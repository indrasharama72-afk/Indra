import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildExternalSiteUrl,
  extractGroundingSources,
  getFormattedDateTime,
  isWebSearchIntent,
  resolveReminderDueIso,
} from './assistantActions';

test('buildExternalSiteUrl builds safe YouTube and Google URLs with optional queries', () => {
  assert.equal(buildExternalSiteUrl('youtube'), 'https://www.youtube.com');
  assert.equal(
    buildExternalSiteUrl('youtube', 'lo-fi beats'),
    'https://www.youtube.com/results?search_query=lo-fi%20beats',
  );
  assert.equal(buildExternalSiteUrl('google'), 'https://www.google.com');
  assert.equal(
    buildExternalSiteUrl('google', 'weather Delhi'),
    'https://www.google.com/search?q=weather%20Delhi',
  );
});

test('getFormattedDateTime formats exact date, time, dayOfWeek, and falls back to UTC on invalid timezone', () => {
  const sample = new Date('2026-11-13T10:30:00.000Z');
  const ist = getFormattedDateTime(sample, 'Asia/Kolkata');
  assert.equal(ist.timeZone, 'Asia/Kolkata');
  assert.equal(ist.dayOfWeek, 'Friday');
  assert.ok(ist.formattedDate.includes('November 13, 2026'));
  assert.ok(ist.formattedTime.includes('4:00:00 PM'));

  const invalidTz = getFormattedDateTime(sample, 'Invalid/Zone');
  assert.equal(invalidTz.timeZone, 'UTC');
});

test('resolveReminderDueIso resolves relative minutes and valid ISO dates', () => {
  const now = new Date('2026-11-13T10:00:00.000Z');
  assert.equal(
    resolveReminderDueIso(null, 15, now),
    '2026-11-13T10:15:00.000Z',
  );
  assert.equal(
    resolveReminderDueIso('2026-11-13T12:00:00.000Z', null, now),
    '2026-11-13T12:00:00.000Z',
  );
  assert.equal(resolveReminderDueIso('not-a-date', null, now), null);
});

test('extractGroundingSources deduplicates web URIs and limits results', () => {
  const sources = extractGroundingSources([
    { web: { uri: 'https://example.com/a', title: 'Article A' } },
    { web: { uri: 'https://example.com/a', title: 'Duplicate A' } },
    { web: { uri: 'https://example.com/b', title: 'Article B' } },
    {},
  ]);
  assert.equal(sources.length, 2);
  assert.equal(sources[0].title, 'Article A');
  assert.equal(sources[1].uri, 'https://example.com/b');
});

test('isWebSearchIntent distinguishes internet search queries from local/tool queries', () => {
  assert.equal(isWebSearchIntent('Search the internet for today news'), true);
  assert.equal(isWebSearchIntent('Aaj ka mausam kaisa hai, internet par search karo'), true);
  assert.equal(isWebSearchIntent('What is the current time and date?'), false);
  assert.equal(isWebSearchIntent('Open YouTube'), false);
});
