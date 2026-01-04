import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bug, Trash2, ChevronDown, ChevronUp } from 'lucide-react';

export interface DebugLog {
  timestamp: Date;
  type: 'info' | 'warn' | 'error' | 'message';
  category: string;
  message: string;
  data?: unknown;
}

interface DebugPanelProps {
  logs: DebugLog[];
  onClear: () => void;
}

export function DebugPanel({ logs, onClear }: DebugPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isExpanded && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, isExpanded]);

  const getTypeColor = (type: DebugLog['type']) => {
    switch (type) {
      case 'error': return 'text-red-500';
      case 'warn': return 'text-yellow-500';
      case 'message': return 'text-blue-500';
      default: return 'text-gray-500';
    }
  };

  const getCategoryBadge = (category: string) => {
    const colors: Record<string, string> = {
      'SUBTITLE': 'bg-green-100 text-green-700',
      'STATUS': 'bg-yellow-100 text-yellow-700',
      'ANALYSIS': 'bg-blue-100 text-blue-700',
      'API': 'bg-purple-100 text-purple-700',
      'ERROR': 'bg-red-100 text-red-700',
    };
    return colors[category] || 'bg-gray-100 text-gray-700';
  };

  return (
    <Card className="mt-4 border-dashed border-orange-300 bg-orange-50/50">
      <CardHeader
        className="py-2 cursor-pointer flex flex-row items-center justify-between"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <CardTitle className="text-sm flex items-center gap-2 text-orange-700">
          <Bug className="h-4 w-4" />
          Debug Console ({logs.length})
        </CardTitle>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={(e) => {
              e.stopPropagation();
              onClear();
            }}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-orange-700" />
          ) : (
            <ChevronUp className="h-4 w-4 text-orange-700" />
          )}
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-0">
          <div className="bg-gray-900 rounded-md p-2 max-h-48 overflow-y-auto font-mono text-xs">
            {logs.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No logs yet...</p>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="py-1 border-b border-gray-800 last:border-0">
                  <div className="flex items-start gap-2">
                    <span className="text-gray-600 shrink-0">
                      {log.timestamp.toLocaleTimeString()}
                    </span>
                    <span className={`px-1 rounded text-[10px] shrink-0 ${getCategoryBadge(log.category)}`}>
                      {log.category}
                    </span>
                    <span className={getTypeColor(log.type)}>
                      {log.message}
                    </span>
                  </div>
                  {log.data !== undefined && (
                    <pre className="text-gray-400 mt-1 ml-16 text-[10px] overflow-x-auto">
                      {typeof log.data === 'string' ? log.data : JSON.stringify(log.data, null, 2)}
                    </pre>
                  )}
                </div>
              ))
            )}
            <div ref={logsEndRef} />
          </div>
        </CardContent>
      )}
    </Card>
  );
}
