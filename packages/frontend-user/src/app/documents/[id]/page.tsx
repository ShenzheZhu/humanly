'use client';

import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Save, FileText, Clock, Award } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { LexicalEditor } from '@humory/editor';
import { useDocument } from '@/hooks/use-document';
import { useCertificates } from '@/hooks/use-certificates';
import { useAuthStore } from '@/stores/auth-store';
import { useToast } from '@/components/ui/use-toast';
import {
  CertificateGenerationDialog,
  type CertificateGenerationOptions,
} from '@/components/certificates/certificate-generation-dialog';
import type { TrackedEvent } from '@humory/editor';
import { useState, useEffect } from 'react';

export default function DocumentEditorPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const documentId = params.id as string;
  const { user } = useAuthStore();
  const {
    document,
    isLoading,
    error,
    isSaving,
    updateDocument,
    trackEvents,
  } = useDocument(documentId);
  const { generateCertificate } = useCertificates();

  const [title, setTitle] = useState('');
  const [isTitleEditing, setIsTitleEditing] = useState(false);
  const [isGeneratingCertificate, setIsGeneratingCertificate] = useState(false);
  const [showCertificateDialog, setShowCertificateDialog] = useState(false);

  useEffect(() => {
    if (document) {
      setTitle(document.title || '');
    }
  }, [document]);

  const handleTitleSave = async () => {
    if (!document) return;
    try {
      await updateDocument(document.content, document.plainText || '');
      setIsTitleEditing(false);
      toast({
        title: 'Success',
        description: 'Document title updated',
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to update title',
        variant: 'destructive',
      });
    }
  };

  const handleContentChange = async (content: Record<string, any>, plainText: string) => {
    // Auto-save is handled by the AutoSavePlugin
  };

  const handleAutoSave = async (content: Record<string, any>, plainText: string) => {
    try {
      await updateDocument(content, plainText);
    } catch (err) {
      console.error('Auto-save failed:', err);
    }
  };

  const handleEventsBuffer = async (events: TrackedEvent[]) => {
    // Map TrackedEvent to DocumentEvent format
    const mappedEvents = events.map((event) => ({
      eventType: event.eventType,
      timestamp: event.timestamp,
      keyCode: event.keyCode,
      keyChar: event.keyChar,
      textBefore: event.textBefore,
      textAfter: event.textAfter,
      cursorPosition: event.cursorPosition,
      selectionStart: event.selectionStart,
      selectionEnd: event.selectionEnd,
      editorStateBefore: event.editorStateBefore,
      editorStateAfter: event.editorStateAfter,
      metadata: event.metadata,
    }));

    await trackEvents(mappedEvents);
  };

  const handleGenerateCertificate = async (options: CertificateGenerationOptions) => {
    try {
      setIsGeneratingCertificate(true);
      const certificate = await generateCertificate(documentId, {
        certificateType: 'full_authorship',
        ...options,
      });

      toast({
        title: 'Success',
        description: 'Certificate generated successfully',
      });

      setShowCertificateDialog(false);

      // Navigate to certificate detail page
      router.push(`/certificates/${certificate.id}`);
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Failed to generate certificate',
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingCertificate(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
          <p className="mt-4 text-muted-foreground">Loading document...</p>
        </div>
      </div>
    );
  }

  if (error || !document) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-destructive">{error || 'Document not found'}</p>
          <Button onClick={() => router.push('/documents')} className="mt-4">
            Back to Documents
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-background">
        <div className="mx-auto max-w-5xl px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push('/documents')}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="flex-1">
                {isTitleEditing ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="text-lg font-semibold"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleTitleSave();
                        } else if (e.key === 'Escape') {
                          setTitle(document.title || '');
                          setIsTitleEditing(false);
                        }
                      }}
                      autoFocus
                    />
                    <Button size="sm" onClick={handleTitleSave}>
                      Save
                    </Button>
                  </div>
                ) : (
                  <h1
                    className="cursor-pointer text-lg font-semibold hover:text-muted-foreground"
                    onClick={() => setIsTitleEditing(true)}
                  >
                    {title || 'Untitled Document'}
                  </h1>
                )}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-4">
              {isSaving && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Clock className="h-3 w-3 animate-spin" />
                  <span className="hidden sm:inline">Saving...</span>
                </Badge>
              )}
              <div className="text-xs sm:text-sm text-muted-foreground">
                {document.wordCount || 0} words
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/logs/${documentId}`)}
                className="sm:size-default"
              >
                <FileText className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">View Logs</span>
              </Button>
              <Button
                size="sm"
                onClick={() => setShowCertificateDialog(true)}
                disabled={isGeneratingCertificate}
                className="sm:size-default"
              >
                {isGeneratingCertificate ? (
                  <>
                    <Clock className="h-4 w-4 sm:mr-2 animate-spin" />
                    <span className="hidden sm:inline">Generating...</span>
                  </>
                ) : (
                  <>
                    <Award className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Generate Certificate</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Editor */}
      <div className="mx-auto max-w-5xl px-4 py-8">
        <LexicalEditor
          documentId={documentId}
          userId={user?.id}
          initialContent={document.content}
          placeholder="Start typing your document..."
          trackingEnabled={true}
          autoSaveEnabled={true}
          autoSaveInterval={30000}
          onContentChange={handleContentChange}
          onEventsBuffer={handleEventsBuffer}
          onAutoSave={handleAutoSave}
          className="min-h-[600px]"
        />
      </div>

      {/* Certificate Generation Dialog */}
      <CertificateGenerationDialog
        open={showCertificateDialog}
        onOpenChange={setShowCertificateDialog}
        onGenerate={handleGenerateCertificate}
        isGenerating={isGeneratingCertificate}
      />
    </div>
  );
}
