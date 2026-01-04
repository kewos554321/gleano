import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Heart } from 'lucide-react';
import type { Phrase } from '@gleano/shared';

interface PhraseCardProps {
  phrase: Phrase;
}

export function PhraseCard({ phrase }: PhraseCardProps) {
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
