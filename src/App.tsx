import { useCallback, useEffect, useReducer, useState } from 'react';
import {
  Bell,
  Brain,
  Lock,
  MessageSquare,
  Settings,
  Shield,
  StickyNote,
} from 'lucide-react';
import { ChatThread } from './components/ChatThread';
import { JarvisCoreVisualizer } from './components/JarvisCoreVisualizer';
import { LockScreenModal } from './components/LockScreenModal';
import { MemoryPanel } from './components/MemoryPanel';
import { NotesPanel } from './components/NotesPanel';
import { SecurityPanel } from './components/SecurityPanel';
import { SettingsPanel } from './components/SettingsPanel';
import { VoiceControlBar } from './components/VoiceControlBar';
import { usePersistentState } from './hooks/usePersistentState';
import { useSpeechListener } from './hooks/useSpeechListener';
import { useVoiceEngine } from './hooks/useVoiceEngine';
import type {
  ActiveTab,
  AssistantClientAction,
  ChatMessage,
  GroundingSource,
  JarvisSettings,
  LanguageMode,
  MemoryItem,
  NoteItem,
  PermissionRequest,
  ReminderItem,
  SecurityState,
} from './types/jarvis';
import { hashPin, mergeMemory } from './utils/jarvisLogic';
import { detectLanguageHint } from './utils/speechProcessor';
import { voiceStateReducer } from './utils/voiceStateMachine';

const DEFAULT_SETTINGS: JarvisSettings = {
  voicePersona: 'Kore',
  autoSpeak: true,
  expressivePauses: true,
  speechRate: 1.0,
  languageMode: 'auto',
  continuousListeningDefault: false,
  speechEngine: 'auto',
  confirmBeforeExternalOpen: true,
  theme: 'dark',
};

