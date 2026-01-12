import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { loadPapers, savePapers, loadSettings, saveSettings } from '../utils/storage'

const DataContext = createContext(null)

const DEFAULT_SETTINGS = {
  api_key: '',
  api_provider: 'openai',
  session_duration_minutes: 60,
  projects: ['ExplAIner', 'LearningGoalHub', 'ExamLens', 'Workshopper', 'Communication'],
  expiry_options: [1, 5, 10, 999]
}

// IndexedDB helpers for storing directory handle
const DB_NAME = 'LitLearnDB'
const DB_VERSION = 1
const STORE_NAME = 'handles'

async function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    }
  })
}

async function storeHandle(db, handle) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.put(handle, 'directory')
    
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve()
  })
}

async function getStoredHandle(db) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.get('directory')
    
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
  })
}

export function DataProvider({ children }) {
  const [papers, setPapers] = useState([])
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [directoryHandle, setDirectoryHandle] = useState(null)

  // Try to restore saved directory handle on mount
  useEffect(() => {
    const restoreSavedHandle = async () => {
      try {
        const db = await openDB()
        const handle = await getStoredHandle(db)
        
        if (handle) {
          // Verify we still have permission
          const permission = await handle.queryPermission({ mode: 'readwrite' })
          if (permission === 'granted') {
            setDirectoryHandle(handle)
            return
          }
          
          // Try to request permission again
          const newPermission = await handle.requestPermission({ mode: 'readwrite' })
          if (newPermission === 'granted') {
            setDirectoryHandle(handle)
            return
          }
        }
      } catch (err) {
        console.log('Could not restore saved directory:', err)
      }
      
      setIsLoading(false)
    }
    
    restoreSavedHandle()
  }, [])

  const requestDirectoryAccess = useCallback(async () => {
    try {
      const handle = await window.showDirectoryPicker({
        mode: 'readwrite',
        startIn: 'documents'
      })
      setDirectoryHandle(handle)
      
      // Save the handle for next time
      try {
        const db = await openDB()
        await storeHandle(db, handle)
      } catch (err) {
        console.error('Could not save directory handle:', err)
      }
      
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
