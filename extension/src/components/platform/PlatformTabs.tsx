import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Youtube, Tv } from 'lucide-react';

export type Platform = 'youtube' | 'netflix';

interface PlatformTabsProps {
  activePlatform: Platform;
  onPlatformChange: (platform: Platform) => void;
  youtubeHasResult: boolean;
  netflixHasResult: boolean;
}

export function PlatformTabs({
  activePlatform,
  onPlatformChange,
  youtubeHasResult,
  netflixHasResult,
}: PlatformTabsProps) {
  return (
    <div className="flex gap-2 mb-4">
      <Button
        variant={activePlatform === 'youtube' ? 'default' : 'outline'}
        size="sm"
        onClick={() => onPlatformChange('youtube')}
        className="flex-1"
      >
        <Youtube className="h-4 w-4 mr-2" />
        YouTube
        {youtubeHasResult && (
          <Badge variant="secondary" className="ml-2 text-xs">✓</Badge>
        )}
      </Button>
      <Button
        variant={activePlatform === 'netflix' ? 'default' : 'outline'}
        size="sm"
        onClick={() => onPlatformChange('netflix')}
        className="flex-1"
      >
        <Tv className="h-4 w-4 mr-2" />
        Netflix
        {netflixHasResult && (
          <Badge variant="secondary" className="ml-2 text-xs">✓</Badge>
        )}
      </Button>
    </div>
  );
}
