'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CalendarClock, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { Document } from '@humanly/shared';

interface WritingTimerCardState {
  expired: boolean;
  label: string;
  value: string;
  detail: string;
}

interface DocumentCardProps {
  document: Document & { displayTitle?: string };
  timerState?: WritingTimerCardState | null;
  onDelete: (id: string) => Promise<void>;
  variant?: 'card' | 'list';
}

export function DocumentCard({ document, timerState, onDelete, variant = 'card' }: DocumentCardProps) {
  const router = useRouter();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      setIsDeleting(true);
      await onDelete(document.id);
      setShowDeleteDialog(false);
    } catch (error) {
      console.error('Failed to delete document:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const characterCount = document.characterCount ?? (document.plainText || '').length;
  const showPreview = characterCount > 100;
  const displayTitle = document.displayTitle || document.title || 'Untitled Document';
  const documentHref = `/documents/${document.id}`;

  if (variant === 'list') {
    return (
      <>
        <Link href={documentHref} className="block">
          <div className="group flex min-h-[4.75rem] cursor-pointer flex-col gap-3 border-b border-border/70 px-1 py-3 transition-colors hover:bg-muted/35 sm:flex-row sm:items-center sm:gap-5 sm:px-2">
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-start gap-2">
                <h3 className="min-w-0 flex-1 truncate text-base font-semibold text-foreground sm:text-lg">
                  {displayTitle}
                </h3>
                {timerState?.expired && (
                  <Badge variant="secondary" className="shrink-0 rounded-md">
                    Read-only
                  </Badge>
                )}
              </div>

              <div className="mt-1 text-xs text-muted-foreground">
                Last edited {formatDate(document.updatedAt || document.createdAt)} · {characterCount.toLocaleString()} characters
              </div>

              {timerState && (
                <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                  <CalendarClock className="h-3.5 w-3.5 shrink-0 text-accent" />
                  <span className="font-medium text-foreground">{timerState.value}</span>
                  <span>{timerState.detail}</span>
                </div>
              )}
            </div>

            <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border/60 pt-3 sm:border-t-0 sm:pt-0">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={(e) => {
                  e.preventDefault();
                  router.push(documentHref);
                }}
              >
                {timerState?.expired ? 'Open Read-only' : 'Open'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs text-muted-foreground hover:text-foreground"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowDeleteDialog(true);
                }}
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Delete
              </Button>
            </div>
          </div>
        </Link>

        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Document</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete &quot;{document.title || 'this document'}&quot;?
                This action cannot be undone and will also delete all associated tracking events.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={isDeleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }

  return (
    <>
      <Link
        href={documentHref}
        className="block h-full"
      >
        <Card className="group flex h-full min-h-[18rem] cursor-pointer transition-colors hover:border-foreground/30">
          <CardContent className="flex h-full flex-1 flex-col gap-3 p-4 sm:p-5">
            <div className="flex items-start justify-between gap-2">
              <h3 className="min-w-0 text-base font-semibold leading-snug text-foreground line-clamp-2 sm:text-lg">
                {displayTitle}
              </h3>
              {timerState?.expired && (
                <Badge variant="secondary" className="shrink-0 rounded-md">
                  Read-only
                </Badge>
              )}
            </div>

            <div className="text-xs text-muted-foreground">
              Last edited {formatDate(document.updatedAt || document.createdAt)} · {characterCount.toLocaleString()} characters
            </div>

            {timerState && (
              <div className="flex items-start gap-2 rounded-lg border border-border/70 bg-muted/35 p-3 text-sm">
                <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                <div className="min-w-0">
                  <p className="humanly-eyebrow">
                    {timerState.label}
                  </p>
                  <p className="font-semibold">{timerState.value}</p>
                  <p className="text-xs text-muted-foreground">{timerState.detail}</p>
                </div>
              </div>
            )}

            {/* Preview text */}
            {showPreview && document.plainText && (
              <p className="text-sm leading-6 text-muted-foreground/80 line-clamp-2">
                {document.plainText}
              </p>
            )}

            <div className="mt-auto flex items-center justify-end gap-2 border-t border-border/60 pt-3">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={(e) => {
                  e.preventDefault();
                  router.push(documentHref);
                }}
              >
                {timerState?.expired ? 'Open Read-only' : 'Open'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs text-muted-foreground hover:text-foreground"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowDeleteDialog(true);
                }}
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Delete
              </Button>
            </div>
          </CardContent>
        </Card>
      </Link>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{document.title || 'this document'}&quot;?
              This action cannot be undone and will also delete all associated tracking events.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
