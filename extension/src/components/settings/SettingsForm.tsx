import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { CEFR_LABELS, LEARNING_GOALS, type CEFRLevel, type LearningGoal, type UserSettings } from '@gleano/shared';
import { LANGUAGES, NATIVE_LANGUAGES } from '@/components/constants';
import { Target, Bug, MousePointer } from 'lucide-react';

interface SettingsFormProps {
  settings: UserSettings;
  onUpdate: (updates: Partial<UserSettings>) => void;
  showDefaultAction?: boolean;
  showDebugMode?: boolean;
}

export function SettingsForm({
  settings,
  onUpdate,
  showDefaultAction = true,
  showDebugMode = true,
}: SettingsFormProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">母語</label>
        <Select
          value={settings.nativeLanguage}
          onValueChange={(value) => onUpdate({ nativeLanguage: value })}
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
          value={settings.targetLanguage}
          onValueChange={(value) => onUpdate({ targetLanguage: value })}
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
          value={settings.level.toString()}
          onValueChange={(value) => onUpdate({ level: parseInt(value) as CEFRLevel })}
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
          value={settings.learningGoal || 'general'}
          onValueChange={(value) => onUpdate({ learningGoal: value as LearningGoal })}
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
            {settings.customDifficulty || 5}/10
          </span>
        </div>
        <Slider
          value={[settings.customDifficulty || 5]}
          onValueChange={(value) => onUpdate({ customDifficulty: value[0] })}
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

      {showDefaultAction && (
        <div className="space-y-2 pt-2 border-t">
          <label className="text-sm font-medium flex items-center gap-1">
            <MousePointer className="h-4 w-4" />
            點擊圖示時
          </label>
          <Select
            value={settings.defaultAction || 'sidepanel'}
            onValueChange={(value) => onUpdate({ defaultAction: value as 'sidepanel' | 'popup' })}
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
      )}

      {showDebugMode && (
        <div className="flex items-center justify-between py-2 border-t border-dashed">
          <div className="flex items-center gap-2">
            <Bug className="h-4 w-4 text-orange-500" />
            <label className="text-sm font-medium text-orange-700">Debug Mode</label>
          </div>
          <Switch
            checked={settings.debugMode || false}
            onCheckedChange={(checked) => onUpdate({ debugMode: checked })}
          />
        </div>
      )}
    </div>
  );
}
