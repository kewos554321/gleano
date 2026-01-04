import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp, Captions } from 'lucide-react';

export interface CapturedSubtitle {
  text: string;
  timestamp: number;
}

interface CapturedSubtitlesPanelProps {
  subtitles: CapturedSubtitle[];
  defaultOpen?: boolean;
}

export function CapturedSubtitlesPanel({
  subtitles,
  defaultOpen = true,
}: CapturedSubtitlesPanelProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  if (subtitles.length === 0) {
    return null;
  }

  return (
    <Card className="mb-4">
      <CardHeader
        className="py-2 px-3 cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Captions className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">已捕捉字幕</span>
            <Badge variant="secondary" className="text-xs">
              {subtitles.length}
            </Badge>
          </div>
          {isOpen ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </CardHeader>
      {isOpen && (
        <CardContent className="py-2 px-3 max-h-48 overflow-y-auto">
          <div className="space-y-2">
            {subtitles.map((subtitle, index) => (
              <div
                key={index}
                className="text-xs p-2 bg-muted rounded-md"
              >
                <p className="text-foreground">{subtitle.text}</p>
                <p className="text-muted-foreground text-[10px] mt-1">
                  {new Date(subtitle.timestamp).toLocaleTimeString()}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
