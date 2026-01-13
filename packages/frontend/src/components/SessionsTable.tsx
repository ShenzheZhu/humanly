'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Loader2,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  XCircle,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Filter,
  X,
} from 'lucide-react';
import api, { ApiError } from '@/lib/api-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface Session {
  id: string;
  projectId: string;
  externalUserId: string;
  sessionStart: string;
  sessionEnd: string | null;
  submitted: boolean;
  submissionTime: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  eventCount: number;
  duration: number;
}

interface SessionsResponse {
  success: boolean;
  data: {
    sessions: Session[];
    pagination: {
      page: number;
      limit: number;
      totalCount: number;
      totalPages: number;
    };
  };
}

interface SessionsTableProps {
  projectId: string;
}

type SortField = 'sessionStart' | 'duration' | 'eventCount' | 'externalUserId' | 'submitted';
type SortDirection = 'asc' | 'desc';

export default function SessionsTable({ projectId }: SessionsTableProps) {
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    totalCount: 0,
    totalPages: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>('sessionStart');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [filterSubmitted, setFilterSubmitted] = useState<string>('all');
  const [searchUserId, setSearchUserId] = useState<string>('');
  const [searchInput, setSearchInput] = useState<string>('');

  const fetchSessions = async (page: number = 1) => {
    try {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagination.limit.toString(),
      });

      if (filterSubmitted !== 'all') {
        params.append('submitted', filterSubmitted);
      }

      if (searchUserId) {
        params.append('externalUserId', searchUserId);
      }

      const response = await api.get<SessionsResponse>(
        `/api/v1/projects/${projectId}/analytics/sessions?${params.toString()}`
      );

      let sessionsList = response.data.sessions;

      // Client-side sorting (since backend doesn't support sorting yet)
      sessionsList = sessionsList.sort((a, b) => {
        let aVal: any = a[sortField];
        let bVal: any = b[sortField];

        if (sortField === 'sessionStart') {
          aVal = new Date(aVal).getTime();
          bVal = new Date(bVal).getTime();
        }

        if (sortDirection === 'asc') {
          return aVal > bVal ? 1 : -1;
        } else {
          return aVal < bVal ? 1 : -1;
        }
      });

      setSessions(sessionsList);
      setPagination(response.data.pagination);
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message || 'Failed to load sessions');
      console.error('Failed to load sessions:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) {
      fetchSessions(1);
    }
  }, [projectId, filterSubmitted, searchUserId]);

  useEffect(() => {
    if (sessions.length > 0) {
      fetchSessions(pagination.page);
    }
  }, [sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-4 w-4 ml-1 text-muted-foreground" />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="h-4 w-4 ml-1" />
    ) : (
      <ArrowDown className="h-4 w-4 ml-1" />
    );
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
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

  const getUserAgentInfo = (userAgent: string | null) => {
    if (!userAgent) return 'Unknown';

    // Extract browser info
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';

    return 'Other';
  };

  const handleSessionClick = (sessionId: string) => {
    router.push(`/projects/${projectId}/analytics/sessions/${sessionId}`);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      fetchSessions(newPage);
    }
  };

  const handleSearch = () => {
    setSearchUserId(searchInput);
    fetchSessions(1);
  };

  const handleClearSearch = () => {
    setSearchInput('');
    setSearchUserId('');
    fetchSessions(1);
  };

  const handleClearFilters = () => {
    setFilterSubmitted('all');
    setSearchInput('');
    setSearchUserId('');
    setSortField('sessionStart');
    setSortDirection('desc');
  };

  const hasActiveFilters = filterSubmitted !== 'all' || searchUserId !== '';

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 7;

    if (pagination.totalPages <= maxVisible) {
      for (let i = 1; i <= pagination.totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (pagination.page <= 4) {
        for (let i = 1; i <= 5; i++) pages.push(i);
        pages.push('...');
        pages.push(pagination.totalPages);
      } else if (pagination.page >= pagination.totalPages - 3) {
        pages.push(1);
        pages.push('...');
        for (let i = pagination.totalPages - 4; i <= pagination.totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = pagination.page - 1; i <= pagination.page + 1; i++) pages.push(i);
        pages.push('...');
        pages.push(pagination.totalPages);
      }
    }

    return pages;
  };

  if (isLoading && sessions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sessions</CardTitle>
          <CardDescription>View all user sessions for this project</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>Sessions</CardTitle>
            <CardDescription>
              {pagination.totalCount > 0
                ? `${pagination.totalCount.toLocaleString()} total sessions`
                : 'No sessions recorded yet'}
            </CardDescription>
          </div>
          {hasActiveFilters && (
            <Button variant="outline" size="sm" onClick={handleClearFilters}>
              <X className="h-4 w-4 mr-1" />
              Clear Filters
            </Button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 pt-4">
          <div className="flex gap-2 items-center">
            <Input
              placeholder="Search by User ID..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="w-64"
            />
            <Button size="sm" onClick={handleSearch}>
              <Filter className="h-4 w-4 mr-1" />
              Search
            </Button>
            {searchUserId && (
              <Button size="sm" variant="ghost" onClick={handleClearSearch}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          <Select value={filterSubmitted} onValueChange={setFilterSubmitted}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sessions</SelectItem>
              <SelectItem value="true">Submitted Only</SelectItem>
              <SelectItem value="false">Incomplete Only</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent>
        {error ? (
          <div className="text-center py-8 text-destructive">{error}</div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-lg font-medium">No sessions found</p>
            <p className="text-sm mt-1">
              {hasActiveFilters
                ? 'Try adjusting your filters'
                : 'Sessions will appear here once users interact with your tracked forms'}
            </p>
          </div>
        ) : (
          <>
            <div className="rounded-md border overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="font-semibold">
                        <button
                          onClick={() => handleSort('externalUserId')}
                          className="flex items-center hover:text-foreground transition-colors"
                        >
                          User ID
                          {getSortIcon('externalUserId')}
                        </button>
                      </TableHead>
                      <TableHead className="font-semibold">
                        <button
                          onClick={() => handleSort('sessionStart')}
                          className="flex items-center hover:text-foreground transition-colors"
                        >
                          Started
                          {getSortIcon('sessionStart')}
                        </button>
                      </TableHead>
                      <TableHead className="font-semibold">Ended</TableHead>
                      <TableHead className="font-semibold">
                        <button
                          onClick={() => handleSort('duration')}
                          className="flex items-center hover:text-foreground transition-colors"
                        >
                          Duration
                          {getSortIcon('duration')}
                        </button>
                      </TableHead>
                      <TableHead className="font-semibold">
                        <button
                          onClick={() => handleSort('eventCount')}
                          className="flex items-center hover:text-foreground transition-colors"
                        >
                          Events
                          {getSortIcon('eventCount')}
                        </button>
                      </TableHead>
                      <TableHead className="font-semibold">
                        <button
                          onClick={() => handleSort('submitted')}
                          className="flex items-center hover:text-foreground transition-colors"
                        >
                          Status
                          {getSortIcon('submitted')}
                        </button>
                      </TableHead>
                      <TableHead className="font-semibold">Browser</TableHead>
                      <TableHead className="font-semibold">IP Address</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sessions.map((session, index) => (
                      <TableRow
                        key={session.id}
                        className={`cursor-pointer hover:bg-accent/50 transition-colors ${
                          index % 2 === 0 ? 'bg-background' : 'bg-muted/20'
                        }`}
                        onClick={() => handleSessionClick(session.id)}
                      >
                        <TableCell className="font-mono text-sm font-medium">
                          {session.externalUserId}
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatDateTime(session.sessionStart)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {session.sessionEnd ? formatDateTime(session.sessionEnd) : '—'}
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatDuration(session.duration)}
                        </TableCell>
                        <TableCell className="text-center font-medium">
                          {session.eventCount}
                        </TableCell>
                        <TableCell>
                          {session.submitted ? (
                            <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Submitted
                            </Badge>
                          ) : (
                            <Badge variant="secondary">
                              <XCircle className="h-3 w-3 mr-1" />
                              Incomplete
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {getUserAgentInfo(session.userAgent)}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {session.ipAddress || '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between mt-6">
                <div className="text-sm text-muted-foreground">
                  Showing{' '}
                  <span className="font-medium">
                    {(pagination.page - 1) * pagination.limit + 1}
                  </span>
                  {' - '}
                  <span className="font-medium">
                    {Math.min(pagination.page * pagination.limit, pagination.totalCount)}
                  </span>
                  {' of '}
                  <span className="font-medium">{pagination.totalCount.toLocaleString()}</span>
                  {' sessions'}
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page === 1 || isLoading}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>

                  <div className="flex gap-1">
                    {getPageNumbers().map((pageNum, idx) => (
                      pageNum === '...' ? (
                        <span key={`ellipsis-${idx}`} className="px-2 py-1">
                          ...
                        </span>
                      ) : (
                        <Button
                          key={pageNum}
                          variant={pageNum === pagination.page ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => handlePageChange(pageNum as number)}
                          disabled={isLoading}
                          className="min-w-[2.5rem]"
                        >
                          {pageNum}
                        </Button>
                      )
                    ))}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page === pagination.totalPages || isLoading}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
