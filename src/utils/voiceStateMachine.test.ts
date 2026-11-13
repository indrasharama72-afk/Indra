import test from 'node:test';
import assert from 'node:assert/strict';
import { voiceStateReducer, type VoiceMachineState } from './voiceStateMachine';

const baseState: VoiceMachineState = {
  status: 'idle',
  continuousListening: false,
  autoSpeak: true,
  lastSpokenText: '',
};

test('voiceStateReducer transitions idle -> listening -> thinking -> speaking -> idle', () => {
  let state = voiceStateReducer(baseState, { type: 'START_LISTENING' });
  assert.equal(state.status, 'listening');

  state = voiceStateReducer(state, { type: 'START_THINKING' });
  assert.equal(state.status, 'thinking');

  // Cannot listen while thinking
  state = voiceStateReducer(state, { type: 'START_LISTENING' });
  assert.equal(state.status, 'thinking');

  state = voiceStateReducer(state, { type: 'START_SPEAKING', text: 'Namaste!' });
  assert.equal(state.status, 'speaking');
  assert.equal(state.lastSpokenText, 'Namaste!');

  state = voiceStateReducer(state, { type: 'FINISH_SPEAKING' });
  assert.equal(state.status, 'idle');
});

test('continuousListening resumes listening after FINISH_SPEAKING or FAIL_THINKING', () => {
  let state: VoiceMachineState = {
    ...baseState,
    continuousListening: true,
    status: 'thinking',
  };

  state = voiceStateReducer(state, { type: 'START_SPEAKING', text: 'Here is your answer.' });
  assert.equal(state.status, 'speaking');

  state = voiceStateReducer(state, { type: 'FINISH_SPEAKING' });
  assert.equal(state.status, 'listening');

  state = voiceStateReducer(state, { type: 'START_THINKING' });
  state = voiceStateReducer(state, { type: 'FAIL_THINKING' });
  assert.equal(state.status, 'listening');
});

test('STOP_SPEAKING halts speech cleanly without looping back into listening', () => {
  const speakingState: VoiceMachineState = {
    ...baseState,
    continuousListening: true,
    status: 'speaking',
    lastSpokenText: 'Long response...',
  };
  const stopped = voiceStateReducer(speakingState, { type: 'STOP_SPEAKING' });
  assert.equal(stopped.status, 'idle');
  assert.equal(stopped.lastSpokenText, 'Long response...');
});

test('TOGGLE_CONTINUOUS starts listening from idle and stops when turned off', () => {
  const on = voiceStateReducer(baseState, { type: 'TOGGLE_CONTINUOUS', enabled: true });
  assert.equal(on.continuousListening, true);
  assert.equal(on.status, 'listening');

  const off = voiceStateReducer(on, { type: 'TOGGLE_CONTINUOUS', enabled: false });
  assert.equal(off.continuousListening, false);
  assert.equal(off.status, 'idle');
});
