import { useState, useEffect, useCallback } from 'react';
import type { UserSettings } from '@gleano/shared';

const DEFAULT_SETTINGS: UserSettings = {
  id: '',
  nativeLanguage: 'zh-TW',
  targetLanguage: 'en',
  level: 3,
  learningGoal: 'general',
  customDifficulty: 5,
};

export function useUserSettings() {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    chrome.storage.local.get(['userSettings'], (result) => {
      if (result.userSettings) {
        setSettings(result.userSettings);
      } else {
        const defaultSettings: UserSettings = {
          ...DEFAULT_SETTINGS,
          id: crypto.randomUUID(),
        };
        chrome.storage.local.set({ userSettings: defaultSettings });
        setSettings(defaultSettings);
      }
      setLoading(false);
    });
  }, []);

  const updateSettings = useCallback((updates: Partial<UserSettings>) => {
    if (!settings) return;
    const newSettings = { ...settings, ...updates };
    chrome.storage.local.set({ userSettings: newSettings });
    setSettings(newSettings);
  }, [settings]);

  return { settings, loading, updateSettings };
}
