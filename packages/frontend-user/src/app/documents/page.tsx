'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, FileText, KeyRound, Plus, Trash2, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { DocumentCard } from '@/components/documents/document-card';
import { useDocuments } from '@/hooks/use-documents';
import { useToast } from '@/components/ui/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { apiClient } from '@/lib/api-client';

type SortOption = 'lastEdited' | 'title' | 'wordCount';

interface ProjectEnrollment {
  id: string;
  name: string;
  inviteCode: string;
  documentId: string;
  joinedAt: string;
  description?: string;
}

const PROJECT_ENROLLMENTS_KEY = 'humanly.projectEnrollments';

const readProjectEnrollments = (): ProjectEnrollment[] => {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(PROJECT_ENROLLMENTS_KEY) || '[]');
  } catch {
    return [];
  }
};

const writeProjectEnrollments = (enrollments: ProjectEnrollment[]) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(PROJECT_ENROLLMENTS_KEY, JSON.stringify(enrollments));
};

const getDisplayProjectName = (project: ProjectEnrollment) => {
  const name = project.name?.trim();
  if (!name || name === 'Project Name') return `Project ${project.inviteCode}`;
  return name;
};

export default function DocumentsPage() {
  const router = useRouter();
  const { documents, isLoading, error, createDocument, deleteDocument } = useDocuments();
  const { toast } = useToast();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newDocTitle, setNewDocTitle] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('lastEdited');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [showJoinDialog, setShowJoinDialog] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<ProjectEnrollment | null>(null);
  const [inviteCode, setInviteCode] = useState('');
  const [isJoiningProject, setIsJoiningProject] = useState(false);
  const [projectEnrollments, setProjectEnrollments] = useState<ProjectEnrollment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isCreatingRef = useRef(false);

  useEffect(() => {
    setProjectEnrollments(readProjectEnrollments());
  }, []);

  useEffect(() => {
    if (projectEnrollments.length === 0) return;

    let cancelled = false;

    const refreshProjectNames = async () => {
      const refreshed = await Promise.all(
        projectEnrollments.map(async (project) => {
          try {
            const response = await apiClient.post('/projects/join', { inviteCode: project.inviteCode });
            const projectFromApi = response.data?.data?.project || response.data?.data || null;

            if (!projectFromApi?.name) return project;

            return {
              ...project,
              id: projectFromApi.id || project.id,
              name: projectFromApi.name,
              description: projectFromApi.description || project.description,
            };
          } catch {
            return project;
          }
        })
      );

      if (cancelled) return;

      const changed = refreshed.some((project, index) => (
        project.name !== projectEnrollments[index].name ||
        project.description !== projectEnrollments[index].description ||
        project.id !== projectEnrollments[index].id
      ));

      if (changed) {
        setProjectEnrollments(refreshed);
        writeProjectEnrollments(refreshed);
      }
    };

    refreshProjectNames();

    return () => {
      cancelled = true;
    };
  }, [projectEnrollments]);

  useEffect(() => {
    if (isLoading || !documents) return;
    const existingDocumentIds = new Set(documents.map((document) => document.id));
    const nextEnrollments = projectEnrollments.filter((project) => (
      existingDocumentIds.has(project.documentId)
    ));

    if (nextEnrollments.length !== projectEnrollments.length) {
      setProjectEnrollments(nextEnrollments);
      writeProjectEnrollments(nextEnrollments);
    }
  }, [documents, isLoading, projectEnrollments]);

  const handlePdfSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      toast({ title: 'Error', description: 'Please select a PDF file', variant: 'destructive' });
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      toast({ title: 'Error', description: 'PDF must be smaller than 50MB', variant: 'destructive' });
      return;
    }
    setPdfFile(file);
    if (!newDocTitle.trim()) {
      setNewDocTitle(file.name.replace(/\.pdf$/i, ''));
    }
  };

  const handleCreateDocument = useCallback(async () => {
    if (!newDocTitle.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a document title',
        variant: 'destructive',
      });
      return;
    }

    // Prevent double submission from Enter key + button click racing
    if (isCreatingRef.current) return;
    isCreatingRef.current = true;

    try {
      setIsCreating(true);
      const document = await createDocument(newDocTitle, pdfFile || undefined);
      setShowCreateDialog(false);
      setNewDocTitle('');
      setPdfFile(null);
      toast({
        title: 'Success',
        description: pdfFile ? 'Document created with PDF for review' : 'Document created successfully',
      });
      router.push(`/documents/${document.id}`);
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Failed to create document',
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
      isCreatingRef.current = false;
    }
  }, [newDocTitle, pdfFile, createDocument, toast, router]);

  const handleDeleteDocument = async (documentId: string) => {
    try {
      await deleteDocument(documentId);
      toast({
        title: 'Success',
        description: 'Document deleted successfully',
      });
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Failed to delete document',
        variant: 'destructive',
      });
    }
  };

  const removeProjectEnrollment = (project: ProjectEnrollment) => {
    const nextEnrollments = projectEnrollments.filter(
      (enrollment) => enrollment.documentId !== project.documentId
    );
    setProjectEnrollments(nextEnrollments);
    writeProjectEnrollments(nextEnrollments);
  };

  const handleDeleteProjectEnrollment = async () => {
    if (!projectToDelete) return;

    try {
      await apiClient.delete(`/projects/enrollments/${projectToDelete.id}`);
      await deleteDocument(projectToDelete.documentId);
      removeProjectEnrollment(projectToDelete);
      toast({
        title: 'Project removed',
        description: 'The project submission was deleted from your dashboard',
      });
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Failed to delete project',
        variant: 'destructive',
      });
    } finally {
      setProjectToDelete(null);
    }
  };

  const handleJoinProject = useCallback(async () => {
    const normalizedCode = inviteCode.trim().toUpperCase();
    if (!/^[A-Z0-9]{6}$/.test(normalizedCode)) {
      toast({
        title: 'Error',
        description: 'Invite code must be 6 letters or numbers',
        variant: 'destructive',
      });
      return;
    }

    if (projectEnrollments.some((project) => project.inviteCode === normalizedCode)) {
      toast({
        title: 'Already joined',
        description: 'This project is already on your dashboard',
      });
      setShowJoinDialog(false);
      setInviteCode('');
      return;
    }

    try {
      setIsJoiningProject(true);

      const response = await apiClient.post('/projects/join', { inviteCode: normalizedCode });
      const enrollmentFromApi: Partial<ProjectEnrollment> | null = response.data?.data?.project || response.data?.data || null;

      if (!enrollmentFromApi?.name) {
        throw new Error('Project invite code not found');
      }

      const document = await createDocument(
        `${enrollmentFromApi.name} Submission`
      );

      const enrollment: ProjectEnrollment = {
        id: enrollmentFromApi?.id || normalizedCode,
        name: enrollmentFromApi.name,
        description: enrollmentFromApi?.description || 'Project joined with invite code',
        inviteCode: normalizedCode,
        documentId: document.id,
        joinedAt: new Date().toISOString(),
      };

      await apiClient.put(`/projects/enrollments/${enrollment.id}/submission-document`, {
        documentId: document.id,
      });

      const nextEnrollments = [...projectEnrollments, enrollment];
      setProjectEnrollments(nextEnrollments);
      writeProjectEnrollments(nextEnrollments);
      setShowJoinDialog(false);
      setInviteCode('');

      toast({
        title: 'Project joined',
        description: 'A project submission document was added to your dashboard',
      });
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Failed to join project',
        variant: 'destructive',
      });
    } finally {
      setIsJoiningProject(false);
    }
  }, [createDocument, inviteCode, projectEnrollments, toast]);

  const documentIds = new Set((documents || []).map((document) => document.id));
  const validProjectEnrollments = projectEnrollments.filter((project) => (
    documentIds.has(project.documentId)
  ));
  const projectDocumentIds = new Set(validProjectEnrollments.map((project) => project.documentId));
  const personalDocuments = (documents || [])
    .filter((document) => !projectDocumentIds.has(document.id))
    .sort((a, b) => {
      if (sortBy === 'title') {
        return (a.title || '').localeCompare(b.title || '');
      }
      if (sortBy === 'wordCount') {
        return (b.wordCount || 0) - (a.wordCount || 0);
      }
      return new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime();
    });

  // Container classes for centered content with max-width
  const containerClass = "mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8";

  if (isLoading) {
    return (
      <main className={containerClass}>
        <div className="mb-8">
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className={containerClass}>
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="text-center">
            <p className="text-destructive">{error}</p>
            <Button onClick={() => window.location.reload()} className="mt-4">
              Retry
            </Button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className={containerClass}>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">My Documents</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Create and manage your documents with authorship tracking
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Dialog open={showJoinDialog} onOpenChange={setShowJoinDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full sm:w-auto">
                <KeyRound className="mr-2 h-4 w-4" />
                Join Project
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Join Project</DialogTitle>
                <DialogDescription>
                  Enter the 6-character invite code from your instructor or admin.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-2 py-4">
                <Label htmlFor="invite-code">Invite Code</Label>
                <Input
                  id="invite-code"
                  value={inviteCode}
                  maxLength={6}
                  placeholder="A7K2QX"
                  className="font-mono uppercase tracking-widest"
                  onChange={(event) => setInviteCode(event.target.value.toUpperCase())}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      handleJoinProject();
                    }
                  }}
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowJoinDialog(false)} disabled={isJoiningProject}>
                  Cancel
                </Button>
                <Button onClick={handleJoinProject} disabled={isJoiningProject}>
                  {isJoiningProject ? 'Joining...' : 'Join Project'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto">
                <Plus className="mr-2 h-4 w-4" />
                New Document
              </Button>
            </DialogTrigger>
          <DialogContent className="overflow-hidden sm:max-w-xl">
            <DialogHeader>
              <DialogTitle>Create New Document</DialogTitle>
              <DialogDescription>
                Enter a title for your new document. Optionally upload a PDF to review it in a 3-panel workspace.
              </DialogDescription>
            </DialogHeader>
            <div className="grid min-w-0 gap-4 py-4">
              <div className="grid min-w-0 gap-2">
                <Label htmlFor="title">Document Title</Label>
                <Input
                  id="title"
                  placeholder="My Research Paper"
                  value={newDocTitle}
                  onChange={(e) => setNewDocTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleCreateDocument();
                    }
                  }}
                />
              </div>

              {/* PDF Upload */}
              <div className="grid min-w-0 gap-2">
                <Label>Upload PDF (optional)</Label>
                {pdfFile ? (
                  <div className="flex max-w-full min-w-0 items-center gap-3 overflow-hidden rounded-lg border bg-muted/50 p-3">
                    <FileText className="h-8 w-8 text-red-500 shrink-0" />
                    <div className="min-w-0 flex-1 overflow-hidden">
                      <p className="truncate text-sm font-medium" title={pdfFile.name}>
                        {pdfFile.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {(pdfFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0"
                      onClick={() => {
                        setPdfFile(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div
                    className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Click to upload a PDF for review
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      PDF up to 50MB
                    </p>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf"
                  onChange={handlePdfSelect}
                  className="hidden"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => { setShowCreateDialog(false); setPdfFile(null); }}
                disabled={isCreating}
              >
                Cancel
              </Button>
              <Button onClick={handleCreateDocument} disabled={isCreating}>
                {isCreating ? 'Creating...' : pdfFile ? 'Create & Upload PDF' : 'Create Document'}
              </Button>
            </DialogFooter>
          </DialogContent>
          </Dialog>
        </div>
      </div>

      {validProjectEnrollments.length > 0 && (
        <section className="mb-10">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold tracking-tight">Enrolled Project Documents</h2>
              <p className="text-sm text-muted-foreground">
                {validProjectEnrollments.length} project-scoped {validProjectEnrollments.length === 1 ? 'submission' : 'submissions'}
              </p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {validProjectEnrollments.map((project) => {
              const projectName = getDisplayProjectName(project);
              return (
              <Card key={`${project.id}-${project.documentId}`} className="transition-shadow hover:shadow-md">
                <CardContent className="flex h-full flex-col gap-3 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Project Name
                      </p>
                      <h3 className="truncate text-lg font-semibold" title={projectName}>
                        {projectName}
                      </h3>
                    </div>
                    <BookOpen className="h-5 w-5 shrink-0 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Code
                    </p>
                    <div className="rounded-md border bg-muted/30 px-3 py-2 font-mono text-sm font-semibold tracking-wider">
                      {project.inviteCode}
                    </div>
                  </div>
                  <div className="flex-1" />
                  <div className="flex gap-2">
                    <Button className="flex-1" onClick={() => router.push(`/documents/${project.documentId}`)}>
                      Open Submission
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      title="Delete project submission"
                      onClick={() => setProjectToDelete(project)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
            })}
          </div>
        </section>
      )}

      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">My Documents</h2>
          <p className="text-sm text-muted-foreground">
            {personalDocuments.length} personal/private {personalDocuments.length === 1 ? 'document' : 'documents'}
          </p>
        </div>
        <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="lastEdited">Last edited</SelectItem>
            <SelectItem value="title">Title</SelectItem>
            <SelectItem value="wordCount">Word count</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {personalDocuments.length === 0 ? (
        <div className="flex min-h-[400px] flex-col items-center justify-center rounded-lg border-2 border-dashed">
          <FileText className="h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">No documents yet</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Get started by creating your first document
          </p>
          <Button className="mt-4" onClick={() => setShowCreateDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Document
          </Button>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {personalDocuments.map((document) => (
            <DocumentCard
              key={document.id}
              document={document}
              onDelete={handleDeleteDocument}
            />
          ))}
        </div>
      )}

      <AlertDialog open={!!projectToDelete} onOpenChange={(open) => !open && setProjectToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project Submission</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the project from your dashboard and deletes its submission document.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteProjectEnrollment}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
