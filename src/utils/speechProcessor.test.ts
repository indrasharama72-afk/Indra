import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildTtsStylePrompt,
  detectLanguageHint,
  formatExpressiveSpeech,
  getRecognitionLocale,
  splitIntoSpeechChunks,
} from './speechProcessor';

test('detectLanguageHint identifies Devanagari Hindi, Hinglish, and English', () => {
  assert.equal(detectLanguageHint('नमस्ते जार्विस, मौसम कैसा है?'), 'hi');
  assert.equal(detectLanguageHint('Jarvis, aaj ka plan kya hai?'), 'hinglish');
  assert.equal(detectLanguageHint('Mera naam Sintu hai'), 'hinglish');
  assert.equal(detectLanguageHint('What is the capital of France?'), 'en');
  assert.equal(detectLanguageHint('Hello', 'hi'), 'hi');
});

test('formatExpressiveSpeech strips markdown and inserts natural pauses', () => {
  const raw = '**Hello!** Here is `code`:\n- First item\n- Second item\n\nSure I can help.';
  const formatted = formatExpressiveSpeech(raw, true);
  assert.equal(formatted.includes('**'), false);
  assert.equal(formatted.includes('`'), false);
  assert.ok(formatted.includes('Sure... I can help.'));
});

test('splitIntoSpeechChunks splits English and Hindi sentences cleanly', () => {
  const chunks = splitIntoSpeechChunks('Hello Sintu! How are you? आज का दिन अच्छा है। बहुत बढ़िया!');
  assert.equal(chunks.length, 4);
  assert.equal(chunks[0], 'Hello Sintu!');
  assert.equal(chunks[2], 'आज का दिन अच्छा है।');
});

test('getRecognitionLocale returns hi-IN for Hindi and en-IN for Hinglish/Auto', () => {
  assert.equal(getRecognitionLocale('hi'), 'hi-IN');
  assert.equal(getRecognitionLocale('hinglish'), 'en-IN');
  assert.equal(getRecognitionLocale('auto'), 'en-IN');
});

test('buildTtsStylePrompt requests friendly female voice and natural pauses', () => {
  const prompt = buildTtsStylePrompt('hinglish', true);
  assert.ok(prompt.toLowerCase().includes('female'));
  assert.ok(prompt.toLowerCase().includes('pauses'));
  assert.ok(prompt.includes('Hinglish'));
});
