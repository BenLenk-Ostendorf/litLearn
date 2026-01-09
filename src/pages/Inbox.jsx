import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useData } from '../context/DataContext'
import { Upload, FileText, Check, AlertCircle, X, Plus } from 'lucide-react'
import Papa from 'papaparse'
import { v4 as uuidv4 } from 'uuid'
import { format, parse, isValid } from 'date-fns'

export default function Inbox() {
  const { papers, updatePapers } = useData()
  const navigate = useNavigate()
  
  const [preview, setPreview] = useState(null)
  const [errors, setErrors] = useState([])
  const [importing, setImporting] = useState(false)
  
  const [manualDoi, setManualDoi] = useState('')
  const [manualTitle, setManualTitle] = useState('')
  const [manualError, setManualError] = useState('')
  const [adding, setAdding] = useState(false)

  const existingDois = new Set(papers.map(p => p.doi.toLowerCase()))

  const handleFileSelect = useCallback((e) => {
    const file = e.target.files?.[0]
    if (!file) return

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const validRows = []
        const errorRows = []

        results.data.forEach((row, index) => {
          const rowErrors = []
          
          if (!row.doi || !row.doi.startsWith('10.')) {
            rowErrors.push('Ungültiges DOI-Format (muss mit "10." beginnen)')
          }
          
          if (!row.title || row.title.trim() === '') {
            rowErrors.push('Titel fehlt')
          }

          let parsedDate = null
          if (row.added_date) {
            parsedDate = parse(row.added_date, 'yyyy-MM-dd', new Date())
            if (!isValid(parsedDate)) {
              rowErrors.push(`Ungültiges Datum: "${row.added_date}" (erwartet: YYYY-MM-DD)`)
            }
          } else {
            parsedDate = new Date()
          }

          const isDuplicate = existingDois.has(row.doi?.toLowerCase())

          if (rowErrors.length > 0) {
            errorRows.push({ row: index + 2, data: row, errors: rowErrors })
          } else if (!isDuplicate) {
            validRows.push({
              doi: row.doi.trim(),
              title: row.title.trim(),
              added_date: format(parsedDate, 'yyyy-MM-dd')
            })
          }
        })

        setPreview(validRows)
        setErrors(errorRows)
      },
      error: (err) => {
        setErrors([{ row: 0, data: {}, errors: ['CSV-Parsing fehlgeschlagen: ' + err.message] }])
      }
    })
  }, [existingDois])

  const handleImport = useCallback(async () => {
    if (!preview || preview.length === 0) return
    
    setImporting(true)
    
    const newPapers = preview.map(row => ({
      id: uuidv4(),
      doi: row.doi,
      title: row.title,
      added_date: row.added_date,
      status: 'inbox',
      pdf_path: null,
      excerpt: null,
      spaced_repetition: null
    }))

    await updatePapers([...papers, ...newPapers])
    
    setPreview(null)
    setErrors([])
    setImporting(false)
    
    navigate('/')
  }, [preview, papers, updatePapers, navigate])

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
    
    const newPaper = {
      id: uuidv4(),
      doi: manualDoi.trim(),
      title: manualTitle.trim(),
      added_date: format(new Date(), 'yyyy-MM-dd'),
      status: 'inbox',
      pdf_path: null,
      excerpt: null,
      spaced_repetition: null
    }
    
    await updatePapers([...papers, newPaper])
    
    setManualDoi('')
    setManualTitle('')
    setAdding(false)
  }, [manualDoi, manualTitle, papers, updatePapers, existingDois])

  const inboxPapers = papers.filter(p => p.status === 'inbox')

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CSV Import */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">CSV importieren</h2>
          
          <label className="block border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-primary hover:bg-blue-50/50 transition-colors">
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-2">CSV-Datei hierher ziehen oder klicken</p>
            <p className="text-sm text-gray-500">Format: doi, title, added_date (YYYY-MM-DD)</p>
            <input 
              type="file" 
              accept=".csv" 
              onChange={handleFileSelect}
              className="hidden" 
            />
          </label>
        </div>

        {/* Manual Entry */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Paper manuell hinzufügen</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                DOI <span className="text-error">*</span>
              </label>
              <input
                type="text"
                value={manualDoi}
                onChange={(e) => setManualDoi(e.target.value)}
                placeholder="10.1234/example.2024"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              />
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
            
            {manualError && (
              <div className="flex items-center gap-2 text-error text-sm">
                <AlertCircle className="w-4 h-4" />
                {manualError}
              </div>
            )}
            
            <button
              onClick={handleManualAdd}
              disabled={adding || !manualDoi || !manualTitle}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-5 h-5" />
              {adding ? 'Füge hinzu...' : 'Paper hinzufügen'}
            </button>
          </div>
        </div>
      </div>

      {errors.length > 0 && (
        <div className="bg-error/10 border border-error/20 rounded-xl p-6">
          <h3 className="text-error font-semibold mb-3 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            Fehler in CSV ({errors.length} Zeilen)
          </h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {errors.map((err, i) => (
              <div key={i} className="text-sm">
                <span className="font-medium">Zeile {err.row}:</span>{' '}
                <span className="text-error">{err.errors.join(', ')}</span>
                {err.data.title && <span className="text-gray-500"> ({err.data.title})</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {preview && preview.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Vorschau ({preview.length} neue Paper)
            </h3>
            <div className="flex gap-2">
              <button
                onClick={() => { setPreview(null); setErrors([]) }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Abbrechen
              </button>
              <button
                onClick={handleImport}
                disabled={importing}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
              >
                {importing ? 'Importiere...' : 'Importieren'}
              </button>
            </div>
          </div>
          
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {preview.map((row, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{row.title}</p>
                  <p className="text-sm text-gray-500">{row.doi}</p>
                </div>
                <span className="text-sm text-gray-500">{row.added_date}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {inboxPapers.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            In der Inbox ({inboxPapers.length})
          </h3>
          
          <div className="space-y-2">
            {inboxPapers.map(paper => (
              <div key={paper.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <FileText className="w-5 h-5 text-gray-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{paper.title}</p>
                  <p className="text-sm text-gray-500">{paper.doi}</p>
                </div>
                <button
                  onClick={() => navigate(`/reading/${paper.id}`)}
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
