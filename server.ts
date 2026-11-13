import dotenv from 'dotenv';
dotenv.config();

import express, { type Request, type Response } from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  type Content,
  type FunctionDeclaration,
  GoogleGenAI,
  type Part,
  ThinkingLevel,
  Type,
} from '@google/genai';
import { createServer as createViteServer } from 'vite';
import { buildSystemPrompt } from './src/utils/jarvisLogic';
import {
  buildExternalSiteUrl,
  extractGroundingSources,
  getFormattedDateTime,
  isWebSearchIntent,
  resolveReminderDueIso,
  type SupportedSite,
} from './src/utils/assistantActions';
import {
  buildTtsStylePrompt,
  detectLanguageHint,
  formatExpressiveSpeech,
} from './src/utils/speechProcessor';
import type {
  AssistantClientAction,
  GroundingSource,
  LanguageMode,
  MemoryCategory,
  MemoryItem,
  SensitiveActionType,
  VoicePersona,
} from './src/types/jarvis';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;

function getAiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in the server environment.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

const getCurrentDateTimeDecl: FunctionDeclaration = {
  name: 'getCurrentDateTime',
  description:
    'Get the exact current local time, date, day of the week, and timezone for the user.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      purpose: {
        type: Type.STRING,
        description: 'Optional brief note about whether user asked for time, date, or both.',
      },
    },
  },
};

const openWebsiteDecl: FunctionDeclaration = {
  name: 'openWebsite',
  description:
    'Prepare a permission-gated link to open YouTube or Google (optionally with a search query) when requested by the user.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      site: {
        type: Type.STRING,
        description: 'Must be "youtube" or "google".',
      },
      query: {
        type: Type.STRING,
        description: 'Optional search query to open on YouTube or Google.',
      },
    },
    required: ['site'],
  },
};

const createNoteDecl: FunctionDeclaration = {
  name: 'createNote',
  description: 'Create and save a persistent note for the user.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      title: {
        type: Type.STRING,
        description: 'Short title for the note.',
      },
      content: {
        type: Type.STRING,
        description: 'Full content of the note.',
      },
    },
    required: ['title', 'content'],
  },
};

const createReminderDecl: FunctionDeclaration = {
  name: 'createReminder',
  description: 'Create and save a persistent reminder with optional due time.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      title: {
        type: Type.STRING,
        description: 'What the user wants to be reminded about.',
      },
      dueInMinutes: {
        type: Type.NUMBER,
        description: 'Optional relative delay in minutes from now (e.g., 10 for "in 10 minutes").',
      },
      dueAtIso: {
        type: Type.STRING,
        description: 'Optional ISO 8601 timestamp if a specific clock time/date was requested.',
      },
    },
    required: ['title'],
  },
};

const savePreferenceDecl: FunctionDeclaration = {
  name: 'savePreference',
  description:
    'Save a user preference, personal fact, or standing instruction into persistent Memory.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      content: {
        type: Type.STRING,
        description: 'Concise preference or fact to remember.',
      },
      category: {
        type: Type.STRING,
        description: 'One of: preference, personal, work, instruction',
      },
    },
    required: ['content', 'category'],
  },
};

const requestSensitiveActionDecl: FunctionDeclaration = {
  name: 'requestSensitiveAction',
  description:
    'Request explicit user permission before executing destructive or sensitive actions such as clearing all notes, clearing all reminders, clearing all memories, clearing chat history, or disabling the security PIN.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      actionType: {
        type: Type.STRING,
        description:
          'One of: clear_notes, clear_reminders, clear_memories, clear_chat, disable_pin',
      },
      reason: {
        type: Type.STRING,
        description: 'Clear explanation of what will be affected if approved.',
      },
    },
    required: ['actionType', 'reason'],
  },
};

interface ChatRequestBody {
  message: string;
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
  memories?: MemoryItem[];
  ownerName?: string;
  languageMode?: LanguageMode;
  expressivePauses?: boolean;
  clientTimeZone?: string;
  notesCount?: number;
  remindersCount?: number;
}

interface TtsRequestBody {
  text: string;
  voiceName?: VoicePersona;
  language?: LanguageMode;
  expressivePauses?: boolean;
}

