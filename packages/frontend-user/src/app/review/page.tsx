'use client'

import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Upload, FileText, Users } from 'lucide-react'

export default function ReviewHomePage() {
  const router = useRouter()

  // For demo purposes - in production, check authentication
  // and redirect to login if not authenticated

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold">Peer Review System</h1>
          <p className="text-gray-600 mt-1">
            Upload papers and conduct blind peer reviews with full provenance tracking
          </p>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-16">
        {/* Main Actions */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          {/* Upload Paper Card */}
          <Card
            className="p-8 hover:shadow-lg transition-shadow cursor-pointer group"
            onClick={() => router.push('/admin/papers/upload')}
          >
            <div className="text-center">
              <div className="inline-block p-4 bg-blue-100 rounded-full mb-4 group-hover:bg-blue-200 transition-colors">
                <Upload className="h-12 w-12 text-blue-600" />
              </div>
              <h2 className="text-xl font-bold mb-3">Upload PDF</h2>
              <p className="text-gray-600 mb-4">
                Upload a research paper and assign reviewers
              </p>
              <Button className="w-full">
                <Upload className="h-4 w-4 mr-2" />
                Upload Paper
              </Button>
            </div>
          </Card>

          {/* My Reviews Card */}
          <Card
            className="p-8 hover:shadow-lg transition-shadow cursor-pointer group"
            onClick={() => router.push('/review/dashboard')}
          >
            <div className="text-center">
              <div className="inline-block p-4 bg-green-100 rounded-full mb-4 group-hover:bg-green-200 transition-colors">
                <FileText className="h-12 w-12 text-green-600" />
              </div>
              <h2 className="text-xl font-bold mb-3">My Reviews</h2>
              <p className="text-gray-600 mb-4">
                View papers assigned to you for review
              </p>
              <Button className="w-full" variant="outline">
                <FileText className="h-4 w-4 mr-2" />
                View Assignments
              </Button>
            </div>
          </Card>
        </div>

        {/* Features */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Platform Features</h3>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-50 rounded">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h4 className="font-semibold text-sm mb-1">Secure PDF Viewing</h4>
                <p className="text-xs text-gray-600">
                  Papers can only be viewed in-system, no downloads
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 bg-green-50 rounded">
                <Users className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <h4 className="font-semibold text-sm mb-1">Blind Review</h4>
                <p className="text-xs text-gray-600">
                  Author names hidden from reviewers
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 bg-purple-50 rounded">
                <FileText className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <h4 className="font-semibold text-sm mb-1">Full Tracking</h4>
                <p className="text-xs text-gray-600">
                  All review activity tracked for provenance
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Quick Start Guide */}
        <div className="mt-8 text-center text-sm text-gray-600">
          <p className="mb-2">
            <strong>Quick Start:</strong>
          </p>
          <p>
            1. Upload PDF → 2. Assign Reviewers → 3. Review in 3-Panel Workspace
          </p>
        </div>
      </div>
    </div>
  )
}
