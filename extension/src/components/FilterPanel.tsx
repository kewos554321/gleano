import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { POS_LABELS, type PartOfSpeech, type AnalysisFilter } from '@gleano/shared';
import { Filter, Sparkles, X, ChevronDown, ChevronUp } from 'lucide-react';

interface FilterPanelProps {
  onFilterChange: (filter: AnalysisFilter) => void;
  onAnalyze: () => void;
  isLoading: boolean;
}

const POS_OPTIONS: PartOfSpeech[] = ['noun', 'verb', 'adjective', 'adverb'];

const TOPIC_SUGGESTIONS = [
  '廚房', '旅遊', '商業', '科技', '醫療', '運動', '音樂', '電影'
];

export function FilterPanel({ onFilterChange, onAnalyze, isLoading }: FilterPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedPos, setSelectedPos] = useState<PartOfSpeech[]>([]);
  const [topicFilter, setTopicFilter] = useState('');
  const [customPrompt, setCustomPrompt] = useState('');

  const togglePos = (pos: PartOfSpeech) => {
    const newSelected = selectedPos.includes(pos)
      ? selectedPos.filter(p => p !== pos)
      : [...selectedPos, pos];
    setSelectedPos(newSelected);
    updateFilter(newSelected, topicFilter, customPrompt);
  };

  const updateFilter = (pos: PartOfSpeech[], topic: string, prompt: string) => {
    onFilterChange({
      posFilter: pos.length > 0 ? pos : undefined,
      topicFilter: topic || undefined,
      customPrompt: prompt || undefined,
    });
  };

  const handleTopicChange = (topic: string) => {
    setTopicFilter(topic);
    updateFilter(selectedPos, topic, customPrompt);
  };

  const handlePromptChange = (prompt: string) => {
    setCustomPrompt(prompt);
    updateFilter(selectedPos, topicFilter, prompt);
  };

  const clearFilters = () => {
    setSelectedPos([]);
    setTopicFilter('');
    setCustomPrompt('');
    onFilterChange({});
  };

  const hasFilters = selectedPos.length > 0 || topicFilter || customPrompt;

  return (
    <Card className="mb-4">
      <CardHeader className="py-3 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Filter className="h-4 w-4" />
            篩選與 AI 提示
            {hasFilters && (
              <Badge variant="secondary" className="ml-2">
                {selectedPos.length + (topicFilter ? 1 : 0) + (customPrompt ? 1 : 0)}
              </Badge>
            )}
          </CardTitle>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-0 space-y-4">
          {/* Part of Speech Filter */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-2 block">
              詞性篩選
            </label>
            <div className="flex flex-wrap gap-2">
              {POS_OPTIONS.map(pos => (
                <Badge
                  key={pos}
                  variant={selectedPos.includes(pos) ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => togglePos(pos)}
                >
                  {POS_LABELS[pos]}
                </Badge>
              ))}
            </div>
          </div>

          {/* Topic Filter */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-2 block">
              主題分類
            </label>
            <Input
              placeholder="輸入主題，如：廚房、旅遊..."
              value={topicFilter}
              onChange={(e) => handleTopicChange(e.target.value)}
              className="h-8 text-sm"
            />
            <div className="flex flex-wrap gap-1 mt-2">
              {TOPIC_SUGGESTIONS.map(topic => (
                <Badge
                  key={topic}
                  variant={topicFilter === topic ? 'default' : 'secondary'}
                  className="cursor-pointer text-xs"
                  onClick={() => handleTopicChange(topicFilter === topic ? '' : topic)}
                >
                  {topic}
                </Badge>
              ))}
            </div>
          </div>

          {/* Custom AI Prompt */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-2 block flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              自訂 AI 提示
            </label>
            <Input
              placeholder="例如：找出適合 IELTS 寫作的高級詞彙"
              value={customPrompt}
              onChange={(e) => handlePromptChange(e.target.value)}
              className="h-8 text-sm"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={onAnalyze}
              disabled={isLoading}
              className="flex-1"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              {isLoading ? '分析中...' : '套用篩選並分析'}
            </Button>
            {hasFilters && (
              <Button
                size="sm"
                variant="outline"
                onClick={clearFilters}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
