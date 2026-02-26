'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Check, X } from 'lucide-react';

interface AISuggestionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept: () => void;
  onReject: () => void;
  title: string;
  originalText: string;
  suggestedText: string;
  isLoading?: boolean;
}

export function AISuggestionDialog({
  isOpen,
  onClose,
  onAccept,
  onReject,
  title,
  originalText,
  suggestedText,
  isLoading = false,
}: AISuggestionDialogProps) {
  const handleAccept = () => {
    console.log('[AISuggestionDialog] Accept button clicked');
    onAccept();
    console.log('[AISuggestionDialog] onAccept called, now closing dialog');
    onClose();
  };

  const handleReject = () => {
    console.log('[AISuggestionDialog] Reject button clicked');
    onReject();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[70vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-base">{title}</DialogTitle>
          <DialogDescription className="text-xs">
            Review the AI suggestion below. Accept to replace the selected text, or reject to keep the original.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto space-y-3 py-3">
          {/* Original Text */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="h-px flex-1 bg-border" />
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                Original
              </span>
              <div className="h-px flex-1 bg-border" />
            </div>
            <div className="rounded-md border bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground whitespace-pre-wrap break-words">
                {originalText}
              </p>
            </div>
          </div>

          {/* Suggested Text */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="h-px flex-1 bg-border" />
              <span className="text-[10px] font-medium text-violet-600 uppercase tracking-wide">
                AI Suggestion
              </span>
              <div className="h-px flex-1 bg-border" />
            </div>
            <div className="rounded-md border border-violet-200 bg-violet-50/50 p-3">
              <p className="text-xs text-foreground whitespace-pre-wrap break-words">
                {suggestedText}
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleReject}
            disabled={isLoading}
            className="gap-1.5"
          >
            <X className="h-3.5 w-3.5" />
            Reject
          </Button>
          <Button
            size="sm"
            onClick={handleAccept}
            disabled={isLoading}
            className="gap-1.5 bg-violet-600 hover:bg-violet-700"
          >
            <Check className="h-3.5 w-3.5" />
            Accept & Replace
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
