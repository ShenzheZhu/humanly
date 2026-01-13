'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  BarChart3,
  Eye,
  Code,
  Download,
  Settings,
  Users,
  Activity,
  Calendar,
  AlertCircle,
  Loader2,
  List
} from 'lucide-react';
import { Project, AnalyticsSummary } from '@humory/shared';
import api, { ApiError } from '@/lib/api-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import SessionsTable from '@/components/SessionsTable';

interface ProjectStats extends AnalyticsSummary {
  lastActivity?: Date;
}

export default function ProjectOverviewPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [stats, setStats] = useState<ProjectStats | null>(null);
  const [isLoadingProject, setIsLoadingProject] = useState(true);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProject = async () => {
      try {
        setIsLoadingProject(true);
        setError(null);
        const response = await api.get<{
          success: boolean;
          data: Project;
        }>(`/api/v1/projects/${projectId}`);
        setProject(response.data);
      } catch (err) {
        const apiError = err as ApiError;
        if (apiError.statusCode === 404) {
          setError('Project not found. It may have been deleted or you may not have permission to view it.');
        } else if (apiError.statusCode === 403) {
          setError('You do not have permission to view this project.');
        } else {
          setError(apiError.message || 'Failed to load project details.');
        }
      } finally {
        setIsLoadingProject(false);
      }
    };

    const fetchStats = async () => {
      try {
        setIsLoadingStats(true);
        const response = await api.get<{
          success: boolean;
          data: AnalyticsSummary;
        }>(`/api/v1/projects/${projectId}/analytics/summary`);
        setStats(response.data);
      } catch (err) {
        // Stats are optional, don't show error if they fail
        console.error('Failed to load project stats:', err);
        setStats({
          totalEvents: 0,
          totalSessions: 0,
          totalUsers: 0,
          avgEventsPerSession: 0,
          avgSessionDuration: 0,
          completionRate: 0,
        });
      } finally {
        setIsLoadingStats(false);
      }
    };

    if (projectId) {
      fetchProject();
      fetchStats();
    }
  }, [projectId]);

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatDateTime = (date: Date | string) => {
    return new Date(date).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  };

  const getServiceTypeLabel = (type: string | null | undefined) => {
    if (!type) return 'Not specified';
    const labels: Record<string, string> = {
      qualtrics: 'Qualtrics',
      'google-forms': 'Google Forms',
      custom: 'Custom',
      other: 'Other',
    };
    return labels[type] || type;
  };

  if (isLoadingProject) {
    return (
      <div className="min-h-[calc(100vh-200px)] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading project...</p>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="max-w-4xl mx-auto">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error || 'Project not found'}</AlertDescription>
        </Alert>
        <div className="mt-6">
          <Button onClick={() => router.push('/projects')} variant="outline">
            Back to Projects
          </Button>
        </div>
      </div>
    );
  }

  const navigationItems = [
    {
      icon: BarChart3,
      label: 'View Analytics',
      href: `/projects/${projectId}/analytics`,
      description: 'View detailed analytics and insights',
    },
    {
      icon: List,
      label: 'View Sessions',
      href: `/projects/${projectId}/sessions`,
      description: 'Browse and analyze individual sessions',
    },
    {
      icon: Eye,
      label: 'Live Preview',
      href: `/projects/${projectId}/live-preview`,
      description: 'Monitor user sessions in real-time',
    },
    {
      icon: Code,
      label: 'Tracking Code',
      href: `/projects/${projectId}/snippets`,
      description: 'Get integration code snippets',
    },
    {
      icon: Download,
      label: 'Export Data',
      href: `/projects/${projectId}/export`,
      description: 'Export sessions and events data',
    },
    {
      icon: Settings,
      label: 'Settings',
      href: `/projects/${projectId}/settings`,
      description: 'Configure project settings',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
          {project.description && (
            <p className="text-muted-foreground mt-2">{project.description}</p>
          )}
        </div>
        <Button
          variant="outline"
          onClick={() => router.push('/projects')}
        >
          Back to Projects
        </Button>
      </div>

      {/* Project Details Card */}
      <Card>
        <CardHeader>
          <CardTitle>Project Information</CardTitle>
          <CardDescription>Basic details about your project</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Project ID</dt>
              <dd className="text-sm font-mono mt-1">{project.id}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Created</dt>
              <dd className="text-sm mt-1 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                {formatDate(project.createdAt)}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">External Service</dt>
              <dd className="text-sm mt-1">{getServiceTypeLabel(project.externalServiceType)}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">User ID Key</dt>
              <dd className="text-sm font-mono mt-1">{project.userIdKey || 'userId'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Status</dt>
              <dd className="text-sm mt-1">
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    project.isActive
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                  }`}
                >
                  {project.isActive ? 'Active' : 'Inactive'}
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Project Token</dt>
              <dd className="text-sm font-mono mt-1 truncate">{project.projectToken}</dd>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Events</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoadingStats ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : (
              <>
                <div className="text-2xl font-bold">{(stats?.totalEvents ?? 0).toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  {(stats?.avgEventsPerSession ?? 0).toFixed(1)} avg per session
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoadingStats ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : (
              <>
                <div className="text-2xl font-bold">{(stats?.totalSessions ?? 0).toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  {stats?.avgSessionDuration ? formatDuration(stats.avgSessionDuration) : '0s'} avg duration
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoadingStats ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : (
              <>
                <div className="text-2xl font-bold">{(stats?.totalUsers ?? 0).toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  {stats?.totalSessions && stats?.totalUsers
                    ? (stats.totalSessions / stats.totalUsers).toFixed(1)
                    : 0}{' '}
                  sessions per user
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoadingStats ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : (
              <>
                <div className="text-2xl font-bold">{(stats?.completionRate ?? 0).toFixed(1)}%</div>
                <p className="text-xs text-muted-foreground">of started sessions</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Sessions Table */}
      <SessionsTable projectId={projectId} />

      {/* Navigation Cards */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href}>
                <Card className="hover:bg-accent/50 transition-colors cursor-pointer h-full">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <CardTitle className="text-base">{item.label}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>{item.description}</CardDescription>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
