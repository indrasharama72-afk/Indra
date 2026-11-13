import { useCallback, useEffect, useRef, useState } from 'react';
import type { LanguageMode, VoicePersona } from '../types/jarvis';
import {
  detectLanguageHint,
  formatExpressiveSpeech,
  splitIntoSpeechChunks,
} from '../utils/speechProcessor';

interface SpeakOptions {
  text: string;
  voicePersona: VoicePersona;
  language?: LanguageMode;
  expressivePauses: boolean;
  speechRate: number;
  onStart?: () => void;
  onEnd?: () => void;
}

const WAVEFORM_BARS = 24;
const ZERO_WAVEFORM = Array.from({ length: WAVEFORM_BARS }, () => 0.08);

const PREFERRED_FEMALE_VOICE_NAMES = [
  'neerja',
  'swara',
  'heera',
  'kalpana',
  'google हिन्दी',
  'google uk english female',
  'samantha',
  'karen',
  'moira',
  'victoria',
  'zira',
  'aria',
  'jenny',
  'natural',
  'female',
];

function selectFemaleWebSpeechVoice(
  voices: SpeechSynthesisVoice[],
  lang: LanguageMode,
): SpeechSynthesisVoice | null {
  if (!voices.length) return null;

  const targetLangPrefix = lang === 'hi' ? 'hi' : 'en';
  const langMatched = voices.filter((v) =>
    v.lang.toLowerCase().startsWith(targetLangPrefix),
  );
  const pool = langMatched.length > 0 ? langMatched : voices;

  // Prefer Indian English female voice for Hinglish when available
  if (lang === 'hinglish' || lang === 'auto') {
    const enInFemale = voices.find((v) => {
      const name = v.name.toLowerCase();
      return (
        v.lang.toLowerCase() === 'en-in' &&
        PREFERRED_FEMALE_VOICE_NAMES.some((p) => name.includes(p))
      );
    });
    if (enInFemale) return enInFemale;
  }

  for (const preferred of PREFERRED_FEMALE_VOICE_NAMES) {
    const found = pool.find((v) => v.name.toLowerCase().includes(preferred));
    if (found) return found;
  }

  return pool[0] ?? voices[0] ?? null;
}

