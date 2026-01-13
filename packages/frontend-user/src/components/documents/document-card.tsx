'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import type { Document } from '@humory/shared';

interface DocumentCardProps {
  document: Document & { displayTitle?: string };
  onDelete: (id: string) => Promise<void>;
}

export function DocumentCard({ document, onDelete }: DocumentCardProps) {
  const router = useRouter();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

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

  const wordCount = document.wordCount || 0;
  const isTrivial = wordCount < 10;
  const showPreview = wordCount > 20;
  const displayTitle = document.displayTitle || document.title || 'Untitled Document';

  return (
    <>
      <Link
        href={`/documents/${document.id}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="block h-full"
      >
        <Card className="transition-shadow hover:shadow-md cursor-pointer h-full flex flex-col border-border/40">
          <CardContent className="p-5 flex flex-col gap-3 flex-1">
            {/* Title */}
            <h3 className="text-lg font-semibold line-clamp-2 text-foreground">
              {displayTitle}
            </h3>

            {/* Metadata row */}
            <div className="text-xs text-muted-foreground">
              Last edited {formatDate(document.updatedAt || document.createdAt)} · {wordCount} words
            </div>

            {/* Preview text (only if > 20 words) */}
            {showPreview && document.plainText && (
              <p className="text-sm text-muted-foreground/80 line-clamp-2">
                {document.plainText}
              </p>
            )}

            {/* Spacer */}
            <div className="flex-1" />

            {/* Hover actions - always reserve space */}
            <div className={`flex items-center justify-end gap-2 mt-2 h-8 transition-opacity ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs"
                onClick={(e) => {
                  e.preventDefault();
                  router.push(`/documents/${document.id}`);
                }}
              >
                Open
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
              Are you sure you want to delete "{document.title || 'this document'}"?
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
