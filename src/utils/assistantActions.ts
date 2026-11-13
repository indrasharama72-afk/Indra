import type { GroundingSource } from '../types/jarvis';

export type SupportedSite = 'youtube' | 'google';

/**
 * Builds a validated HTTPS URL for opening YouTube or Google (optionally with a search query).
 */
export function buildExternalSiteUrl(site: SupportedSite, query?: string): string {
  const cleanQuery = typeof query === 'string' ? query.trim() : '';
  if (site === 'youtube') {
    return cleanQuery
      ? `https://www.youtube.com/results?search_query=${encodeURIComponent(cleanQuery)}`
      : 'https://www.youtube.com';
  }
  return cleanQuery
    ? `https://www.google.com/search?q=${encodeURIComponent(cleanQuery)}`
    : 'https://www.google.com';
}

/**
 * Formats an exact, timezone-aware date and time payload for JARVIS.
 */
export function getFormattedDateTime(
  now: Date = new Date(),
  timeZone?: string,
): {
  formattedTime: string;
  formattedDate: string;
  dayOfWeek: string;
  timeZone: string;
  iso: string;
} {
  let resolvedTz = timeZone?.trim() || 'UTC';
  try {
    // Validate timezone
    new Intl.DateTimeFormat('en-US', { timeZone: resolvedTz }).format(now);
  } catch {
    resolvedTz = 'UTC';
  }

  const formattedTime = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
    timeZone: resolvedTz,
  }).format(now);

  const formattedDate = new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: resolvedTz,
  }).format(now);

  const dayOfWeek = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    timeZone: resolvedTz,
  }).format(now);

  return {
    formattedTime,
    formattedDate,
    dayOfWeek,
    timeZone: resolvedTz,
    iso: now.toISOString(),
  };
}

/**
 * Resolves a reminder due timestamp from either an ISO string or relative minutes.
 */
export function resolveReminderDueIso(
  dueAtIso?: string | null,
  dueInMinutes?: number | null,
  now: Date = new Date(),
): string | null {
  if (typeof dueInMinutes === 'number' && Number.isFinite(dueInMinutes) && dueInMinutes > 0) {
    return new Date(now.getTime() + dueInMinutes * 60_000).toISOString();
  }
  if (typeof dueAtIso === 'string' && dueAtIso.trim()) {
    const parsed = new Date(dueAtIso.trim());
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }
  return null;
}

/**
 * Extracts deduplicated web source links from Gemini groundingChunks.
 */
export function extractGroundingSources(
  chunks: Array<{ web?: { uri?: string; title?: string } }> | undefined | null,
): GroundingSource[] {
  if (!Array.isArray(chunks) || chunks.length === 0) return [];
  const seen = new Set<string>();
  const sources: GroundingSource[] = [];

  for (const chunk of chunks) {
    const uri = chunk?.web?.uri?.trim();
    if (!uri || seen.has(uri)) continue;
    seen.add(uri);
    const title = chunk?.web?.title?.trim() || uri;
    sources.push({ title, uri });
  }

  return sources.slice(0, 6);
}

/**
 * Detects whether a user message is requesting live internet search or current web facts.
 */
export function isWebSearchIntent(message: string): boolean {
  const lower = message.toLowerCase();
  return /\b(search(\s+the)?\s+(internet|web|online)|google\s+search|look\s+up|latest\s+news|today'?s\s+news|current\s+weather|weather\s+in|who\s+is\s+the\s+(current|ceo|president|prime\s+minister)|stock\s+price|score\s+of|khabar|mausam|internet\s+par|search\s+karo|dhundo)\b/i.test(
    lower,
  );
}
