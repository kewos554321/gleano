// User settings
export interface UserSettings {
  id: string;
  nativeLanguage: string; // e.g., "zh-TW"
  targetLanguage: string; // e.g., "en"
  level: CEFRLevel;
}

export type CEFRLevel = 1 | 2 | 3 | 4 | 5 | 6;

export const CEFR_LABELS: Record<CEFRLevel, { label: string; cefr: string }> = {
  1: { label: '初學者', cefr: 'A1' },
  2: { label: '基礎', cefr: 'A2' },
  3: { label: '中級', cefr: 'B1' },
  4: { label: '中高級', cefr: 'B2' },
  5: { label: '進階', cefr: 'C1' },
  6: { label: '精通', cefr: 'C2' },
};

// Learning content types
export interface Word {
  word: string;
  phonetic: string;
  pos: string; // part of speech
  meaning: string;
  example: string;
}

export interface Phrase {
  phrase: string;
  meaning: string;
  context: string;
}

export interface Sentence {
  sentence: string;
  translation: string;
  note: string;
}

export interface AnalysisResult {
  words: Word[];
  phrases: Phrase[];
  sentences: Sentence[];
}

// Learned item (saved to database)
export interface LearnedItem {
  id: number;
  userId: string;
  type: 'word' | 'phrase' | 'sentence';
  content: string;
  translation: string;
  language: string;
  sourceUrl: string;
  sourceTitle: string;
  createdAt: string;
}

// API request/response types
export interface AnalyzeRequest {
  transcript: string;
  sourceUrl: string;
  sourceTitle: string;
}

export interface AnalyzeResponse {
  success: boolean;
  data?: AnalysisResult;
  error?: string;
}

export interface UserSettingsResponse {
  success: boolean;
  data?: UserSettings;
  error?: string;
}

// Message types for extension communication
export type MessageType =
  | 'SUBTITLE_CAPTURED'
  | 'SPEECH_RECOGNIZED'
  | 'ANALYZE_REQUEST'
  | 'SETTINGS_UPDATED'
  | 'OPEN_SIDEPANEL';

export interface ExtensionMessage {
  type: MessageType;
  payload?: unknown;
}

export interface SubtitleCapturedPayload {
  text: string;
  source: 'youtube' | 'netflix' | 'speech';
  url: string;
  title: string;
  timestamp: number;
}
