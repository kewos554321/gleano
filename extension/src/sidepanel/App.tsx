import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { FilterPanel } from '@/components/FilterPanel';
import { DebugPanel, type DebugLog } from '@/components/DebugPanel';
import { SettingsPage } from '@/components/SettingsPage';
import { WordCard, PhraseCard, SentenceCard } from '@/components/learning';
import { PlatformTabs, SubtitleStatusCard, CapturedSubtitlesPanel, type Platform, type CapturedSubtitle } from '@/components/platform';
import type { AnalysisResult, SubtitleCapturedPayload, SubtitleStatusPayload, AnalysisFilter } from '@gleano/shared';
import { BookOpen, MessageSquare, Quote, RefreshCw, Settings } from 'lucide-react';

type PageView = 'main' | 'settings';
type LoadingStep = 'idle' | 'collecting' | 'analyzing' | 'processing';

interface PlatformData {
  result: AnalysisResult | null;
  loading: boolean;
  loadingStep: LoadingStep;
  currentSource: string;
  subtitleStatus: SubtitleStatusPayload | null;
  capturedSubtitles: CapturedSubtitle[];
  analysisError: string | null;
}

const ANALYSIS_TIMEOUT_SECONDS = 60;

const emptyPlatformData: PlatformData = {
  result: null,
  loading: false,
  loadingStep: 'idle',
  currentSource: '',
  subtitleStatus: null,
  capturedSubtitles: [],
  analysisError: null,
};

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
  const [waitingCountdown, setWaitingCountdown] = useState<Record<Platform, number>>({ youtube: 0, netflix: 0 });
  const [analysisCountdown, setAnalysisCountdown] = useState<Record<Platform, number>>({ youtube: 0, netflix: 0 });
  const currentSourceRef = useRef<Record<Platform, string>>({ youtube: '', netflix: '' });
  const countdownRef = useRef<Record<Platform, ReturnType<typeof setInterval> | null>>({ youtube: null, netflix: null });
  const analysisTimeoutRef = useRef<Record<Platform, ReturnType<typeof setInterval> | null>>({ youtube: null, netflix: null });

  // Helper to update platform-specific data
  const updatePlatformData = useCallback((platform: Platform, updates: Partial<PlatformData>) => {
    setPlatformData(prev => ({
      ...prev,
      [platform]: { ...prev[platform], ...updates },
    }));
  }, []);

  // Helper to clear analysis timeout
  const clearAnalysisTimeout = useCallback((platform: Platform) => {
    if (analysisTimeoutRef.current[platform]) {
      clearInterval(analysisTimeoutRef.current[platform]!);
      analysisTimeoutRef.current[platform] = null;
    }
    setAnalysisCountdown(prev => ({ ...prev, [platform]: 0 }));
  }, []);

  // Get current platform's data
  const currentData = platformData[activePlatform];

  // Countdown timer for "found" status
  useEffect(() => {
    const platform = activePlatform;
    const status = currentData.subtitleStatus?.status;

    if (countdownRef.current[platform]) {
      clearInterval(countdownRef.current[platform]!);
      countdownRef.current[platform] = null;
    }

    if (status === 'found' && !currentData.result) {
      setWaitingCountdown(prev => ({ ...prev, [platform]: 30 }));

      countdownRef.current[platform] = setInterval(() => {
        setWaitingCountdown(prev => {
          const newCount = prev[platform] - 1;
          if (newCount <= 0) {
            if (countdownRef.current[platform]) {
              clearInterval(countdownRef.current[platform]!);
              countdownRef.current[platform] = null;
            }
            return { ...prev, [platform]: 0 };
          }
          return { ...prev, [platform]: newCount };
        });
      }, 1000);
    } else {
      setWaitingCountdown(prev => ({ ...prev, [platform]: 0 }));
    }

    return () => {
      if (countdownRef.current[platform]) {
        clearInterval(countdownRef.current[platform]!);
      }
    };
  }, [activePlatform, currentData.subtitleStatus?.status, currentData.result]);

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

  // Cleanup analysis timeouts on unmount
  useEffect(() => {
    return () => {
      if (analysisTimeoutRef.current.youtube) {
        clearInterval(analysisTimeoutRef.current.youtube);
      }
      if (analysisTimeoutRef.current.netflix) {
        clearInterval(analysisTimeoutRef.current.netflix);
      }
    };
  }, []);

  // Load debug mode setting
  useEffect(() => {
    chrome.storage.local.get(['userSettings']).then(({ userSettings }) => {
      if (userSettings?.debugMode) {
        setDebugMode(true);
        addDebugLog('info', 'SYSTEM', 'Debug mode enabled');
      }
    });

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
        clearAnalysisTimeout(platform);
        updatePlatformData(platform, {
          result: data,
          loading: false,
          loadingStep: 'idle',
          analysisError: null,
        });
      } else if (message.type === 'SUBTITLE_CAPTURED') {
        const payload = message.payload as SubtitleCapturedPayload;
        const platform = payload.source as Platform;
        addDebugLog('info', 'SUBTITLE', `Captured from ${platform}: "${payload.text.substring(0, 50)}..."`);

        setActivePlatform(platform);

        if (payload.title !== currentSourceRef.current[platform]) {
          addDebugLog('warn', 'SUBTITLE', `Source changed for ${platform}: "${currentSourceRef.current[platform]}" -> "${payload.title}"`);
          updatePlatformData(platform, {
            result: null,
            loading: false,
            loadingStep: 'idle',
            capturedSubtitles: [],
          });
        }
        currentSourceRef.current[platform] = payload.title;

        setPlatformData(prev => {
          const currentSubtitles = prev[platform].capturedSubtitles;
          const newSubtitle: CapturedSubtitle = {
            text: payload.text,
            timestamp: payload.timestamp,
          };
          const updatedSubtitles = [...currentSubtitles, newSubtitle].slice(-20);
          return {
            ...prev,
            [platform]: {
              ...prev[platform],
              currentSource: payload.title,
              subtitleStatus: null,
              capturedSubtitles: updatedSubtitles,
            },
          };
        });
      } else if (message.type === 'SUBTITLE_STATUS') {
        const payload = message.payload as SubtitleStatusPayload;
        const platform = payload.source as Platform;
        addDebugLog('info', 'STATUS', `${platform}: ${payload.status} - ${payload.message}`);
        updatePlatformData(platform, { subtitleStatus: payload });
        setActivePlatform(platform);
      } else if (message.type === 'ANALYSIS_ERROR') {
        const payload = message.payload as { message: string };
        addDebugLog('error', 'ANALYSIS', `Error: ${payload.message}`);
        clearAnalysisTimeout(activePlatform);
        updatePlatformData(activePlatform, {
          loading: false,
          loadingStep: 'idle',
          analysisError: payload.message,
        });
      }
    };

    chrome.runtime.onMessage.addListener(handleMessage);
    return () => chrome.runtime.onMessage.removeListener(handleMessage);
  }, [addDebugLog, activePlatform, updatePlatformData, clearAnalysisTimeout]);

  const requestAnalysis = () => {
    const platform = activePlatform;
    addDebugLog('info', 'API', `Sending ANALYZE_REQUEST for ${platform}`, { filter });

    // Clear any existing timeout
    clearAnalysisTimeout(platform);

    chrome.runtime.sendMessage({
      type: 'ANALYZE_REQUEST',
      payload: { filter, platform }
    });

    updatePlatformData(platform, {
      loading: true,
      loadingStep: 'analyzing',
      analysisError: null,
    });

    // Start countdown timer
    setAnalysisCountdown(prev => ({ ...prev, [platform]: ANALYSIS_TIMEOUT_SECONDS }));

    analysisTimeoutRef.current[platform] = setInterval(() => {
      setAnalysisCountdown(prev => {
        const newCount = prev[platform] - 1;
        if (newCount <= 0) {
          // Timeout reached
          clearAnalysisTimeout(platform);
          addDebugLog('error', 'API', `Analysis timeout for ${platform}`);
          updatePlatformData(platform, {
            loading: false,
            loadingStep: 'idle',
            analysisError: '分析逾時，請稍後再試',
          });
          return { ...prev, [platform]: 0 };
        }
        return { ...prev, [platform]: newCount };
      });
    }, 1000);
  };

  const clearDebugLogs = () => {
    setDebugLogs([]);
    addDebugLog('info', 'SYSTEM', 'Logs cleared');
  };

  const filteredWords = useMemo(() => {
    if (!currentData.result?.words) return [];

    let words = currentData.result.words;

    if (filter.posFilter && filter.posFilter.length > 0) {
      words = words.filter(word => {
        const pos = word.pos.toLowerCase();
        return filter.posFilter!.some(p => pos.includes(p));
      });
    }

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

  if (page === 'settings') {
    return <SettingsPage onBack={() => setPage('main')} />;
  }

  return (
    <div className="min-h-screen bg-background p-4">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" />
          學習內容
        </h1>
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" onClick={() => setPage('settings')}>
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
      <PlatformTabs
        activePlatform={activePlatform}
        onPlatformChange={setActivePlatform}
        youtubeHasResult={!!platformData.youtube.result}
        netflixHasResult={!!platformData.netflix.result}
      />

      {/* Current Source */}
      {currentData.currentSource && (
        <p className="text-sm text-muted-foreground mb-4 truncate">
          來源: {currentData.currentSource}
        </p>
      )}

      {/* Subtitle Status */}
      {currentData.subtitleStatus && (
        <SubtitleStatusCard
          status={currentData.subtitleStatus}
          platform={activePlatform}
          countdown={waitingCountdown[activePlatform]}
        />
      )}

      {/* Captured Subtitles */}
      <CapturedSubtitlesPanel subtitles={currentData.capturedSubtitles} />

      {/* Filter Panel */}
      <FilterPanel
        onFilterChange={setFilter}
        onAnalyze={requestAnalysis}
        isLoading={currentData.loading}
      />

      {/* Loading State */}
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
            {analysisCountdown[activePlatform] > 0 && (
              <p className="text-xs text-muted-foreground mt-2">
                剩餘時間: {analysisCountdown[activePlatform]} 秒
              </p>
            )}
          </div>
        </div>
      )}

      {/* Analysis Error */}
      {currentData.analysisError && !currentData.loading && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-4">
          <p className="text-sm text-destructive font-medium">{currentData.analysisError}</p>
          <p className="text-xs text-muted-foreground mt-1">
            請確認網路連線正常，或稍後再試
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={requestAnalysis}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            重新分析
          </Button>
        </div>
      )}

      {/* Empty State */}
      {!currentData.loading && !currentData.result && (
        <div className="text-center py-12 text-muted-foreground">
          <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>播放 {activePlatform === 'youtube' ? 'YouTube' : 'Netflix'} 影片</p>
          <p className="text-sm">我們會自動捕捉字幕並分析學習內容</p>
          <p className="text-xs mt-4 text-orange-600">
            如果沒有反應，請重新整理影片頁面
          </p>
          <p className="text-xs mt-2">v1.0.4 - 元件重構</p>
        </div>
      )}

      {/* Results */}
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

      {/* Debug Panel */}
      {debugMode && (
        <DebugPanel logs={debugLogs} onClear={clearDebugLogs} />
      )}
    </div>
  );
}

export default App;
