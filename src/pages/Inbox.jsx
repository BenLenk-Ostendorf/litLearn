import { useState, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useData } from '../context/DataContext'
import { Upload, FileText, Check, AlertCircle, X, Plus, GripVertical, Loader2, Link as LinkIcon } from 'lucide-react'
import { v4 as uuidv4 } from 'uuid'
import { format } from 'date-fns'

export default function Inbox() {
  const { papers, updatePapers, directoryHandle } = useData()
  const navigate = useNavigate()
  
  const [manualDoi, setManualDoi] = useState('')
  const [manualTitle, setManualTitle] = useState('')
  const [manualError, setManualError] = useState('')
  const [adding, setAdding] = useState(false)
  
  const [pdfFile, setPdfFile] = useState(null)
  const [pdfError, setPdfError] = useState('')
  const [uploadingPdf, setUploadingPdf] = useState(false)
  
  const [resolving, setResolving] = useState(false)
  
  const [draggedIndex, setDraggedIndex] = useState(null)

  const existingDois = new Set(papers.map(p => p.doi.toLowerCase()))

  const extractDOI = (input) => {
    const trimmed = input.trim()
    
    // Direct DOI (starts with 10.)
    if (trimmed.startsWith('10.')) {
      return trimmed
    }
    
    // DOI URL (https://doi.org/10.xxxx)
    const doiUrlMatch = trimmed.match(/doi\.org\/(10\.[^\s]+)/i)
    if (doiUrlMatch) {
      return doiUrlMatch[1]
    }
    
    // Publisher URLs with DOI in path
    const urlDoiMatch = trimmed.match(/\/(10\.[0-9]{4,}[^\s]*)/)
    if (urlDoiMatch) {
      return urlDoiMatch[1].replace(/[\/#]$/, '')
    }
    
    return null
  }

  const resolveDOI = useCallback(async (input) => {
    setResolving(true)
    setManualError('')
    
    try {
      const doi = extractDOI(input)
      
      if (!doi) {
        setManualError('Keine gültige DOI oder URL gefunden')
        setResolving(false)
        return
      }
      
      if (existingDois.has(doi.toLowerCase())) {
        setManualError('Dieses DOI existiert bereits')
        setResolving(false)
        return
      }
      
      // Fetch metadata from CrossRef
      const response = await fetch(`https://api.crossref.org/works/${encodeURIComponent(doi)}`)
      
      if (!response.ok) {
        throw new Error('DOI konnte nicht aufgelöst werden')
      }
      
      const data = await response.json()
      const work = data.message
      
      // Extract title
      const title = work.title?.[0] || ''
      
      if (!title) {
        throw new Error('Kein Titel in den Metadaten gefunden')
      }
      
      // Set the resolved data
      setManualDoi(doi)
      setManualTitle(title)
      setManualError('')
    } catch (err) {
      console.error('DOI resolution failed:', err)
      setManualError('Fehler beim Auflösen: ' + err.message)
    } finally {
      setResolving(false)
    }
  }, [existingDois])

  const handlePdfSelect = useCallback((e) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    if (file.type !== 'application/pdf') {
      setPdfError('Bitte wähle eine PDF-Datei aus')
      return
    }
    
    setPdfFile(file)
    setPdfError('')
  }, [])

  const handlePdfUpload = useCallback(async () => {
    if (!pdfFile || !directoryHandle) return
    
    setPdfError('')
    
    if (!manualDoi.trim() || !manualDoi.startsWith('10.')) {
      setPdfError('Ungültiges DOI-Format (muss mit "10." beginnen)')
      return
    }
    
    if (!manualTitle.trim()) {
      setPdfError('Titel darf nicht leer sein')
      return
    }
    
    if (existingDois.has(manualDoi.toLowerCase())) {
      setPdfError('Dieses DOI existiert bereits')
      return
    }
    
    setUploadingPdf(true)
    
    try {
      const paperId = uuidv4()
      const pdfFileName = `${paperId}.pdf`
      
      // Save PDF to pdfs folder
      const pdfsFolder = await directoryHandle.getDirectoryHandle('pdfs', { create: true })
      const pdfFileHandle = await pdfsFolder.getFileHandle(pdfFileName, { create: true })
      const writable = await pdfFileHandle.createWritable()
      await writable.write(pdfFile)
      await writable.close()
      
      const maxOrder = Math.max(0, ...papers.filter(p => p.status === 'inbox').map(p => p.inbox_order || 0))
      
      const newPaper = {
        id: paperId,
        doi: manualDoi.trim(),
        title: manualTitle.trim(),
        added_date: format(new Date(), 'yyyy-MM-dd'),
        status: 'inbox',
        pdf_path: `pdfs/${pdfFileName}`,
        excerpt: null,
        spaced_repetition: null,
        inbox_order: maxOrder + 1
      }
      
      await updatePapers([...papers, newPaper])
      
      setManualDoi('')
      setManualTitle('')
      setPdfFile(null)
    } catch (err) {
      console.error('PDF upload failed:', err)
      setPdfError('Fehler beim Hochladen der PDF: ' + err.message)
    } finally {
      setUploadingPdf(false)
    }
  }, [pdfFile, manualDoi, manualTitle, papers, updatePapers, existingDois, directoryHandle])

  const handleManualAdd = useCallback(async () => {
    setManualError('')
    
    if (!manualDoi.trim() || !manualDoi.startsWith('10.')) {
      setManualError('Ungültiges DOI-Format (muss mit "10." beginnen)')
      return
    }
    
    if (!manualTitle.trim()) {
      setManualError('Titel darf nicht leer sein')
      return
    }
    
    if (existingDois.has(manualDoi.toLowerCase())) {
      setManualError('Dieses DOI existiert bereits')
      return
    }
    
    setAdding(true)
    
    const maxOrder = Math.max(0, ...papers.filter(p => p.status === 'inbox').map(p => p.inbox_order || 0))
    
    const newPaper = {
      id: uuidv4(),
      doi: manualDoi.trim(),
      title: manualTitle.trim(),
      added_date: format(new Date(), 'yyyy-MM-dd'),
      status: 'inbox',
      pdf_path: null,
      excerpt: null,
      spaced_repetition: null,
      inbox_order: maxOrder + 1
    }
    
    await updatePapers([...papers, newPaper])
    
    setManualDoi('')
    setManualTitle('')
    setAdding(false)
  }, [manualDoi, manualTitle, papers, updatePapers, existingDois])

  const inboxPapers = useMemo(() => {
    return papers
      .filter(p => p.status === 'inbox')
      .sort((a, b) => (a.inbox_order || 0) - (b.inbox_order || 0))
  }, [papers])
  
  const handleDragStart = (index) => {
    setDraggedIndex(index)
  }
  
  const handleDragOver = (e) => {
    e.preventDefault()
  }
  
  const handleDrop = async (dropIndex) => {
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null)
      return
    }
    
    const reordered = [...inboxPapers]
    const [draggedPaper] = reordered.splice(draggedIndex, 1)
    reordered.splice(dropIndex, 0, draggedPaper)
    
    // Update inbox_order for all inbox papers
    const updatedPapers = papers.map(p => {
      if (p.status !== 'inbox') return p
      const newIndex = reordered.findIndex(ip => ip.id === p.id)
      return newIndex >= 0 ? { ...p, inbox_order: newIndex } : p
    })
    
    await updatePapers(updatedPapers)
    setDraggedIndex(null)
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6">
        {/* PDF Upload with Manual Entry */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Paper hinzufügen</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                DOI oder URL <span className="text-error">*</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={manualDoi}
                  onChange={(e) => setManualDoi(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && manualDoi.trim()) {
                      e.preventDefault()
                      resolveDOI(manualDoi)
                    }
                  }}
                  placeholder="10.1234/example oder https://doi.org/10.1234/example"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                />
                <button
                  onClick={() => resolveDOI(manualDoi)}
                  disabled={resolving || !manualDoi.trim()}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  title="DOI/URL auflösen"
                >
                  {resolving ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <LinkIcon className="w-5 h-5" />
                  )}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Gib eine DOI oder URL ein und klicke auf das Link-Symbol zum Auflösen
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Titel <span className="text-error">*</span>
              </label>
              <input
                type="text"
                value={manualTitle}
                onChange={(e) => setManualTitle(e.target.value)}
                placeholder="Paper Title"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                PDF-Datei (optional)
              </label>
              <label className="block border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-primary hover:bg-blue-50/50 transition-colors">
                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600 mb-1">
                  {pdfFile ? pdfFile.name : 'PDF-Datei auswählen'}
                </p>
                <p className="text-xs text-gray-500">Klicken oder PDF hierher ziehen</p>
                <input 
                  type="file" 
                  accept=".pdf,application/pdf" 
                  onChange={handlePdfSelect}
                  className="hidden" 
                />
              </label>
              {pdfFile && (
                <button
                  onClick={() => { setPdfFile(null); setPdfError('') }}
                  className="mt-2 text-sm text-gray-600 hover:text-error flex items-center gap-1"
                >
                  <X className="w-4 h-4" />
                  PDF entfernen
                </button>
              )}
            </div>
            
            {(manualError || pdfError) && (
              <div className="flex items-center gap-2 text-error text-sm">
                <AlertCircle className="w-4 h-4" />
                {manualError || pdfError}
              </div>
            )}
            
            <button
              onClick={pdfFile ? handlePdfUpload : handleManualAdd}
              disabled={(pdfFile ? uploadingPdf : adding) || !manualDoi || !manualTitle}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-5 h-5" />
              {pdfFile 
                ? (uploadingPdf ? 'Lade hoch...' : 'Paper mit PDF hinzufügen')
                : (adding ? 'Füge hinzu...' : 'Paper hinzufügen')
              }
            </button>
          </div>
        </div>
      </div>

      {inboxPapers.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            In der Inbox ({inboxPapers.length})
          </h3>
          
          <div className="space-y-2">
            {inboxPapers.map((paper, index) => (
              <div 
                key={paper.id} 
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(index)}
                className={`flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-move hover:bg-gray-100 transition-colors ${
                  draggedIndex === index ? 'opacity-50' : ''
                }`}
              >
                <GripVertical className="w-5 h-5 text-gray-400 flex-shrink-0" />
                <FileText className="w-5 h-5 text-gray-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{paper.title}</p>
                  <p className="text-sm text-gray-500">{paper.doi}</p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    navigate(`/reading/${paper.id}`)
                  }}
                  className="px-3 py-1.5 text-sm bg-primary text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Lesen
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
