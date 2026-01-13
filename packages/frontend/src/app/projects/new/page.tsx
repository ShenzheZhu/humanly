'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2 } from 'lucide-react';

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
import type { Project, ExternalServiceType } from '@humory/shared';

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

export default function NewProjectPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [error, setError] = useState<string | null>(null);

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      name: '',
      description: '',
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
        description: data.description || undefined,
        userIdKey: data.userIdKey,
        externalServiceType: data.externalServiceType || undefined,
      };

      const response = await api.post<{
        success: boolean;
        data: Project;
        message: string;
      }>('/api/v1/projects', payload);

      toast({
        title: 'Success!',
        description: 'Project created successfully',
        variant: 'default',
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

  return (
    <div className="container max-w-2xl py-8">
      <Card>
        <CardHeader>
          <CardTitle>Create New Project</CardTitle>
          <CardDescription>
            Set up a new project to start tracking user interactions in your forms and surveys.
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
                        placeholder="My Survey Project"
                        {...field}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormDescription>
                      A unique name to identify your project (3-100 characters).
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
                        placeholder="Brief description of your project..."
                        className="resize-none"
                        {...field}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormDescription>
                      Optional description of your project (max 500 characters).
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

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
                      The field name that contains the user ID in your external form (e.g., "userId", "participantId", "respondentId").
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
                      The type of external service you're using for your forms/surveys.
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
