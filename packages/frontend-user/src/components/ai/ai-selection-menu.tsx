'use client';

import React, { useState } from 'react';
import { Sparkles, Check, Wand2, BookOpen, Loader2, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import api from '@/lib/api-client';
import { AISuggestionDialog } from './ai-suggestion-dialog';

interface SelectionInfo {
  text: string;
  start: number;
  end: number;
  rect: DOMRect;
}

interface AISelectionMenuProps {
  documentId: string;
  selection: SelectionInfo;
  onClose: () => void;  // Called when user clicks outside or action completes
  replaceSelection: (newText: string) => void;
  cancelAIAction: () => void; // Called when user rejects AI suggestion
  onActionApplied?: (actionType: ActionType, originalText: string, newText: string) => void;
  onAskAI?: (selectedText: string) => void;
}

export type ActionType = 'grammar' | 'improve' | 'simplify' | 'formal';

interface PendingSuggestion {
  actionType: ActionType;
  actionLabel: string;
  originalText: string;
  suggestedText: string;
}

// Define the available AI actions with their prompts and icons
const ACTIONS: { type: ActionType; label: string; icon: React.ReactNode; prompt: string }[] = [
  {
    type: 'grammar',
    label: 'Fix grammar',
    icon: <Check className="h-3.5 w-3.5" />,
    prompt: 'Fix any grammar, spelling, and punctuation errors in the following text. Only return the corrected text without any explanation:',
  },
  {
    type: 'improve',
    label: 'Improve writing',
    icon: <Wand2 className="h-3.5 w-3.5" />,
    prompt: 'Improve the following text to make it clearer and more professional while keeping the same meaning. Only return the improved text without any explanation:',
  },
  {
    type: 'simplify',
    label: 'Simplify',
    icon: <BookOpen className="h-3.5 w-3.5" />,
    prompt: 'Simplify the following text to make it easier to understand while keeping the same meaning. Only return the simplified text without any explanation:',
  },
  {
    type: 'formal',
    label: 'Make formal',
    icon: <Sparkles className="h-3.5 w-3.5" />,
    prompt: 'Rewrite the following text in a more formal and professional tone. Only return the formal text without any explanation:',
  },
];

export function AISelectionMenu({
  documentId,
  selection,
  onClose: _onClose,  // Available but not currently used - replaceSelection handles closing
  replaceSelection,
  cancelAIAction,
  onActionApplied,
  onAskAI,
}: AISelectionMenuProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingAction, setLoadingAction] = useState<ActionType | null>(null);
  const [pendingSuggestion, setPendingSuggestion] = useState<PendingSuggestion | null>(null);

  const handleAction = async (action: typeof ACTIONS[number]) => {
    if (isLoading) return;

    setIsLoading(true);
    setLoadingAction(action.type);

    try {
      // Call the AI chat endpoint with silent flag to avoid creating session/logs
      // Response format: { success: true, data: { message: { id, role, content } } }
      const result = await api.post<{
        success: boolean;
        data: {
          message: { id: string; role: string; content: string };
        };
      }>('/ai/chat', {
        documentId,
        message: `${action.prompt}\n\n"${selection.text}"`,
        silent: true, // Don't save to chat history
        context: {
          selectedText: selection.text,
        },
      });

      // Extract the improved text from the message content
      let improvedText = result.data?.message?.content || '';

      if (!improvedText) {
        console.error('AI response was empty');
        return;
      }

      // Clean up the response - remove surrounding quotes if present
      improvedText = improvedText.trim();
      if (improvedText.startsWith('"') && improvedText.endsWith('"')) {
        improvedText = improvedText.slice(1, -1);
      }
      if (improvedText.startsWith("'") && improvedText.endsWith("'")) {
        improvedText = improvedText.slice(1, -1);
      }

      // Show confirmation dialog instead of auto-applying
      setPendingSuggestion({
        actionType: action.type,
        actionLabel: action.label,
        originalText: selection.text,
        suggestedText: improvedText,
      });
    } catch (error) {
      console.error('AI action failed:', error);
      // Don't close on error, let user try again
    } finally {
      setIsLoading(false);
      setLoadingAction(null);
    }
  };

  const handleAcceptSuggestion = async () => {
    console.log('[AISelectionMenu] Accept button clicked', { pendingSuggestion });
    if (!pendingSuggestion) {
      console.warn('[AISelectionMenu] No pending suggestion found');
      return;
    }

    console.log('[AISelectionMenu] About to call replaceSelection with:', pendingSuggestion.suggestedText);
    console.log('[AISelectionMenu] replaceSelection function:', replaceSelection);

    // Replace the selected text with the AI suggestion
    replaceSelection(pendingSuggestion.suggestedText);
    console.log('[AISelectionMenu] replaceSelection called');

    // Track the action in event history (local tracking)
    if (onActionApplied) {
      console.log('[AISelectionMenu] Tracking action in event history');
      onActionApplied(
        pendingSuggestion.actionType,
        pendingSuggestion.originalText,
        pendingSuggestion.suggestedText
      );
    }

    // Track the acceptance in the backend for certificate statistics
    try {
      await api.post('/ai/selection-action', {
        documentId,
        actionType: pendingSuggestion.actionType,
        originalText: pendingSuggestion.originalText,
        suggestedText: pendingSuggestion.suggestedText,
        decision: 'accepted',
      });
      console.log('[AISelectionMenu] Selection action tracked (accepted)');
    } catch (error) {
      console.error('[AISelectionMenu] Failed to track selection action:', error);
      // Don't block the user flow if tracking fails
    }

    // Clear the pending suggestion
    console.log('[AISelectionMenu] Clearing pending suggestion');
    setPendingSuggestion(null);
  };

  const handleRejectSuggestion = async () => {
    console.log('[AISelectionMenu] Reject button clicked');

    // Track the rejection in the backend for certificate statistics
    if (pendingSuggestion) {
      try {
        await api.post('/ai/selection-action', {
          documentId,
          actionType: pendingSuggestion.actionType,
          originalText: pendingSuggestion.originalText,
          suggestedText: pendingSuggestion.suggestedText,
          decision: 'rejected',
        });
        console.log('[AISelectionMenu] Selection action tracked (rejected)');
      } catch (error) {
        console.error('[AISelectionMenu] Failed to track selection action:', error);
        // Don't block the user flow if tracking fails
      }
    }

    // Unlock the selection popup so it can be closed normally
    cancelAIAction();
    // Simply close the dialog without making any changes
    setPendingSuggestion(null);
  };

  return (
    <div
      className={cn(
        'flex items-center gap-0.5 rounded-lg border bg-background/95 backdrop-blur-sm shadow-lg p-1',
        'animate-in fade-in-0 zoom-in-95 duration-150'
      )}
    >
      {ACTIONS.map((action) => (
        <Button
          key={action.type}
          variant="ghost"
          size="sm"
          className={cn(
            'h-8 px-2.5 text-xs font-medium gap-1.5',
            'hover:bg-violet-50 hover:text-violet-700',
            loadingAction === action.type && 'bg-violet-50 text-violet-700'
          )}
          onClick={() => handleAction(action)}
          disabled={isLoading}
        >
          {loadingAction === action.type ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            action.icon
          )}
          {action.label}
        </Button>
      ))}
      {onAskAI && (
        <>
          <div className="w-px h-5 bg-border mx-0.5" />
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              'h-8 px-2.5 text-xs font-medium gap-1.5',
              'hover:bg-violet-50 hover:text-violet-700'
            )}
            onClick={() => onAskAI(selection.text)}
            disabled={isLoading}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            Ask AI
          </Button>
        </>
      )}

      {/* AI Suggestion Confirmation Dialog */}
      {pendingSuggestion && (
        <AISuggestionDialog
          isOpen={true}
          onClose={() => setPendingSuggestion(null)}
          onAccept={handleAcceptSuggestion}
          onReject={handleRejectSuggestion}
          title={`${pendingSuggestion.actionLabel} - Review Suggestion`}
          originalText={pendingSuggestion.originalText}
          suggestedText={pendingSuggestion.suggestedText}
        />
      )}
    </div>
  );
}
