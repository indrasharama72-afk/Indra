import type { LanguageMode } from '../types/jarvis';

const HINGLISH_MARKERS = new Set([
  'kya', 'kaise', 'kaisi', 'kaisa', 'hai', 'hain', 'hoon', 'hum', 'aap', 'tum',
  'mera', 'meri', 'mere', 'tera', 'batao', 'bata', 'samjhao', 'karo', 'karna',
  'nahi', 'nahin', 'haan', 'accha', 'acha', 'theek', 'thik', 'namaste', 'shukriya',
  'dhanyawad', 'yaad', 'rakhna', 'rakho', 'chahiye', 'kal', 'aaj', 'abhi', 'bahut',
  'kyunki', 'lekin', 'aur', 'par', 'se', 'ko', 'ke', 'ka', 'ki', 'mein', 'bhi',
  'mujhe', 'tumhe', 'unhe', 'yahan', 'wahan', 'kab', 'kahan', 'kyun', 'kaun',
  'bhai', 'dost', 'please', 'bolo', 'sunao', 'likho', 'banao', 'samajh', 'pata',
]);

/**
 * Detects whether a given text is Hindi (Devanagari), Hinglish (Romanized Hindi mix),
 * or English.
 */
export function detectLanguageHint(
  text: string,
  preferredMode: LanguageMode = 'auto',
): LanguageMode {
  if (preferredMode !== 'auto') {
    return preferredMode;
  }

  const trimmed = text.trim();
  if (!trimmed) {
    return 'en';
  }

  // Devanagari Unicode block: \u0900-\u097F
  if (/[\u0900-\u097F]/.test(trimmed)) {
    return 'hi';
  }

  const tokens = trimmed
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

  if (tokens.length === 0) {
    return 'en';
  }

  const STRONG_HINGLISH = new Set([
    'namaste', 'namaskar', 'hinglish', 'shukriya', 'dhanyawad', 'yaar',
    'batao', 'samjhao', 'yaad', 'rakhna', 'kaise', 'kya',
  ]);

  let hinglishHits = 0;
  let strongHits = 0;
  for (const token of tokens) {
    if (HINGLISH_MARKERS.has(token)) {
      hinglishHits += 1;
    }
    if (STRONG_HINGLISH.has(token)) {
      strongHits += 1;
    }
  }

  // Strong cultural/Hinglish marker, 2+ Hinglish tokens, or >= 1 token in a short utterance
  if (strongHits >= 1 || hinglishHits >= 2 || (hinglishHits === 1 && tokens.length <= 4)) {
    return 'hinglish';
  }

  return 'en';
}

/**
 * Strips markdown symbols and adds natural phrasing pauses so TTS sounds warm,
 * expressive, and conversational without reading out asterisks or backticks.
 */
export function formatExpressiveSpeech(
  rawText: string,
  expressivePauses = true,
): string {
  let clean = rawText
    // Remove fenced code blocks' triple backticks while keeping brief readable content
    .replace(/```[\w-]*\n?/g, '')
    // Remove inline code backticks
    .replace(/`([^`]+)`/g, '$1')
    // Remove markdown bold/italic markers
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    // Remove markdown headings
    .replace(/^#{1,6}\s+/gm, '')
    // Convert bullet points into natural clause pauses
    .replace(/^\s*[-*•]\s+/gm, '')
    // Normalize numbered list markers ("1. Foo" -> "1, Foo")
    .replace(/^(\s*\d+)\.\s+/gm, '$1, ')
    // Remove markdown links [label](url) -> label
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Collapse multiple newlines into sentence breaks
    .replace(/\n{2,}/g, '. ')
    .replace(/\n/g, ', ')
    .replace(/\s{2,}/g, ' ')
    .trim();

  // Fix awkward double punctuation created by line-break normalization
  clean = clean
    .replace(/\.\s*\./g, '.')
    .replace(/,\s*\./g, '.')
    .replace(/\?\s*\./g, '?')
    .replace(/!\s*\./g, '!')
    .replace(/:\s*,/g, ':');

  if (!expressivePauses || !clean) {
    return clean;
  }

  // Insert subtle conversational pauses after transitional phrases when not already punctuated
  clean = clean
    .replace(/\b(Well|Sure|Of course|Actually|Honestly|By the way|Achha|Haan|Bilkul|Theek hai|Sunिए|Dekhiye)\s+(?=[A-Za-z\u0900-\u097F])/gi, '$1... ')
    .replace(/\s*—\s*/g, ', ')
    .replace(/;\s*/g, '... ');

  return clean.trim();
}

/**
 * Splits spoken text into natural breath-sized sentence chunks for Web Speech fallback
 * and smooth inter-sentence pauses.
 */
export function splitIntoSpeechChunks(text: string): string[] {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (!normalized) return [];

  // Split on English sentence punctuation (. ! ?) and Hindi danda (।)
  const rawParts = normalized.split(/(?<=[.!?।])\s+/);
  const chunks: string[] = [];

  for (const part of rawParts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    if (trimmed.length <= 180) {
      chunks.push(trimmed);
    } else {
      // Softly break long clauses on commas/ellipses
      const subParts = trimmed.split(/(?<=[,;])\s+/);
      let buffer = '';
      for (const sub of subParts) {
        if ((buffer + ' ' + sub).trim().length > 160 && buffer) {
          chunks.push(buffer.trim());
          buffer = sub;
        } else {
          buffer = (buffer + ' ' + sub).trim();
        }
      }
      if (buffer.trim()) {
        chunks.push(buffer.trim());
      }
    }
  }

  return chunks;
}

/**
 * Returns the optimal BCP-47 speech recognition language tag for the chosen mode.
 */
export function getRecognitionLocale(mode: LanguageMode): string {
  switch (mode) {
    case 'hi':
      return 'hi-IN';
    case 'hinglish':
    case 'auto':
      return 'en-IN';
    case 'en':
    default:
      return 'en-IN';
  }
}

/**
 * Builds TTS speech style direction based on language and expressive mode.
 */
export function buildTtsStylePrompt(
  language: LanguageMode,
  expressivePauses: boolean,
): string {
  const base =
    'Speak in a natural, warm, clear, friendly female AI assistant voice. Sound genuine, attentive, and human-like without sounding robotic.';
  const pacing = expressivePauses
    ? ' Use natural breathing pauses at commas, transitions, and sentence boundaries with gentle expressive inflection.'
    : ' Speak clearly at a steady, crisp conversational pace.';

  if (language === 'hi') {
    return `${base}${pacing} Pronounce Hindi words naturally and clearly with a warm conversational Indian accent.`;
  }
  if (language === 'hinglish') {
    return `${base}${pacing} Pronounce mixed Hindi and English (Hinglish) phrases effortlessly with a warm, natural Indian English and Hindi conversational cadence.`;
  }
  return `${base}${pacing}`;
}
