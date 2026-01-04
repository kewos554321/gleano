import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FilterPanel } from '@/components/FilterPanel';
import { DebugPanel, type DebugLog } from '@/components/DebugPanel';
import { SettingsPage } from '@/components/SettingsPage';
import type { AnalysisResult, Word, Phrase, Sentence, SubtitleCapturedPayload, SubtitleStatusPayload, AnalysisFilter } from '@gleano/shared';
import { BookOpen, MessageSquare, Quote, Heart, RefreshCw, Settings, AlertCircle, CheckCircle, Search, Loader2, Youtube, Tv } from 'lucide-react';

type PageView = 'main' | 'settings';
type Platform = 'youtube' | 'netflix';

interface PlatformData {
  result: AnalysisResult | null;
  loading: boolean;
  loadingStep: LoadingStep;
  currentSource: string;
  subtitleStatus: SubtitleStatusPayload | null;
}

const emptyPlatformData: PlatformData = {
  result: null,
  loading: false,
  loadingStep: 'idle',
  currentSource: '',
  subtitleStatus: null,
};

function WordCard({ word }: { word: Word }) {
  const [saved, setSaved] = useState(false);

  return (
    <Card className="mb-3">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg">{word.word}</CardTitle>
              {word.topic && (
                <Badge variant="secondary" className="text-xs">
                  {word.topic}
                </Badge>
              )}
            </div>
            <CardDescription className="text-xs">
              {word.phonetic} · {word.pos}
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSaved(!saved)}
            className={saved ? 'text-red-500' : 'text-muted-foreground'}
          >
            <Heart className="h-4 w-4" fill={saved ? 'currentColor' : 'none'} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-2">{word.meaning}</p>
        <p className="text-xs text-muted-foreground italic">{word.example}</p>
      </CardContent>
    </Card>
  );
}

function PhraseCard({ phrase }: { phrase: Phrase }) {
  const [saved, setSaved] = useState(false);

  return (
    <Card className="mb-3">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <CardTitle className="text-base">{phrase.phrase}</CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSaved(!saved)}
            className={saved ? 'text-red-500' : 'text-muted-foreground'}
          >
            <Heart className="h-4 w-4" fill={saved ? 'currentColor' : 'none'} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-2">{phrase.meaning}</p>
        <p className="text-xs text-muted-foreground">{phrase.context}</p>
      </CardContent>
    </Card>
  );
}

function SentenceCard({ sentence }: { sentence: Sentence }) {
  const [saved, setSaved] = useState(false);

  return (
    <Card className="mb-3">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <CardTitle className="text-base font-normal">{sentence.sentence}</CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSaved(!saved)}
            className={saved ? 'text-red-500' : 'text-muted-foreground'}
          >
            <Heart className="h-4 w-4" fill={saved ? 'currentColor' : 'none'} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-2">{sentence.translation}</p>
        {sentence.note && (
          <p className="text-xs text-muted-foreground">{sentence.note}</p>
        )}
      </CardContent>
    </Card>
  );
}

type LoadingStep = 'idle' | 'collecting' | 'analyzing' | 'processing';

