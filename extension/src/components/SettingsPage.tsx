import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { CEFR_LABELS, LEARNING_GOALS, type CEFRLevel, type LearningGoal, type UserSettings } from '@gleano/shared';
import { ArrowLeft, Target, Bug, MousePointer } from 'lucide-react';

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

interface SettingsPageProps {
  onBack: () => void;
}

export function SettingsPage({ onBack }: SettingsPageProps) {
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
          learningGoal: 'general',
          customDifficulty: 5,
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <Card className="border-0 shadow-none">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <CardTitle className="text-lg">設定</CardTitle>
              <CardDescription>調整你的學習偏好</CardDescription>
            </div>
          </div>
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

          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-1">
              <Target className="h-4 w-4" />
              學習目標
            </label>
            <Select
              value={settings?.learningGoal || 'general'}
              onValueChange={(value) => updateSettings({ learningGoal: value as LearningGoal })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(LEARNING_GOALS).map(([goal, { label, description }]) => (
                  <SelectItem key={goal} value={goal}>
                    <div className="flex flex-col">
                      <span>{label}</span>
                      <span className="text-xs text-muted-foreground">{description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">自訂難度</label>
              <span className="text-sm text-muted-foreground">
                {settings?.customDifficulty || 5}/10
              </span>
            </div>
            <Slider
              value={[settings?.customDifficulty || 5]}
              onValueChange={(value) => updateSettings({ customDifficulty: value[0] })}
              min={1}
              max={10}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>簡單</span>
              <span>困難</span>
            </div>
          </div>

          {/* Default Action Setting */}
          <div className="space-y-2 pt-2 border-t">
            <label className="text-sm font-medium flex items-center gap-1">
              <MousePointer className="h-4 w-4" />
              點擊圖示時
            </label>
            <Select
              value={settings?.defaultAction || 'sidepanel'}
              onValueChange={(value) => updateSettings({ defaultAction: value as 'sidepanel' | 'popup' })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sidepanel">開啟學習面板</SelectItem>
                <SelectItem value="popup">開啟設定</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              右鍵點擊圖示可快速切換
            </p>
          </div>

          {/* Debug Mode Toggle */}
          <div className="flex items-center justify-between py-2 border-t border-dashed">
            <div className="flex items-center gap-2">
              <Bug className="h-4 w-4 text-orange-500" />
              <label className="text-sm font-medium text-orange-700">Debug Mode</label>
            </div>
            <Switch
              checked={settings?.debugMode || false}
              onCheckedChange={(checked) => updateSettings({ debugMode: checked })}
            />
          </div>

          <p className="text-xs text-center text-muted-foreground pt-2">
            v1.0.2 - 支援學習目標設定
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
