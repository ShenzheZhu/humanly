'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  Search,
  Calendar,
} from 'lucide-react'
import type { PaperForReviewer, PaperReviewer } from '@humory/shared'
import { reviewerApi } from '@/lib/api/review-api'

export default function ReviewerDashboard() {
  const router = useRouter()
  const [assignments, setAssignments] = useState<PaperReviewer[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'in_progress' | 'submitted'>('all')

  // For demo purposes - in production, get from auth context
  const userId = 'current-user-id'

  useEffect(() => {
    loadAssignments()
  }, [])

  const loadAssignments = async () => {
    try {
      setLoading(true)
      const data = await reviewerApi.listPapers(userId)
      setAssignments(data)
    } catch (error) {
      console.error('Failed to load assignments:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredAssignments = assignments.filter((assignment) => {
    // Filter by status
    if (filterStatus !== 'all' && assignment.reviewStatus !== filterStatus) {
      return false
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      // Note: paper info would need to be joined in the API response
      return (
        assignment.paperId.toLowerCase().includes(query) ||
        assignment.id.toLowerCase().includes(query)
      )
    }

    return true
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />Pending</Badge>
      case 'in_progress':
        return <Badge variant="secondary"><FileText className="h-3 w-3 mr-1" />In Progress</Badge>
      case 'submitted':
        return <Badge variant="default"><CheckCircle className="h-3 w-3 mr-1" />Submitted</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getDeadlineWarning = (deadline?: Date) => {
    if (!deadline) return null

    const now = new Date()
    const deadlineDate = new Date(deadline)
    const daysRemaining = Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    if (daysRemaining < 0) {
      return <span className="text-red-600 text-sm">Overdue</span>
    } else if (daysRemaining <= 3) {
      return <span className="text-orange-600 text-sm">Due in {daysRemaining} days</span>
    } else {
      return <span className="text-gray-600 text-sm">Due in {daysRemaining} days</span>
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Loading your assignments...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold">Review Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Manage your peer review assignments
          </p>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Search and Filters */}
        <div className="mb-6 flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search papers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex gap-2">
            <Button
              variant={filterStatus === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterStatus('all')}
            >
              All
            </Button>
            <Button
              variant={filterStatus === 'pending' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterStatus('pending')}
            >
              Pending
            </Button>
            <Button
              variant={filterStatus === 'in_progress' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterStatus('in_progress')}
            >
              In Progress
            </Button>
            <Button
              variant={filterStatus === 'submitted' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterStatus('submitted')}
            >
              Submitted
            </Button>
          </div>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{assignments.length}</p>
                <p className="text-sm text-gray-600">Total Assignments</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {assignments.filter((a) => a.reviewStatus === 'pending').length}
                </p>
                <p className="text-sm text-gray-600">Pending</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded">
                <AlertCircle className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {assignments.filter((a) => a.reviewStatus === 'in_progress').length}
                </p>
                <p className="text-sm text-gray-600">In Progress</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {assignments.filter((a) => a.reviewStatus === 'submitted').length}
                </p>
                <p className="text-sm text-gray-600">Submitted</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Assignments List */}
        <div className="space-y-4">
          {filteredAssignments.length === 0 ? (
            <Card className="p-8 text-center">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <h3 className="font-semibold mb-2">No assignments found</h3>
              <p className="text-gray-600 text-sm">
                {searchQuery
                  ? 'Try adjusting your search filters'
                  : 'You have no review assignments at this time'}
              </p>
            </Card>
          ) : (
            filteredAssignments.map((assignment) => (
              <Card key={assignment.id} className="p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-lg">
                        Paper {assignment.paperId.substring(0, 8)}...
                      </h3>
                      {getStatusBadge(assignment.reviewStatus || 'pending')}
                    </div>

                    <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        Assigned: {new Date(assignment.createdAt).toLocaleDateString()}
                      </span>

                      {assignment.reviewStartedAt && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          Started: {new Date(assignment.reviewStartedAt).toLocaleDateString()}
                        </span>
                      )}

                      {assignment.reviewSubmittedAt && (
                        <span className="flex items-center gap-1">
                          <CheckCircle className="h-4 w-4" />
                          Submitted: {new Date(assignment.reviewSubmittedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-6 text-sm">
                      <div>
                        <span className="text-gray-600">Papers opened:</span>{' '}
                        <span className="font-semibold">{assignment.paperOpenedCount || 0}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Reading time:</span>{' '}
                        <span className="font-semibold">
                          {Math.round((assignment.totalReadingTimeSeconds || 0) / 60)} min
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {assignment.canViewPaper && (
                        <Badge variant="outline" className="text-xs">Can View</Badge>
                      )}
                      {assignment.canWriteReview && (
                        <Badge variant="outline" className="text-xs">Can Write</Badge>
                      )}
                      {assignment.canAccessAI && (
                        <Badge variant="outline" className="text-xs">AI Enabled</Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    {getDeadlineWarning(assignment.reviewDeadline)}

                    <Button
                      onClick={() => router.push(`/review/${assignment.paperId}`)}
                      disabled={!assignment.canViewPaper}
                    >
                      {assignment.reviewStatus === 'submitted' ? 'View Review' : 'Start Review'}
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
