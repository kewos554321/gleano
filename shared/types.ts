// User settings
export interface UserSettings {
  id: string;
  nativeLanguage: string; // e.g., "zh-TW"
  targetLanguage: string; // e.g., "en"
  level: CEFRLevel;
  learningGoal?: LearningGoal;
  customDifficulty?: number; // 1-10
}

export type CEFRLevel = 1 | 2 | 3 | 4 | 5 | 6;

export type LearningGoal = 'general' | 'ielts' | 'toefl' | 'toeic' | 'business' | 'academic';

export const CEFR_LABELS: Record<CEFRLevel, { label: string; cefr: string }> = {
  1: { label: '初學者', cefr: 'A1' },
  2: { label: '基礎', cefr: 'A2' },
  3: { label: '中級', cefr: 'B1' },
  4: { label: '中高級', cefr: 'B2' },
  5: { label: '進階', cefr: 'C1' },
  6: { label: '精通', cefr: 'C2' },
};

export const LEARNING_GOALS: Record<LearningGoal, { label: string; description: string }> = {
  general: { label: '日常會話', description: '一般英語學習' },
  ielts: { label: 'IELTS', description: '雅思考試準備' },
  toefl: { label: 'TOEFL', description: '托福考試準備' },
  toeic: { label: 'TOEIC', description: '多益考試準備' },
  business: { label: '商務英語', description: '職場商業用語' },
  academic: { label: '學術英語', description: '學術論文寫作' },
};

// Part of speech types for filtering
export type PartOfSpeech = 'noun' | 'verb' | 'adjective' | 'adverb' | 'preposition' | 'conjunction' | 'pronoun' | 'interjection';

export const POS_LABELS: Record<PartOfSpeech, string> = {
  noun: '名詞',
  verb: '動詞',
  adjective: '形容詞',
  adverb: '副詞',
  preposition: '介詞',
  conjunction: '連接詞',
  pronoun: '代詞',
  interjection: '感嘆詞',
};

// Analysis filter options
export interface AnalysisFilter {
  posFilter?: PartOfSpeech[];
  topicFilter?: string;
  customPrompt?: string;
}

// Learning content types
export interface Word {
  word: string;
  phonetic: string;
  pos: string; // part of speech
  meaning: string;
  example: string;
  topic?: string; // e.g., "kitchen", "travel", "business"
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
  | 'OPEN_SIDEPANEL'
  | 'SUBTITLE_STATUS';

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

export interface SubtitleStatusPayload {
  status: 'searching' | 'not_found' | 'found' | 'retrying';
  source: 'youtube' | 'netflix';
  message: string;
  retryCount?: number;
}
