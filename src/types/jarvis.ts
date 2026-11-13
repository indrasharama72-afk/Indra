export type VoiceStatus = 'idle' | 'listening' | 'thinking' | 'speaking';

export type LanguageMode = 'auto' | 'en' | 'hi' | 'hinglish';

export type VoicePersona = 'Kore' | 'Zephyr';

export type SpeechEngineMode = 'auto' | 'gemini-transcribe';

export type MemoryCategory = 'preference' | 'personal' | 'work' | 'instruction';

export type ActiveTab = 'chat' | 'notes' | 'memory' | 'security' | 'settings';

export type ThemeMode = 'dark' | 'light';

export interface MemoryItem {
  id: string;
  content: string;
  category: MemoryCategory;
  createdAt: string;
}

export interface NoteItem {
  id: string;
  title: string;
  content: string;
  createdAt: string;
}

export interface ReminderItem {
  id: string;
  title: string;
  dueAtIso: string | null;
  completed: boolean;
  notified: boolean;
  createdAt: string;
}

export interface GroundingSource {
  title: string;
  uri: string;
}

export type SensitiveActionType =
  | 'open_website'
  | 'clear_notes'
  | 'clear_reminders'
  | 'clear_memories'
  | 'clear_chat'
  | 'disable_pin';

export interface PermissionRequest {
  id: string;
  actionType: SensitiveActionType;
  title: string;
  description: string;
  url?: string;
  site?: 'youtube' | 'google';
  status: 'pending' | 'approved' | 'denied';
}

export interface AssistantClientAction {
  type:
    | 'permission_request'
    | 'create_note'
    | 'create_reminder'
    | 'save_preference';
  permission?: PermissionRequest;
  note?: { title: string; content: string };
  reminder?: { title: string; dueAtIso: string | null };
  memory?: { content: string; category: MemoryCategory };
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  language?: LanguageMode;
  memorySavedNote?: string;
  actionNotes?: string[];
  sources?: GroundingSource[];
  permissionRequest?: PermissionRequest;
  isError?: boolean;
}

export interface JarvisSettings {
  voicePersona: VoicePersona;
  autoSpeak: boolean;
  expressivePauses: boolean;
  speechRate: number; // 0.85 to 1.2
  languageMode: LanguageMode;
  continuousListeningDefault: boolean;
  speechEngine: SpeechEngineMode;
  confirmBeforeExternalOpen: boolean;
  theme: ThemeMode;
}

export interface SecurityState {
  ownerName: string;
  pinHash: string | null;
  isLocked: boolean;
  protectMemoryAndSettings: boolean;
  failedAttempts: number;
}
