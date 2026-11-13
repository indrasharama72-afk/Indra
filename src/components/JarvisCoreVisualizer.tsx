import { Mic, MicOff, RotateCcw, Square, Volume2 } from 'lucide-react';
import type { LanguageMode, VoicePersona, VoiceStatus } from '../types/jarvis';

interface JarvisCoreVisualizerProps {
  status: VoiceStatus;
  waveformLevels: number[];
  continuousListening: boolean;
  interimTranscript: string;
  voicePersona: VoicePersona;
  languageMode: LanguageMode;
  canRepeat: boolean;
  isTranscribing: boolean;
  onToggleListening: () => void;
  onStopSpeaking: () => void;
  onRepeatAnswer: () => void;
}

const LANGUAGE_LABELS: Record<LanguageMode, string> = {
  auto: 'Auto · EN / HI / Hinglish',
  en: 'English',
  hi: 'Hindi (हिन्दी)',
  hinglish: 'Hinglish',
};

export function JarvisCoreVisualizer({
  status,
  waveformLevels,
  continuousListening,
  interimTranscript,
  voicePersona,
  languageMode,
  canRepeat,
  isTranscribing,
  onToggleListening,
  onStopSpeaking,
  onRepeatAnswer,
}: JarvisCoreVisualizerProps) {
  const isThinking = status === 'thinking';
  const isSpeaking = status === 'speaking';
  const isListening = status === 'listening';

  return (
    <section
      aria-label="JARVIS voice and processing visualizer"
      data-testid="jarvis-core-visualizer"
      data-voice-status={status}
      className="flex flex-col items-center justify-between rounded-2xl border border-slate-200 dark:border-slate-800/90 bg-white dark:bg-[#0F1726] p-3.5 md:p-6 transition-colors"
    >
      {/* Top unboxed metadata row */}
      <div className="w-full flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pb-2.5 md:pb-3 border-b border-slate-100 dark:border-slate-800/80">
        <span className="font-medium text-slate-700 dark:text-slate-200">
          Voice: {voicePersona} (Female)
        </span>
        <span className="truncate max-w-[170px] text-right">
          {LANGUAGE_LABELS[languageMode]}
        </span>
      </div>

      {/* Central Visual Core: Processing Circles / Waveform / Listening Ring */}
      <div className="my-2.5 md:my-7 flex flex-col items-center justify-center w-full">
        <div className="relative flex items-center justify-center w-32 h-32 md:w-52 md:h-52">
          {/* Listening outward pulse ring */}
          {isListening && (
            <>
              <span
                aria-hidden="true"
                className="absolute inset-2 rounded-full border border-sky-500/45 animate-jarvis-pulse-ring"
              />
              <span
                aria-hidden="true"
                className="absolute inset-5 rounded-full border border-sky-400/35"
              />
            </>
          )}

          {/* Animated Processing Circles while generating response */}
          {isThinking && (
            <svg
              viewBox="0 0 200 200"
              aria-hidden="true"
              data-testid="processing-circles"
              className="absolute inset-0 w-full h-full"
            >
              {/* Outer segmented ring */}
              <circle
                cx="100"
                cy="100"
                r="88"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeDasharray="48 22 14 22"
                strokeLinecap="round"
                className="text-sky-500/75 origin-center animate-jarvis-spin"
              />
              {/* Middle counter-rotating processing circle */}
              <circle
                cx="100"
                cy="100"
                r="70"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeDasharray="34 18 60 18"
                strokeLinecap="round"
                className="text-cyan-400/85 origin-center animate-jarvis-spin-reverse"
              />
              {/* Inner breathing harmonic circle */}
              <circle
                cx="100"
                cy="100"
                r="52"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeDasharray="16 10"
                className="text-sky-300/80 origin-center animate-jarvis-breathe"
              />
            </svg>
          )}

          {/* Speaking radial subtle ring */}
          {isSpeaking && (
            <div
              aria-hidden="true"
              className="absolute inset-3 rounded-full border border-sky-500/40 bg-sky-500/5 transition-transform duration-150"
            />
          )}

          {/* Idle geometric ring */}
          {status === 'idle' && (
            <div
              aria-hidden="true"
              className="absolute inset-4 rounded-full border border-slate-200 dark:border-slate-700/80"
            />
          )}

          {/* Center Core Button / Waveform Stage */}
          {isSpeaking ? (
            <div
              data-testid="voice-waveform"
              aria-label="JARVIS voice waveform"
              className="relative z-10 flex items-center justify-center gap-1 w-32 h-24 px-2"
            >
              {waveformLevels.map((level, idx) => {
                const heightPct = Math.round(Math.max(14, Math.min(100, level * 100)));
                return (
                  <span
                    key={idx}
                    className="w-1 rounded-full bg-sky-500 dark:bg-sky-400 transition-[height] duration-75"
                    style={{ height: `${heightPct}%` }}
                  />
                );
              })}
            </div>
          ) : (
            <button
              type="button"
              onClick={onToggleListening}
              disabled={isThinking || isTranscribing}
              aria-label={
                isThinking
                  ? 'JARVIS is Thinking'
                  : isListening
                    ? 'Stop Listening'
                    : 'Start Voice Listening'
              }
              className={`relative z-10 flex flex-col items-center justify-center w-28 h-28 md:w-32 md:h-32 rounded-full border transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#0F1726] ${
                isThinking
                  ? 'border-sky-500/40 bg-sky-500/10 text-sky-600 dark:text-sky-300 cursor-wait'
                  : isListening
                    ? 'border-sky-500 bg-sky-600 text-white shadow-lg shadow-sky-500/20 hover:bg-sky-500'
                    : 'border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/90 text-slate-800 dark:text-slate-100 hover:border-sky-500/60 hover:bg-slate-200/80 dark:hover:bg-slate-800'
              }`}
            >
              {isThinking ? (
                <div className="flex items-center gap-1.5" aria-hidden="true">
                  <span className="w-2 h-2 rounded-full bg-sky-500 animate-bounce [animation-delay:-0.25s]" />
                  <span className="w-2 h-2 rounded-full bg-sky-500 animate-bounce [animation-delay:-0.12s]" />
                  <span className="w-2 h-2 rounded-full bg-sky-500 animate-bounce" />
                </div>
              ) : isListening ? (
                <Mic className="w-7 h-7" />
              ) : (
                <MicOff className="w-6 h-6 opacity-80" />
              )}
              <span className="mt-1.5 text-xs font-medium whitespace-nowrap">
                {isThinking
                  ? 'Processing'
                  : isTranscribing
                    ? 'Transcribing'
                    : isListening
                      ? 'Listening'
                      : 'Tap to Speak'}
              </span>
            </button>
          )}
        </div>

        {/* Status Message */}
        <div className="mt-4 min-h-[2.75rem] flex flex-col items-center justify-center text-center px-2">
          {isThinking && (
            <p
              data-testid="thinking-status"
              role="status"
              aria-live="polite"
              className="text-sm font-semibold text-sky-600 dark:text-sky-400 tracking-tight animate-pulse"
            >
              JARVIS is Thinking...
            </p>
          )}
          {isSpeaking && (
            <p
              role="status"
              aria-live="polite"
              className="text-sm font-semibold text-sky-600 dark:text-sky-400 flex items-center gap-1.5"
            >
              <Volume2 className="w-4 h-4" />
              <span>JARVIS is Speaking...</span>
            </p>
          )}
          {isListening && (
            <p role="status" aria-live="polite" className="text-sm font-medium text-slate-700 dark:text-slate-200">
              {interimTranscript
                ? `“${interimTranscript}”`
                : isTranscribing
                  ? 'Transcribing your voice...'
                  : 'Listening in Hindi, Hinglish, or English...'}
            </p>
          )}
          {status === 'idle' && (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {continuousListening
                ? 'Continuous listening armed — ready when you speak'
                : 'Tap microphone or type a message below'}
            </p>
          )}
        </div>
      </div>

      {/* Quick Playback Actions: Stop Speaking & Repeat Answer */}
      <div className="w-full grid grid-cols-2 gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800/80">
        <button
          type="button"
          onClick={onStopSpeaking}
          disabled={!isSpeaking}
          className={`min-h-[44px] inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${
            isSpeaking
              ? 'bg-rose-600 text-white hover:bg-rose-500'
              : 'bg-slate-100 dark:bg-slate-800/70 text-slate-400 dark:text-slate-500 cursor-not-allowed'
          }`}
        >
          <Square className="w-3.5 h-3.5 fill-current" />
          <span>Stop Speaking</span>
        </button>

        <button
          type="button"
          onClick={onRepeatAnswer}
          disabled={!canRepeat || isThinking}
          className={`min-h-[44px] inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${
            canRepeat && !isThinking
              ? 'bg-slate-900 dark:bg-slate-800 text-white hover:bg-slate-800 dark:hover:bg-slate-700 border border-slate-700/50'
              : 'bg-slate-100 dark:bg-slate-800/70 text-slate-400 dark:text-slate-500 cursor-not-allowed'
          }`}
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Repeat Answer</span>
        </button>
      </div>
    </section>
  );
}
