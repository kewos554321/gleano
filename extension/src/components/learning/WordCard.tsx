import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Heart } from 'lucide-react';
import type { Word } from '@gleano/shared';

interface WordCardProps {
  word: Word;
}

export function WordCard({ word }: WordCardProps) {
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
