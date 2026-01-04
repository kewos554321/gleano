import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Heart } from 'lucide-react';
import type { Sentence } from '@gleano/shared';

interface SentenceCardProps {
  sentence: Sentence;
}

export function SentenceCard({ sentence }: SentenceCardProps) {
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
