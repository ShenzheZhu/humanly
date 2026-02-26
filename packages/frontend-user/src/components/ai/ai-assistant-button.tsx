'use client';

import React from 'react';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface AIAssistantButtonProps {
  isOpen: boolean;
  onClick: () => void;
  className?: string;
}

export function AIAssistantButton({ isOpen, onClick, className }: AIAssistantButtonProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={isOpen ? 'default' : 'outline'}
            size="sm"
            onClick={onClick}
            className={cn(
              'gap-2 transition-all',
              isOpen && 'bg-primary text-primary-foreground',
              className
            )}
          >
            <Sparkles className={cn('h-4 w-4', isOpen && 'animate-pulse')} />
            <span className="hidden sm:inline">AI Assistant</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>AI Assistant (Cmd/Ctrl + J)</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