export function useVoiceEngine() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [waveformLevels, setWaveformLevels] = useState<number[]>(ZERO_WAVEFORM);
  const [lastSpokenText, setLastSpokenText] = useState('');
  const [lastSpeakOptions, setLastSpeakOptions] = useState<Omit<SpeakOptions, 'onStart' | 'onEnd'> | null>(null);
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null);

  const speakTokenRef = useRef(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const abortCtrlRef = useRef<AbortController | null>(null);
  const endCallbackRef = useRef<(() => void) | undefined>(undefined);

  const cleanupPlayback = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (abortCtrlRef.current) {
      abortCtrlRef.current.abort();
      abortCtrlRef.current = null;
    }
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.onended = null;
        sourceNodeRef.current.stop();
        sourceNodeRef.current.disconnect();
      } catch {
        // Already stopped
      }
      sourceNodeRef.current = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setWaveformLevels(ZERO_WAVEFORM);
  }, []);

  const stopSpeaking = useCallback(() => {
    speakTokenRef.current += 1;
    cleanupPlayback();
    setIsSpeaking(false);
    endCallbackRef.current = undefined;
  }, [cleanupPlayback]);

  const speakWithWebSpeechFallback = useCallback(
    async (
      options: SpeakOptions,
      token: number,
    ): Promise<void> => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        throw new Error('Speech playback is unavailable in this browser.');
      }

      const lang = options.language || detectLanguageHint(options.text, 'auto');
      const cleaned = formatExpressiveSpeech(options.text, options.expressivePauses);
      const chunks = splitIntoSpeechChunks(cleaned);
      if (chunks.length === 0) return;

      const synth = window.speechSynthesis;
      const voices = synth.getVoices();
      const chosenVoice = selectFemaleWebSpeechVoice(voices, lang);

      // Rhythmic waveform animation loop for Web Speech synthesis
      let phase = 0;
      const animateSyntheticWave = () => {
        if (speakTokenRef.current !== token) return;
        phase += 0.22;
        const levels = Array.from({ length: WAVEFORM_BARS }, (_, i) => {
          const distFromCenter = Math.abs(i - WAVEFORM_BARS / 2) / (WAVEFORM_BARS / 2);
          const envelope = 1 - distFromCenter * 0.45;
          const wave =
            0.35 +
            0.35 * Math.sin(phase + i * 0.55) +
            0.22 * Math.cos(phase * 1.7 - i * 0.35);
          return Math.max(0.12, Math.min(1, wave * envelope));
        });
        setWaveformLevels(levels);
        rafRef.current = requestAnimationFrame(animateSyntheticWave);
      };

      setIsSpeaking(true);
      options.onStart?.();
      rafRef.current = requestAnimationFrame(animateSyntheticWave);

      for (let i = 0; i < chunks.length; i += 1) {
        if (speakTokenRef.current !== token) return;
        const chunk = chunks[i];

        await new Promise<void>((resolve) => {
          const utterance = new SpeechSynthesisUtterance(chunk);
          if (chosenVoice) {
            utterance.voice = chosenVoice;
            utterance.lang = chosenVoice.lang;
          } else {
            utterance.lang = lang === 'hi' ? 'hi-IN' : 'en-IN';
          }
          utterance.rate = Math.max(0.8, Math.min(1.25, options.speechRate));
          utterance.pitch = 1.08; // warm, clear female register
          utterance.onend = () => resolve();
          utterance.onerror = () => resolve();
          synth.speak(utterance);
        });

        // Natural breathing pause between sentences
        if (options.expressivePauses && i < chunks.length - 1 && speakTokenRef.current === token) {
          await new Promise((r) => setTimeout(r, 180));
        }
      }

      if (speakTokenRef.current === token) {
        cleanupPlayback();
        setIsSpeaking(false);
        options.onEnd?.();
      }
    },
    [cleanupPlayback],
  );

  const speak = useCallback(
    async (options: SpeakOptions) => {
      const trimmed = options.text.trim();
      if (!trimmed) return;

      speakTokenRef.current += 1;
      const token = speakTokenRef.current;
      cleanupPlayback();
      setVoiceNotice(null);

      setLastSpokenText(trimmed);
      setLastSpeakOptions({
        text: trimmed,
        voicePersona: options.voicePersona,
        language: options.language,
        expressivePauses: options.expressivePauses,
        speechRate: options.speechRate,
      });
      endCallbackRef.current = options.onEnd;

      const controller = new AbortController();
      abortCtrlRef.current = controller;

      try {
        const res = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: trimmed,
            voiceName: options.voicePersona,
            language: options.language || detectLanguageHint(trimmed, 'auto'),
            expressivePauses: options.expressivePauses,
          }),
          signal: controller.signal,
        });

        if (speakTokenRef.current !== token) return;

        if (!res.ok) {
          throw new Error('Cloud voice unavailable, switching to browser female voice.');
        }

        const data = (await res.json()) as { audioBase64?: string };
        if (!data.audioBase64 || speakTokenRef.current !== token) {
          throw new Error('No audio returned.');
        }

        const binaryStr = atob(data.audioBase64);
        const bytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i += 1) {
          bytes[i] = binaryStr.charCodeAt(i);
        }

        const AudioContextCtor =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

        if (!audioCtxRef.current) {
          audioCtxRef.current = new AudioContextCtor();
        }
        const ctx = audioCtxRef.current;
        if (ctx.state === 'suspended') {
          await ctx.resume();
        }

        const audioBuffer = await ctx.decodeAudioData(bytes.buffer.slice(0));
        if (speakTokenRef.current !== token) return;

        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.playbackRate.value = Math.max(0.85, Math.min(1.2, options.speechRate));

        const analyser = ctx.createAnalyser();
        analyser.fftSize = 64;
        analyser.smoothingTimeConstant = 0.72;

        source.connect(analyser);
        analyser.connect(ctx.destination);
        sourceNodeRef.current = source;

        const freqData = new Uint8Array(analyser.frequencyBinCount);
        const updateWaveform = () => {
          if (speakTokenRef.current !== token) return;
          analyser.getByteFrequencyData(freqData);
          const levels = Array.from({ length: WAVEFORM_BARS }, (_, idx) => {
            const bin = Math.min(freqData.length - 1, Math.floor((idx / WAVEFORM_BARS) * 18));
            const normalized = freqData[bin] / 255;
            return Math.max(0.1, Math.min(1, normalized * 1.15));
          });
          setWaveformLevels(levels);
          rafRef.current = requestAnimationFrame(updateWaveform);
        };

        setIsSpeaking(true);
        options.onStart?.();
        rafRef.current = requestAnimationFrame(updateWaveform);

        source.onended = () => {
          if (speakTokenRef.current === token) {
            cleanupPlayback();
            setIsSpeaking(false);
            options.onEnd?.();
          }
        };

        source.start(0);
      } catch (err: unknown) {
        if (speakTokenRef.current !== token) return;
        if (err instanceof DOMException && err.name === 'AbortError') return;

        // Graceful fallback to browser female Web Speech voice
        try {
          await speakWithWebSpeechFallback(options, token);
        } catch {
          cleanupPlayback();
          setIsSpeaking(false);
          setVoiceNotice('Voice playback was blocked or unavailable on this browser.');
          options.onEnd?.();
        }
      }
    },
    [cleanupPlayback, speakWithWebSpeechFallback],
  );

  const repeatLastAnswer = useCallback(
    (callbacks?: { onStart?: () => void; onEnd?: () => void; textOverride?: string }) => {
      if (callbacks?.textOverride) {
        const base = lastSpeakOptions ?? {
          voicePersona: 'Kore' as VoicePersona,
          expressivePauses: true,
          speechRate: 1.0,
        };
        void speak({
          ...base,
          text: callbacks.textOverride,
          onStart: callbacks.onStart,
          onEnd: callbacks.onEnd,
        });
        return;
      }
      if (!lastSpeakOptions) return;
      void speak({
        ...lastSpeakOptions,
        onStart: callbacks?.onStart,
        onEnd: callbacks?.onEnd,
      });
    },
    [lastSpeakOptions, speak],
  );

  useEffect(() => {
    return () => {
      speakTokenRef.current += 1;
      cleanupPlayback();
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        void audioCtxRef.current.close();
      }
    };
  }, [cleanupPlayback]);

  return {
    isSpeaking,
    waveformLevels,
    lastSpokenText,
    canRepeat: Boolean(lastSpokenText),
    voiceNotice,
    speak,
    stopSpeaking,
    repeatLastAnswer,
    setLastSpokenText,
    setLastSpeakOptions,
  };
}
