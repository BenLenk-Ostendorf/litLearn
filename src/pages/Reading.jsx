import { useState, useEffect, useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams, useNavigate } from 'react-router-dom'
import { useData } from '../context/DataContext'
import PdfViewer from '../components/reading/PdfViewer'
import ExcerptForm from '../components/reading/ExcerptForm'
import Timer from '../components/reading/Timer'
import { saveDraft, loadDraft, deleteDraft, savePdf } from '../utils/storage'
import { Upload, FileText, Play, AlertCircle } from 'lucide-react'
import { v4 as uuidv4 } from 'uuid'
import { format, addWeeks } from 'date-fns'

export default function Reading() {
  const { t } = useTranslation()
  const { paperId } = useParams()
  const navigate = useNavigate()
  const { papers, updatePaper, settings, directoryHandle } = useData()
  
  const [paper, setPaper] = useState(null)
  const [pdfFile, setPdfFile] = useState(null)
  const [pdfText, setPdfText] = useState('')
  const [excerpt, setExcerpt] = useState(null)
  const [timerRunning, setTimerRunning] = useState(false)
  const [timeSpent, setTimeSpent] = useState(0)
  const [splitPosition, setSplitPosition] = useState(50)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  
  const containerRef = useRef(null)
  const isDragging = useRef(false)
  const [dragOver, setDragOver] = useState(false)

  // Find paper or get next from inbox
  useEffect(() => {
    let targetPaper = null
    
    if (paperId) {
      targetPaper = papers.find(p => p.id === paperId)
    } else {
      // Check for paper in reading status first
      targetPaper = papers.find(p => p.status === 'reading')
      // Otherwise get next from inbox
      if (!targetPaper) {
        targetPaper = papers.find(p => p.status === 'inbox')
      }
    }
    
    if (targetPaper) {
      setPaper(targetPaper)
      // Load existing excerpt or create new
      setExcerpt(targetPaper.excerpt || createEmptyExcerpt())
    }
  }, [paperId, papers])

  // Load draft on mount
  useEffect(() => {
    if (paper && directoryHandle) {
      loadDraft(directoryHandle, paper.id).then(draft => {
        if (draft) {
          setExcerpt(draft.excerpt)
          setTimeSpent(draft.timeSpent || 0)
        }
      })
    }
  }, [paper, directoryHandle])

  // Auto-save every 30 seconds
  useEffect(() => {
    if (!paper || !directoryHandle || !excerpt) return
    
    const interval = setInterval(async () => {
      await saveDraft(directoryHandle, paper.id, { excerpt, timeSpent })
    }, 30000)
    
    return () => clearInterval(interval)
  }, [paper, directoryHandle, excerpt, timeSpent])

  const createEmptyExcerpt = () => ({
    main_claims: { user_input: '', ai_suggestion: '', final: '' },
    topics: { user_input: [], ai_suggestion: [], final: [] },
    study_type: '',
    citability: 5,
    relevant_projects: [],
    expiry_years: 5,
    methodology_sample: '',
    critical_notes: { user_input: '', ai_suggestion: '', final: '' },
    completed_date: null,
    time_spent_minutes: 0
  })

  const handlePdfUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !paper) return
    
    await processPdfFile(file)
  }

  const processPdfFile = async (file) => {
    if (!file || !paper) return
    
    try {
      // Save PDF to pdfs folder
      const fileName = `${paper.doi.replace(/[/\\:]/g, '-')}.pdf`
      const pdfPath = await savePdf(directoryHandle, fileName, file)
      
      // Update paper with pdf path
      await updatePaper(paper.id, { pdf_path: pdfPath, status: 'reading' })
      
      setPdfFile(file)
    } catch (err) {
      setError('PDF-Upload fehlgeschlagen: ' + err.message)
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(false)
  }

  const handleDrop = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(false)
    
    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      const file = files[0]
      if (file.type === 'application/pdf') {
        await processPdfFile(file)
      } else {
        setError('Bitte nur PDF-Dateien hochladen')
      }
    }
  }

  const handlePdfTextExtracted = useCallback((text) => {
    setPdfText(text)
  }, [])

  const handleExcerptChange = useCallback((updates) => {
    setExcerpt(prev => ({ ...prev, ...updates }))
  }, [])

  const handleComplete = async () => {
    if (!paper || !excerpt) return
    
    // Validate required fields
    if (!excerpt.main_claims.final || excerpt.main_claims.final.length < 50) {
      setError('Bitte Hauptaussagen ausfüllen (mind. 50 Zeichen)')
      return
    }
    if (excerpt.topics.final.length < 2) {
      setError('Bitte mindestens 2 Themen angeben')
      return
    }
    
    setSaving(true)
    setError(null)
    
    try {
      const completedExcerpt = {
        ...excerpt,
        completed_date: format(new Date(), 'yyyy-MM-dd'),
        time_spent_minutes: Math.round(timeSpent / 60)
      }
      
      const spacedRepetition = {
        next_review_date: format(addWeeks(new Date(), 1), 'yyyy-MM-dd'),
        current_interval_weeks: 1,
        fibonacci_index: 0,
        review_history: [],
        expired: false
      }
      
      await updatePaper(paper.id, {
        status: 'completed',
        excerpt: completedExcerpt,
        spaced_repetition: spacedRepetition
      })
      
      // Delete draft
      await deleteDraft(directoryHandle, paper.id)
      
      navigate('/')
    } catch (err) {
      setError('Speichern fehlgeschlagen: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  // Resizable split handling
  const handleMouseDown = (e) => {
    isDragging.current = true
    e.preventDefault()
  }

  const handleMouseMove = useCallback((e) => {
    if (!isDragging.current || !containerRef.current) return
    
    const rect = containerRef.current.getBoundingClientRect()
    const newPosition = ((e.clientX - rect.left) / rect.width) * 100
    setSplitPosition(Math.min(80, Math.max(20, newPosition)))
  }, [])

  const handleMouseUp = useCallback(() => {
    isDragging.current = false
  }, [])

  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [handleMouseMove, handleMouseUp])

  if (!paper) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-12rem)]">
        <div className="text-center">
          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 mb-4">Kein Paper ausgewählt</p>
          <button
            onClick={() => navigate('/inbox')}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Zur Inbox
          </button>
        </div>
      </div>
    )
  }

  // Show PDF upload if no PDF yet
  if (!paper.pdf_path && !pdfFile) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">{paper.title}</h2>
          <a 
            href={`https://doi.org/${paper.doi}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline mb-4 inline-block"
          >
            {paper.doi}
          </a>
          
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
              dragOver 
                ? 'border-primary bg-blue-50 border-solid' 
                : 'border-gray-300 hover:border-primary hover:bg-blue-50/50'
            }`}
          >
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-2">{t('reading.dragPdf')}</p>
            <p className="text-sm text-gray-500">{t('reading.uploadPdf')}</p>
            <label className="mt-4 inline-block px-4 py-2 bg-primary text-white rounded-lg cursor-pointer hover:bg-blue-600 transition-colors">
              {t('reading.uploadPdf')}
              <input 
                type="file" 
                accept=".pdf" 
                onChange={handlePdfUpload}
                className="hidden" 
              />
            </label>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      {/* Header with timer */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold text-gray-900 truncate">{paper.title}</h2>
          <a 
            href={`https://doi.org/${paper.doi}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary hover:underline"
          >
            {paper.doi}
          </a>
        </div>
        
        <div className="flex items-center gap-4 ml-4">
          <Timer 
            running={timerRunning}
            duration={settings.session_duration_minutes * 60}
            elapsed={timeSpent}
            onTick={setTimeSpent}
          />
          
          {!timerRunning ? (
            <button
              onClick={() => setTimerRunning(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              <Play className="w-4 h-4" />
              {t('reading.timer.start')}
            </button>
          ) : (
            <button
              onClick={() => setTimerRunning(false)}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              {t('reading.timer.pause')}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 bg-error/10 border border-error/20 rounded-lg p-3 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-error flex-shrink-0" />
          <p className="text-error text-sm">{error}</p>
          <button onClick={() => setError(null)} className="ml-auto text-error/60 hover:text-error">×</button>
        </div>
      )}

      {/* Split view */}
      <div ref={containerRef} className="flex-1 flex bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* PDF Viewer */}
        <div style={{ width: `${splitPosition}%` }} className="h-full overflow-hidden">
          <PdfViewer 
            file={pdfFile} 
            filePath={paper.pdf_path}
            directoryHandle={directoryHandle}
            onTextExtracted={handlePdfTextExtracted}
          />
        </div>
        
        {/* Resize handle */}
        <div 
          className="resize-handle"
          onMouseDown={handleMouseDown}
        />
        
        {/* Excerpt form */}
        <div style={{ width: `${100 - splitPosition}%` }} className="h-full overflow-y-auto">
          <ExcerptForm 
            excerpt={excerpt}
            onChange={handleExcerptChange}
            pdfText={pdfText}
            paper={paper}
            settings={settings}
            onComplete={handleComplete}
            saving={saving}
          />
        </div>
      </div>
    </div>
  )
}
