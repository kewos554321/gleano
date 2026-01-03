import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CEFR_LABELS, type CEFRLevel, type UserSettings } from '@gleano/shared';
import { BookOpen, Settings } from 'lucide-react';

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'ja', name: '日本語' },
  { code: 'ko', name: '한국어' },
  { code: 'es', name: 'Español' },
  { code: 'fr', name: 'Français' },
  { code: 'de', name: 'Deutsch' },
];

const NATIVE_LANGUAGES = [
  { code: 'zh-TW', name: '繁體中文' },
  { code: 'zh-CN', name: '简体中文' },
  { code: 'en', name: 'English' },
];

function App() {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    chrome.storage.local.get(['userSettings'], (result) => {
      if (result.userSettings) {
        setSettings(result.userSettings);
      } else {
        const defaultSettings: UserSettings = {
          id: crypto.randomUUID(),
          nativeLanguage: 'zh-TW',
          targetLanguage: 'en',
          level: 3,
        };
        chrome.storage.local.set({ userSettings: defaultSettings });
        setSettings(defaultSettings);
      }
      setLoading(false);
    });
  }, []);

  const updateSettings = (updates: Partial<UserSettings>) => {
    if (!settings) return;
    const newSettings = { ...settings, ...updates };
    chrome.storage.local.set({ userSettings: newSettings });
    setSettings(newSettings);
  };

  const openSidePanel = () => {
    chrome.runtime.sendMessage({ type: 'OPEN_SIDEPANEL' });
  };

  if (loading) {
    return (
      <div className="w-80 p-4 flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="w-80">
      <Card className="border-0 shadow-none">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <BookOpen className="h-5 w-5 text-primary" />
            Gleano
          </CardTitle>
          <CardDescription>
            從 YouTube / Netflix 學習語言
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">母語</label>
            <Select
              value={settings?.nativeLanguage}
              onValueChange={(value) => updateSettings({ nativeLanguage: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {NATIVE_LANGUAGES.map((lang) => (
                  <SelectItem key={lang.code} value={lang.code}>
                    {lang.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">學習語言</label>
            <Select
              value={settings?.targetLanguage}
              onValueChange={(value) => updateSettings({ targetLanguage: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((lang) => (
                  <SelectItem key={lang.code} value={lang.code}>
                    {lang.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">程度</label>
            <Select
              value={settings?.level.toString()}
              onValueChange={(value) => updateSettings({ level: parseInt(value) as CEFRLevel })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(CEFR_LABELS).map(([level, { label, cefr }]) => (
                  <SelectItem key={level} value={level}>
                    {cefr} - {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button className="w-full" onClick={openSidePanel}>
            <Settings className="mr-2 h-4 w-4" />
            開啟學習面板
          </Button>

          <p className="text-xs text-center text-muted-foreground pt-2">
            v1.0.1 - API 已連線
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default App;
