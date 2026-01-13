import { BarChart3 } from 'lucide-react';

export function EmptyAnalyticsState() {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
      <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
      <h3 className="font-semibold text-lg mb-2">No Analytics Yet</h3>
      <p className="text-sm text-muted-foreground max-w-sm">
        Start typing in the demo field to see real-time typing behavior analytics
      </p>
    </div>
  );
}
