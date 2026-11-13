import { useState } from 'react';
import { Moon, Sun, Trash2, Volume2 } from 'lucide-react';
import type {
  JarvisSettings,
  LanguageMode,
  SpeechEngineMode,
  VoicePersona,
} from '../types/jarvis';

interface SettingsPanelProps {
  settings: JarvisSettings;
  messageCount: number;
  onUpdateSettings: (patch: Partial<JarvisSettings>) => void;
  onClearChat: () => void;
  onTestVoice: () => void;
}

export function SettingsPanel({
  settings,
  messageCount,
  onUpdateSettings,
  onClearChat,
  onTestVoice,
}: SettingsPanelProps) {
  const [confirmClearChat, setConfirmClearChat] = useState(false);

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          Assistant Settings
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Customize JARVIS’s female voice persona, natural pauses, listening mode,
          and display theme.
        </p>
      </div>

      {/* Voice & Expressive Speech */}
      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F1726] p-5 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Voice & Speech Delivery
          </h3>
          <button
            type="button"
            onClick={onTestVoice}
            className="min-h-[40px] inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-medium bg-sky-600 text-white hover:bg-sky-500 whitespace-nowrap"
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span>Preview Voice</span>
          </button>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="voice-persona-select"
              className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5"
            >
              Female Voice Persona
            </label>
            <select
              id="voice-persona-select"
              value={settings.voicePersona}
              onChange={(e) =>
                onUpdateSettings({ voicePersona: e.target.value as VoicePersona })
              }
              className="min-h-[44px] w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/80 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="Kore">Kore — Warm, Clear & Friendly</option>
              <option value="Zephyr">Zephyr — Bright & Conversational</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="settings-language-select"
              className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5"
            >
              Conversation Language
            </label>
            <select
              id="settings-language-select"
              value={settings.languageMode}
              onChange={(e) =>
                onUpdateSettings({ languageMode: e.target.value as LanguageMode })
              }
              className="min-h-[44px] w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/80 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="auto">Auto-Detect (English / Hindi / Hinglish)</option>
              <option value="hinglish">Hinglish (Hindi + English)</option>
              <option value="hi">Hindi (हिन्दी)</option>
              <option value="en">English</option>
            </select>
          </div>
        </div>

        {/* Speech Speed */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label
              htmlFor="speech-rate-range"
              className="text-xs font-medium text-slate-600 dark:text-slate-400"
            >
              Speech Pace
            </label>
            <span className="text-xs font-mono tabular-nums text-slate-700 dark:text-slate-300">
              {settings.speechRate.toFixed(2)}x
            </span>
          </div>
          <input
            id="speech-rate-range"
            type="range"
            min="0.85"
            max="1.20"
            step="0.05"
            value={settings.speechRate}
            onChange={(e) =>
              onUpdateSettings({ speechRate: parseFloat(e.target.value) })
            }
            className="w-full accent-sky-600 cursor-pointer"
          />
        </div>

        {/* Toggles */}
        <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
          <div className="py-3 flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                Auto-Speak Every Response
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Automatically read JARVIS’s replies aloud with live waveform.
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={settings.autoSpeak}
              aria-label="Auto-Speak Every Response"
              onClick={() => onUpdateSettings({ autoSpeak: !settings.autoSpeak })}
              className={`min-h-[36px] min-w-[60px] rounded-full px-1.5 transition-colors flex items-center shrink-0 ${
                settings.autoSpeak
                  ? 'bg-sky-600 justify-end'
                  : 'bg-slate-300 dark:bg-slate-700 justify-start'
              }`}
            >
              <span className="w-5 h-5 rounded-full bg-white shadow" />
            </button>
          </div>

          <div className="py-3 flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                Natural Pauses & Expressive Speech
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Add breathing pauses and conversational phrasing across sentences.
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={settings.expressivePauses}
              aria-label="Natural Pauses and Expressive Speech"
              onClick={() =>
                onUpdateSettings({ expressivePauses: !settings.expressivePauses })
              }
              className={`min-h-[36px] min-w-[60px] rounded-full px-1.5 transition-colors flex items-center shrink-0 ${
                settings.expressivePauses
                  ? 'bg-sky-600 justify-end'
                  : 'bg-slate-300 dark:bg-slate-700 justify-start'
              }`}
            >
              <span className="w-5 h-5 rounded-full bg-white shadow" />
            </button>
          </div>

          <div className="py-3 flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                Start with Continuous Listening
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Automatically re-arm the microphone after JARVIS finishes speaking.
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={settings.continuousListeningDefault}
              aria-label="Start with Continuous Listening"
              onClick={() =>
                onUpdateSettings({
                  continuousListeningDefault: !settings.continuousListeningDefault,
                })
              }
              className={`min-h-[36px] min-w-[60px] rounded-full px-1.5 transition-colors flex items-center shrink-0 ${
                settings.continuousListeningDefault
                  ? 'bg-sky-600 justify-end'
                  : 'bg-slate-300 dark:bg-slate-700 justify-start'
              }`}
            >
              <span className="w-5 h-5 rounded-full bg-white shadow" />
            </button>
          </div>

          <div className="py-3 flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                Ask Permission Before Sensitive Actions
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Require explicit confirmation before opening YouTube/Google or clearing saved data.
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={settings.confirmBeforeExternalOpen}
              aria-label="Ask Permission Before Sensitive Actions"
              onClick={() =>
                onUpdateSettings({
                  confirmBeforeExternalOpen: !settings.confirmBeforeExternalOpen,
                })
              }
              className={`min-h-[36px] min-w-[60px] rounded-full px-1.5 transition-colors flex items-center shrink-0 ${
                settings.confirmBeforeExternalOpen
                  ? 'bg-sky-600 justify-end'
                  : 'bg-slate-300 dark:bg-slate-700 justify-start'
              }`}
            >
              <span className="w-5 h-5 rounded-full bg-white shadow" />
            </button>
          </div>
        </div>

        {/* Speech Recognition Engine */}
        <div>
          <label
            htmlFor="speech-engine-select"
            className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5"
          >
            Microphone Recognition Engine
          </label>
          <select
            id="speech-engine-select"
            value={settings.speechEngine}
            onChange={(e) =>
              onUpdateSettings({ speechEngine: e.target.value as SpeechEngineMode })
            }
            className="min-h-[44px] w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/80 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value="auto">
              Auto (Browser Live Speech + Cloud Fallback)
            </option>
            <option value="gemini-transcribe">
              Cloud Audio Transcription (Tap to Record & Stop)
            </option>
          </select>
        </div>
      </section>

      {/* Appearance & Chat Data */}
      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F1726] p-5 space-y-4">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          Appearance & Conversation Data
        </h3>

        <div className="flex items-center justify-between gap-4">
          <div className="text-sm text-slate-700 dark:text-slate-300">
            Studio Theme
          </div>
          <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => onUpdateSettings({ theme: 'light' })}
              className={`min-h-[36px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                settings.theme === 'light'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Sun className="w-3.5 h-3.5" />
              <span>Light</span>
            </button>
            <button
              type="button"
              onClick={() => onUpdateSettings({ theme: 'dark' })}
              className={`min-h-[36px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                settings.theme === 'dark'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Moon className="w-3.5 h-3.5" />
              <span>Dark</span>
            </button>
          </div>
        </div>

        <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
            {messageCount} stored chat messages
          </div>

          {confirmClearChat ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  onClearChat();
                  setConfirmClearChat(false);
                }}
                className="min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-medium bg-rose-600 text-white hover:bg-rose-500"
              >
                Confirm Clear Chat
              </button>
              <button
                type="button"
                onClick={() => setConfirmClearChat(false)}
                className="min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-medium border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              disabled={messageCount === 0}
              onClick={() => setConfirmClearChat(true)}
              className="min-h-[40px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-rose-600 dark:text-rose-400 border border-rose-500/30 hover:bg-rose-500/10 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Chat History</span>
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
