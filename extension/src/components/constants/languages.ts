export const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'ja', name: '日本語' },
  { code: 'ko', name: '한국어' },
  { code: 'es', name: 'Español' },
  { code: 'fr', name: 'Français' },
  { code: 'de', name: 'Deutsch' },
] as const;

export const NATIVE_LANGUAGES = [
  { code: 'zh-TW', name: '繁體中文' },
  { code: 'zh-CN', name: '简体中文' },
  { code: 'en', name: 'English' },
] as const;

export const TOPIC_SUGGESTIONS = [
  'business',
  'travel',
  'daily',
  'academic',
  'technology',
  'entertainment',
] as const;

export type LanguageCode = typeof LANGUAGES[number]['code'];
export type NativeLanguageCode = typeof NATIVE_LANGUAGES[number]['code'];
