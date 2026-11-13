import { useCallback, useEffect, useRef, useState } from 'react';
import type { LanguageMode, SpeechEngineMode, VoiceStatus } from '../types/jarvis';
import { getRecognitionLocale } from '../utils/speechProcessor';

interface SpeechRecognitionAlternativeLike {
  transcript: string;
}

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  length: number;
  [index: number]: SpeechRecognitionAlternativeLike;
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: SpeechRecognitionResultLike;
  };
}

interface SpeechRecognitionErrorEventLike {
  error: string;
}

interface SpeechRecognitionInstance {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionInstance;

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const win = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return win.SpeechRecognition || win.webkitSpeechRecognition || null;
}

interface UseSpeechListenerOptions {
  languageMode: LanguageMode;
  speechEngine: SpeechEngineMode;
  continuousListening: boolean;
  voiceStatus: VoiceStatus;
  onTranscriptReady: (transcript: string) => void;
  onStatusSync: (listening: boolean) => void;
}

export function useSpeechListener({
  languageMode,
  speechEngine,
  continuousListening,
  voiceStatus,
  onTranscriptReady,
  onStatusSync,
}: UseSpeechListenerOptions) {
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const shouldListenRef = useRef(false);
  const restartTimerRef = useRef<number | null>(null);

  const voiceStatusRef = useRef(voiceStatus);
  voiceStatusRef.current = voiceStatus;

  const continuousRef = useRef(continuousListening);
  continuousRef.current = continuousListening;

  const onTranscriptReadyRef = useRef(onTranscriptReady);
  onTranscriptReadyRef.current = onTranscriptReady;

  const onStatusSyncRef = useRef(onStatusSync);
  onStatusSyncRef.current = onStatusSync;

  const hasBrowserSpeech = Boolean(getSpeechRecognitionCtor());
  const useCloudRecorder = speechEngine === 'gemini-transcribe' || !hasBrowserSpeech;

  const stopMediaRecorder = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    setIsRecordingAudio(false);
  }, []);

  const stopListening = useCallback(() => {
    shouldListenRef.current = false;
    if (restartTimerRef.current !== null) {
      window.clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
      } catch {
        // Ignore stop errors
      }
      recognitionRef.current = null;
    }
    stopMediaRecorder();
    setInterimTranscript('');
    onStatusSyncRef.current(false);
  }, [stopMediaRecorder]);

  const startCloudAudioRecording = useCallback(async () => {
    setMicError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setMicError('Microphone access is not supported in this browser.');
      onStatusSyncRef.current(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      mediaStreamRef.current = stream;
      audioChunksRef.current = [];

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) {
          audioChunksRef.current.push(ev.data);
        }
      };

      recorder.onstop = async () => {
        const chunks = audioChunksRef.current;
        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach((t) => t.stop());
          mediaStreamRef.current = null;
        }
        setIsRecordingAudio(false);
        if (!chunks.length) {
          onStatusSyncRef.current(false);
          return;
        }

        const mimeType = recorder.mimeType || 'audio/webm';
        const blob = new Blob(chunks, { type: mimeType });
        if (blob.size < 400) {
          onStatusSyncRef.current(false);
          return;
        }

        setIsTranscribing(true);
        try {
          const buffer = await blob.arrayBuffer();
          const bytes = new Uint8Array(buffer);
          let binary = '';
          for (let i = 0; i < bytes.byteLength; i += 1) {
            binary += String.fromCharCode(bytes[i]);
          }
          const audioBase64 = btoa(binary);

          const res = await fetch('/api/transcribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              audioBase64,
              mimeType,
              languageMode,
            }),
          });
          const data = (await res.json()) as { transcript?: string; error?: string };
          if (!res.ok) {
            throw new Error(data.error || 'Could not transcribe audio.');
          }
          if (data.transcript?.trim()) {
            onTranscriptReadyRef.current(data.transcript.trim());
          } else {
            setMicError('No clear speech detected. Please try speaking closer to the mic.');
            onStatusSyncRef.current(false);
          }
        } catch (err: unknown) {
          setMicError(
            err instanceof Error ? err.message : 'Transcription failed. Please try again.',
          );
          onStatusSyncRef.current(false);
        } finally {
          setIsTranscribing(false);
        }
      };

      recorder.start();
      setIsRecordingAudio(true);
      onStatusSyncRef.current(true);
    } catch {
      setMicError('Microphone permission denied or no microphone found.');
      onStatusSyncRef.current(false);
    }
  }, [languageMode]);

  const startBrowserRecognition = useCallback(() => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      void startCloudAudioRecording();
      return;
    }

    if (voiceStatusRef.current === 'thinking' || voiceStatusRef.current === 'speaking') {
      return;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.onend = null;
        recognitionRef.current.abort();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }

    setMicError(null);
    shouldListenRef.current = true;

    const recognition = new Ctor();
    recognition.lang = getRecognitionLocale(languageMode);
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    let finalBuffer = '';

    recognition.onstart = () => {
      onStatusSyncRef.current(true);
    };

    recognition.onresult = (event) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        const piece = result[0]?.transcript ?? '';
        if (result.isFinal) {
          finalBuffer += `${piece} `;
        } else {
          interim += piece;
        }
      }
      setInterimTranscript(interim.trim());

      const committed = finalBuffer.trim();
      if (committed) {
        finalBuffer = '';
        setInterimTranscript('');
        shouldListenRef.current = false;
        try {
          recognition.stop();
        } catch {
          // ignore
        }
        onTranscriptReadyRef.current(committed);
      }
    };

    recognition.onerror = (event) => {
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setMicError('Microphone permission was blocked. Please allow mic access in your browser.');
        shouldListenRef.current = false;
        onStatusSyncRef.current(false);
        return;
      }
      if (event.error === 'audio-capture') {
        setMicError('No microphone detected on this device.');
        shouldListenRef.current = false;
        onStatusSyncRef.current(false);
        return;
      }
      // For no-speech / network / aborted, let onend re-arm if continuous mode is ON
    };

    recognition.onend = () => {
      recognitionRef.current = null;
      setInterimTranscript('');

      if (
        continuousRef.current &&
        shouldListenRef.current &&
        voiceStatusRef.current !== 'thinking' &&
        voiceStatusRef.current !== 'speaking'
      ) {
        restartTimerRef.current = window.setTimeout(() => {
          if (
            continuousRef.current &&
            voiceStatusRef.current !== 'thinking' &&
            voiceStatusRef.current !== 'speaking'
          ) {
            startBrowserRecognition();
          }
        }, 280);
      } else if (!continuousRef.current) {
        onStatusSyncRef.current(false);
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      setMicError('Unable to start speech recognition. Please try again.');
      onStatusSyncRef.current(false);
    }
  }, [languageMode, startCloudAudioRecording]);

  const startListening = useCallback(() => {
    if (voiceStatusRef.current === 'thinking' || voiceStatusRef.current === 'speaking') {
      return;
    }
    if (useCloudRecorder) {
      if (isRecordingAudio) {
        stopMediaRecorder();
      } else {
        void startCloudAudioRecording();
      }
      return;
    }
    startBrowserRecognition();
  }, [
    isRecordingAudio,
    startBrowserRecognition,
    startCloudAudioRecording,
    stopMediaRecorder,
    useCloudRecorder,
  ]);

  // Automatically pause mic during thinking/speaking and re-arm when returning to listening
  useEffect(() => {
    if (voiceStatus === 'thinking' || voiceStatus === 'speaking') {
      if (recognitionRef.current) {
        shouldListenRef.current = false;
        try {
          recognitionRef.current.onend = null;
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
        recognitionRef.current = null;
      }
      return;
    }

    if (voiceStatus === 'listening' && continuousListening && !useCloudRecorder && !recognitionRef.current) {
      const timer = window.setTimeout(() => {
        if (
          continuousRef.current &&
          voiceStatusRef.current === 'listening' &&
          !recognitionRef.current
        ) {
          startBrowserRecognition();
        }
      }, 320);
      return () => window.clearTimeout(timer);
    }
  }, [continuousListening, startBrowserRecognition, useCloudRecorder, voiceStatus]);

  useEffect(() => {
    return () => {
      stopListening();
    };
  }, [stopListening]);

  return {
    interimTranscript,
    isRecordingAudio,
    isTranscribing,
    micError,
    hasBrowserSpeech,
    useCloudRecorder,
    startListening,
    stopListening,
    clearMicError: () => setMicError(null),
  };
}
