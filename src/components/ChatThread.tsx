import { useEffect, useRef } from 'react';
import {
  BookmarkCheck,
  CheckCircle2,
  ExternalLink,
  RotateCcw,
  ShieldAlert,
  Volume2,
  XCircle,
} from 'lucide-react';
import type { ChatMessage, LanguageMode, VoiceStatus } from '../types/jarvis';

interface ChatThreadProps {
  messages: ChatMessage[];
  status: VoiceStatus;
  ownerName: string;
  onQuickPrompt: (prompt: string) => void;
  onSpeakMessage: (text: string, language?: LanguageMode) => void;
  onResolvePermission: (messageId: string, approved: boolean) => void;
}

const STARTER_PROMPTS = [
  {
    label: 'YouTube & Voice Control',
    text: 'Open YouTube and search for calm study music.',
  },
  {
    label: 'Time & Date · Hinglish',
    text: 'Namaste JARVIS, abhi kya time aur aaj ki date kya hai?',
  },
  {
    label: 'Internet Search',
    text: 'Search the internet for the latest SpaceX or NASA mission news.',
  },
  {
    label: 'Note & Reminder · Hindi',
    text: 'मेरा एक नोट बनाओ: कल सुबह मीटिंग है, और 15 मिनट बाद चाय पीने का रिमाइंडर लगाओ।',
  },
];

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

function getLangDisplay(lang?: LanguageMode): string {
  if (lang === 'hi') return 'Hindi';
  if (lang === 'hinglish') return 'Hinglish';
  if (lang === 'en') return 'English';
  return 'Auto';
}