const DEFAULT_SECURITY: SecurityState = {
  ownerName: 'Owner',
  pinHash: null,
  isLocked: false,
  protectMemoryAndSettings: true,
  failedAttempts: 0,
};

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('chat');
  const [messages, setMessages] = usePersistentState<ChatMessage[]>(
    'jarvis.chat.v2',
    [],
  );
  const [memories, setMemories] = usePersistentState<MemoryItem[]>(
    'jarvis.memories.v2',
    [],
  );
  const [notes, setNotes] = usePersistentState<NoteItem[]>('jarvis.notes.v2', []);
  const [reminders, setReminders] = usePersistentState<ReminderItem[]>(
    'jarvis.reminders.v2',
    [],
  );
  const [settings, setSettings] = usePersistentState<JarvisSettings>(
    'jarvis.settings.v2',
    DEFAULT_SETTINGS,
  );
  const [security, setSecurity] = usePersistentState<SecurityState>(
    'jarvis.security.v2',
    DEFAULT_SECURITY,
  );

  // Lock on startup if PIN + protection are enabled
  useEffect(() => {
    if (security.pinHash && security.protectMemoryAndSettings && !security.isLocked) {
      setSecurity((prev) => ({ ...prev, isLocked: true }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync Tailwind dark class on <html>
  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [settings.theme]);

  const [voiceState, dispatch] = useReducer(voiceStateReducer, {
    status: 'idle',
    continuousListening: settings.continuousListeningDefault,
    autoSpeak: settings.autoSpeak,
    lastSpokenText: '',
  });

  const voiceEngine = useVoiceEngine();
  const [dueBanner, setDueBanner] = useState<ReminderItem | null>(null);

  // Check for due reminders every 15 seconds
  useEffect(() => {
    const checkDue = () => {
      const nowMs = Date.now();
      const due = reminders.find(
        (r) => !r.completed && !r.notified && r.dueAtIso && Date.parse(r.dueAtIso) <= nowMs,
      );
      if (due) {
        setDueBanner(due);
        setReminders((prev) =>
          prev.map((item) => (item.id === due.id ? { ...item, notified: true } : item)),
        );
        if (settings.autoSpeak && voiceState.status === 'idle' && !security.isLocked) {
          void voiceEngine.speak({
            text: `Reminder: ${due.title}`,
            voicePersona: settings.voicePersona,
            language: settings.languageMode,
            expressivePauses: settings.expressivePauses,
            speechRate: settings.speechRate,
            onStart: () =>
              dispatch({ type: 'START_SPEAKING', text: `Reminder: ${due.title}` }),
            onEnd: () => dispatch({ type: 'FINISH_SPEAKING' }),
          });
        }
      }
    };

    checkDue();
    const timer = window.setInterval(checkDue, 15000);
    return () => window.clearInterval(timer);
  }, [
    reminders,
    security.isLocked,
    setReminders,
    settings.autoSpeak,
    settings.expressivePauses,
    settings.languageMode,
    settings.speechRate,
    settings.voicePersona,
    voiceEngine,
    voiceState.status,
  ]);

  const handleSendMessage = useCallback(
    async (rawText: string) => {
      const trimmed = rawText.trim();
      if (!trimmed || voiceState.status === 'thinking') return;

      voiceEngine.stopSpeaking();

      const detectedUserLang = detectLanguageHint(trimmed, settings.languageMode);
      const userMsg: ChatMessage = {
        id: `msg_${Date.now()}_u`,
        role: 'user',
        content: trimmed,
        timestamp: new Date().toISOString(),
        language: detectedUserLang,
      };

      const nextHistory = [...messages, userMsg];
      setMessages(nextHistory);
      dispatch({ type: 'START_THINKING' });

      try {
        const clientTimeZone =
          Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: trimmed,
            history: messages.slice(-12).map((m) => ({
              role: m.role,
              content: m.content,
            })),
            memories,
            ownerName: security.ownerName,
            languageMode: settings.languageMode,
            expressivePauses: settings.expressivePauses,
            clientTimeZone,
            notesCount: notes.length,
            remindersCount: reminders.length,
          }),
        });

        const data = (await res.json()) as {
          reply?: string;
          detectedLanguage?: LanguageMode;
          clientActions?: AssistantClientAction[];
          sources?: GroundingSource[];
          error?: string;
        };

        if (!res.ok || !data.reply) {
          throw new Error(
            data.error || 'JARVIS could not reach the AI service right now.',
          );
        }

        const actionNotes: string[] = [];
        let memorySavedNote: string | undefined;
        let permissionRequest: PermissionRequest | undefined;

        if (Array.isArray(data.clientActions)) {
          let currentMemories = memories;

          for (const action of data.clientActions) {
            if (action.type === 'save_preference' && action.memory?.content) {
              const merged = mergeMemory(
                currentMemories,
                action.memory.content,
                action.memory.category,
              );
              if (merged.added) {
                currentMemories = merged.items;
                memorySavedNote = merged.added.content;
              }
            } else if (action.type === 'create_note' && action.note) {
              const newNote: NoteItem = {
                id: `note_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                title: action.note.title,
                content: action.note.content,
                createdAt: new Date().toISOString(),
              };
              setNotes((prev) => [newNote, ...prev]);
              actionNotes.push(`Created note: ${newNote.title}`);
            } else if (action.type === 'create_reminder' && action.reminder) {
              const newReminder: ReminderItem = {
                id: `rem_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                title: action.reminder.title,
                dueAtIso: action.reminder.dueAtIso,
                completed: false,
                notified: false,
                createdAt: new Date().toISOString(),
              };
              setReminders((prev) => [newReminder, ...prev]);
              actionNotes.push(
                newReminder.dueAtIso
                  ? `Reminder set: ${newReminder.title} (${new Date(
                      newReminder.dueAtIso,
                    ).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`
                  : `Reminder added: ${newReminder.title}`,
              );
            } else if (action.type === 'permission_request' && action.permission) {
              if (
                action.permission.actionType === 'open_website' &&
                !settings.confirmBeforeExternalOpen
              ) {
                permissionRequest = {
                  ...action.permission,
                  status: 'approved',
                };
              } else {
                permissionRequest = action.permission;
              }
            }
          }

          if (currentMemories !== memories) {
            setMemories(currentMemories);
          }
        }

        const assistantMsg: ChatMessage = {
          id: `msg_${Date.now()}_a`,
          role: 'assistant',
          content: data.reply,
          timestamp: new Date().toISOString(),
          language: data.detectedLanguage || detectedUserLang,
          memorySavedNote,
          actionNotes: actionNotes.length > 0 ? actionNotes : undefined,
          sources:
            Array.isArray(data.sources) && data.sources.length > 0
              ? data.sources
              : undefined,
          permissionRequest,
        };

        setMessages((prev) => [...prev, assistantMsg]);

        voiceEngine.setLastSpokenText(data.reply);
        voiceEngine.setLastSpeakOptions({
          text: data.reply,
          voicePersona: settings.voicePersona,
          language: data.detectedLanguage || detectedUserLang,
          expressivePauses: settings.expressivePauses,
          speechRate: settings.speechRate,
        });

        if (settings.autoSpeak) {
          await voiceEngine.speak({
            text: data.reply,
            voicePersona: settings.voicePersona,
            language: data.detectedLanguage || detectedUserLang,
            expressivePauses: settings.expressivePauses,
            speechRate: settings.speechRate,
            onStart: () => dispatch({ type: 'START_SPEAKING', text: data.reply! }),
            onEnd: () => dispatch({ type: 'FINISH_SPEAKING' }),
          });
        } else {
          dispatch({ type: 'FINISH_SPEAKING' });
        }
      } catch (err: unknown) {
        const message =
          err instanceof Error
            ? err.message
            : 'Unable to complete your request. Please try again.';

        const errorMsg: ChatMessage = {
          id: `msg_${Date.now()}_e`,
          role: 'assistant',
          content: message,
          timestamp: new Date().toISOString(),
          isError: true,
        };
        setMessages((prev) => [...prev, errorMsg]);
        dispatch({ type: 'FAIL_THINKING' });
      }
    },
    [
      memories,
      messages,
      notes.length,
      reminders.length,
      security.ownerName,
      setMemories,
      setMessages,
      setNotes,
      setReminders,
      settings.autoSpeak,
      settings.confirmBeforeExternalOpen,
      settings.expressivePauses,
      settings.languageMode,
      settings.speechRate,
      settings.voicePersona,
      voiceEngine,
      voiceState.status,
    ],
  );

  const handleResolvePermission = useCallback(
    (messageId: string, approved: boolean) => {
      const targetMsg = messages.find((m) => m.id === messageId);
      const perm = targetMsg?.permissionRequest;
      if (!perm || perm.status !== 'pending') return;

      if (approved) {
        if (perm.actionType === 'clear_notes') {
          setNotes([]);
        } else if (perm.actionType === 'clear_reminders') {
          setReminders([]);
          setDueBanner(null);
        } else if (perm.actionType === 'clear_memories') {
          setMemories([]);
        } else if (perm.actionType === 'clear_chat') {
          setMessages([]);
          return;
        } else if (perm.actionType === 'disable_pin') {
          setSecurity((prev) => ({
            ...prev,
            pinHash: null,
            isLocked: false,
            failedAttempts: 0,
          }));
        }
      }

      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId && m.permissionRequest
            ? {
                ...m,
                permissionRequest: {
                  ...m.permissionRequest,
                  status: approved ? 'approved' : 'denied',
                },
              }
            : m,
        ),
      );
    },
    [messages, setMemories, setMessages, setNotes, setReminders, setSecurity],
  );

  const speechListener = useSpeechListener({
    languageMode: settings.languageMode,
    speechEngine: settings.speechEngine,
    continuousListening: voiceState.continuousListening,
    voiceStatus: voiceState.status,
    onTranscriptReady: (transcript) => {
      void handleSendMessage(transcript);
    },
    onStatusSync: (listening) => {
      if (listening) {
        dispatch({ type: 'START_LISTENING' });
      } else {
        dispatch({ type: 'STOP_LISTENING' });
      }
    },
  });

  const handleToggleListening = useCallback(() => {
    if (voiceState.status === 'thinking') return;
    if (voiceState.status === 'speaking') {
      voiceEngine.stopSpeaking();
      dispatch({ type: 'STOP_SPEAKING' });
    }
    if (voiceState.status === 'listening' || speechListener.isRecordingAudio) {
      if (voiceState.continuousListening) {
        dispatch({ type: 'TOGGLE_CONTINUOUS', enabled: false });
      }
      speechListener.stopListening();
    } else {
      speechListener.startListening();
    }
  }, [speechListener, voiceEngine, voiceState.continuousListening, voiceState.status]);

  const handleToggleContinuous = useCallback(() => {
    const nextEnabled = !voiceState.continuousListening;
    dispatch({ type: 'TOGGLE_CONTINUOUS', enabled: nextEnabled });
    if (nextEnabled) {
      if (voiceState.status === 'idle') {
        speechListener.startListening();
      }
    } else {
      speechListener.stopListening();
    }
  }, [speechListener, voiceState.continuousListening, voiceState.status]);

  const handleStopSpeaking = useCallback(() => {
    voiceEngine.stopSpeaking();
    dispatch({ type: 'STOP_SPEAKING' });
  }, [voiceEngine]);

  const handleRepeatAnswer = useCallback(() => {
    const latestAssistant = [...messages]
      .reverse()
      .find((m) => m.role === 'assistant' && !m.isError);
    const textToSpeak = voiceEngine.lastSpokenText || latestAssistant?.content;
    if (!textToSpeak) return;

    speechListener.stopListening();
    voiceEngine.repeatLastAnswer({
      textOverride: textToSpeak,
      onStart: () => dispatch({ type: 'START_SPEAKING', text: textToSpeak }),
      onEnd: () => dispatch({ type: 'FINISH_SPEAKING' }),
    });
  }, [messages, speechListener, voiceEngine]);

  const handleSpeakSpecificMessage = useCallback(
    (text: string, language?: LanguageMode) => {
      speechListener.stopListening();
      void voiceEngine.speak({
        text,
        voicePersona: settings.voicePersona,
        language: language || settings.languageMode,
        expressivePauses: settings.expressivePauses,
        speechRate: settings.speechRate,
        onStart: () => dispatch({ type: 'START_SPEAKING', text }),
        onEnd: () => dispatch({ type: 'FINISH_SPEAKING' }),
      });
    },
    [
      settings.expressivePauses,
      settings.languageMode,
      settings.speechRate,
      settings.voicePersona,
      speechListener,
      voiceEngine,
    ],
  );

  const handleUnlockPin = useCallback(
    (pin: string) => {
      if (!security.pinHash) return true;
      if (hashPin(pin) === security.pinHash) {
        setSecurity((prev) => ({
          ...prev,
          isLocked: false,
          failedAttempts: 0,
        }));
        return true;
      }
      setSecurity((prev) => ({
        ...prev,
        failedAttempts: prev.failedAttempts + 1,
      }));
      return false;
    },
    [security.pinHash, setSecurity],
  );

  const handleLockSession = useCallback(() => {
    if (!security.pinHash) return;
    speechListener.stopListening();
    voiceEngine.stopSpeaking();
    dispatch({ type: 'TOGGLE_CONTINUOUS', enabled: false });
    setSecurity((prev) => ({ ...prev, isLocked: true, failedAttempts: 0 }));
  }, [security.pinHash, setSecurity, speechListener, voiceEngine]);

  const latestAssistantMessage = [...messages]
    .reverse()
    .find((m) => m.role === 'assistant' && !m.isError);
  const canRepeat = Boolean(voiceEngine.canRepeat || latestAssistantMessage);

  const navItems: Array<{ id: ActiveTab; label: string; icon: typeof MessageSquare }> = [
    { id: 'chat', label: 'Chat', icon: MessageSquare },
    { id: 'notes', label: 'Notes', icon: StickyNote },
    { id: 'memory', label: 'Memory', icon: Brain },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="min-h-dvh flex flex-col bg-slate-50 text-slate-900 dark:bg-[#090E17] dark:text-slate-100">
      {/* 3-Zone Top Navigation Bar */}
      <header className="sticky top-0 z-30 h-12 md:h-14 border-b border-slate-200 dark:border-slate-800/90 bg-white/90 dark:bg-[#0B111E]/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto h-full px-4 md:px-6 flex items-center justify-between gap-8">
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('chat');
            }}
            className="font-display text-lg font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap shrink-0"
          >
            JARVIS
          </a>

          <nav
            aria-label="Primary navigation"
            className="hidden md:flex items-center gap-6"
          >
            {navItems.map((item) => {
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  aria-current={active ? 'page' : undefined}
                  className={`py-1.5 text-sm font-medium whitespace-nowrap shrink-0 border-b-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${
                    active
                      ? 'border-sky-500 text-slate-900 dark:text-white'
                      : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="flex items-center shrink-0">
            {security.pinHash ? (
              <button
                type="button"
                onClick={handleLockSession}
                className="min-h-[36px] inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium bg-slate-900 dark:bg-slate-800 text-white hover:bg-slate-800 dark:hover:bg-slate-700 whitespace-nowrap shrink-0"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Lock Session</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setActiveTab('security')}
                className="min-h-[36px] inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap shrink-0"
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Set PIN</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Active Due Reminder Alert */}
      {dueBanner && (
        <div
          role="alert"
          className="max-w-7xl w-full mx-auto px-3 sm:px-4 md:px-6 pt-3"
        >
          <div className="rounded-xl border border-sky-500/40 bg-sky-500/10 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-medium text-sky-900 dark:text-sky-100">
              <Bell className="w-4 h-4 text-sky-500 shrink-0" />
              <span>Reminder due: {dueBanner.title}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setReminders((prev) =>
                    prev.map((r) =>
                      r.id === dueBanner.id ? { ...r, completed: true } : r,
                    ),
                  );
                  setDueBanner(null);
                }}
                className="min-h-[36px] px-3 py-1 rounded-lg text-xs font-medium bg-sky-600 text-white hover:bg-sky-500"
              >
                Mark Done
              </button>
              <button
                type="button"
                onClick={() => {
                  const snoozeIso = new Date(Date.now() + 5 * 60_000).toISOString();
                  setReminders((prev) =>
                    prev.map((r) =>
                      r.id === dueBanner.id
                        ? { ...r, dueAtIso: snoozeIso, notified: false }
                        : r,
                    ),
                  );
                  setDueBanner(null);
                }}
                className="min-h-[36px] px-3 py-1 rounded-lg text-xs font-medium border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200"
              >
                Snooze 5m
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-4 md:px-6 pt-3 pb-16 md:py-5 grid grid-cols-1 md:grid-cols-[320px_1fr] lg:grid-cols-[360px_1fr] gap-4 md:gap-6 items-start">
        <aside
          className={`${
            activeTab === 'chat' ? 'block' : 'hidden md:block'
          } md:sticky md:top-20 space-y-4`}
        >
          <JarvisCoreVisualizer
            status={voiceState.status}
            waveformLevels={voiceEngine.waveformLevels}
            continuousListening={voiceState.continuousListening}
            interimTranscript={speechListener.interimTranscript}
            voicePersona={settings.voicePersona}
            languageMode={settings.languageMode}
            canRepeat={canRepeat}
            isTranscribing={speechListener.isTranscribing}
            onToggleListening={handleToggleListening}
            onStopSpeaking={handleStopSpeaking}
            onRepeatAnswer={handleRepeatAnswer}
          />

          <div className="hidden md:flex items-center justify-between px-2 text-xs text-slate-500 dark:text-slate-400">
            <span>Owner: {security.ownerName || 'Owner'}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">
              {notes.length + reminders.length} notes/rem
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">
              {memories.length} {memories.length === 1 ? 'memory' : 'memories'}
            </span>
          </div>

          {voiceEngine.voiceNotice && (
            <p className="px-2 text-xs text-amber-600 dark:text-amber-400">
              {voiceEngine.voiceNotice}
            </p>
          )}
        </aside>

        <section
          aria-label={`${activeTab} workspace`}
          className="flex flex-col rounded-2xl border border-slate-200 dark:border-slate-800/90 bg-slate-100/60 dark:bg-[#0C1321] min-h-[460px] md:h-[calc(100dvh-7.5rem)] overflow-hidden"
        >
          {activeTab === 'chat' && (
            <>
              <ChatThread
                messages={messages}
                status={voiceState.status}
                ownerName={security.ownerName}
                onQuickPrompt={(prompt) => void handleSendMessage(prompt)}
                onSpeakMessage={handleSpeakSpecificMessage}
                onResolvePermission={handleResolvePermission}
              />
              <VoiceControlBar
                status={voiceState.status}
                continuousListening={voiceState.continuousListening}
                languageMode={settings.languageMode}
                canRepeat={canRepeat}
                isTranscribing={speechListener.isTranscribing}
                micError={speechListener.micError}
                onToggleListening={handleToggleListening}
                onToggleContinuous={handleToggleContinuous}
                onLanguageChange={(mode) =>
                  setSettings((prev) => ({ ...prev, languageMode: mode }))
                }
                onStopSpeaking={handleStopSpeaking}
                onRepeatAnswer={handleRepeatAnswer}
                onSendMessage={(text) => void handleSendMessage(text)}
                onDismissMicError={speechListener.clearMicError}
              />
            </>
          )}

          {activeTab === 'notes' && (
            <NotesPanel
              notes={notes}
              reminders={reminders}
              onCreateNote={(title, content) => {
                const newNote: NoteItem = {
                  id: `note_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                  title,
                  content,
                  createdAt: new Date().toISOString(),
                };
                setNotes((prev) => [newNote, ...prev]);
              }}
              onDeleteNote={(id) =>
                setNotes((prev) => prev.filter((item) => item.id !== id))
              }
              onCreateReminder={(title, dueAtIso) => {
                const newRem: ReminderItem = {
                  id: `rem_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                  title,
                  dueAtIso,
                  completed: false,
                  notified: false,
                  createdAt: new Date().toISOString(),
                };
                setReminders((prev) => [newRem, ...prev]);
              }}
              onToggleReminder={(id) =>
                setReminders((prev) =>
                  prev.map((item) =>
                    item.id === id
                      ? { ...item, completed: !item.completed }
                      : item,
                  ),
                )
              }
              onDeleteReminder={(id) =>
                setReminders((prev) => prev.filter((item) => item.id !== id))
              }
              onRequestClearNotes={() => setNotes([])}
              onRequestClearReminders={() => {
                setReminders([]);
                setDueBanner(null);
              }}
            />
          )}

          {activeTab === 'memory' && (
            <MemoryPanel
              memories={memories}
              onAddMemory={(content, category) => {
                const merged = mergeMemory(memories, content, category);
                if (merged.added) {
                  setMemories(merged.items);
                }
              }}
              onDeleteMemory={(id) =>
                setMemories((prev) => prev.filter((item) => item.id !== id))
              }
              onClearAll={() => setMemories([])}
            />
          )}

          {activeTab === 'security' && (
            <SecurityPanel
              security={security}
              onUpdateOwnerName={(name) =>
                setSecurity((prev) => ({ ...prev, ownerName: name }))
              }
              onSetPin={(pin) =>
                setSecurity((prev) => ({
                  ...prev,
                  pinHash: hashPin(pin),
                  failedAttempts: 0,
                }))
              }
              onRemovePin={() =>
                setSecurity((prev) => ({
                  ...prev,
                  pinHash: null,
                  isLocked: false,
                  failedAttempts: 0,
                }))
              }
              onLockSession={handleLockSession}
              onToggleProtectTabs={(enabled) =>
                setSecurity((prev) => ({
                  ...prev,
                  protectMemoryAndSettings: enabled,
                }))
              }
            />
          )}

          {activeTab === 'settings' && (
            <SettingsPanel
              settings={settings}
              messageCount={messages.length}
              onUpdateSettings={(patch) => {
                setSettings((prev) => ({ ...prev, ...patch }));
                if (typeof patch.autoSpeak === 'boolean') {
                  dispatch({ type: 'SET_AUTO_SPEAK', enabled: patch.autoSpeak });
                }
              }}
              onClearChat={() => setMessages([])}
              onTestVoice={() => {
                const sample =
                  settings.languageMode === 'hi'
                    ? 'नमस्ते! मैं जार्विस हूँ। आपकी सहायता के लिए तैयार हूँ।'
                    : settings.languageMode === 'hinglish'
                      ? 'Namaste! Main JARVIS hoon... Aaj main aapki kis tarah help kar sakti hoon?'
                      : 'Hello! I am JARVIS. Ready to assist you with clear, natural voice responses.';
                handleSpeakSpecificMessage(sample, settings.languageMode);
              }}
            />
          )}
        </section>
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <nav
        aria-label="Mobile navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-30 h-15 border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-[#0B111E]/95 backdrop-blur-md grid grid-cols-5 items-center"
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              aria-current={active ? 'page' : undefined}
              className={`min-h-[44px] h-full flex flex-col items-center justify-center gap-1 py-1.5 text-[10px] leading-none font-medium transition-colors ${
                active
                  ? 'text-sky-600 dark:text-sky-400'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Owner Security Lock Overlay */}
      {security.isLocked && security.pinHash && (
        <LockScreenModal
          ownerName={security.ownerName}
          failedAttempts={security.failedAttempts}
          onUnlock={handleUnlockPin}
        />
      )}
    </div>
  );
}
