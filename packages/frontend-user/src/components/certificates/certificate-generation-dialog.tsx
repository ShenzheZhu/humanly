'use client';

import { useState } from 'react';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Award, Lock, FileText, History, User } from 'lucide-react';

interface CertificateGenerationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerate: (options: CertificateGenerationOptions) => void;
  isGenerating?: boolean;
}

export interface CertificateGenerationOptions {
  signerName?: string;
  includeFullText: boolean;
  includeEditHistory: boolean;
  accessCode?: string;
}

export function CertificateGenerationDialog({
  open,
  onOpenChange,
  onGenerate,
  isGenerating = false,
}: CertificateGenerationDialogProps) {
  const [signerName, setSignerName] = useState('');
  const [includeFullText, setIncludeFullText] = useState(true);
  const [includeEditHistory, setIncludeEditHistory] = useState(true);
  const [accessCode, setAccessCode] = useState('');
  const [confirmAccessCode, setConfirmAccessCode] = useState('');
  const [useAccessCode, setUseAccessCode] = useState(false);
  const [error, setError] = useState('');

  const handleGenerate = () => {
    setError('');

    // Validate access code if enabled
    if (useAccessCode) {
      if (!accessCode) {
        setError('Please enter an access code');
        return;
      }
      if (accessCode !== confirmAccessCode) {
        setError('Access codes do not match');
        return;
      }
      if (accessCode.length < 4) {
        setError('Access code must be at least 4 characters');
        return;
      }
    }

    onGenerate({
      signerName: signerName.trim() || undefined,
      includeFullText,
      includeEditHistory,
      accessCode: useAccessCode ? accessCode : undefined,
    });
  };

  const handleClose = () => {
    if (!isGenerating) {
      setSignerName('');
      setAccessCode('');
      setConfirmAccessCode('');
      setUseAccessCode(false);
      setError('');
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Award className="h-5 w-5 text-primary" />
            <DialogTitle>Generate Certificate</DialogTitle>
          </div>
          <DialogDescription>
            Configure your authorship certificate options
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Signer Name */}
          <div className="space-y-2">
            <Label htmlFor="signerName" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Signer Name (Optional)
            </Label>
            <Input
              id="signerName"
              placeholder="Leave empty to use your email"
              value={signerName}
              onChange={(e) => setSignerName(e.target.value)}
              disabled={isGenerating}
            />
            <p className="text-xs text-muted-foreground">
              Custom name to display on the certificate instead of your email
            </p>
          </div>

          {/* Include Full Text */}
          <div className="flex items-start space-x-3">
            <Checkbox
              id="includeFullText"
              checked={includeFullText}
              onCheckedChange={(checked) => setIncludeFullText(checked as boolean)}
              disabled={isGenerating}
            />
            <div className="flex-1 space-y-1">
              <Label
                htmlFor="includeFullText"
                className="flex items-center gap-2 cursor-pointer"
              >
                <FileText className="h-4 w-4" />
                Include Full Text
              </Label>
              <p className="text-xs text-muted-foreground">
                Include the complete text content in the certificate
              </p>
            </div>
          </div>

          {/* Include Edit History */}
          <div className="flex items-start space-x-3">
            <Checkbox
              id="includeEditHistory"
              checked={includeEditHistory}
              onCheckedChange={(checked) => setIncludeEditHistory(checked as boolean)}
              disabled={isGenerating}
            />
            <div className="flex-1 space-y-1">
              <Label
                htmlFor="includeEditHistory"
                className="flex items-center gap-2 cursor-pointer"
              >
                <History className="h-4 w-4" />
                Include Edit History
              </Label>
              <p className="text-xs text-muted-foreground">
                Include detailed keystroke and editing activity timeline
              </p>
            </div>
          </div>

          {/* Access Code Protection */}
          <div className="border-t pt-4 space-y-3">
            <div className="flex items-start space-x-3">
              <Checkbox
                id="useAccessCode"
                checked={useAccessCode}
                onCheckedChange={(checked) => setUseAccessCode(checked as boolean)}
                disabled={isGenerating}
              />
              <div className="flex-1 space-y-1">
                <Label
                  htmlFor="useAccessCode"
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <Lock className="h-4 w-4" />
                  Protect with Access Code
                </Label>
                <p className="text-xs text-muted-foreground">
                  Require a code to view the certificate
                </p>
              </div>
            </div>

            {useAccessCode && (
              <div className="ml-7 space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="accessCode">Access Code</Label>
                  <Input
                    id="accessCode"
                    type="password"
                    placeholder="Enter access code (min 4 characters)"
                    value={accessCode}
                    onChange={(e) => setAccessCode(e.target.value)}
                    disabled={isGenerating}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmAccessCode">Confirm Access Code</Label>
                  <Input
                    id="confirmAccessCode"
                    type="password"
                    placeholder="Re-enter access code"
                    value={confirmAccessCode}
                    onChange={(e) => setConfirmAccessCode(e.target.value)}
                    disabled={isGenerating}
                  />
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isGenerating}
          >
            Cancel
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <>
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-r-transparent mr-2" />
                Generating...
              </>
            ) : (
              <>
                <Award className="h-4 w-4 mr-2" />
                Generate Certificate
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
