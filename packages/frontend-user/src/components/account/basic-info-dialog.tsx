'use client';

import { FormEvent, useEffect, useState } from 'react';
import { AlertCircle, Loader2, UserRound } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/stores/auth-store';

interface BasicInfoDialogProps {
  open: boolean;
  mode: 'complete' | 'edit';
  onOpenChange: (open: boolean) => void;
}

export function BasicInfoDialog({ open, mode, onOpenChange }: BasicInfoDialogProps) {
  const { user, updateUser } = useAuthStore();
  const [firstName, setFirstName] = useState(user?.firstName?.trim() || '');
  const [lastName, setLastName] = useState(user?.lastName?.trim() || '');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isCompletionMode = mode === 'complete';

  useEffect(() => {
    if (open) {
      setFirstName(user?.firstName?.trim() || '');
      setLastName(user?.lastName?.trim() || '');
      setError(null);
    }
  }, [open, user?.firstName, user?.lastName]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (isCompletionMode && !user?.profileCompleted && !nextOpen) {
      return;
    }
    onOpenChange(nextOpen);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedFirstName = firstName.trim();
    const trimmedLastName = lastName.trim();

    if (!trimmedFirstName || !trimmedLastName) {
      setError('First name and last name are required.');
      return;
    }

    try {
      setIsSaving(true);
      setError(null);
      await updateUser({ firstName: trimmedFirstName, lastName: trimmedLastName });
      onOpenChange(false);
    } catch (err: any) {
      setError(err?.message || 'Failed to save.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="sm:max-w-[460px]"
        onEscapeKeyDown={(event) => {
          if (isCompletionMode && !user?.profileCompleted) {
            event.preventDefault();
          }
        }}
        onInteractOutside={(event) => {
          if (isCompletionMode && !user?.profileCompleted) {
            event.preventDefault();
          }
        }}
      >
        <DialogHeader>
          <div className="mb-2 grid h-10 w-10 place-items-center rounded-full bg-muted text-muted-foreground">
            <UserRound className="h-5 w-5" />
          </div>
          <DialogTitle>
            {isCompletionMode ? 'Finish your basic info' : 'My Account'}
          </DialogTitle>
          <DialogDescription>
            {isCompletionMode
              ? 'Add your first and last name to finish setting up your workspace.'
              : 'Update the name shown in your workspace.'}
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit}>
          {error ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Could not save</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          {!isCompletionMode ? (
            <div className="space-y-1.5">
              <p className="text-sm font-medium text-foreground">Email address</p>
              <p className="rounded-md border bg-muted/35 px-3 py-2.5 text-sm text-muted-foreground">
                {user?.email || 'No email available'}
              </p>
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="basic-info-first-name">First name</Label>
              <Input
                id="basic-info-first-name"
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                placeholder="Jane"
                disabled={isSaving}
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="basic-info-last-name">Last name</Label>
              <Input
                id="basic-info-last-name"
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                placeholder="Doe"
                disabled={isSaving}
              />
            </div>
          </div>

          <DialogFooter className="gap-3 sm:gap-2 sm:space-x-0">
            {!isCompletionMode ? (
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
                Cancel
              </Button>
            ) : null}
            <Button type="submit" disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
