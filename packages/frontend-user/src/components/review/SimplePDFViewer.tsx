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
  ChevronUp,
  ChevronDown,
  Maximize2,
  AlertCircle,
  CheckCircle,
  Loader2,
} from 'lucide-react'
import { paperApi } from '@/lib/api/review-api'
import type { ReviewComment } from '@humory/shared'
import { usePDFTextStore } from '@/stores/pdf-text-store'

interface PDFViewerProps {
  paperId: string
  documentId?: string // optional - for AI context integration
  onCommentAdd: (comment: {
    pageNumber: number
    positionX: number
    positionY: number
    selectedText?: string
  }) => void
  comments: ReviewComment[]
}

interface SearchMatch {
  pageNumber: number
  matchIndex: number
  text: string
}

export default function SimplePDFViewer({ paperId, documentId, onCommentAdd, comments }: PDFViewerProps) {
  const [numPages, setNumPages] = useState<number>(0)
  const [pageNumber, setPageNumber] = useState<number>(1)
  const [textExtractionError, setTextExtractionError] = useState<string | null>(null)

  // PDF text store for AI context
  const { setPDFText, setExtracting, setError: setPDFError } = usePDFTextStore()
  const [scale, setScale] = useState<number>(1.0)
  const [fitToWidth, setFitToWidth] = useState<boolean>(false)
  const [searchText, setSearchText] = useState<string>('')
  const [searchMatches, setSearchMatches] = useState<SearchMatch[]>([])
  const [currentMatchIndex, setCurrentMatchIndex] = useState<number>(-1)
  const [isSearching, setIsSearching] = useState<boolean>(false)
  const [showSearchBox, setShowSearchBox] = useState<boolean>(false)
  const [pageInput, setPageInput] = useState<string>('')
  const [pdfUrl, setPdfUrl] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const highlightLayerRef = useRef<HTMLDivElement>(null)
  const pdfDocRef = useRef<any>(null)
  const textContentCache = useRef<Map<number, any>>(new Map())
  const initialRenderComplete = useRef(false)

  // Extract PDF text in background for AI context
  const extractPDFTextInBackground = useCallback(async (pdf: any, docId: string, pId: string) => {
    try {
      console.log(`[PDF Text Extraction] Starting for document ${docId}...`)
      setExtracting(docId, true)
      setTextExtractionError(null)

      const pages: string[] = []
      const totalPages = pdf.numPages

      // Extract text from each page
      for (let i = 1; i <= totalPages; i++) {
        const page = await pdf.getPage(i)
        const textContent = await page.getTextContent()
        const pageText = textContent.items.map((item: any) => item.str).join(' ')
        pages.push(pageText)
      }

      // Build full text
      const fullText = pages.join('\n\n')

      // Create summary from first 2 pages (trimmed to ~2500 chars)
      const firstTwoPages = pages.slice(0, 2).join('\n\n')
      const summary = firstTwoPages.substring(0, 2500)

      // Store in zustand
      setPDFText(docId, {
        paperId: pId,
        numPages: totalPages,
        pages,
        fullText,
        summary,
        isExtracting: false,
      })

      console.log(`[PDF Text Extraction] ✓ Complete. Extracted ${pages.length} pages, ${fullText.length} chars total`)
    } catch (error: any) {
      console.error('[PDF Text Extraction] Failed:', error)
      const errorMsg = error.message || 'Failed to extract PDF text'
      setTextExtractionError(errorMsg)
      setPDFError(docId, errorMsg)
    }
  }, [setPDFText, setExtracting, setPDFError])

  // Load PDF.js from CDN (v3.11.174 - matches available CDN version)
  useEffect(() => {
    const script = document.createElement('script')
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'
    script.async = true
    script.onload = () => {
      console.log('PDF.js loaded from CDN')
      // Configure worker to use local file
      if (window.pdfjsLib) {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js'
      }
    }
    script.onerror = () => {
      console.error('Failed to load PDF.js from CDN')
      setError('Failed to load PDF library')
      setLoading(false)
    }
    document.head.appendChild(script)

    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script)
      }
    }
  }, [])

  // Load PDF document
  useEffect(() => {
    let blobUrl: string | null = null
    let cancelled = false

    const loadPDF = async () => {
      try {
        setLoading(true)
        setError(null)

        // Wait for PDF.js to be available
        let attempts = 0
        while (!window.pdfjsLib && attempts < 50) {
          await new Promise(resolve => setTimeout(resolve, 100))
          attempts++
        }

        if (!window.pdfjsLib) {
          throw new Error('PDF.js failed to load')
        }

        // Fetch PDF with auth headers and create blob URL
        console.log('[PDF Viewer] Fetching PDF blob for paper:', paperId)
        const url = await paperApi.getPdfBlob(paperId)
        if (cancelled) return
        blobUrl = url
        setPdfUrl(url)
        console.log('[PDF Viewer] PDF blob URL created:', url.substring(0, 50) + '...')

        // Load PDF document
        console.log('[PDF Viewer] Loading PDF document...')
        const loadingTask = window.pdfjsLib.getDocument(url)
        const pdf = await loadingTask.promise
        if (cancelled) return
        pdfDocRef.current = pdf
        const totalPages = pdf.numPages
        setNumPages(totalPages)
        console.log('[PDF Viewer] PDF loaded successfully. Total pages:', totalPages)

        // Track paper access
        await paperApi.logAccess(paperId, {
          accessType: 'open',
        })

        setLoading(false)

        // Force initial render - wait for canvas to be mounted then render
        // This avoids race condition between setNumPages and setPageNumber
        if (!cancelled && totalPages > 0) {
          const initialScale = 1.0 // Use default scale for initial render

          // Helper function to render first page, with retry mechanism
          const renderFirstPage = async (retryCount = 0): Promise<void> => {
            if (cancelled) return

            const canvas = canvasRef.current
            if (!canvas) {
              // Canvas not mounted yet, retry after a short delay (max 10 retries = 1 second)
              if (retryCount < 10) {
                setTimeout(() => renderFirstPage(retryCount + 1), 100)
              } else {
                console.error('PDF canvas not available after retries')
              }
              return
            }

            try {
              const page = await pdf.getPage(1)
              const context = canvas.getContext('2d')
              if (!context) return

              const pixelRatio = window.devicePixelRatio || 1
              const viewport = page.getViewport({ scale: initialScale * pixelRatio, rotation: 0 })

              canvas.height = viewport.height
              canvas.width = viewport.width
              canvas.style.height = `${viewport.height / pixelRatio}px`
              canvas.style.width = `${viewport.width / pixelRatio}px`

              context.clearRect(0, 0, canvas.width, canvas.height)
              context.setTransform(1, 0, 0, 1, 0, 0)

              await page.render({ canvasContext: context, viewport }).promise
              initialRenderComplete.current = true
              console.log('PDF initial render complete (direct)')
            } catch (error) {
              console.error('Error in initial render:', error)
            }
          }

          // Start the render after a brief delay for React to mount the canvas
          setTimeout(() => renderFirstPage(), 50)
        }

        // Extract PDF text in background for AI context (if documentId provided)
        if (documentId && !cancelled) {
          extractPDFTextInBackground(pdf, documentId, paperId)
        }
      } catch (error: any) {
        if (cancelled) return
        console.error('Failed to load PDF:', error)
        setError(error.message || 'Failed to load PDF')
        setLoading(false)
      }
    }

    loadPDF()

    return () => {
      cancelled = true
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl)
      }
      if (pdfDocRef.current) {
        pdfDocRef.current.destroy()
      }
    }
  }, [paperId])

  // Calculate fit-to-width scale when container size changes
  useEffect(() => {
    if (!fitToWidth || !pdfDocRef.current || !containerRef.current || numPages === 0) return

    let resizeTimeout: NodeJS.Timeout

    const updateFitToWidthScale = async () => {
      try {
        const page = await pdfDocRef.current.getPage(pageNumber)
        const containerWidth = containerRef.current!.offsetWidth - 32 // Account for padding
        const viewport = page.getViewport({ scale: 1.0, rotation: 0 })
        const newScale = containerWidth / viewport.width
        setScale(newScale)
      } catch (error) {
        console.error('Error calculating fit-to-width scale:', error)
      }
    }

    // Small delay to ensure container is rendered
    const timeoutId = setTimeout(() => {
      updateFitToWidthScale()
    }, 100)

    // Observe container resize with debouncing
    const resizeObserver = new ResizeObserver(() => {
      clearTimeout(resizeTimeout)
      resizeTimeout = setTimeout(() => {
        updateFitToWidthScale()
      }, 150)
    })
    resizeObserver.observe(containerRef.current)

    return () => {
      clearTimeout(timeoutId)
      clearTimeout(resizeTimeout)
      resizeObserver.disconnect()
    }
  }, [fitToWidth, pageNumber, numPages])

  // Extract text content from a page (defined early to avoid initialization errors)
  const getPageTextContent = useCallback(async (pageNum: number) => {
    if (textContentCache.current.has(pageNum)) {
      return textContentCache.current.get(pageNum)
    }

    try {
      const page = await pdfDocRef.current.getPage(pageNum)
      const textContent = await page.getTextContent()
      textContentCache.current.set(pageNum, textContent)
      return textContent
    } catch (error) {
      console.error(`Error extracting text from page ${pageNum}:`, error)
      return null
    }
  }, [])

  // Render page when page number or scale changes
  useEffect(() => {
    const renderPage = async () => {
      if (!pdfDocRef.current || !canvasRef.current) return

      // Don't render if numPages is 0 (PDF not loaded yet)
      if (numPages === 0) return

      try {
        const page = await pdfDocRef.current.getPage(pageNumber)
        const canvas = canvasRef.current
        const context = canvas.getContext('2d')

        if (!context) return

        // Get device pixel ratio for crisp rendering on retina displays
        const pixelRatio = window.devicePixelRatio || 1
        const viewport = page.getViewport({ scale: scale * pixelRatio, rotation: 0 })

        // Set canvas size accounting for pixel ratio
        canvas.height = viewport.height
        canvas.width = viewport.width

        // Scale down the display size to match intended dimensions
        canvas.style.height = `${viewport.height / pixelRatio}px`
        canvas.style.width = `${viewport.width / pixelRatio}px`

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        }

        // Clear canvas before rendering
        context.clearRect(0, 0, canvas.width, canvas.height)

        // Reset any transforms that might have been applied
        context.setTransform(1, 0, 0, 1, 0, 0)

        await page.render(renderContext).promise

        // Mark initial render as complete
        if (!initialRenderComplete.current) {
          initialRenderComplete.current = true
          console.log('PDF initial render complete')
        }
      } catch (error) {
        console.error('Error rendering page:', error)
      }
    }

    renderPage()
  }, [pageNumber, scale, numPages])

  // Render search highlights separately after page renders
  useEffect(() => {
    if (searchMatches.length === 0 || !initialRenderComplete.current) return

    const renderHighlights = async () => {
      if (!highlightLayerRef.current || !canvasRef.current || !pdfDocRef.current) return

      const highlightLayer = highlightLayerRef.current
      highlightLayer.innerHTML = '' // Clear previous highlights

      const currentPageMatches = searchMatches.filter(m => m.pageNumber === pageNumber)
      if (currentPageMatches.length === 0) return

      try {
        const page = await pdfDocRef.current.getPage(pageNumber)
        const textContent = await getPageTextContent(pageNumber)
        if (!textContent) return

        const viewport = page.getViewport({ scale })
        const query = searchText.toLowerCase()

        textContent.items.forEach((item: any) => {
          const itemText = item.str
          const itemLower = itemText.toLowerCase()

          for (let i = 0; i < itemText.length; i++) {
            if (itemLower.substring(i, i + query.length) === query) {
              const transform = item.transform
              const x = transform[4]
              const y = transform[5]
              const height = item.height || 12
              const width = (item.width || itemText.length * 8) * (query.length / itemText.length)

              const highlight = document.createElement('div')
              highlight.style.position = 'absolute'
              highlight.style.left = `${x * scale / viewport.scale}px`
              highlight.style.top = `${(viewport.height - y - height) * scale / viewport.scale}px`
              highlight.style.width = `${width * scale / viewport.scale}px`
              highlight.style.height = `${height * scale / viewport.scale}px`
              highlight.style.backgroundColor = 'rgba(255, 255, 0, 0.4)'
              highlight.style.pointerEvents = 'none'
              highlightLayer.appendChild(highlight)
            }
          }
        })
      } catch (error) {
        console.error('Error rendering highlights:', error)
      }
    }

    renderHighlights()
  }, [searchMatches, pageNumber, scale, searchText, getPageTextContent])

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

  const changePage = useCallback((offset: number) => {
    setPageNumber((prev) => {
      const newPage = prev + offset
      if (newPage < 1 || newPage > numPages) return prev
      return newPage
    })
  }, [numPages])

  const jumpToPage = useCallback((page: number) => {
    if (page >= 1 && page <= numPages) {
      setPageNumber(page)
      setPageInput('')
    }
  }, [numPages])

  const handlePageInputChange = useCallback((value: string) => {
    setPageInput(value)
  }, [])

  const handlePageInputSubmit = useCallback(() => {
    const page = parseInt(pageInput, 10)
    if (!isNaN(page)) {
      jumpToPage(page)
    }
  }, [pageInput, jumpToPage])

  const handleZoom = useCallback((delta: number) => {
    setFitToWidth(false)
    setScale((prev) => Math.max(0.5, Math.min(3.0, prev + delta)))
  }, [])

  const handleFitToWidth = useCallback(() => {
    setFitToWidth(true)
  }, [])

  // Perform full-text search across all pages
  const handleSearch = useCallback(async () => {
    if (!searchText.trim() || !pdfDocRef.current) {
      setSearchMatches([])
      setCurrentMatchIndex(-1)
      return
    }

    setIsSearching(true)
    const matches: SearchMatch[] = []
    const query = searchText.toLowerCase()

    try {
      // Search all pages
      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        const textContent = await getPageTextContent(pageNum)
        if (!textContent) continue

        // Combine all text items into a single string
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ')
          .toLowerCase()

        // Find all matches in the page
        let startIndex = 0
        while (true) {
          const index = pageText.indexOf(query, startIndex)
          if (index === -1) break

          matches.push({
            pageNumber: pageNum,
            matchIndex: index,
            text: searchText,
          })
          startIndex = index + 1
        }
      }

      setSearchMatches(matches)
      setCurrentMatchIndex(matches.length > 0 ? 0 : -1)

      // Jump to first match
      if (matches.length > 0) {
        setPageNumber(matches[0].pageNumber)
      }

      // Log search access
      paperApi.logAccess(paperId, {
        accessType: 'search',
      }).catch(console.error)
    } catch (error) {
      console.error('Error searching PDF:', error)
    } finally {
      setIsSearching(false)
    }
  }, [searchText, numPages, paperId, getPageTextContent])

  const goToNextMatch = useCallback(() => {
    if (searchMatches.length === 0) return
    const nextIndex = (currentMatchIndex + 1) % searchMatches.length
    setCurrentMatchIndex(nextIndex)
    setPageNumber(searchMatches[nextIndex].pageNumber)
  }, [searchMatches, currentMatchIndex])

  const goToPreviousMatch = useCallback(() => {
    if (searchMatches.length === 0) return
    const prevIndex = (currentMatchIndex - 1 + searchMatches.length) % searchMatches.length
    setCurrentMatchIndex(prevIndex)
    setPageNumber(searchMatches[prevIndex].pageNumber)
  }, [searchMatches, currentMatchIndex])

  // Render search highlights on current page
  const renderSearchHighlights = useCallback(async () => {
    if (!highlightLayerRef.current || !canvasRef.current || !pdfDocRef.current) return

    const highlightLayer = highlightLayerRef.current
    highlightLayer.innerHTML = '' // Clear previous highlights

    const currentPageMatches = searchMatches.filter(m => m.pageNumber === pageNumber)
    if (currentPageMatches.length === 0) return

    try {
      const page = await pdfDocRef.current.getPage(pageNumber)
      const textContent = await getPageTextContent(pageNumber)
      if (!textContent) return

      const viewport = page.getViewport({ scale })
      const canvas = canvasRef.current
      const canvasRect = canvas.getBoundingClientRect()

      // Build text positions
      const query = searchText.toLowerCase()
      let currentText = ''
      let charIndex = 0

      textContent.items.forEach((item: any) => {
        const itemText = item.str
        const itemLower = itemText.toLowerCase()

        for (let i = 0; i < itemText.length; i++) {
          if (itemLower.substring(i, i + query.length) === query) {
            // Found a match, calculate position
            const transform = item.transform
            const x = transform[4]
            const y = transform[5]
            const height = item.height || 12
            const width = (item.width || itemText.length * 8) * (query.length / itemText.length)

            // Create highlight element
            const highlight = document.createElement('div')
            highlight.style.position = 'absolute'
            highlight.style.left = `${x * scale / viewport.scale}px`
            highlight.style.top = `${(viewport.height - y - height) * scale / viewport.scale}px`
            highlight.style.width = `${width * scale / viewport.scale}px`
            highlight.style.height = `${height * scale / viewport.scale}px`
            highlight.style.backgroundColor = 'rgba(255, 255, 0, 0.4)'
            highlight.style.pointerEvents = 'none'
            highlightLayer.appendChild(highlight)
          }
        }
      })
    } catch (error) {
      console.error('Error rendering highlights:', error)
    }
  }, [searchMatches, pageNumber, searchText, scale, getPageTextContent])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle if user is typing in an input
      if (e.target instanceof HTMLInputElement) return

      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        changePage(-1)
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        changePage(1)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [changePage])

  // Trackpad/wheel zoom
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()

        // Calculate zoom centered on cursor
        const delta = -e.deltaY * 0.01
        setFitToWidth(false)
        setScale((prev) => {
          const newScale = Math.max(0.5, Math.min(3.0, prev * (1 + delta)))
          return newScale
        })
      }
    }

    const container = containerRef.current
    if (container) {
      container.addEventListener('wheel', handleWheel, { passive: false })
      return () => container.removeEventListener('wheel', handleWheel)
    }
  }, [])

  const toggleSearchBox = useCallback(() => {
    setShowSearchBox((prev) => !prev)
    if (!showSearchBox) {
      // Clear search when opening
      setSearchText('')
      setSearchMatches([])
      setCurrentMatchIndex(-1)
    }
  }, [showSearchBox])

  // Disable right-click
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

  // Disable Ctrl+S and Ctrl+P
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

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-100">
        <p className="text-gray-600">Loading PDF...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <p className="text-red-600 mb-2">Failed to load PDF</p>
          <p className="text-sm text-gray-600">{error}</p>
        </div>
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
          <div className="flex items-center gap-1">
            <Input
              type="text"
              placeholder={String(pageNumber)}
              value={pageInput}
              onChange={(e) => handlePageInputChange(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handlePageInputSubmit()}
              onBlur={handlePageInputSubmit}
              className="h-8 w-12 text-center text-sm p-0"
            />
            <span className="text-sm text-muted-foreground">
              / {numPages}
            </span>
          </div>
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
            title="Zoom out"
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
            title="Zoom in"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button
            variant={fitToWidth ? "default" : "ghost"}
            size="icon"
            onClick={handleFitToWidth}
            title="Fit to width"
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>

        <div className="border-l h-6 mx-2" />

        {/* Search Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSearchBox}
          title="Search in document"
        >
          <Search className="h-4 w-4" />
        </Button>
      </div>

      {/* Search Box Popup */}
      {showSearchBox && (
        <div className="border-b bg-white p-2 flex items-center gap-2">
          <Input
            type="text"
            placeholder="Search in document..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="h-8 flex-1"
            autoFocus
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={handleSearch}
            disabled={isSearching}
            title="Search"
          >
            <Search className="h-4 w-4" />
          </Button>

          {/* Search Navigation */}
          {searchMatches.length > 0 && (
            <>
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {currentMatchIndex + 1} / {searchMatches.length}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={goToPreviousMatch}
                disabled={searchMatches.length === 0}
                title="Previous match"
              >
                <ChevronUp className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={goToNextMatch}
                disabled={searchMatches.length === 0}
                title="Next match"
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      )}

      {/* PDF Text Extraction Status/Error Banner (only shown when documentId provided for AI integration) */}
      {documentId && textExtractionError && (
        <div className="border-b bg-amber-50 border-amber-200 p-2 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0" />
          <span className="text-xs text-amber-800">
            PDF text extraction failed: {textExtractionError}. AI Assistant will not have access to PDF content.
          </span>
        </div>
      )}

      {/* PDF Canvas with Highlight Layer */}
      <div ref={containerRef} className="flex-1 overflow-auto p-4">
        <div className="flex justify-start">
          <div className="relative">
            <canvas ref={canvasRef} className="shadow-lg" />
            <div
              ref={highlightLayerRef}
              className="absolute top-0 left-0 pointer-events-none"
              style={{
                width: canvasRef.current?.style.width || '100%',
                height: canvasRef.current?.style.height || '100%',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

// Extend Window interface for PDF.js from CDN
declare global {
  interface Window {
    pdfjsLib: any
  }
}

