'use client';

import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, FileText, Clock, Award, PanelLeftClose, PanelLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { AIAssistantButton, AIAssistantPanel, AISelectionMenu, type ActionType } from '@/components/ai';
import { useAI } from '@/hooks/use-ai';
import { useAIStore } from '@/stores/ai-store';
import type { TrackedEvent } from '@humory/editor';
import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';

// ✅ Overleaf-style: resizable panels
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable';

// Dynamically import PDFViewer with SSR disabled (PDF.js loaded from CDN)
const PDFViewer = dynamic(() => import('@/components/review/SimplePDFViewer'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full bg-gray-100">
      <p className="text-gray-600">Loading PDF viewer...</p>
    </div>
  ),
});

export default function DocumentEditorPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const documentId = params.id as string;
  const { user } = useAuthStore();
  const {
    document,
    linkedPaper,
    isLoading,
    error,
    isSaving,
    updateDocument,
    trackEvents,
  } = useDocument(documentId);
  const [showPdfPanel, setShowPdfPanel] = useState(true);
  const { generateCertificate } = useCertificates();

  const [title, setTitle] = useState('');
  const [isTitleEditing, setIsTitleEditing] = useState(false);
  const [isGeneratingCertificate, setIsGeneratingCertificate] = useState(false);
  const [showCertificateDialog, setShowCertificateDialog] = useState(false);

  // AI Assistant
  const {
    isPanelOpen: isAIPanelOpen,
    togglePanel: toggleAIPanel,
    closePanel: closeAIPanel,
  } = useAI(documentId);

  // Store document content for AI context
  const [currentContent, setCurrentContent] = useState<string>('');
  const [wordCount, setWordCount] = useState<number>(0);

  const calculateWordCount = useCallback((text: string): number => {
    if (!text || typeof text !== 'string') return 0;
    const words = text.trim().replace(/\s+/g, ' ').split(' ').filter((w) => w.length > 0);
    return words.length;
  }, []);

  useEffect(() => {
    if (document) {
      setTitle(document.title || '');
      setCurrentContent(document.plainText || '');
      setWordCount(document.wordCount || 0);
    }
  }, [document]);

  // Keyboard shortcut for AI Assistant (Cmd/Ctrl + J)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'j') {
        e.preventDefault();
        toggleAIPanel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleAIPanel]);

  const getFullContent = useCallback(() => currentContent, [currentContent]);

  const handleTitleSave = async () => {
    if (!document) return;
    try {
      await updateDocument(document.content, document.plainText || '');
      setIsTitleEditing(false);
      toast({ title: 'Success', description: 'Document title updated' });
    } catch {
      toast({ title: 'Error', description: 'Failed to update title', variant: 'destructive' });
    }
  };

  const handleContentChange = async (_content: Record<string, any>, plainText: string) => {
    setCurrentContent(plainText);
    setWordCount(calculateWordCount(plainText));
  };

  const handleAutoSave = async (content: Record<string, any>, plainText: string) => {
    try {
      await updateDocument(content, plainText);
    } catch (err) {
      console.error('Auto-save failed:', err);
    }
  };

  const handleEventsBuffer = async (events: TrackedEvent[]) => {
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

  const openPanelWithQuote = useAIStore((state) => state.openPanelWithQuote);
  const handleAskAI = useCallback((selectedText: string) => openPanelWithQuote(selectedText), [openPanelWithQuote]);

  const handleAISelectionAction = useCallback(
    async (actionType: ActionType, originalText: string, newText: string) => {
      const event = {
        eventType: 'ai_selection_action',
        timestamp: new Date(),
        textBefore: originalText,
        textAfter: newText,
        metadata: { actionType, originalText, newText },
      };
      await trackEvents([event as any]);
    },
    [trackEvents]
  );

  const handleGenerateCertificate = async (options: CertificateGenerationOptions) => {
    try {
      setIsGeneratingCertificate(true);
      const certificate = await generateCertificate(documentId, {
        certificateType: 'full_authorship',
        ...options,
      });

      toast({ title: 'Success', description: 'Certificate generated successfully' });
      setShowCertificateDialog(false);
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

  // ✅ Overleaf-style canvas: nearly full-width with minimal padding
  // px-2 gives a tiny gutter on edges for a more spacious panel layout
  const CANVAS = 'mx-auto w-full max-w-[2400px] px-3';

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <div className="border-b bg-background shrink-0">
        <div className={`${CANVAS} py-4`}>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <Button variant="ghost" size="icon" onClick={() => router.push('/documents')}>
                <ArrowLeft className="h-4 w-4" />
              </Button>

              <div className="flex-1 min-w-0">
                {isTitleEditing ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="text-lg font-semibold"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleTitleSave();
                        else if (e.key === 'Escape') {
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
                    className="cursor-pointer text-lg font-semibold hover:text-muted-foreground truncate"
                    onClick={() => setIsTitleEditing(true)}
                    title={title || 'Untitled Document'}
                  >
                    {title || 'Untitled Document'}
                  </h1>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
              {linkedPaper && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPdfPanel(!showPdfPanel)}
                  title={showPdfPanel ? 'Hide PDF' : 'Show PDF'}
                >
                  {showPdfPanel ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
                  <span className="hidden sm:inline ml-1">PDF</span>
                </Button>
              )}

              {isSaving && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Clock className="h-3 w-3 animate-spin" />
                  <span className="hidden sm:inline">Saving...</span>
                </Badge>
              )}

              <div className="hidden sm:block text-sm text-muted-foreground">{wordCount} words</div>

              <AIAssistantButton isOpen={isAIPanelOpen} onClick={toggleAIPanel} />

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

      {/* Main content */}
      <div className="flex-1 overflow-hidden">
        <div className={`${CANVAS} h-full py-3`}>
          {/* ✅ Resizable like Overleaf */}
          <ResizablePanelGroup direction="horizontal" className="h-full w-full rounded-md border bg-background">
            {/* PDF */}
            {linkedPaper && showPdfPanel ? (
              <ResizablePanel defaultSize={38} minSize={22}>
                <div className="h-full border-r bg-background overflow-hidden">
                  <PDFViewer paperId={linkedPaper.id} documentId={documentId} onCommentAdd={() => {}} comments={[]} />
                </div>
              </ResizablePanel>
            ) : null}

            {linkedPaper && showPdfPanel ? <ResizableHandle withHandle /> : null}

            {/* Editor */}
            <ResizablePanel
              defaultSize={linkedPaper && showPdfPanel ? (isAIPanelOpen ? 37 : 62) : (isAIPanelOpen ? 70 : 100)}
              minSize={30}
            >
              <div className="h-full overflow-auto">
                <div className={`${linkedPaper || isAIPanelOpen ? 'px-4 py-4' : 'px-6 py-6'} h-full`}>
                  <LexicalEditor
                    documentId={documentId}
                    userId={user?.id}
                    initialContent={document.content}
                    placeholder={linkedPaper ? 'Write your review here...' : 'Start typing your document...'}
                    trackingEnabled={true}
                    autoSaveEnabled={true}
                    autoSaveInterval={30000}
                    onContentChange={handleContentChange}
                    onEventsBuffer={handleEventsBuffer}
                    onAutoSave={handleAutoSave}
                    className="h-full"
                    renderSelectionPopup={({ selection, onClose, replaceSelection }) => (
                      <AISelectionMenu
                        documentId={documentId}
                        selection={selection}
                        onClose={onClose}
                        replaceSelection={replaceSelection}
                        onActionApplied={handleAISelectionAction}
                        onAskAI={(text) => {
                          onClose();
                          handleAskAI(text);
                        }}
                      />
                    )}
                  />
                </div>
              </div>
            </ResizablePanel>

            {/* AI */}
            {isAIPanelOpen ? (
              <>
                <ResizableHandle withHandle />
                <ResizablePanel defaultSize={25} minSize={18}>
                  <div className="h-full border-l bg-background overflow-hidden">
                    <AIAssistantPanel documentId={documentId} onClose={closeAIPanel} getFullContent={getFullContent} />
                  </div>
                </ResizablePanel>
              </>
            ) : null}
          </ResizablePanelGroup>
        </div>
      </div>

      <CertificateGenerationDialog
        open={showCertificateDialog}
        onOpenChange={setShowCertificateDialog}
        onGenerate={handleGenerateCertificate}
        isGenerating={isGeneratingCertificate}
      />
    </div>
  );
}