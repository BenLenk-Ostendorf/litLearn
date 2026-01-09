import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { ZoomIn, ZoomOut, Maximize2, Minimize2, Hand, MousePointer } from 'lucide-react'
import * as pdfjsLib from 'pdfjs-dist'
import * as pdfjsViewer from 'pdfjs-dist/web/pdf_viewer'
import 'pdfjs-dist/web/pdf_viewer.css'
import { loadPdf } from '../../utils/storage'

// Use local worker file instead of CDN
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString()

export default function PdfViewer({ file, filePath, directoryHandle, onTextExtracted }) {
  const { t } = useTranslation()
  const containerRef = useRef(null)
  const scrollContainerRef = useRef(null)
  const canvasRefs = useRef([])
  const textLayerRefs = useRef([])
  
  const [pdf, setPdf] = useState(null)
  const [totalPages, setTotalPages] = useState(0)
  const [scale, setScale] = useState(1.0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [renderedPages, setRenderedPages] = useState([])
  const [hasSelectableText, setHasSelectableText] = useState(null)
  
  // Pan/drag state
  const [isPanning, setIsPanning] = useState(false)
  const [startPos, setStartPos] = useState({ x: 0, y: 0 })
  const [scrollPos, setScrollPos] = useState({ x: 0, y: 0 })
  const [selectionMode, setSelectionMode] = useState(false)

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
        setHasSelectableText(null)
        
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

  // Render all pages
  useEffect(() => {
    if (!pdf) return
    
    const renderAllPages = async () => {
      const pages = []
      
      for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        const page = await pdf.getPage(pageNum)
        const viewport = page.getViewport({ scale })
        pages.push({ pageNum, viewport, page })
      }
      
      setRenderedPages(pages)
    }
    
    renderAllPages()
  }, [pdf, totalPages, scale])
  
  // Render each page to its canvas with text layer
  useEffect(() => {
    if (renderedPages.length === 0) return
    
    let cancelled = false
    
    const renderPages = async () => {
      for (let index = 0; index < renderedPages.length; index++) {
        if (cancelled) break
        
        const { pageNum, viewport, page } = renderedPages[index]
        
        try {
          const canvas = canvasRefs.current[index]
          if (!canvas) continue
          
          const context = canvas.getContext('2d')
          const outputScale = window.devicePixelRatio || 1
          
          canvas.width = Math.floor(viewport.width * outputScale)
          canvas.height = Math.floor(viewport.height * outputScale)
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

          // Render text layer for selection
          const textLayerDiv = textLayerRefs.current[index]
          if (!textLayerDiv) continue
          
          const textContent = await page.getTextContent()
          if (pageNum === 1 && hasSelectableText === null) {
            const hasText = Boolean(textContent?.items?.some(i => (i?.str || '').trim().length > 0))
            setHasSelectableText(hasText)
          }
          
          textLayerDiv.innerHTML = ''
          textLayerDiv.style.width = canvas.style.width
          textLayerDiv.style.height = canvas.style.height
          
          if (pdfjsViewer?.TextLayer) {
            const textLayer = new pdfjsViewer.TextLayer({
              textContentSource: textContent,
              container: textLayerDiv,
              viewport
            })
            const maybePromise = textLayer.render()
            if (maybePromise?.promise) {
              await maybePromise.promise
            } else {
              await maybePromise
            }
          } else if (pdfjsViewer?.renderTextLayer) {
            const taskOrPromise = pdfjsViewer.renderTextLayer({
              textContentSource: textContent,
              container: textLayerDiv,
              viewport
            })
            
            if (taskOrPromise?.promise) {
              await taskOrPromise.promise
            } else {
              await taskOrPromise
            }
          } else {
            console.warn('PDF.js text layer renderer not available in this build.')
          }
        } catch (err) {
          console.error('Text layer render error:', err)
        }
      }
    }
    
    renderPages()
    
    return () => {
      cancelled = true
    }
  }, [renderedPages, hasSelectableText])

  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.1, 2.5))
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.1, 1.0))
  const handleZoomChange = (e) => setScale(parseFloat(e.target.value))
  
  // Pan/drag handlers (default mode unless in selection mode)
  const handleMouseDown = (e) => {
    if (e.button !== 0) return // Only left click
    if (selectionMode) return // Don't pan in selection mode
    
    setIsPanning(true)
    setStartPos({ x: e.clientX, y: e.clientY })
    setScrollPos({
      x: scrollContainerRef.current.scrollLeft,
      y: scrollContainerRef.current.scrollTop
    })
    e.preventDefault()
  }
  
  const handleMouseMove = (e) => {
    if (!isPanning) return
    
    const dx = e.clientX - startPos.x
    const dy = e.clientY - startPos.y
    
    scrollContainerRef.current.scrollLeft = scrollPos.x - dx
    scrollContainerRef.current.scrollTop = scrollPos.y - dy
  }
  
  const handleMouseUp = () => {
    setIsPanning(false)
  }
  
  useEffect(() => {
    if (isPanning) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isPanning, startPos, scrollPos])

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
          <p className="text-gray-500">{t('common.loading')}</p>
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
        <div className="flex items-center gap-3">
          <button
            onClick={handleZoomOut}
            className="p-1.5 hover:bg-gray-100 rounded"
            title={t('pdf.zoomOut')}
            disabled={scale <= 1.0}
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <input
            type="range"
            min="1.0"
            max="2.5"
            step="0.1"
            value={scale}
            onChange={handleZoomChange}
            className="w-24 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            title="Zoom: {Math.round(scale * 100)}%"
          />
          <span className="text-sm text-gray-600 w-12 text-center">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={handleZoomIn}
            className="p-1.5 hover:bg-gray-100 rounded"
            title={t('pdf.zoomIn')}
            disabled={scale >= 2.5}
          >
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSelectionMode(!selectionMode)}
            className={`p-1.5 rounded transition-colors ${
              selectionMode 
                ? 'bg-primary text-white' 
                : 'hover:bg-gray-100 text-gray-600'
            }`}
            title={selectionMode ? t('pdf.textSelection') : t('pdf.handTool')}
          >
            {selectionMode ? <MousePointer className="w-4 h-4" /> : <Hand className="w-4 h-4" />}
          </button>
          <span className="text-sm text-gray-600">
            {t('pdf.pages', { count: totalPages })}
          </span>
          {hasSelectableText === false && (
            <span className="text-sm text-gray-500">
              {t('pdf.noText')}
            </span>
          )}
        </div>
        
        <button
          onClick={toggleFullscreen}
          className="p-1.5 hover:bg-gray-100 rounded"
          title="Vollbild"
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>
      
      {/* Scrollable canvas container */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-auto p-4 bg-gray-100"
        style={{ cursor: isPanning ? 'grabbing' : (selectionMode ? 'text' : 'grab') }}
        onMouseDown={handleMouseDown}
      >
        <div className="flex flex-col items-center gap-4">
          {renderedPages.map(({ pageNum }, index) => (
            <div key={pageNum} className="relative shadow-lg">
              <canvas
                ref={el => canvasRefs.current[index] = el}
                className="bg-white"
              />
              <div 
                className="textLayer absolute top-0 left-0 overflow-hidden leading-none"
                ref={el => textLayerRefs.current[index] = el}
                style={{ pointerEvents: selectionMode ? 'auto' : 'none' }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
