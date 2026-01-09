import { useState } from 'react'
import { useData } from '../context/DataContext'
import { Key, Clock, FolderKanban, Save, Plus, X, Download, Upload } from 'lucide-react'

export default function Settings() {
  const { settings, updateSettings, papers, updatePapers, directoryHandle } = useData()
  
  const [apiKey, setApiKey] = useState(settings.api_key || '')
  const [apiProvider, setApiProvider] = useState(settings.api_provider || 'openai')
  const [sessionDuration, setSessionDuration] = useState(settings.session_duration_minutes || 60)
  const [projects, setProjects] = useState(settings.projects || [])
  const [newProject, setNewProject] = useState('')
  const [saved, setSaved] = useState(false)

  const handleSave = async () => {
    await updateSettings({
      api_key: apiKey,
      api_provider: apiProvider,
      session_duration_minutes: sessionDuration,
      projects
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const addProject = () => {
    if (newProject.trim() && !projects.includes(newProject.trim())) {
      setProjects([...projects, newProject.trim()])
      setNewProject('')
    }
  }

  const removeProject = (project) => {
    setProjects(projects.filter(p => p !== project))
  }

  const handleExport = () => {
    const data = {
      papers,
      settings,
      exportDate: new Date().toISOString()
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `litlearn-backup-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const text = await file.text()
      const data = JSON.parse(text)
      
      if (data.papers && Array.isArray(data.papers)) {
        await updatePapers(data.papers)
      }
      if (data.settings) {
        await updateSettings(data.settings)
        setApiKey(data.settings.api_key || '')
        setApiProvider(data.settings.api_provider || 'openai')
        setSessionDuration(data.settings.session_duration_minutes || 60)
        setProjects(data.settings.projects || [])
      }
      
      alert('Import erfolgreich!')
    } catch (err) {
      alert('Import fehlgeschlagen: ' + err.message)
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Key className="w-5 h-5 text-gray-500" />
          KI-Integration
        </h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Anbieter
            </label>
            <select
              value={apiProvider}
              onChange={(e) => setApiProvider(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
            >
              <option value="openai">OpenAI (GPT-4o-mini)</option>
              <option value="gemini">Google Gemini Flash</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              API-Key
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={apiProvider === 'openai' ? 'sk-...' : 'AIza...'}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
            />
            <p className="text-sm text-gray-500 mt-1">
              Wird lokal gespeichert. Validierung erfolgt bei erster Nutzung.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-gray-500" />
          Lernsession
        </h2>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Session-Dauer (Minuten)
          </label>
          <input
            type="number"
            value={sessionDuration}
            onChange={(e) => setSessionDuration(parseInt(e.target.value) || 60)}
            min={15}
            max={180}
            className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <FolderKanban className="w-5 h-5 text-gray-500" />
          Projekte
        </h2>
        
        <div className="flex flex-wrap gap-2 mb-4">
          {projects.map(project => (
            <span 
              key={project} 
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-100 rounded-full text-sm"
            >
              {project}
              <button
                onClick={() => removeProject(project)}
                className="text-gray-400 hover:text-error"
              >
                <X className="w-4 h-4" />
              </button>
            </span>
          ))}
        </div>
        
        <div className="flex gap-2">
          <input
            type="text"
            value={newProject}
            onChange={(e) => setNewProject(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addProject()}
            placeholder="Neues Projekt..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
          />
          <button
            onClick={addProject}
            className="px-3 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Daten</h2>
        
        <div className="flex gap-3">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <Download className="w-5 h-5" />
            Backup exportieren
          </button>
          
          <label className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer">
            <Upload className="w-5 h-5" />
            Backup importieren
            <input
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
            />
          </label>
        </div>
      </div>

      <button
        onClick={handleSave}
        className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg hover:bg-blue-600 transition-colors"
      >
        <Save className="w-5 h-5" />
        {saved ? 'Gespeichert!' : 'Einstellungen speichern'}
      </button>
    </div>
  )
}
