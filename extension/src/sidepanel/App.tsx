import { useState, useEffect, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FilterPanel } from '@/components/FilterPanel';
import type { AnalysisResult, Word, Phrase, Sentence, SubtitleCapturedPayload, SubtitleStatusPayload, AnalysisFilter } from '@gleano/shared';
import { BookOpen, MessageSquare, Quote, Heart, RefreshCw, Settings, AlertCircle, CheckCircle, Search, Loader2 } from 'lucide-react';

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
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState<LoadingStep>('idle');
  const [currentSource, setCurrentSource] = useState<string>('');
  const [filter, setFilter] = useState<AnalysisFilter>({});
  const [subtitleStatus, setSubtitleStatus] = useState<SubtitleStatusPayload | null>(null);

  useEffect(() => {
    const handleMessage = (message: { type: string; payload?: unknown }) => {
      if (message.type === 'ANALYSIS_RESULT') {
        setResult(message.payload as AnalysisResult);
        setLoading(false);
        setLoadingStep('idle');
      } else if (message.type === 'SUBTITLE_CAPTURED') {
        const payload = message.payload as SubtitleCapturedPayload;
        setCurrentSource(payload.title);
        setSubtitleStatus(null); // Clear status when subtitle is captured
        setLoadingStep('collecting');
      } else if (message.type === 'SUBTITLE_STATUS') {
        const payload = message.payload as SubtitleStatusPayload;
        setSubtitleStatus(payload);
      }
    };

    chrome.runtime.onMessage.addListener(handleMessage);
    return () => chrome.runtime.onMessage.removeListener(handleMessage);
  }, []);

  const requestAnalysis = () => {
    chrome.runtime.sendMessage({
      type: 'ANALYZE_REQUEST',
      payload: { filter }
    });
    setLoading(true);
    setLoadingStep('analyzing');
  };

  // Filter words based on current filter settings
  const filteredWords = useMemo(() => {
    if (!result?.words) return [];

    let words = result.words;

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
  }, [result?.words, filter]);

  const openSettings = () => {
    chrome.runtime.sendMessage({ type: 'OPEN_POPUP' });
  };

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
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            分析
          </Button>
        </div>
      </div>

      {currentSource && (
        <p className="text-sm text-muted-foreground mb-4 truncate">
          來源: {currentSource}
        </p>
      )}

      {/* Subtitle Status */}
      {subtitleStatus && (
        <Card className={`mb-4 ${
          subtitleStatus.status === 'not_found' ? 'border-destructive' :
          subtitleStatus.status === 'found' ? 'border-green-500' :
          'border-yellow-500'
        }`}>
          <CardContent className="py-3">
            <div className="flex items-center gap-2">
              {subtitleStatus.status === 'searching' && (
                <Search className="h-4 w-4 text-yellow-500 animate-pulse" />
              )}
              {subtitleStatus.status === 'retrying' && (
                <Loader2 className="h-4 w-4 text-yellow-500 animate-spin" />
              )}
              {subtitleStatus.status === 'not_found' && (
                <AlertCircle className="h-4 w-4 text-destructive" />
              )}
              {subtitleStatus.status === 'found' && (
                <CheckCircle className="h-4 w-4 text-green-500" />
              )}
              <span className={`text-sm ${
                subtitleStatus.status === 'not_found' ? 'text-destructive' :
                subtitleStatus.status === 'found' ? 'text-green-600' :
                'text-yellow-600'
              }`}>
                {subtitleStatus.message}
              </span>
              <Badge variant="outline" className="ml-auto text-xs">
                {subtitleStatus.source === 'youtube' ? 'YouTube' : 'Netflix'}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filter Panel */}
      <FilterPanel
        onFilterChange={setFilter}
        onAnalyze={requestAnalysis}
        isLoading={loading}
      />

      {loading && (
        <div className="flex flex-col items-center justify-center py-12 gap-4">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
          <div className="text-center">
            <p className="text-sm font-medium">
              {loadingStep === 'collecting' && '收集字幕中...'}
              {loadingStep === 'analyzing' && '正在分析內容...'}
              {loadingStep === 'processing' && '處理結果中...'}
              {loadingStep === 'idle' && '載入中...'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {loadingStep === 'collecting' && '請繼續播放影片以收集更多字幕'}
              {loadingStep === 'analyzing' && '使用 AI 分析學習內容，請稍候'}
              {loadingStep === 'processing' && '即將完成'}
            </p>
          </div>
        </div>
      )}

      {!loading && !result && (
        <div className="text-center py-12 text-muted-foreground">
          <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>播放 YouTube 或 Netflix 影片</p>
          <p className="text-sm">我們會自動捕捉字幕並分析學習內容</p>
          <p className="text-xs mt-4">v1.0.2 - 支援 AI 篩選</p>
        </div>
      )}

      {!loading && result && (
        <Tabs defaultValue="words" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="words" className="flex items-center gap-1">
              <BookOpen className="h-4 w-4" />
              單字 ({filteredWords.length})
            </TabsTrigger>
            <TabsTrigger value="phrases" className="flex items-center gap-1">
              <MessageSquare className="h-4 w-4" />
              片語 ({result.phrases.length})
            </TabsTrigger>
            <TabsTrigger value="sentences" className="flex items-center gap-1">
              <Quote className="h-4 w-4" />
              句型 ({result.sentences.length})
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
            {result.phrases.map((phrase, index) => (
              <PhraseCard key={index} phrase={phrase} />
            ))}
          </TabsContent>

          <TabsContent value="sentences" className="mt-4">
            {result.sentences.map((sentence, index) => (
              <SentenceCard key={index} sentence={sentence} />
            ))}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

export default App;
