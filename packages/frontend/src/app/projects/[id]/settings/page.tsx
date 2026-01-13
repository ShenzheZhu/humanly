'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { ArrowLeft, Loader2, Key, Trash2 } from 'lucide-react';
import { Project, ExternalServiceType } from '@humory/shared';

import { api } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';

// Validation schema
const projectSettingsSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(100, 'Name is too long'),
  description: z.string().max(500, 'Description is too long').optional(),
  externalServiceType: z.enum(['qualtrics', 'google-forms', 'custom', 'other']).optional(),
  userIdKey: z.string().min(1, 'User ID key is required').max(50, 'Key is too long'),
});

type ProjectSettingsFormData = z.infer<typeof projectSettingsSchema>;

export default function ProjectSettingsPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;
  const { toast } = useToast();

  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setSaving] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showRegenerateDialog, setShowRegenerateDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [newToken, setNewToken] = useState<string | null>(null);

  const form = useForm<ProjectSettingsFormData>({
    resolver: zodResolver(projectSettingsSchema),
    defaultValues: {
      name: '',
      description: '',
      externalServiceType: undefined,
      userIdKey: 'userId',
    },
  });

  // Fetch project details
  useEffect(() => {
    const fetchProject = async () => {
      try {
        setIsLoading(true);
        const response = await api.get<{
          success: boolean;
          data: Project;
        }>(`/api/v1/projects/${projectId}`);
        setProject(response.data);

        // Update form with project data
        form.reset({
          name: response.data.name,
          description: response.data.description || '',
          externalServiceType: response.data.externalServiceType || undefined,
          userIdKey: response.data.userIdKey,
        });
      } catch (error: any) {
        toast({
          title: 'Error',
          description: error.message || 'Failed to load project settings',
          variant: 'destructive',
        });
        router.push('/projects');
      } finally {
        setIsLoading(false);
      }
    };

    if (projectId) {
      fetchProject();
    }
  }, [projectId, router, toast, form]);

  // Handle form submission
  const onSubmit = async (data: ProjectSettingsFormData) => {
    try {
      setSaving(true);
      const response = await api.put<{
        success: boolean;
        data: Project;
        message: string;
      }>(`/api/v1/projects/${projectId}`, data);

      setProject(response.data);
      toast({
        title: 'Success',
        description: 'Project settings updated successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update project settings',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  // Handle token regeneration
  const handleRegenerateToken = async () => {
    try {
      setIsRegenerating(true);
      const response = await api.post<{
        success: boolean;
        data: Project;
        message: string;
      }>(`/api/v1/projects/${projectId}/regenerate-token`);

      setNewToken(response.data.projectToken);

      // Update project with new token
      if (project) {
        setProject({ ...project, projectToken: response.data.projectToken });
      }

      toast({
        title: 'Success',
        description: 'Project token regenerated successfully',
      });

      setShowRegenerateDialog(false);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to regenerate token',
        variant: 'destructive',
      });
    } finally {
      setIsRegenerating(false);
    }
  };

  // Handle project deletion
  const handleDeleteProject = async () => {
    try {
      setIsDeleting(true);
      await api.delete(`/api/v1/projects/${projectId}`);

      toast({
        title: 'Success',
        description: 'Project deleted successfully',
      });

      router.push('/projects');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete project',
        variant: 'destructive',
      });
      setShowDeleteDialog(false);
      setIsDeleting(false);
    }
  };

  // Copy token to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied',
      description: 'Token copied to clipboard',
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!project) {
    return null;
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          className="mb-4"
          onClick={() => router.push(`/projects/${projectId}`)}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Project
        </Button>
        <h1 className="text-3xl font-bold">Project Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage your project configuration and settings
        </p>
      </div>

      {/* General Settings */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>General Settings</CardTitle>
          <CardDescription>
            Update your project name, description, and configuration
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Project Name */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project Name</FormLabel>
                    <FormControl>
                      <Input placeholder="My Project" {...field} />
                    </FormControl>
                    <FormDescription>
                      A descriptive name for your project
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Description */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter project description..."
                        {...field}
                        rows={3}
                      />
                    </FormControl>
                    <FormDescription>
                      Optional description of your project
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* External Service Type */}
              <FormField
                control={form.control}
                name="externalServiceType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>External Service Type</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select service type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="qualtrics">Qualtrics</SelectItem>
                        <SelectItem value="google-forms">Google Forms</SelectItem>
                        <SelectItem value="custom">Custom</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      The type of external service you're integrating with
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* User ID Key */}
              <FormField
                control={form.control}
                name="userIdKey"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>User ID Key</FormLabel>
                    <FormControl>
                      <Input placeholder="userId" {...field} />
                    </FormControl>
                    <FormDescription>
                      The key used to identify users in your external service
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Submit Button */}
              <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Project Token */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Project Token</CardTitle>
          <CardDescription>
            Your project token is used for API authentication
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {newToken && (
            <div className="p-4 rounded-md bg-yellow-50 border border-yellow-200">
              <p className="text-sm font-medium text-yellow-800 mb-2">
                New Token Generated
              </p>
              <p className="text-xs text-yellow-700 mb-3">
                Make sure to copy your new token now. You won't be able to see it
                again!
              </p>
              <div className="flex gap-2">
                <Input
                  value={newToken}
                  readOnly
                  className="font-mono text-sm bg-white"
                />
                <Button
                  variant="outline"
                  onClick={() => copyToClipboard(newToken)}
                >
                  Copy
                </Button>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Input
              value={project.projectToken}
              readOnly
              className="font-mono text-sm"
              type="password"
            />
            <Button
              variant="outline"
              onClick={() => copyToClipboard(project.projectToken)}
            >
              Copy
            </Button>
          </div>

          <Button
            variant="outline"
            onClick={() => setShowRegenerateDialog(true)}
          >
            <Key className="mr-2 h-4 w-4" />
            Regenerate Token
          </Button>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
          <CardDescription>
            Irreversible and destructive actions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Delete Project</p>
              <p className="text-sm text-muted-foreground">
                Once you delete a project, there is no going back. All data will be
                permanently deleted.
              </p>
            </div>
            <Button
              variant="destructive"
              onClick={() => setShowDeleteDialog(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Project
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Regenerate Token Dialog */}
      <Dialog open={showRegenerateDialog} onOpenChange={setShowRegenerateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Regenerate Project Token?</DialogTitle>
            <DialogDescription>
              This will invalidate your current token. Any integrations using the
              old token will stop working until you update them with the new token.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRegenerateDialog(false)}
              disabled={isRegenerating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRegenerateToken}
              disabled={isRegenerating}
            >
              {isRegenerating && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Regenerate Token
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Project Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Project?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete the project
              "{project.name}" and all associated data including sessions, events,
              and analytics.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteProject}
              disabled={isDeleting}
            >
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete Project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
