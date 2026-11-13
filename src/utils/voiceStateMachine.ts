import type { VoiceStatus } from '../types/jarvis';

export interface VoiceMachineState {
  status: VoiceStatus;
  continuousListening: boolean;
  autoSpeak: boolean;
  lastSpokenText: string;
}

export type VoiceMachineAction =
  | { type: 'START_LISTENING' }
  | { type: 'STOP_LISTENING' }
  | { type: 'START_THINKING' }
  | { type: 'START_SPEAKING'; text: string }
  | { type: 'FINISH_SPEAKING' }
  | { type: 'STOP_SPEAKING' }
  | { type: 'FAIL_THINKING' }
  | { type: 'TOGGLE_CONTINUOUS'; enabled?: boolean }
  | { type: 'SET_AUTO_SPEAK'; enabled: boolean };

/**
 * Pure state machine governing JARVIS's voice lifecycle:
 * - Never listens while thinking or speaking (prevents self-echo)
 * - Only enters 'thinking' when a real request starts
 * - Automatically resumes 'listening' after speaking ends iff continuousListening is ON
 */
export function voiceStateReducer(
  state: VoiceMachineState,
  action: VoiceMachineAction,
): VoiceMachineState {
  switch (action.type) {
    case 'START_LISTENING':
      if (state.status === 'thinking' || state.status === 'speaking') {
        return state;
      }
      return { ...state, status: 'listening' };

    case 'STOP_LISTENING':
      if (state.status !== 'listening') {
        return state;
      }
      return { ...state, status: 'idle' };

    case 'START_THINKING':
      return { ...state, status: 'thinking' };

    case 'FAIL_THINKING':
      return {
        ...state,
        status: state.continuousListening ? 'listening' : 'idle',
      };

    case 'START_SPEAKING':
      return {
        ...state,
        status: 'speaking',
        lastSpokenText: action.text || state.lastSpokenText,
      };

    case 'FINISH_SPEAKING':
      return {
        ...state,
        status: state.continuousListening ? 'listening' : 'idle',
      };

    case 'STOP_SPEAKING':
      if (state.status !== 'speaking') {
        return state;
      }
      return {
        ...state,
        status: 'idle',
      };

    case 'TOGGLE_CONTINUOUS': {
      const nextContinuous =
        typeof action.enabled === 'boolean'
          ? action.enabled
          : !state.continuousListening;

      let nextStatus = state.status;
      if (nextContinuous && state.status === 'idle') {
        nextStatus = 'listening';
      } else if (!nextContinuous && state.status === 'listening') {
        nextStatus = 'idle';
      }

      return {
        ...state,
        continuousListening: nextContinuous,
        status: nextStatus,
      };
    }

    case 'SET_AUTO_SPEAK':
      return { ...state, autoSpeak: action.enabled };

    default:
      return state;
  }
}
