import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { AnalysisResult, Word, Phrase, Sentence, SubtitleCapturedPayload } from '@gleano/shared';
import { BookOpen, MessageSquare, Quote, Heart, RefreshCw } from 'lucide-react';

function WordCard({ word }: { word: Word }) {
  const [saved, setSaved] = useState(false);

  return (
    <Card className="mb-3">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{word.word}</CardTitle>
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

function App() {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentSource, setCurrentSource] = useState<string>('');

  useEffect(() => {
    const handleMessage = (message: { type: string; payload?: unknown }) => {
      if (message.type === 'ANALYSIS_RESULT') {
        setResult(message.payload as AnalysisResult);
        setLoading(false);
      } else if (message.type === 'SUBTITLE_CAPTURED') {
        const payload = message.payload as SubtitleCapturedPayload;
        setCurrentSource(payload.title);
        setLoading(true);
      }
    };

    chrome.runtime.onMessage.addListener(handleMessage);
    return () => chrome.runtime.onMessage.removeListener(handleMessage);
  }, []);

  const requestAnalysis = () => {
    chrome.runtime.sendMessage({ type: 'ANALYZE_REQUEST' });
    setLoading(true);
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" />
          學習內容
        </h1>
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

      {currentSource && (
        <p className="text-sm text-muted-foreground mb-4 truncate">
          來源: {currentSource}
        </p>
      )}

      {loading && (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {!loading && !result && (
        <div className="text-center py-12 text-muted-foreground">
          <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>播放 YouTube 或 Netflix 影片</p>
          <p className="text-sm">我們會自動捕捉字幕並分析學習內容</p>
          <p className="text-xs mt-4">v1.0.1 - API 已連線</p>
        </div>
      )}

      {!loading && result && (
        <Tabs defaultValue="words" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="words" className="flex items-center gap-1">
              <BookOpen className="h-4 w-4" />
              單字 ({result.words.length})
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
            {result.words.map((word, index) => (
              <WordCard key={index} word={word} />
            ))}
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
