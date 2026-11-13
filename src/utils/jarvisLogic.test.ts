import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSystemPrompt, hashPin, mergeMemory, validatePin } from './jarvisLogic';
import type { MemoryItem } from '../types/jarvis';

test('buildSystemPrompt includes honesty rules, owner name, and saved memories', () => {
  const memories: MemoryItem[] = [
    {
      id: 'm1',
      content: 'Prefers concise Hinglish explanations',
      category: 'preference',
      createdAt: '2026-11-13T00:00:00.000Z',
    },
  ];
  const prompt = buildSystemPrompt({
    ownerName: 'Sintu',
    memories,
    languageMode: 'hinglish',
    expressivePauses: true,
  });
  assert.ok(prompt.includes('Sintu'));
  assert.ok(prompt.includes('Never pretend to think'));
  assert.ok(prompt.includes('Prefers concise Hinglish explanations'));
  assert.ok(prompt.includes('Hinglish'));
});

test('validatePin accepts 4-6 digit numeric PINs and rejects invalid values', () => {
  assert.equal(validatePin('1234').valid, true);
  assert.equal(validatePin('987654').valid, true);
  assert.equal(validatePin('123').valid, false);
  assert.equal(validatePin('12ab').valid, false);
  assert.equal(validatePin('1234567').valid, false);
});

test('hashPin is deterministic and distinct for different PINs', () => {
  assert.equal(hashPin('1234'), hashPin('1234'));
  assert.notEqual(hashPin('1234'), hashPin('5678'));
});

test('mergeMemory deduplicates case-insensitively and prepends new items', () => {
  const initial: MemoryItem[] = [
    { id: '1', content: 'Drink water at 9am', category: 'personal', createdAt: '2026-01-01' },
  ];
  const dup = mergeMemory(initial, '  drink water at 9am  ', 'personal');
  assert.equal(dup.added, null);
  assert.equal(dup.items.length, 1);

  const added = mergeMemory(initial, 'Likes morning coffee', 'preference', '2026-01-02', 'm2');
  assert.ok(added.added);
  assert.equal(added.items.length, 2);
  assert.equal(added.items[0].id, 'm2');
});