export function ChatThread({
  messages,
  status,
  ownerName,
  onQuickPrompt,
  onSpeakMessage,
  onResolvePermission,
}: ChatThreadProps) {
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, status]);

  if (messages.length === 0 && status !== 'thinking') {
    return (
      <div className="flex-1 overflow-y-auto p-5 md:p-8 flex flex-col items-center justify-center text-center">
        <div className="max-w-lg space-y-5">
          <div className="space-y-2">
            <h2 className="text-xl md:text-2xl font-semibold text-slate-900 dark:text-slate-100 text-balance">
              Hello {ownerName || 'Owner'}, JARVIS is ready
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Speak or type in Hindi, Hinglish, or English. Ask for live time and
              date, web searches, notes, reminders, or permission-gated YouTube
              and Google links.
            </p>
          </div>

          <div className="grid gap-2.5 text-left">
            {STARTER_PROMPTS.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => onQuickPrompt(item.text)}
                className="min-h-[48px] w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F1726] px-4 py-3 text-left hover:border-sky-500/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
              >
                <div className="text-xs font-medium text-sky-600 dark:text-sky-400">
                  {item.label}
                </div>
                <div className="mt-0.5 text-sm text-slate-800 dark:text-slate-200">
                  {item.text}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      data-testid="chat-thread"
      className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4"
    >
      {messages.map((msg) => {
        const isUser = msg.role === 'user';
        const perm = msg.permissionRequest;
        return (
          <article
            key={msg.id}
            className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`max-w-[92%] md:max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed space-y-2.5 ${
                isUser
                  ? 'bg-sky-600 text-white'
                  : msg.isError
                    ? 'border border-rose-500/40 bg-rose-500/10 text-rose-800 dark:text-rose-200'
                    : 'border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131D31] text-slate-800 dark:text-slate-100'
              }`}
            >
              <p className="whitespace-pre-wrap break-words">{msg.content}</p>

              {/* Verified executed notes / reminders / preferences */}
              {msg.actionNotes && msg.actionNotes.length > 0 && (
                <div className="pt-2 border-t border-slate-200/70 dark:border-slate-700/70 space-y-1">
                  {msg.actionNotes.map((note, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400"
                    >
                      <BookmarkCheck className="w-3.5 h-3.5 shrink-0" />
                      <span>{note}</span>
                    </div>
                  ))}
                </div>
              )}

              {msg.memorySavedNote && (
                <div className="pt-2 border-t border-slate-200/70 dark:border-slate-700/70 flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                  <BookmarkCheck className="w-3.5 h-3.5 shrink-0" />
                  <span>Saved to memory: {msg.memorySavedNote}</span>
                </div>
              )}

              {/* Grounded Internet Search Sources */}
              {msg.sources && msg.sources.length > 0 && (
                <div className="pt-2 border-t border-slate-200/70 dark:border-slate-700/70 space-y-1.5">
                  <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Web Sources
                  </div>
                  <div className="flex flex-col gap-1">
                    {msg.sources.map((src) => (
                      <a
                        key={src.uri}
                        href={src.uri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-sky-600 dark:text-sky-400 hover:underline truncate"
                      >
                        <ExternalLink className="w-3 h-3 shrink-0" />
                        <span className="truncate">{src.title}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Permission Prompt for Sensitive Actions & External Site Opening */}
              {perm && (
                <div
                  data-testid="permission-card"
                  className="pt-2.5 border-t border-slate-200/70 dark:border-slate-700/70 space-y-2.5"
                >
                  <div className="flex items-start gap-2">
                    <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <div className="space-y-0.5 min-w-0">
                      <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                        {perm.title}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 break-words">
                        {perm.description}
                      </p>
                    </div>
                  </div>

                  {perm.status === 'pending' ? (
                    <div className="flex flex-wrap items-center gap-2">
                      {perm.actionType === 'open_website' && perm.url ? (
                        <a
                          href={perm.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => onResolvePermission(msg.id, true)}
                          className="min-h-[38px] inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium bg-sky-600 text-white hover:bg-sky-500"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>
                            Allow & Open {perm.site === 'youtube' ? 'YouTube' : 'Google'}
                          </span>
                        </a>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onResolvePermission(msg.id, true)}
                          className="min-h-[38px] inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium bg-rose-600 text-white hover:bg-rose-500"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Allow Action</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => onResolvePermission(msg.id, false)}
                        className="min-h-[38px] inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Deny</span>
                      </button>
                    </div>
                  ) : perm.status === 'approved' ? (
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                      <span className="inline-flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Permission approved</span>
                      </span>
                      {perm.url && (
                        <a
                          href={perm.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sky-600 dark:text-sky-400 hover:underline"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>Open Link Again</span>
                        </a>
                      )}
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Permission denied — no action taken</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="mt-1.5 flex items-center gap-2 px-1 text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
              <span>{isUser ? ownerName || 'You' : 'JARVIS'}</span>
              <span aria-hidden="true">·</span>
              <span>{formatTime(msg.timestamp)}</span>
              {msg.language && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="font-sans">{getLangDisplay(msg.language)}</span>
                </>
              )}
              {!isUser && !msg.isError && (
                <>
                  <span aria-hidden="true">·</span>
                  <button
                    type="button"
                    onClick={() => onSpeakMessage(msg.content, msg.language)}
                    aria-label={`Speak response from ${formatTime(msg.timestamp)}`}
                    className="font-sans inline-flex items-center gap-1 text-sky-600 dark:text-sky-400 hover:underline py-1 px-1.5 rounded"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>Speak</span>
                    <RotateCcw className="w-3 h-3 ml-0.5 opacity-75" />
                  </button>
                </>
              )}
            </div>
          </article>
        );
      })}

      {/* Live Thinking Bubble inside thread */}
      {status === 'thinking' && (
        <div
          data-testid="chat-thinking-indicator"
          className="flex items-start"
          role="status"
          aria-live="polite"
        >
          <div className="rounded-2xl border border-sky-500/30 bg-white dark:bg-[#131D31] px-4 py-3 flex items-center gap-3">
            <div className="relative w-6 h-6 flex items-center justify-center" aria-hidden="true">
              <span className="absolute inset-0 rounded-full border-2 border-sky-500/30 border-t-sky-500 animate-jarvis-spin" />
              <span className="w-2 h-2 rounded-full bg-sky-500 animate-jarvis-breathe" />
            </div>
            <span className="text-sm font-medium text-sky-600 dark:text-sky-400">
              JARVIS is Thinking...
            </span>
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
