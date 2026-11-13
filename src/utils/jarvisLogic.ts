import type { LanguageMode, MemoryCategory, MemoryItem } from '../types/jarvis';

export interface SystemPromptOptions {
  ownerName: string;
  memories: MemoryItem[];
  languageMode: LanguageMode;
  expressivePauses: boolean;
  notesCount?: number;
  remindersCount?: number;
}

/**
 * Builds JARVIS's grounded system instruction.
 * Enforces:
 * - Natural, warm, friendly female AI assistant persona
 * - Hindi, Hinglish, and English fluency
 * - Real tool execution for time/date, web search, notes/reminders, preferences, and permission-gated actions
 * - Strict honesty: NEVER pretend to think or claim actions happened if a tool did not execute
 */
export function buildSystemPrompt({
  ownerName,
  memories,
  languageMode,
  expressivePauses,
  notesCount = 0,
  remindersCount = 0,
}: SystemPromptOptions): string {
  const safeOwner = ownerName.trim() || 'Owner';

  const memoryBlock =
    memories.length > 0
      ? memories
          .map((m, idx) => `${idx + 1}. [${m.category}] ${m.content}`)
          .join('\n')
      : 'No saved memories yet.';

  const languageDirective = (() => {
    switch (languageMode) {
      case 'hi':
        return 'Respond in natural, clear, friendly Hindi (Devanagari script) unless the user explicitly asks for English.';
      case 'hinglish':
        return 'Respond in natural, friendly Hinglish (Hindi written in Roman script mixed naturally with everyday English words), matching the user’s conversational tone.';
      case 'en':
        return 'Respond in clear, natural, warm English.';
      case 'auto':
      default:
        return 'Automatically match the user’s language: reply in Hindi (Devanagari) if they speak/write Hindi, in natural Hinglish (Roman Hindi + English) if they use Hinglish, and in English if they use English.';
    }
  })();

  const speechStyleDirective = expressivePauses
    ? 'Write responses so they sound great when read aloud: use warm conversational phrasing, concise sentences, natural commas, and occasional light pauses where appropriate. Avoid heavy markdown tables or excessive formatting.'
    : 'Keep responses clear, direct, and easy to follow both on screen and when spoken aloud.';

  return [
    `You are JARVIS, a natural, clear, friendly female AI voice assistant assisting ${safeOwner}.`,
    `Language Directive: ${languageDirective}`,
    `Voice & Delivery: ${speechStyleDirective}`,
    '',
    'Capabilities & Real Tool Rules (CRITICAL):',
    '1. Time & Date: Always call `getCurrentDateTime` whenever the user asks for the current time, date, or day.',
    '2. Internet Search: Use `googleSearch` automatically for live news, weather, facts, sports scores, or whenever the user asks you to search the internet.',
    '3. Open YouTube / Google: When asked to open or search on YouTube or Google directly, call `openWebsite` (site="youtube" or "google", optional query). Never claim the browser already opened it—tell the user you prepared the link and ask them to tap Allow to open it.',
    '4. Notes & Reminders: Call `createNote` when the user wants to write/save a note, and `createReminder` when they ask to be reminded of something (with `dueInMinutes` or `dueAtIso` if a time is mentioned).',
    '5. Preferences & Memory: Call `savePreference` ONLY when the user explicitly asks you to remember a fact, preference, or instruction.',
    '6. Sensitive Actions: When the user asks to delete/clear all notes, clear all reminders, clear all memories, clear chat history, or disable/remove the security PIN, ALWAYS call `requestSensitiveAction` and ask the user for explicit permission first. Never claim a deletion occurred until the user approves it.',
    '7. Never pretend to think, stall with fake filler, or claim to have performed external actions (like sending emails, making phone calls, or controlling OS apps) that you have no tool for.',
    '',
    `Current Workspace: ${notesCount} saved notes, ${remindersCount} saved reminders.`,
    `Saved Owner Memories & Preferences:\n${memoryBlock}`,
  ].join('\n');
}

/**
 * Validates an Owner Security PIN (4 to 6 numeric digits).
 */
export function validatePin(pin: string): { valid: boolean; error?: string } {
  const trimmed = pin.trim();
  if (!/^\d{4,6}$/.test(trimmed)) {
    return { valid: false, error: 'PIN must be 4 to 6 numeric digits.' };
  }
  return { valid: true };
}

/**
 * Deterministic lightweight hash for local owner PIN verification.
 */
export function hashPin(pin: string): string {
  const input = `jarvis-owner-pin::${pin.trim()}`;
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `pin_${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

/**
 * Merges a new memory into existing memories without exact/case-insensitive duplicates.
 */
export function mergeMemory(
  existing: MemoryItem[],
  content: string,
  category: MemoryCategory = 'personal',
  nowIso = new Date().toISOString(),
  id = `mem_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
): { items: MemoryItem[]; added: MemoryItem | null } {
  const cleaned = content.trim();
  if (!cleaned) {
    return { items: existing, added: null };
  }

  const normalizedNew = cleaned.toLowerCase();
  const duplicate = existing.find(
    (item) => item.content.trim().toLowerCase() === normalizedNew,
  );
  if (duplicate) {
    return { items: existing, added: null };
  }

  const newItem: MemoryItem = {
    id,
    content: cleaned,
    category,
    createdAt: nowIso,
  };

  return {
    items: [newItem, ...existing],
    added: newItem,
  };
}
