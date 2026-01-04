import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SettingsForm } from '@/components/settings';
import { useUserSettings } from '@/components/hooks';
import { BookOpen, Settings } from 'lucide-react';

function App() {
  const { settings, loading, updateSettings } = useUserSettings();

  const openSidePanel = () => {
    chrome.runtime.sendMessage({ type: 'OPEN_SIDEPANEL' });
  };

  if (loading || !settings) {
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
          <SettingsForm
            settings={settings}
            onUpdate={updateSettings}
            showDefaultAction={true}
            showDebugMode={true}
          />

          <Button className="w-full" onClick={openSidePanel}>
            <Settings className="mr-2 h-4 w-4" />
            開啟學習面板
          </Button>

          <p className="text-xs text-center text-muted-foreground pt-2">
            v1.0.4 - 元件重構
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default App;