function App() {
  const [page, setPage] = useState<PageView>('main');
  const [activePlatform, setActivePlatform] = useState<Platform>('youtube');
  const [platformData, setPlatformData] = useState<Record<Platform, PlatformData>>({
    youtube: { ...emptyPlatformData },
    netflix: { ...emptyPlatformData },
  });
  const [filter, setFilter] = useState<AnalysisFilter>({});
  const [debugMode, setDebugMode] = useState(false);
  const [debugLogs, setDebugLogs] = useState<DebugLog[]>([]);
  const currentSourceRef = useRef<Record<Platform, string>>({ youtube: '', netflix: '' });

  // Helper to update platform-specific data
  const updatePlatformData = useCallback((platform: Platform, updates: Partial<PlatformData>) => {
    setPlatformData(prev => ({
      ...prev,
      [platform]: { ...prev[platform], ...updates },
    }));
  }, []);

  // Get current platform's data
  const currentData = platformData[activePlatform];

  const addDebugLog = useCallback((
    type: DebugLog['type'],
    category: string,
    message: string,
    data?: unknown
  ) => {
    setDebugLogs(prev => [...prev.slice(-99), {
      timestamp: new Date(),
      type,
      category,
      message,
      data,
    }]);
  }, []);

  // Load debug mode setting
  useEffect(() => {
    chrome.storage.local.get(['userSettings']).then(({ userSettings }) => {
      if (userSettings?.debugMode) {
        setDebugMode(true);
        addDebugLog('info', 'SYSTEM', 'Debug mode enabled');
      }
    });

    // Listen for settings changes
    const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }) => {
      if (changes.userSettings?.newValue?.debugMode !== undefined) {
        setDebugMode(changes.userSettings.newValue.debugMode);
        addDebugLog('info', 'SYSTEM', `Debug mode ${changes.userSettings.newValue.debugMode ? 'enabled' : 'disabled'}`);
      }
    };
    chrome.storage.onChanged.addListener(handleStorageChange);
    return () => chrome.storage.onChanged.removeListener(handleStorageChange);
  }, [addDebugLog]);

  useEffect(() => {
    const handleMessage = (message: { type: string; payload?: unknown }) => {
      addDebugLog('message', 'MESSAGE', `Received: ${message.type}`, message.payload);

      if (message.type === 'ANALYSIS_RESULT') {
        const data = message.payload as AnalysisResult & { source?: Platform };
        const platform = data.source || activePlatform;
        addDebugLog('info', 'ANALYSIS', `Result for ${platform}: ${data.words.length} words, ${data.phrases.length} phrases, ${data.sentences.length} sentences`);
        updatePlatformData(platform, {
          result: data,
          loading: false,
          loadingStep: 'idle',
        });
      } else if (message.type === 'SUBTITLE_CAPTURED') {
        const payload = message.payload as SubtitleCapturedPayload;
        const platform = payload.source as Platform;
        addDebugLog('info', 'SUBTITLE', `Captured from ${platform}: "${payload.text.substring(0, 50)}..."`);

        // Auto-switch to the active platform
        setActivePlatform(platform);

        // 如果來源改變，重置結果
        if (payload.title !== currentSourceRef.current[platform]) {
          addDebugLog('warn', 'SUBTITLE', `Source changed for ${platform}: "${currentSourceRef.current[platform]}" -> "${payload.title}"`);
          updatePlatformData(platform, {
            result: null,
            loading: false,
            loadingStep: 'idle',
          });
        }
        currentSourceRef.current[platform] = payload.title;
        updatePlatformData(platform, {
          currentSource: payload.title,
          subtitleStatus: null,
        });
      } else if (message.type === 'SUBTITLE_STATUS') {
        const payload = message.payload as SubtitleStatusPayload;
        const platform = payload.source as Platform;
        addDebugLog('info', 'STATUS', `${platform}: ${payload.status} - ${payload.message}`);
        updatePlatformData(platform, { subtitleStatus: payload });
        // Auto-switch to the platform that's sending status
        setActivePlatform(platform);
      }
    };

    chrome.runtime.onMessage.addListener(handleMessage);
    return () => chrome.runtime.onMessage.removeListener(handleMessage);
  }, [addDebugLog, activePlatform, updatePlatformData]);

  const requestAnalysis = () => {
    addDebugLog('info', 'API', `Sending ANALYZE_REQUEST for ${activePlatform}`, { filter });
    chrome.runtime.sendMessage({
      type: 'ANALYZE_REQUEST',
      payload: { filter, platform: activePlatform }
    });
    updatePlatformData(activePlatform, {
      loading: true,
      loadingStep: 'analyzing',
    });
  };

  const clearDebugLogs = () => {
    setDebugLogs([]);
    addDebugLog('info', 'SYSTEM', 'Logs cleared');
  };

  // Filter words based on current filter settings
  const filteredWords = useMemo(() => {
    if (!currentData.result?.words) return [];

    let words = currentData.result.words;

    // Filter by part of speech
    if (filter.posFilter && filter.posFilter.length > 0) {
      words = words.filter(word => {
        const pos = word.pos.toLowerCase();
        return filter.posFilter!.some(p => pos.includes(p));
      });
    }

    // Filter by topic
    if (filter.topicFilter) {
      const topic = filter.topicFilter.toLowerCase();
      words = words.filter(word =>
        word.topic?.toLowerCase().includes(topic) ||
        word.meaning.toLowerCase().includes(topic) ||
        word.example.toLowerCase().includes(topic)
      );
    }

    return words;
  }, [currentData.result?.words, filter]);

  const openSettings = () => {
    setPage('settings');
  };

  // Render settings page if on settings view
  if (page === 'settings') {
    return <SettingsPage onBack={() => setPage('main')} />;
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" />
          學習內容
        </h1>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={openSettings}
          >
            <Settings className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={requestAnalysis}
            disabled={currentData.loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${currentData.loading ? 'animate-spin' : ''}`} />
            分析
          </Button>
        </div>
      </div>

      {/* Platform Tabs */}
      <div className="flex gap-2 mb-4">
        <Button
          variant={activePlatform === 'youtube' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActivePlatform('youtube')}
          className="flex-1"
        >
          <Youtube className="h-4 w-4 mr-2" />
          YouTube
          {platformData.youtube.currentSource && (
            <Badge variant="secondary" className="ml-2 text-xs">
              {platformData.youtube.result ? '✓' : '...'}
            </Badge>
          )}
        </Button>
        <Button
          variant={activePlatform === 'netflix' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActivePlatform('netflix')}
          className="flex-1"
        >
          <Tv className="h-4 w-4 mr-2" />
          Netflix
          {platformData.netflix.currentSource && (
            <Badge variant="secondary" className="ml-2 text-xs">
              {platformData.netflix.result ? '✓' : '...'}
            </Badge>
          )}
        </Button>
      </div>

      {currentData.currentSource && (
        <p className="text-sm text-muted-foreground mb-4 truncate">
          來源: {currentData.currentSource}
        </p>
      )}

      {/* Subtitle Status */}
      {currentData.subtitleStatus && (
        <Card className={`mb-4 ${
          currentData.subtitleStatus.status === 'not_found' ? 'border-destructive' :
          currentData.subtitleStatus.status === 'found' ? 'border-green-500' :
          'border-yellow-500'
        }`}>
          <CardContent className="py-3">
            <div className="flex items-center gap-2">
              {currentData.subtitleStatus.status === 'searching' && (
                <Search className="h-4 w-4 text-yellow-500 animate-pulse" />
              )}
              {currentData.subtitleStatus.status === 'retrying' && (
                <Loader2 className="h-4 w-4 text-yellow-500 animate-spin" />
              )}
              {currentData.subtitleStatus.status === 'not_found' && (
                <AlertCircle className="h-4 w-4 text-destructive" />
              )}
              {currentData.subtitleStatus.status === 'found' && (
                <CheckCircle className="h-4 w-4 text-green-500" />
              )}
              <span className={`text-sm ${
                currentData.subtitleStatus.status === 'not_found' ? 'text-destructive' :
                currentData.subtitleStatus.status === 'found' ? 'text-green-600' :
                'text-yellow-600'
              }`}>
                {currentData.subtitleStatus.message}
              </span>
            </div>
            {/* Solution for not found */}
            {currentData.subtitleStatus.status === 'not_found' && (
              <div className="mt-3 pt-3 border-t border-dashed">
                <p className="text-xs font-medium mb-2">解決方法：</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  {activePlatform === 'youtube' ? (
                    <>
                      <li>• 按鍵盤「C」鍵開啟字幕</li>
                      <li>• 點擊影片右下角的「CC」按鈕</li>
                      <li>• 確認影片有提供字幕（自動產生或手動上傳）</li>
                      <li>• 重新整理頁面後再試一次</li>
                    </>
                  ) : (
                    <>
                      <li>• 點擊影片下方的對話框圖示開啟字幕</li>
                      <li>• 在設定中選擇字幕語言</li>
                      <li>• 確認節目有提供字幕</li>
                      <li>• 重新整理頁面後再試一次</li>
                    </>
                  )}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Filter Panel */}
      <FilterPanel
        onFilterChange={setFilter}
        onAnalyze={requestAnalysis}
        isLoading={currentData.loading}
      />

      {currentData.loading && (
        <div className="flex flex-col items-center justify-center py-12 gap-4">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
          <div className="text-center">
            <p className="text-sm font-medium">
              {currentData.loadingStep === 'collecting' && '收集字幕中...'}
              {currentData.loadingStep === 'analyzing' && '正在分析內容...'}
              {currentData.loadingStep === 'processing' && '處理結果中...'}
              {currentData.loadingStep === 'idle' && '載入中...'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {currentData.loadingStep === 'collecting' && '請繼續播放影片以收集更多字幕'}
              {currentData.loadingStep === 'analyzing' && '使用 AI 分析學習內容，請稍候'}
              {currentData.loadingStep === 'processing' && '即將完成'}
            </p>
          </div>
        </div>
      )}

      {!currentData.loading && !currentData.result && (
        <div className="text-center py-12 text-muted-foreground">
          <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>播放 {activePlatform === 'youtube' ? 'YouTube' : 'Netflix'} 影片</p>
          <p className="text-sm">我們會自動捕捉字幕並分析學習內容</p>
          <p className="text-xs mt-4 text-orange-600">
            如果沒有反應，請重新整理影片頁面
          </p>
          <p className="text-xs mt-2">v1.0.3 - 支援平台分頁</p>
        </div>
      )}

      {!currentData.loading && currentData.result && (
        <Tabs defaultValue="words" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="words" className="flex items-center gap-1">
              <BookOpen className="h-4 w-4" />
              單字 ({filteredWords.length})
            </TabsTrigger>
            <TabsTrigger value="phrases" className="flex items-center gap-1">
              <MessageSquare className="h-4 w-4" />
              片語 ({currentData.result.phrases.length})
            </TabsTrigger>
            <TabsTrigger value="sentences" className="flex items-center gap-1">
              <Quote className="h-4 w-4" />
              句型 ({currentData.result.sentences.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="words" className="mt-4">
            {filteredWords.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>沒有符合篩選條件的單字</p>
              </div>
            ) : (
              filteredWords.map((word, index) => (
                <WordCard key={index} word={word} />
              ))
            )}
          </TabsContent>

          <TabsContent value="phrases" className="mt-4">
            {currentData.result.phrases.map((phrase, index) => (
              <PhraseCard key={index} phrase={phrase} />
            ))}
          </TabsContent>

          <TabsContent value="sentences" className="mt-4">
            {currentData.result.sentences.map((sentence, index) => (
              <SentenceCard key={index} sentence={sentence} />
            ))}
          </TabsContent>
        </Tabs>
      )}

      {/* Debug Panel - only show in debug mode */}
      {debugMode && (
        <DebugPanel logs={debugLogs} onClear={clearDebugLogs} />
      )}
    </div>
  );
}

export default App;
