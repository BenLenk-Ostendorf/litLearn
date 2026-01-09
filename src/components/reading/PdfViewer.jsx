import { useState, useEffect, useRef } from 'react'
import { ZoomIn, ZoomOut, ChevronLeft, ChevronRight, Maximize2, Minimize2 } from 'lucide-react'
import * as pdfjsLib from 'pdfjs-dist'
import { loadPdf } from '../../utils/storage'

// Use local worker file instead of CDN
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString()

export default function PdfViewer({ file, filePath, directoryHandle, onTextExtracted }) {
  const canvasRef = useRef(null)
  const containerRef = useRef(null)
  
  const [pdf, setPdf] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [scale, setScale] = useState(1.8)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Load PDF
  useEffect(() => {
    const loadPdfDocument = async () => {
      setLoading(true)
      setError(null)
      
      try {
        let pdfData
        
        if (file) {
          pdfData = await file.arrayBuffer()
        } else if (filePath && directoryHandle) {
          const pdfFile = await loadPdf(directoryHandle, filePath)
          pdfData = await pdfFile.arrayBuffer()
        } else {
          return
        }
        
        const pdfDoc = await pdfjsLib.getDocument({ data: pdfData }).promise
        setPdf(pdfDoc)
        setTotalPages(pdfDoc.numPages)
        setCurrentPage(1)
        
        // Extract text for AI
        extractText(pdfDoc)
      } catch (err) {
        console.error('PDF load error:', err)
        setError('PDF konnte nicht geladen werden: ' + err.message)
      } finally {
        setLoading(false)
      }
    }
    
    loadPdfDocument()
  }, [file, filePath, directoryHandle])

  // Extract text from PDF
  const extractText = async (pdfDoc) => {
    try {
      let fullText = ''
      const maxChars = 15000
      
      // Prioritize first pages (abstract) and last pages (conclusion)
      const pagesToExtract = []
      const numPages = pdfDoc.numPages
      
      // First 3 pages
      for (let i = 1; i <= Math.min(3, numPages); i++) {
        pagesToExtract.push(i)
      }
      
      // Last 2 pages if not already included
      for (let i = Math.max(numPages - 1, 4); i <= numPages; i++) {
        if (!pagesToExtract.includes(i)) {
          pagesToExtract.push(i)
        }
      }
      
      for (const pageNum of pagesToExtract) {
        if (fullText.length >= maxChars) break
        
        const page = await pdfDoc.getPage(pageNum)
        const textContent = await page.getTextContent()
        const pageText = textContent.items.map(item => item.str).join(' ')
        fullText += pageText + '\n\n'
      }
      
      onTextExtracted?.(fullText.slice(0, maxChars))
    } catch (err) {
      console.error('Text extraction error:', err)
    }
  }

  // Render current page
  useEffect(() => {
    if (!pdf || !canvasRef.current) return
    
    const renderPage = async () => {
      const page = await pdf.getPage(currentPage)
      const viewport = page.getViewport({ scale })
      
      const canvas = canvasRef.current
      const context = canvas.getContext('2d')
      
      // Use devicePixelRatio for sharper rendering
      const outputScale = window.devicePixelRatio || 1
      
      canvas.width = Math.floor(viewport.width * outputScale)
      canvas.height = Math.floor(viewport.height * outputScale)
      
      // Set CSS size to match viewport (prevents browser scaling)
      canvas.style.width = Math.floor(viewport.width) + 'px'
      canvas.style.height = Math.floor(viewport.height) + 'px'
      
      const transform = outputScale !== 1 
        ? [outputScale, 0, 0, outputScale, 0, 0] 
        : null
      
      await page.render({
        canvasContext: context,
        viewport,
        transform
      }).promise
    }
    
    renderPage()
  }, [pdf, currentPage, scale])

  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.3, 4))
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.3, 0.5))
  const handlePrevPage = () => setCurrentPage(prev => Math.max(prev - 1, 1))
  const handleNextPage = () => setCurrentPage(prev => Math.min(prev + 1, totalPages))

  const toggleFullscreen = () => {
    if (!containerRef.current) return
    
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-gray-500">PDF wird geladen...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-100 p-4">
        <div className="text-center text-error">
          <p>{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="h-full flex flex-col bg-gray-100">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-200">
        <div className="flex items-center gap-2">
          <button
            onClick={handleZoomOut}
            className="p-1.5 hover:bg-gray-100 rounded"
            title="Verkleinern"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-sm text-gray-600 w-12 text-center">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={handleZoomIn}
            className="p-1.5 hover:bg-gray-100 rounded"
            title="Vergrößern"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrevPage}
            disabled={currentPage <= 1}
            className="p-1.5 hover:bg-gray-100 rounded disabled:opacity-50"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm text-gray-600">
            {currentPage} / {totalPages}
          </span>
          <button
            onClick={handleNextPage}
            disabled={currentPage >= totalPages}
            className="p-1.5 hover:bg-gray-100 rounded disabled:opacity-50"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        
        <button
          onClick={toggleFullscreen}
          className="p-1.5 hover:bg-gray-100 rounded"
          title="Vollbild"
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>
      
      {/* Canvas */}
      <div className="flex-1 overflow-auto p-4 flex justify-center">
        <canvas ref={canvasRef} className="shadow-lg" />
      </div>
    </div>
  )
}
