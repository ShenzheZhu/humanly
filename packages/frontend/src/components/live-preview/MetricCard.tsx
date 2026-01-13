import React from 'react';
import { Info, type LucideIcon } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { MetricCategory } from '@/lib/metric-definitions';

interface MetricCardProps {
  label: string;
  value: string;
  description: string;
  icon: LucideIcon;
  category: MetricCategory;
}

const CATEGORY_COLORS: Record<MetricCategory, { icon: string; border: string }> = {
  speed: {
    icon: 'text-blue-600 dark:text-blue-400',
    border: 'border-blue-200 dark:border-blue-800'
  },
  timing: {
    icon: 'text-purple-600 dark:text-purple-400',
    border: 'border-purple-200 dark:border-purple-800'
  },
  behavior: {
    icon: 'text-green-600 dark:text-green-400',
    border: 'border-green-200 dark:border-green-800'
  },
  quality: {
    icon: 'text-orange-600 dark:text-orange-400',
    border: 'border-orange-200 dark:border-orange-800'
  },
  session: {
    icon: 'text-cyan-600 dark:text-cyan-400',
    border: 'border-cyan-200 dark:border-cyan-800'
  }
};

export const MetricCard = React.memo<MetricCardProps>(({ label, value, description, icon: Icon, category }) => {
  const colors = CATEGORY_COLORS[category];

  return (
    <div
      className={`rounded-lg border ${colors.border} bg-card p-4 hover:bg-accent/5 transition-colors`}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <Icon className={`h-4 w-4 ${colors.icon}`} />
          <span className="text-sm font-medium text-foreground">{label}</span>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="focus:outline-none focus:ring-2 focus:ring-ring rounded-sm">
                <Info className="h-3 w-3 text-muted-foreground hover:text-foreground transition-colors" />
              </button>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p className="text-xs">{description}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <div className="text-2xl font-bold text-foreground mb-1">
        {value}
      </div>

      <p className="text-xs text-muted-foreground truncate">
        {description.split('.')[0]}
      </p>
    </div>
  );
});

MetricCard.displayName = 'MetricCard';
