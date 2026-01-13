import { useMemo } from 'react';
import type { RealtimeEvent } from '@/lib/analytics-utils';
import { METRIC_DEFINITIONS } from '@/lib/metric-definitions';

export interface TypingAnalytics {
  [metricId: string]: number;
}

export function useTypingAnalytics(
  events: RealtimeEvent[],
  resetKey: number
): TypingAnalytics {
  const analytics = useMemo(() => {
    const result: TypingAnalytics = {};

    // Calculate all metrics
    METRIC_DEFINITIONS.forEach(metric => {
      try {
        result[metric.id] = metric.calculator(events);
      } catch (error) {
        console.error(`Error calculating metric ${metric.id}:`, error);
        result[metric.id] = 0;
      }
    });

    return result;
    // resetKey is intentionally included to force recalculation when analytics are reset
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events, resetKey]);

  return analytics;
}
