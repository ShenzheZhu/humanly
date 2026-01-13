import { Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { METRIC_DEFINITIONS, CATEGORY_ORDER, CATEGORY_LABELS } from '@/lib/metric-definitions';
import type { UseSelectedMetricsReturn } from '@/hooks/use-selected-metrics';

interface MetricSelectorProps {
  selectedMetrics: UseSelectedMetricsReturn;
}

export function MetricSelector({ selectedMetrics }: MetricSelectorProps) {
  const { isSelected, toggleMetric, resetToDefaults } = selectedMetrics;

  // Group metrics by category
  const metricsByCategory = CATEGORY_ORDER.map(category => ({
    category,
    label: CATEGORY_LABELS[category],
    metrics: METRIC_DEFINITIONS.filter(m => m.category === category)
  }));

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings className="h-4 w-4 mr-2" />
          Metrics
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-64 max-h-[500px] overflow-y-auto" align="end">
        <DropdownMenuLabel>Select Metrics to Display</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {metricsByCategory.map(({ category, label, metrics }) => (
          <div key={category}>
            <DropdownMenuLabel className="text-xs font-normal text-muted-foreground px-2 py-1.5">
              {label}
            </DropdownMenuLabel>
            {metrics.map(metric => (
              <DropdownMenuCheckboxItem
                key={metric.id}
                checked={isSelected(metric.id)}
                onCheckedChange={() => toggleMetric(metric.id)}
              >
                {metric.label}
              </DropdownMenuCheckboxItem>
            ))}
          </div>
        ))}

        <DropdownMenuSeparator />
        <DropdownMenuLabel asChild>
          <button
            onClick={resetToDefaults}
            className="w-full text-left text-sm font-normal hover:bg-accent px-2 py-1.5 cursor-pointer"
          >
            Reset to Defaults
          </button>
        </DropdownMenuLabel>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
