import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SettingsForm } from '@/components/settings';
import { useUserSettings } from '@/components/hooks';
import { ArrowLeft } from 'lucide-react';

interface SettingsPageProps {
  onBack: () => void;
}

export function SettingsPage({ onBack }: SettingsPageProps) {
  const { settings, loading, updateSettings } = useUserSettings();

  if (loading || !settings) {
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
        <CardContent>
          <SettingsForm
            settings={settings}
            onUpdate={updateSettings}
            showDefaultAction={true}
            showDebugMode={true}
          />
          <p className="text-xs text-center text-muted-foreground pt-4">
            v1.0.4 - 元件重構
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
