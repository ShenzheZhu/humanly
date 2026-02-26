'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  Search,
  MessageSquarePlus,
} from 'lucide-react'
import { paperApi } from '@/lib/api/review-api'
import type { ReviewComment } from '@humory/shared'

interface PDFViewerProps {
  paperId: string
  onCommentAdd: (comment: {
    pageNumber: number
    positionX: number
    positionY: number
    selectedText?: string
  }) => void
  comments: ReviewComment[]
}

// This component will only render on the client side
export default function PDFViewerClient({ paperId, onCommentAdd, comments }: PDFViewerProps) {
  const [numPages, setNumPages] = useState<number>(0)
  const [pageNumber, setPageNumber] = useState<number>(1)
  const [scale, setScale] = useState<number>(1.0)
  const [searchText, setSearchText] = useState<string>('')
  const [pdfUrl, setPdfUrl] = useState<string>('')
  const [selectedText, setSelectedText] = useState<string>('')
  const [selection, setSelection] = useState<{ x: number; y: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [Document, setDocument] = useState<any>(null)
  const [Page, setPage] = useState<any>(null)
  const [pdfjs, setPdfjs] = useState<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Load react-pdf dynamically on client side only
  useEffect(() => {
    let mounted = true

    const loadPDFLibraries = async () => {
      try {
        const reactPdf = await import('react-pdf')
        await import('react-pdf/dist/Page/AnnotationLayer.css')
        await import('react-pdf/dist/Page/TextLayer.css')

        if (mounted) {
          setDocument(() => reactPdf.Document)
          setPage(() => reactPdf.Page)
          setPdfjs(reactPdf.pdfjs)

          // Configure PDF.js worker from public directory
          reactPdf.pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'
        }
      } catch (error) {
        console.error('Failed to load PDF libraries:', error)
      }
    }

    loadPDFLibraries()

    return () => {
      mounted = false
    }
  }, [])

  // Load PDF as blob with proper auth headers
  useEffect(() => {
    if (!Document || !Page) return

    let blobUrl: string | null = null
    const loadPDF = async () => {
      try {
        setLoading(true)
        // Fetch PDF with auth headers and create blob URL
        const url = await paperApi.getPdfBlob(paperId)
        blobUrl = url
        setPdfUrl(url)

        // Track paper access
        await paperApi.logAccess(paperId, {
          accessType: 'open',
        })
      } catch (error) {
        console.error('Failed to load PDF:', error)
        setLoading(false)
      }
    }
    loadPDF()

    // Cleanup blob URL on unmount
    return () => {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl)
      }
    }
  }, [paperId, Document, Page])

  // Track page view duration
  useEffect(() => {
    const startTime = Date.now()
    return () => {
      const duration = Math.floor((Date.now() - startTime) / 1000)
      paperApi.logAccess(paperId, {
        accessType: 'page_view',
        pageNumber,
        durationSeconds: duration,
      }).catch(console.error)
    }
  }, [pageNumber, paperId])

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages)
    setLoading(false)
  }

  const handleTextSelection = useCallback(() => {
    const selection = window.getSelection()
    if (!selection || selection.toString().trim() === '') {
      setSelectedText('')
      setSelection(null)
      return
    }

    const text = selection.toString()
    const range = selection.getRangeAt(0)
    const rect = range.getBoundingClientRect()
    const containerRect = containerRef.current?.getBoundingClientRect()

    if (containerRect) {
      setSelectedText(text)
      setSelection({
        x: (rect.left - containerRect.left) / containerRect.width,
        y: (rect.top - containerRect.top) / containerRect.height,
      })
    }
  }, [])

  const handleAddComment = useCallback(() => {
    if (!selectedText || !selection) return

    onCommentAdd({
      pageNumber,
      positionX: selection.x,
      positionY: selection.y,
      selectedText,
    })

    // Clear selection
    window.getSelection()?.removeAllRanges()
    setSelectedText('')
    setSelection(null)
  }, [selectedText, selection, pageNumber, onCommentAdd])

  const changePage = useCallback((offset: number) => {
    setPageNumber((prevPageNumber) => {
      const newPage = prevPageNumber + offset
      if (newPage < 1 || newPage > numPages) return prevPageNumber
      return newPage
    })
  }, [numPages])

  const handleZoom = useCallback((delta: number) => {
    setScale((prev) => Math.max(0.5, Math.min(3.0, prev + delta)))
  }, [])

  const handleSearch = useCallback(() => {
    if (!searchText) return
    // Track search
    paperApi.logAccess(paperId, {
      accessType: 'search',
    }).catch(console.error)
  }, [searchText, paperId])

  // Disable right-click context menu
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault()
      return false
    }

    const container = containerRef.current
    if (container) {
      container.addEventListener('contextmenu', handleContextMenu)
      return () => container.removeEventListener('contextmenu', handleContextMenu)
    }
  }, [])

  // Disable keyboard shortcuts (Ctrl+S, Ctrl+P)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'p')) {
        e.preventDefault()
        return false
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  if (!Document || !Page || loading) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-100">
        <p className="text-gray-600">Loading PDF...</p>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-gray-100">
      {/* Toolbar */}
      <div className="border-b bg-white p-2 flex items-center gap-2 flex-wrap">
        {/* Page Navigation */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => changePage(-1)}
            disabled={pageNumber <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm px-2 min-w-[100px] text-center">
            Page {pageNumber} / {numPages}
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => changePage(1)}
            disabled={pageNumber >= numPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="border-l h-6 mx-2" />

        {/* Zoom Controls */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleZoom(-0.1)}
            disabled={scale <= 0.5}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm px-2 min-w-[60px] text-center">
            {Math.round(scale * 100)}%
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleZoom(0.1)}
            disabled={scale >= 3.0}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>

        <div className="border-l h-6 mx-2" />

        {/* Search */}
        <div className="flex items-center gap-1 flex-1 max-w-xs">
          <Input
            type="text"
            placeholder="Search in document..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="h-8"
          />
          <Button variant="ghost" size="icon" onClick={handleSearch}>
            <Search className="h-4 w-4" />
          </Button>
        </div>

        {/* Comment button (shown when text selected) */}
        {selectedText && (
          <Button
            variant="default"
            size="sm"
            onClick={handleAddComment}
            className="ml-auto"
          >
            <MessageSquarePlus className="h-4 w-4 mr-2" />
            Add Comment
          </Button>
        )}
      </div>

      {/* PDF Content */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto p-4"
        onMouseUp={handleTextSelection}
      >
        {pdfUrl && (
          <Document
            file={pdfUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={(error) => console.error('Document load error:', error)}
            className="flex justify-center"
            loading={
              <div className="flex items-center justify-center p-8">
                <p className="text-gray-600">Loading document...</p>
              </div>
            }
            error={
              <div className="flex items-center justify-center p-8">
                <p className="text-red-600">Failed to load PDF. Please try again.</p>
              </div>
            }
          >
            <div className="relative">
              <Page
                pageNumber={pageNumber}
                scale={scale}
                renderTextLayer={true}
                renderAnnotationLayer={false}
                className="shadow-lg"
                onRenderError={(error) => console.error('Page render error:', error)}
              />

              {/* Overlay comments for current page */}
              {comments
                .filter((c) => c.pageNumber === pageNumber)
                .map((comment) => (
                  <CommentMarker
                    key={comment.id}
                    comment={comment}
                    scale={scale}
                  />
                ))}
            </div>
          </Document>
        )}
      </div>
    </div>
  )
}

// Comment marker component
function CommentMarker({
  comment,
  scale,
}: {
  comment: ReviewComment
  scale: number
}) {
  return (
    <div
      className="absolute w-6 h-6 bg-yellow-400 rounded-full border-2 border-yellow-600 cursor-pointer hover:scale-110 transition-transform flex items-center justify-center"
      style={{
        left: `${(comment.positionX || 0) * 100}%`,
        top: `${(comment.positionY || 0) * 100}%`,
        transform: `translate(-50%, -50%) scale(${1 / scale})`,
      }}
      title={comment.commentText}
    >
      <span className="text-xs font-bold text-yellow-900">!</span>
    </div>
  )
}
