import { cn } from '@/lib/utils';

type HumanlyWordmarkProps = {
  className?: string;
  cursor?: boolean;
  size?: 'sm' | 'md' | 'lg';
};

const sizeClasses = {
  sm: 'text-lg',
  md: 'text-2xl',
  lg: 'text-4xl sm:text-5xl',
};

const cursorClasses = {
  sm: 'h-4 w-1.5',
  md: 'h-5 w-2',
  lg: 'h-8 w-3 sm:h-10 sm:w-4',
};

export function HumanlyWordmark({
  className,
  cursor = true,
  size = 'md',
}: HumanlyWordmarkProps) {
  return (
    <span
      className={cn(
        'inline-flex items-baseline gap-1 font-bold leading-none tracking-normal text-foreground',
        'font-[var(--font-space-mono)]',
        sizeClasses[size],
        className
      )}
      aria-label="Humanly"
    >
      <span>humanly</span>
      {cursor && (
        <span
          aria-hidden="true"
          className={cn(
            'inline-block translate-y-[0.08em] bg-current humanly-cursor-blink',
            cursorClasses[size]
          )}
        />
      )}
    </span>
  );
}
