import { RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MetricSelector } from './MetricSelector';
import type { UseSelectedMetricsReturn } from '@/hooks/use-selected-metrics';

interface AnalyticsControlsProps {
  selectedMetricsHook: UseSelectedMetricsReturn;
  onReset: () => void;
}

export function AnalyticsControls({ selectedMetricsHook, onReset }: AnalyticsControlsProps) {
  const { selectedMetrics } = selectedMetricsHook;

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <h3 className="text-lg font-semibold">Analytics</h3>
        <Badge variant="secondary" className="text-xs">
          {selectedMetrics.length} {selectedMetrics.length === 1 ? 'metric' : 'metrics'}
        </Badge>
      </div>

      <div className="flex items-center gap-2">
        <MetricSelector selectedMetrics={selectedMetricsHook} />
        <Button variant="outline" size="sm" onClick={onReset}>
          <RotateCcw className="h-4 w-4 mr-2" />
          Reset
        </Button>
      </div>
    </div>
  );
}
