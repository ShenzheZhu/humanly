'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { BrainCircuit, FileText, Loader2, Upload, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';
import { api } from '@/lib/api-client';
import type { Project, ExternalServiceType } from '@humanly/shared';

// Zod schema for form validation
const projectFormSchema = z.object({
  name: z
    .string()
    .min(3, 'Project name must be at least 3 characters')
    .max(100, 'Project name must not exceed 100 characters'),
  description: z
    .string()
    .max(500, 'Description must not exceed 500 characters')
    .optional()
    .or(z.literal('')),
  externalServiceType: z
    .enum(['qualtrics', 'google-forms', 'custom', 'other'])
    .optional(),
  allowedAiModels: z.array(z.string()).min(1, 'Select at least one AI model'),
  aiUsageLimit: z.coerce.number().int().min(1, 'AI usage limit must be at least 1'),
  userIdKey: z
    .string()
    .min(1, 'User ID key is required')
    .max(100, 'User ID key must not exceed 100 characters')
    .default('userId'),
});

type ProjectFormValues = z.infer<typeof projectFormSchema>;

const externalServiceOptions: { value: ExternalServiceType; label: string }[] = [
  { value: 'qualtrics', label: 'Qualtrics' },
  { value: 'google-forms', label: 'Google Forms' },
  { value: 'custom', label: 'Custom' },
  { value: 'other', label: 'Other' },
];

const aiModelOptions = ['GPT-4.1', 'GPT-4o mini', 'Claude 3.5 Sonnet', 'Gemini 1.5 Pro'];

export default function NewProjectPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [error, setError] = useState<string | null>(null);
  const [instructionFile, setInstructionFile] = useState<File | null>(null);

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      name: '',
      description: '',
      allowedAiModels: ['GPT-4o mini'],
      aiUsageLimit: 100,
      userIdKey: 'userId',
      externalServiceType: undefined,
    },
  });

  const { isSubmitting } = form.formState;

  const onSubmit = async (data: ProjectFormValues) => {
    try {
      setError(null);

      // Clean up the data - remove empty strings for optional fields
      const payload = {
        name: data.name,
        description: [
          data.description,
          `Allowed AI models: ${data.allowedAiModels.join(', ')}`,
          `AI usage limit: ${data.aiUsageLimit}`,
        ].filter(Boolean).join('\n\n'),
        userIdKey: data.userIdKey,
        externalServiceType: data.externalServiceType || undefined,
      };

      const response = await api.post<{
        success: boolean;
        data: Project;
        message: string;
      }>('/api/v1/projects', payload);

      let instructionUploadFailed = false;
      if (instructionFile) {
        const formData = new FormData();
        formData.append('pdf', instructionFile);
        formData.append('title', instructionFile.name.replace(/\.pdf$/i, ''));
        formData.append('authors', JSON.stringify([]));
        formData.append('abstract', 'Project instruction file');
        formData.append('keywords', JSON.stringify(['instructions']));

        try {
          await api.post(
            `/api/v1/projects/${response.data.id}/papers`,
            formData
          );
        } catch {
          instructionUploadFailed = true;
        }
      }

      toast({
        title: instructionUploadFailed ? 'Project created' : 'Success!',
        description: instructionUploadFailed
          ? 'Project created, but the instruction file upload failed. You can upload it from the project dashboard later.'
          : instructionFile
            ? 'Project created and instruction file uploaded successfully.'
            : 'Project created successfully. Share the generated invite code from the project dashboard.',
        variant: instructionUploadFailed ? 'destructive' : 'default',
      });

      // Redirect to the new project's page
      router.push(`/projects/${response.data.id}`);
    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to create project. Please try again.';
      setError(errorMessage);

      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };

  const handleCancel = () => {
    router.push('/projects');
  };

  const handleInstructionFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setInstructionFile(null);
      event.target.value = '';
      toast({
        title: 'Invalid file',
        description: 'Instruction files must be uploaded as PDF.',
        variant: 'destructive',
      });
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      setInstructionFile(null);
      event.target.value = '';
      toast({
        title: 'File too large',
        description: 'Instruction PDFs must be smaller than 50MB.',
        variant: 'destructive',
      });
      return;
    }

    setInstructionFile(file);
  };

  return (
    <div className="container max-w-2xl py-8">
      <Card>
        <CardHeader>
          <CardTitle>Create Writing Project</CardTitle>
          <CardDescription>
            Set up an admin-managed writing project with invite-code enrollment, AI permissions, and optional instruction files.
          </CardDescription>
        </CardHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-6">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Project Name <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Research Reflection Assignment"
                        {...field}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormDescription>
                      A user-facing title shown on the admin dashboard and project detail pages.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe the writing task, deadline, evaluation criteria, or class context..."
                        className="resize-none"
                        {...field}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormDescription>
                      This description is visible to admins and can be reused for user-facing instructions.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="allowedAiModels"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Allowed LLM Models <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <div className="grid gap-2 rounded-md border p-3 sm:grid-cols-2">
                        {aiModelOptions.map((model) => {
                          const checked = field.value.includes(model);
                          return (
                            <label key={model} className="flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                checked={checked}
                                disabled={isSubmitting}
                                onChange={(event) => {
                                  field.onChange(
                                    event.target.checked
                                      ? [...field.value, model]
                                      : field.value.filter((item) => item !== model)
                                  );
                                }}
                              />
                              <BrainCircuit className="h-4 w-4 text-muted-foreground" />
                              {model}
                            </label>
                          );
                        })}
                      </div>
                    </FormControl>
                    <FormDescription>
                      These model selections are saved into the project description until the backend exposes first-class AI settings.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="aiUsageLimit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      AI Usage Limit <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        placeholder="100"
                        {...field}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormDescription>
                      Maximum AI requests allowed per enrolled user for this project.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="rounded-md border border-dashed p-4">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Upload className="h-4 w-4 text-muted-foreground" />
                  Instruction File
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Upload a PDF instruction file for this writing project. It will be attached after the project is created.
                </p>
                {instructionFile ? (
                  <div className="mt-3 flex items-center gap-3 rounded-md border bg-muted/40 p-3">
                    <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium" title={instructionFile.name}>
                        {instructionFile.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {(instructionFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setInstructionFile(null)}
                      disabled={isSubmitting}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <Input
                    type="file"
                    accept="application/pdf"
                    className="mt-3"
                    onChange={handleInstructionFileChange}
                    disabled={isSubmitting}
                  />
                )}
              </div>

              <FormField
                control={form.control}
                name="userIdKey"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      User ID Key <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="userId"
                        {...field}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormDescription>
                      The field name that contains the user ID in your external form, such as userId, participantId, or respondentId.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="externalServiceType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>External Service Type</FormLabel>
                    <FormControl>
                      <select
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        {...field}
                        value={field.value || ''}
                        onChange={(e) => {
                          const value = e.target.value;
                          field.onChange(value ? value : undefined);
                        }}
                        disabled={isSubmitting}
                      >
                        <option value="">Select a service (optional)</option>
                        {externalServiceOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </FormControl>
                    <FormDescription>
                      The type of external service used for your forms or surveys.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>

            <CardFooter className="flex justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {isSubmitting ? 'Creating...' : 'Create Project'}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
}
