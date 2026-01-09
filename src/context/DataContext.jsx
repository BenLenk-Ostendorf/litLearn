import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { loadPapers, savePapers, loadSettings, saveSettings } from '../utils/storage'

const DataContext = createContext(null)

const DEFAULT_SETTINGS = {
  api_key: '',
  api_provider: 'openai',
  session_duration_minutes: 60,
  projects: ['ExplAIner', 'LearningGoalHub', 'ExamLens', 'Workshopper'],
  expiry_options: [1, 5, 10, 999]
}

export function DataProvider({ children }) {
  const [papers, setPapers] = useState([])
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [directoryHandle, setDirectoryHandle] = useState(null)

  const requestDirectoryAccess = useCallback(async () => {
    try {
      const handle = await window.showDirectoryPicker({
        mode: 'readwrite',
        startIn: 'documents'
      })
      setDirectoryHandle(handle)
      return handle
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError('Ordnerzugriff verweigert. Bitte erneut versuchen.')
      }
      return null
    }
  }, [])

  const initializeData = useCallback(async (handle) => {
    if (!handle) return
    
    setIsLoading(true)
    setError(null)
    
    try {
      const [loadedPapers, loadedSettings] = await Promise.all([
        loadPapers(handle),
        loadSettings(handle)
      ])
      
      setPapers(loadedPapers)
      setSettings({ ...DEFAULT_SETTINGS, ...loadedSettings })
    } catch (err) {
      console.error('Error loading data:', err)
      setError('Fehler beim Laden der Daten: ' + err.message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const updatePapers = useCallback(async (newPapers) => {
    setPapers(newPapers)
    if (directoryHandle) {
      try {
        await savePapers(directoryHandle, newPapers)
      } catch (err) {
        console.error('Error saving papers:', err)
        setError('Fehler beim Speichern: ' + err.message)
      }
    }
  }, [directoryHandle])

  const updateSettings = useCallback(async (newSettings) => {
    const merged = { ...settings, ...newSettings }
    setSettings(merged)
    if (directoryHandle) {
      try {
        await saveSettings(directoryHandle, merged)
      } catch (err) {
        console.error('Error saving settings:', err)
        setError('Fehler beim Speichern der Einstellungen: ' + err.message)
      }
    }
  }, [directoryHandle, settings])

  const addPaper = useCallback(async (paper) => {
    const newPapers = [...papers, paper]
    await updatePapers(newPapers)
  }, [papers, updatePapers])

  const updatePaper = useCallback(async (paperId, updates) => {
    const newPapers = papers.map(p => 
      p.id === paperId ? { ...p, ...updates } : p
    )
    await updatePapers(newPapers)
  }, [papers, updatePapers])

  const clearError = useCallback(() => setError(null), [])

  const value = {
    papers,
    settings,
    isLoading,
    error,
    directoryHandle,
    requestDirectoryAccess,
    initializeData,
    updatePapers,
    updateSettings,
    addPaper,
    updatePaper,
    clearError
  }

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  )
}

export function useData() {
  const context = useContext(DataContext)
  if (!context) {
    throw new Error('useData must be used within a DataProvider')
  }
  return context
}
