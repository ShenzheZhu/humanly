'use client'

import { use } from 'react'
import ReviewWorkspace from '@/components/review/ReviewWorkspace'

interface PageProps {
  params: Promise<{
    paperId: string
  }>
}

export default function ReviewPage({ params }: PageProps) {
  const { paperId } = use(params)

  // For demo purposes - in production, get from auth context
  const userId = 'current-user-id'

  return <ReviewWorkspace paperId={paperId} userId={userId} />
}
