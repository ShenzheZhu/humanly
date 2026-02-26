'use client'

import { use, useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { UserPlus, Trash2, Edit, Clock, CheckCircle, Eye, Pencil, Bot } from 'lucide-react'
import type { Paper, PaperReviewer } from '@humory/shared'
import { paperApi, reviewerApi } from '@/lib/api/review-api'
import { useToast } from '@/hooks/use-toast'

interface PageProps {
  params: Promise<{
    paperId: string
  }>
}

export default function ReviewerManagementPage({ params }: PageProps) {
  const { paperId } = use(params)
  const { toast } = useToast()

  const [paper, setPaper] = useState<Paper | null>(null)
  const [reviewers, setReviewers] = useState<PaperReviewer[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)

  // For demo purposes - in production, get from auth context
  const userId = 'current-user-id'

  useEffect(() => {
    loadData()
  }, [paperId])

  const loadData = async () => {
    try {
      setLoading(true)
      const [paperData, reviewersData] = await Promise.all([
        paperApi.get(paperId),
        reviewerApi.list(paperId),
      ])
      setPaper(paperData as Paper)
      setReviewers(reviewersData)
    } catch (error) {
      console.error('Failed to load data:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load paper and reviewers. Please try again.',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveReviewer = async (reviewerId: string) => {
    if (!confirm('Are you sure you want to remove this reviewer?')) {
      return
    }

    try {
      await reviewerApi.remove(paperId, reviewerId)
      setReviewers((prev) => prev.filter((r) => r.reviewerId !== reviewerId))

      toast({
        title: 'Reviewer removed',
        description: 'The reviewer has been successfully removed.',
      })
    } catch (error: any) {
      console.error('Failed to remove reviewer:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to remove reviewer. Please try again.',
      })
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <Badge variant="outline">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        )
      case 'in_progress':
        return (
          <Badge variant="secondary">
            <Edit className="h-3 w-3 mr-1" />
            In Progress
          </Badge>
        )
      case 'submitted':
        return (
          <Badge variant="default">
            <CheckCircle className="h-3 w-3 mr-1" />
            Submitted
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Loading...</p>
      </div>
    )
  }

  if (!paper) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-600">Paper not found</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold">Manage Reviewers</h1>
              <p className="text-gray-600 mt-1 line-clamp-2">{paper.title}</p>
            </div>

            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Reviewer
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Assign New Reviewer</DialogTitle>
                </DialogHeader>
                <AddReviewerForm
                  paperId={paperId}
                  onSuccess={(reviewer) => {
                    setReviewers((prev) => [...prev, reviewer])
                    setIsAddDialogOpen(false)
                    toast({
                      title: 'Reviewer assigned',
                      description: 'The reviewer has been successfully assigned.',
                    })
                  }}
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="p-4">
            <p className="text-2xl font-bold">{reviewers.length}</p>
            <p className="text-sm text-gray-600">Total Reviewers</p>
          </Card>
          <Card className="p-4">
            <p className="text-2xl font-bold">
              {reviewers.filter((r) => r.reviewStatus === 'pending').length}
            </p>
            <p className="text-sm text-gray-600">Pending</p>
          </Card>
          <Card className="p-4">
            <p className="text-2xl font-bold">
              {reviewers.filter((r) => r.reviewStatus === 'in_progress').length}
            </p>
            <p className="text-sm text-gray-600">In Progress</p>
          </Card>
          <Card className="p-4">
            <p className="text-2xl font-bold">
              {reviewers.filter((r) => r.reviewStatus === 'submitted').length}
            </p>
            <p className="text-sm text-gray-600">Submitted</p>
          </Card>
        </div>

        {/* Reviewers Table */}
        <Card>
          <div className="p-6">
            <h2 className="text-lg font-semibold mb-4">Assigned Reviewers</h2>

            {reviewers.length === 0 ? (
              <div className="text-center py-12">
                <UserPlus className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <h3 className="font-semibold mb-2">No reviewers assigned</h3>
                <p className="text-gray-600 text-sm mb-4">
                  Get started by assigning reviewers to this paper.
                </p>
                <Button onClick={() => setIsAddDialogOpen(true)}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add First Reviewer
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reviewer ID</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Permissions</TableHead>
                    <TableHead>Activity</TableHead>
                    <TableHead>Assigned</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reviewers.map((reviewer) => (
                    <TableRow key={reviewer.id}>
                      <TableCell className="font-mono text-sm">
                        {reviewer.reviewerId.substring(0, 12)}...
                      </TableCell>

                      <TableCell>{getStatusBadge(reviewer.reviewStatus || 'pending')}</TableCell>

                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {reviewer.canViewPaper && (
                            <Badge variant="outline" className="text-xs">
                              <Eye className="h-3 w-3 mr-1" />
                              View
                            </Badge>
                          )}
                          {reviewer.canWriteReview && (
                            <Badge variant="outline" className="text-xs">
                              <Pencil className="h-3 w-3 mr-1" />
                              Write
                            </Badge>
                          )}
                          {reviewer.canAccessAI && (
                            <Badge variant="outline" className="text-xs">
                              <Bot className="h-3 w-3 mr-1" />
                              AI
                            </Badge>
                          )}
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="text-sm">
                          <div>Opened: {reviewer.paperOpenedCount || 0}</div>
                          <div className="text-gray-600">
                            Reading: {Math.round((reviewer.totalReadingTimeSeconds || 0) / 60)}m
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="text-sm text-gray-600">
                        {new Date(reviewer.createdAt).toLocaleDateString()}
                      </TableCell>

                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRemoveReviewer(reviewer.reviewerId)}
                            disabled={reviewer.reviewStatus === 'submitted'}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}

// Add Reviewer Form Component
function AddReviewerForm({
  paperId,
  onSuccess,
}: {
  paperId: string
  onSuccess: (reviewer: PaperReviewer) => void
}) {
  const { toast } = useToast()
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    reviewerId: '',
    canViewPaper: true,
    canWriteReview: true,
    canAccessAI: true,
  })

  // For demo purposes - in production, get from auth context
  const userId = 'current-user-id'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.reviewerId) {
      toast({
        variant: 'destructive',
        title: 'Missing reviewer ID',
        description: 'Please enter a reviewer ID.',
      })
      return
    }

    try {
      setSubmitting(true)

      const reviewer = await reviewerApi.assign(paperId, {
        reviewerId: formData.reviewerId,
        canViewPaper: formData.canViewPaper,
        canWriteReview: formData.canWriteReview,
        canAccessAI: formData.canAccessAI,
      })

      onSuccess(reviewer)
    } catch (error: any) {
      console.error('Failed to assign reviewer:', error)
      toast({
        variant: 'destructive',
        title: 'Assignment failed',
        description: error.message || 'Failed to assign reviewer. Please try again.',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="reviewerId">Reviewer ID</Label>
        <Input
          id="reviewerId"
          type="text"
          placeholder="Enter reviewer user ID"
          value={formData.reviewerId}
          onChange={(e) => setFormData({ ...formData, reviewerId: e.target.value })}
          required
        />
      </div>

      <div className="space-y-3">
        <Label>Permissions</Label>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="canViewPaper"
            checked={formData.canViewPaper}
            onCheckedChange={(checked) =>
              setFormData({ ...formData, canViewPaper: checked as boolean })
            }
          />
          <label
            htmlFor="canViewPaper"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Can view paper
          </label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="canWriteReview"
            checked={formData.canWriteReview}
            onCheckedChange={(checked) =>
              setFormData({ ...formData, canWriteReview: checked as boolean })
            }
          />
          <label
            htmlFor="canWriteReview"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Can write review
          </label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="canAccessAI"
            checked={formData.canAccessAI}
            onCheckedChange={(checked) =>
              setFormData({ ...formData, canAccessAI: checked as boolean })
            }
          />
          <label
            htmlFor="canAccessAI"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Can access AI assistant
          </label>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Assigning...' : 'Assign Reviewer'}
        </Button>
      </div>
    </form>
  )
}
