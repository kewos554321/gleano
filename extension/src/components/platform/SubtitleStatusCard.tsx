import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import type { SubtitleStatusPayload } from '@gleano/shared';
import type { Platform } from './PlatformTabs';

interface SubtitleStatusCardProps {
  status: SubtitleStatusPayload;
  platform: Platform;
  countdown: number;
}

export function SubtitleStatusCard({ status, platform, countdown }: SubtitleStatusCardProps) {
  const getStatusIcon = () => {
    switch (status.status) {
      case 'searching':
        return <Search className="h-4 w-4 text-yellow-500 animate-pulse" />;
      case 'retrying':
        return <Loader2 className="h-4 w-4 text-yellow-500 animate-spin" />;
      case 'not_found':
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      case 'found':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
  };

  const getStatusColor = () => {
    switch (status.status) {
      case 'not_found':
        return 'text-destructive';
      case 'found':
        return 'text-green-600';
      default:
        return 'text-yellow-600';
    }
  };

  const getBorderColor = () => {
    switch (status.status) {
      case 'not_found':
        return 'border-destructive';
      case 'found':
        return 'border-green-500';
      default:
        return 'border-yellow-500';
    }
  };

  return (
    <Card className={`mb-4 ${getBorderColor()}`}>
      <CardContent className="py-3">
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          <span className={`text-sm flex-1 ${getStatusColor()}`}>
            {status.message}
          </span>
          {status.status === 'found' && countdown > 0 && (
            <Badge variant="outline" className="ml-2 text-xs tabular-nums">
              {countdown}s
            </Badge>
          )}
        </div>

        {status.status === 'found' && countdown > 0 && (
          <p className="text-xs text-muted-foreground mt-2">
            請播放影片，字幕出現後會自動捕捉...
          </p>
        )}

        {status.status === 'not_found' && (
          <div className="mt-3 pt-3 border-t border-dashed">
            <p className="text-xs font-medium mb-2">解決方法：</p>
            <ul className="text-xs text-muted-foreground space-y-1">
              {platform === 'youtube' ? (
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
  );
}