interface TranscribeRequestBody {
  audioBase64: string;
  mimeType: string;
  languageMode?: LanguageMode;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '15mb' }));

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      ok: true,
      hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
    });
  });

  app.post('/api/chat', async (req: Request, res: Response) => {
    try {
      const body = req.body as ChatRequestBody;
      const userMessage = typeof body?.message === 'string' ? body.message.trim() : '';

      if (!userMessage) {
        res.status(400).json({ error: 'Message cannot be empty.' });
        return;
      }

      const ai = getAiClient();
      const memories = Array.isArray(body.memories) ? body.memories.slice(0, 30) : [];
      const ownerName = typeof body.ownerName === 'string' ? body.ownerName : 'Owner';
      const languageMode: LanguageMode = body.languageMode || 'auto';
      const expressivePauses = body.expressivePauses !== false;
      const clientTimeZone =
        typeof body.clientTimeZone === 'string' ? body.clientTimeZone : undefined;

      const systemInstruction = buildSystemPrompt({
        ownerName,
        memories,
        languageMode,
        expressivePauses,
        notesCount: typeof body.notesCount === 'number' ? body.notesCount : 0,
        remindersCount:
          typeof body.remindersCount === 'number' ? body.remindersCount : 0,
      });

      const recentHistory: Content[] = Array.isArray(body.history)
        ? body.history.slice(-12).map((msg) => ({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: msg.content }],
          }))
        : [];

      const contents: Content[] = [
        ...recentHistory,
        { role: 'user', parts: [{ text: userMessage }] },
      ];

      const toolsWithSearch = [
        { googleSearch: {} },
        {
          functionDeclarations: [
            getCurrentDateTimeDecl,
            openWebsiteDecl,
            createNoteDecl,
            createReminderDecl,
            savePreferenceDecl,
            requestSensitiveActionDecl,
          ],
        },
      ];

      const toolsFunctionsOnly = [
        {
          functionDeclarations: [
            getCurrentDateTimeDecl,
            openWebsiteDecl,
            createNoteDecl,
            createReminderDecl,
            savePreferenceDecl,
            requestSensitiveActionDecl,
          ],
        },
      ];

      const useSearchFirst = isWebSearchIntent(userMessage);

      const generateWithResilience = async (inputContents: Content[]) => {
        const attempts: Array<{
          model: string;
          useSearch: boolean;
          thinking: boolean;
          delayMs: number;
        }> = [
          {
            model: 'gemini-4-hydrogen',
            useSearch: useSearchFirst,
            thinking: true,
            delayMs: 0,
          },
          {
            model: 'gemini-4-hydrogen',
            useSearch: false,
            thinking: true,
            delayMs: 900,
          },
          {
            model: 'gemini-3.1-flash-lite',
            useSearch: false,
            thinking: false,
            delayMs: 1400,
          },
        ];

        let lastError: unknown;
        for (const attempt of attempts) {
          if (attempt.delayMs > 0) {
            await new Promise((r) => setTimeout(r, attempt.delayMs));
          }
          try {
            return await ai.models.generateContent({
              model: attempt.model,
              contents: inputContents,
              config: {
                systemInstruction,
                ...(attempt.thinking
                  ? { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } }
                  : {}),
                tools: attempt.useSearch ? toolsWithSearch : toolsFunctionsOnly,
                ...(attempt.useSearch
                  ? { toolConfig: { includeServerSideToolInvocations: true } }
                  : {}),
              },
            });
          } catch (err: unknown) {
            lastError = err;
            const msg = err instanceof Error ? err.message : String(err);
            const isRateLimit =
              msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED');
            if (!isRateLimit) {
              throw err;
            }
          }
        }
        throw lastError;
      };

      const clientActions: AssistantClientAction[] = [];
      const collectedSources: GroundingSource[] = [];
      const seenSourceUris = new Set<string>();

      const collectSourcesFromResponse = (
        resp: Awaited<ReturnType<typeof ai.models.generateContent>>,
      ) => {
        const chunks = resp.candidates?.[0]?.groundingMetadata?.groundingChunks as
          | Array<{ web?: { uri?: string; title?: string } }>
          | undefined;
        for (const src of extractGroundingSources(chunks)) {
          if (!seenSourceUris.has(src.uri)) {
            seenSourceUris.add(src.uri);
            collectedSources.push(src);
          }
        }
      };

      let response = await generateWithResilience(contents);
      collectSourcesFromResponse(response);

      // Handle up to 3 tool-call rounds cleanly
      for (let round = 0; round < 3; round += 1) {
        const functionCalls = response.functionCalls;
        const previousContent = response.candidates?.[0]?.content;
        if (!functionCalls?.length || !previousContent) {
          break;
        }

        const responseParts: Part[] = [];
        for (const call of functionCalls) {
          const args = (call.args ?? {}) as Record<string, unknown>;
          let toolResult: Record<string, unknown> = { status: 'ok' };

          if (call.name === 'getCurrentDateTime') {
            const dt = getFormattedDateTime(new Date(), clientTimeZone);
            toolResult = dt;
          } else if (call.name === 'openWebsite') {
            const site: SupportedSite =
              String(args.site || '').toLowerCase() === 'youtube' ? 'youtube' : 'google';
            const query = typeof args.query === 'string' ? args.query.trim() : '';
            const url = buildExternalSiteUrl(site, query);
            const siteLabel = site === 'youtube' ? 'YouTube' : 'Google';
            const permId = `perm_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

            clientActions.push({
              type: 'permission_request',
              permission: {
                id: permId,
                actionType: 'open_website',
                title: query
                  ? `Open ${siteLabel} for "${query}"`
                  : `Open ${siteLabel}`,
                description: `JARVIS prepared the external link (${url}). Allow opening it in a new browser tab?`,
                url,
                site,
                status: 'pending',
              },
            });
            toolResult = {
              status: 'permission_required',
              site: siteLabel,
              url,
              message:
                'Permission prompt presented to the owner. Ask the owner to tap Allow to open it.',
            };
          } else if (call.name === 'createNote') {
            const title = String(args.title || 'Quick Note').trim();
            const content = String(args.content || title).trim();
            clientActions.push({
              type: 'create_note',
              note: { title, content },
            });
            toolResult = { status: 'created', title, content };
          } else if (call.name === 'createReminder') {
            const title = String(args.title || 'Reminder').trim();
            const dueInMinutes =
              typeof args.dueInMinutes === 'number' ? args.dueInMinutes : null;
            const rawDueIso = typeof args.dueAtIso === 'string' ? args.dueAtIso : null;
            const dueAtIso = resolveReminderDueIso(rawDueIso, dueInMinutes, new Date());
            clientActions.push({
              type: 'create_reminder',
              reminder: { title, dueAtIso },
            });
            toolResult = {
              status: 'created',
              title,
              dueAtIso: dueAtIso || 'No specific clock time set',
            };
          } else if (call.name === 'savePreference') {
            const content = String(args.content || '').trim();
            const rawCat = String(args.category || 'preference');
            const validCategories: MemoryCategory[] = [
              'preference',
              'personal',
              'work',
              'instruction',
            ];
            const category = validCategories.includes(rawCat as MemoryCategory)
              ? (rawCat as MemoryCategory)
              : 'preference';
            if (content) {
              clientActions.push({
                type: 'save_preference',
                memory: { content, category },
              });
            }
            toolResult = { status: 'saved', content, category };
          } else if (call.name === 'requestSensitiveAction') {
            const rawAction = String(args.actionType || 'clear_memories');
            const validActions: SensitiveActionType[] = [
              'clear_notes',
              'clear_reminders',
              'clear_memories',
              'clear_chat',
              'disable_pin',
            ];
            const actionType: SensitiveActionType = validActions.includes(
              rawAction as SensitiveActionType,
            )
              ? (rawAction as SensitiveActionType)
              : 'clear_memories';
            const reason = String(
              args.reason || 'This action modifies or deletes saved data.',
            ).trim();
            const permId = `perm_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
            const titleMap: Record<SensitiveActionType, string> = {
              open_website: 'Open External Website',
              clear_notes: 'Clear All Saved Notes',
              clear_reminders: 'Clear All Reminders',
              clear_memories: 'Clear All Saved Memories',
              clear_chat: 'Clear Chat History',
              disable_pin: 'Disable Owner Security PIN',
            };
            clientActions.push({
              type: 'permission_request',
              permission: {
                id: permId,
                actionType,
                title: titleMap[actionType],
                description: reason,
                status: 'pending',
              },
            });
            toolResult = {
              status: 'permission_required',
              actionType,
              message:
                'Permission prompt presented to the owner. Do not claim the action is done until the owner clicks Allow.',
            };
          }

          responseParts.push({
            functionResponse: {
              id: call.id,
              name: call.name,
              response: toolResult,
            },
          });
        }

        contents.push(previousContent, {
          role: 'user',
          parts: responseParts,
        });

        response = await generateWithResilience(contents);
        collectSourcesFromResponse(response);
      }

      const replyText =
        (response.text ?? '').trim() ||
        'I am ready to help. Could you please repeat your request?';
      const detectedLanguage = detectLanguageHint(replyText, languageMode);

      res.json({
        reply: replyText,
        detectedLanguage,
        clientActions,
        sources: collectedSources,
      });
    } catch (err: unknown) {
      const rawMessage =
        err instanceof Error ? err.message : 'Unexpected server error while generating reply.';
      console.error('[/api/chat] Error:', rawMessage);
      const isRateLimit =
        rawMessage.includes('429') || rawMessage.includes('RESOURCE_EXHAUSTED');
      const friendly = isRateLimit
        ? 'Gemini API rate limit or quota was reached. Please wait a moment and try again, or check your API key quota in Settings > Secrets.'
        : rawMessage;
      res.status(isRateLimit ? 429 : 500).json({ error: friendly });
    }
  });

  app.post('/api/tts', async (req: Request, res: Response) => {
    try {
      const body = req.body as TtsRequestBody;
      const rawText = typeof body?.text === 'string' ? body.text.trim() : '';

      if (!rawText) {
        res.status(400).json({ error: 'Text is required for speech synthesis.' });
        return;
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('GEMINI_API_KEY is not configured in the server environment.');
      }

      const expressivePauses = body.expressivePauses !== false;
      const language: LanguageMode = body.language || detectLanguageHint(rawText, 'auto');
      const voiceName: VoicePersona = body.voiceName === 'Zephyr' ? 'Zephyr' : 'Kore';
      const spokenText = formatExpressiveSpeech(rawText, expressivePauses);
      const stylePrompt = buildTtsStylePrompt(language, expressivePauses);

      const attemptTts = async (
        apiVersion: string | undefined,
        includeSpeechMetadata: boolean,
        includeSpeechConfig: boolean,
      ) => {
        const client = new GoogleGenAI({
          apiKey,
          ...(apiVersion ? { apiVersion } : {}),
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build',
            },
          },
        });

        const part = includeSpeechMetadata
          ? { text: spokenText, speechMetadata: { style: stylePrompt } }
          : { text: `Read aloud naturally (${stylePrompt}): ${spokenText}` };

        return client.models.generateContent({
          model: 'gemini-3.8-flash-lite-tts',
          contents: [{ role: 'user', parts: [part] }],
          config: {
            responseModalities: ['AUDIO'],
            ...(includeSpeechConfig
              ? {
                  speechConfig: {
                    voiceConfig: {
                      prebuiltVoiceConfig: {
                        voiceName,
                      },
                    },
                  },
                }
              : {}),
          },
        });
      };

      let response;
      try {
        response = await attemptTts(undefined, true, true);
      } catch (firstErr: unknown) {
        const msg = firstErr instanceof Error ? firstErr.message : '';
        if (msg.includes('Cannot find field') || msg.includes('INVALID_ARGUMENT')) {
          try {
            response = await attemptTts('v1alpha', true, true);
          } catch {
            response = await attemptTts('v1alpha', false, false);
          }
        } else {
          throw firstErr;
        }
      }

      const inlineData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData;
      const base64Audio = inlineData?.data;

      if (!base64Audio) {
        res.status(502).json({ error: 'TTS model did not return audio data.' });
        return;
      }

      res.json({
        audioBase64: base64Audio,
        mimeType: inlineData?.mimeType || 'audio/wav',
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Speech synthesis failed on server.';
      console.error('[/api/tts] Error:', message);
      res.status(500).json({ error: message });
    }
  });

  app.post('/api/transcribe', async (req: Request, res: Response) => {
    try {
      const body = req.body as TranscribeRequestBody;
      const audioBase64 = typeof body?.audioBase64 === 'string' ? body.audioBase64 : '';
      const mimeType = typeof body?.mimeType === 'string' ? body.mimeType : 'audio/webm';
      const languageMode: LanguageMode = body.languageMode || 'auto';

      if (!audioBase64) {
        res.status(400).json({ error: 'Audio data is required for transcription.' });
        return;
      }

      const ai = getAiClient();

      const languagePrompt =
        languageMode === 'hi'
          ? 'Transcribe the spoken audio accurately in Hindi (Devanagari script).'
          : languageMode === 'hinglish'
            ? 'Transcribe the spoken audio accurately in natural Hinglish (Roman script for Hindi words mixed with English).'
            : languageMode === 'en'
              ? 'Transcribe the spoken audio accurately in English.'
              : 'Transcribe the spoken audio accurately. Preserve Hindi (Devanagari), Hinglish, or English naturally as spoken. Return only the transcribed text with no commentary.';

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-transcribe',
        contents: {
          parts: [
            {
              inlineData: {
                mimeType,
                data: audioBase64,
              },
            },
            { text: languagePrompt },
          ],
        },
      });

      const transcript = (response.text ?? '').trim();
      res.json({ transcript });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Audio transcription failed on server.';
      console.error('[/api/transcribe] Error:', message);
      res.status(500).json({ error: message });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`JARVIS server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((error) => {
  console.error('Failed to start JARVIS server:', error);
  process.exit(1);
});
