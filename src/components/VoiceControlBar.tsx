import { type FormEvent, useState } from 'react';
import { Mic, MicOff, Radio, RotateCcw, Send, Square } from 'lucide-react';
import type { LanguageMode, VoiceStatus } from '../types/jarvis';

interface VoiceControlBarProps {
  status: VoiceStatus;
  continuousListening: boolean;
  languageMode: LanguageMode;
  canRepeat: boolean;
  isTranscribing: boolean;
  micError: string | null;
  onToggleListening: () => void;
  onToggleContinuous: () => void;
  onLanguageChange: (mode: LanguageMode) => void;
  onStopSpeaking: () => void;
  onRepeatAnswer: () => void;
  onSendMessage: (text: string) => void;
  onDismissMicError: () => void;
}

export function VoiceControlBar({
  status,
  continuousListening,
  languageMode,
  canRepeat,
  isTranscribing,
  micError,
  onToggleListening,
  onToggleContinuous,
  onLanguageChange,
  onStopSpeaking,
  onRepeatAnswer,
  onSendMessage,
  onDismissMicError,
}: VoiceControlBarProps) {
  const [draft, setDraft] = useState('');

  const isThinking = status === 'thinking';
  const isSpeaking = status === 'speaking';
  const isListening = status === 'listening';

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed || isThinking) return;
    setDraft('');
    onSendMessage(trimmed);
  };

  return (
    <div className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F1726] p-3 md:p-4 space-y-3">
      {micError && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-200"
        >
          <span>{micError}</span>
          <button
            type="button"
            onClick={onDismissMicError}
            className="text-xs font-medium underline shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Voice Toolbar: Continuous Listening ON/OFF, Language, Stop/Repeat */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            role="switch"
            aria-checked={continuousListening}
            aria-label="Continuous Listening Mode"
            onClick={onToggleContinuous}
            className={`min-h-[44px] inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium whitespace-nowrap shrink-0 border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${
              continuousListening
                ? 'bg-sky-600 text-white border-sky-500 hover:bg-sky-500'
                : 'bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-200/70 dark:hover:bg-slate-800'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Continuous: {continuousListening ? 'ON' : 'OFF'}</span>
          </button>

          <label className="sr-only" htmlFor="jarvis-lang-select">
            Conversation Language
          </label>
          <select
            id="jarvis-lang-select"
            value={languageMode}
            onChange={(e) => onLanguageChange(e.target.value as LanguageMode)}
            aria-label="Conversation Language"
            className="min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
          >
            <option value="auto">Auto (EN / HI / Hinglish)</option>
            <option value="hinglish">Hinglish</option>
            <option value="hi">Hindi (हिन्दी)</option>
            <option value="en">English</option>
          </select>
        </div>

        <div className="flex items-center gap-2 md:hidden">
          {isSpeaking && (
            <button
              type="button"
              onClick={onStopSpeaking}
              aria-label="Stop Speaking"
              className="min-h-[44px] inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-rose-600 text-white whitespace-nowrap"
            >
              <Square className="w-3 h-3 fill-current" />
              <span>Stop</span>
            </button>
          )}
          {canRepeat && !isSpeaking && (
            <button
              type="button"
              onClick={onRepeatAnswer}
              disabled={isThinking}
              aria-label="Repeat Answer"
              className="min-h-[44px] inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 whitespace-nowrap"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Repeat</span>
            </button>
          )}
        </div>
      </div>

      {/* Text + Mic Input Composer */}
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <button
          type="button"
          onClick={onToggleListening}
          disabled={isThinking || isTranscribing}
          aria-label={isListening ? 'Stop microphone listening' : 'Start microphone listening'}
          className={`min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-xl border transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${
            isListening
              ? 'bg-sky-600 text-white border-sky-500 hover:bg-sky-500'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
        >
          {isListening ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
        </button>

        <label htmlFor="jarvis-chat-input" className="sr-only">
          Ask JARVIS anything in English, Hindi, or Hinglish
        </label>
        <input
          id="jarvis-chat-input"
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Ask JARVIS in English, Hindi, or Hinglish..."
          disabled={isThinking}
          className="min-h-[44px] flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/80 px-3.5 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
        />

        <button
          type="submit"
          disabled={!draft.trim() || isThinking}
          aria-label="Send message"
          className={`min-h-[44px] min-w-[44px] inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap shrink-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${
            draft.trim() && !isThinking
              ? 'bg-sky-600 text-white hover:bg-sky-500'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed'
          }`}
        >
          <Send className="w-4 h-4" />
          <span className="hidden sm:inline">Send</span>
        </button>
      </form>
    </div>
  );
}
