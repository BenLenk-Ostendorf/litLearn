import { useState, useEffect, useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams, useNavigate } from 'react-router-dom'
import { useData } from '../context/DataContext'
import PdfViewer from '../components/reading/PdfViewer'
import ExcerptForm from '../components/reading/ExcerptForm'
import Timer from '../components/reading/Timer'
import { saveDraft, loadDraft, deleteDraft, savePdf } from '../utils/storage'
import { useAi } from '../hooks/useAi'
import { Upload, FileText, Play, AlertCircle, Sparkles, Loader2 } from 'lucide-react'
import { v4 as uuidv4 } from 'uuid'
import { format, addWeeks } from 'date-fns'

// Project descriptions for AI context
const PROJECT_DESCRIPTIONS = `
1. ExplAIner: A web-based educational application that leverages LLMs to deliver personalized learning experiences in higher education. Implements the AVIVA model for LLM-assisted teaching sessions. Features adaptive learning paths, knowledge challenges, personalized content. For students to reach learning goals with minimal supervision.

2. ELeVaTE: A system implementing a five-phase process for examining, validating, and transforming learning objectives in an LLM-augmented educational landscape. Features LLM-powered learning goal extraction, automated competency classification, and iterative transformation workflows. Helps educators assess which learning objectives are at risk due to AI capabilities.

3. Workshopper: A web-based application to help educators plan and structure teaching units based on learning objectives. Guides instructors through learning goal management, method selection, time allocation, and teaching material creation. Features method recommendation based on pedagogical fit and automated material generation.

4. Communication: Research and publications related to scientific communication, science communication to the public, and communication strategies in educational technology and AI in education contexts. Includes papers on how to effectively communicate research findings, public engagement with science, and dissemination strategies.
`

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
  const [analyzing, setAnalyzing] = useState(false)
  const [aiSuggestions, setAiSuggestions] = useState(null)
  
  const { requestFullAnalysis, loading: aiLoading, error: aiError } = useAi(settings)
  
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
    main_claims: { user_input: '', ai_suggestion: '' },
    topics: { user_input: [], ai_suggestion: [] },
    study_type: '',
    citability: 5,
    citability_reasoning: '',
    relevant_projects: [],
    project_reasoning: '',
    expiry_years: 5,
    methodology_sample: '',
    critical_notes: { user_input: '', ai_suggestion: '' },
    completed_date: null,
    time_spent_minutes: 0
  })

  // Trigger AI analysis when PDF text is extracted
  const runAiAnalysis = useCallback(async (text) => {
    if (!text || !paper || !settings.api_key) return
    
    setAnalyzing(true)
    
    try {
      const analysis = await requestFullAnalysis({
        paper_title: paper.title,
        doi: paper.doi,
        pdf_text: text,
        projects: settings.projects || ['ExplAIner', 'ELeVaTE', 'Workshopper'],
        project_descriptions: PROJECT_DESCRIPTIONS
      })
      
      if (analysis) {
        setAiSuggestions(analysis)
        // Pre-fill excerpt with AI suggestions
        setExcerpt(prev => ({
          ...prev,
          main_claims: { ...prev.main_claims, ai_suggestion: analysis.main_claims },
          topics: { ...prev.topics, ai_suggestion: analysis.topics },
          study_type: analysis.study_type || prev.study_type,
          citability: analysis.citability || prev.citability,
          citability_reasoning: analysis.citability_reasoning || '',
          relevant_projects: analysis.relevant_projects || [],
          project_reasoning: analysis.project_reasoning || '',
          critical_notes: { ...prev.critical_notes, ai_suggestion: analysis.critical_notes }
        }))
      }
    } catch (err) {
      console.error('AI analysis failed:', err)
    } finally {
      setAnalyzing(false)
    }
  }, [paper, settings, requestFullAnalysis])

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
    // Trigger AI analysis when text is extracted
    if (text && !aiSuggestions) {
      runAiAnalysis(text)
    }
  }, [aiSuggestions, runAiAnalysis])

  const handleExcerptChange = useCallback((updates) => {
    setExcerpt(prev => ({ ...prev, ...updates }))
  }, [])

  const handleComplete = async () => {
    if (!paper || !excerpt) return
    
    // Validate required fields (now using user_input since final fields are removed)
    if (!excerpt.main_claims.user_input || excerpt.main_claims.user_input.length < 50) {
      setError(t('reading.errorMainClaims'))
      return
    }
    if (excerpt.topics.user_input.length < 2) {
      setError(t('reading.errorTopics'))
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

      {/* AI Analysis Loading Overlay */}
      {analyzing && (
        <div className="mb-4 bg-purple-50 border border-purple-200 rounded-lg p-4 flex items-center gap-3">
          <Loader2 className="w-6 h-6 text-purple-600 animate-spin" />
          <div>
            <p className="font-medium text-purple-900">{t('reading.aiAnalyzing')}</p>
            <p className="text-sm text-purple-700">{t('reading.aiAnalyzingDesc')}</p>
          </div>
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
