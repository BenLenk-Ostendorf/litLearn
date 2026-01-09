import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useData } from '../context/DataContext'
import { Search as SearchIcon, Filter, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react'
import { format, parseISO } from 'date-fns'

const STATUS_LABELS = {
  inbox: 'Inbox',
  reading: 'In Bearbeitung',
  completed: 'Abgeschlossen'
}

export default function Search() {
  const { papers, settings } = useData()
  const navigate = useNavigate()
  
  const [query, setQuery] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [statusFilter, setStatusFilter] = useState([])
  const [projectFilter, setProjectFilter] = useState([])
  const [citabilityRange, setCitabilityRange] = useState([1, 10])
  const [showExpired, setShowExpired] = useState(false)
  const [sortBy, setSortBy] = useState('added_date')
  const [sortDir, setSortDir] = useState('desc')

  const allTopics = useMemo(() => {
    const topics = new Set()
    papers.forEach(p => {
      p.excerpt?.topics?.final?.forEach(t => topics.add(t))
    })
    return Array.from(topics).sort()
  }, [papers])

  const filteredPapers = useMemo(() => {
    return papers
      .filter(paper => {
        if (query) {
          const q = query.toLowerCase()
          const searchFields = [
            paper.title,
            paper.doi,
            paper.excerpt?.main_claims?.final,
            paper.excerpt?.critical_notes?.final,
            ...(paper.excerpt?.topics?.final || []),
            ...(paper.excerpt?.key_concepts?.final || [])
          ].filter(Boolean).join(' ').toLowerCase()
          
          if (!searchFields.includes(q)) return false
        }

        if (statusFilter.length > 0 && !statusFilter.includes(paper.status)) {
          return false
        }

        if (projectFilter.length > 0) {
          const paperProjects = paper.excerpt?.relevant_projects || []
          if (!projectFilter.some(p => paperProjects.includes(p))) return false
        }

        if (paper.excerpt?.citability) {
          if (paper.excerpt.citability < citabilityRange[0] || 
              paper.excerpt.citability > citabilityRange[1]) {
            return false
          }
        }

        if (!showExpired && paper.spaced_repetition?.expired) {
          return false
        }

        return true
      })
      .sort((a, b) => {
        let aVal, bVal
        
        switch (sortBy) {
          case 'title':
            aVal = a.title.toLowerCase()
            bVal = b.title.toLowerCase()
            break
          case 'citability':
            aVal = a.excerpt?.citability || 0
            bVal = b.excerpt?.citability || 0
            break
          case 'added_date':
          default:
            aVal = a.added_date
            bVal = b.added_date
        }
        
        if (sortDir === 'asc') {
          return aVal > bVal ? 1 : -1
        }
        return aVal < bVal ? 1 : -1
      })
  }, [papers, query, statusFilter, projectFilter, citabilityRange, showExpired, sortBy, sortDir])

  const toggleSort = (field) => {
    if (sortBy === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortDir('desc')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Suche in Titel, Hauptaussagen, Konzepten..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-4 py-2.5 border rounded-lg transition-colors ${
            showFilters ? 'bg-primary text-white border-primary' : 'border-gray-300 hover:bg-gray-50'
          }`}
        >
          <Filter className="w-5 h-5" />
          Filter
          {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {showFilters && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <div className="space-y-1">
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <label key={value} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={statusFilter.includes(value)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setStatusFilter([...statusFilter, value])
                      } else {
                        setStatusFilter(statusFilter.filter(s => s !== value))
                      }
                    }}
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span className="text-sm">{label}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Projekte</label>
            <div className="space-y-1">
              {settings.projects.map(project => (
                <label key={project} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={projectFilter.includes(project)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setProjectFilter([...projectFilter, project])
                      } else {
                        setProjectFilter(projectFilter.filter(p => p !== project))
                      }
                    }}
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span className="text-sm">{project}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Zitierbarkeit: {citabilityRange[0]} - {citabilityRange[1]}
            </label>
            <div className="flex gap-2 items-center">
              <input
                type="range"
                min={1}
                max={10}
                value={citabilityRange[0]}
                onChange={(e) => setCitabilityRange([parseInt(e.target.value), citabilityRange[1]])}
                className="flex-1"
              />
              <input
                type="range"
                min={1}
                max={10}
                value={citabilityRange[1]}
                onChange={(e) => setCitabilityRange([citabilityRange[0], parseInt(e.target.value)])}
                className="flex-1"
              />
            </div>
            
            <label className="flex items-center gap-2 mt-3">
              <input
                type="checkbox"
                checked={showExpired}
                onChange={(e) => setShowExpired(e.target.checked)}
                className="rounded border-gray-300 text-primary focus:ring-primary"
              />
              <span className="text-sm">Abgelaufene anzeigen</span>
            </label>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th 
                className="text-left px-4 py-3 text-sm font-medium text-gray-700 cursor-pointer hover:bg-gray-100"
                onClick={() => toggleSort('title')}
              >
                Titel {sortBy === 'title' && (sortDir === 'asc' ? '↑' : '↓')}
              </th>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-700 w-24">Status</th>
              <th 
                className="text-left px-4 py-3 text-sm font-medium text-gray-700 w-24 cursor-pointer hover:bg-gray-100"
                onClick={() => toggleSort('citability')}
              >
                Zitierb. {sortBy === 'citability' && (sortDir === 'asc' ? '↑' : '↓')}
              </th>
              <th 
                className="text-left px-4 py-3 text-sm font-medium text-gray-700 w-28 cursor-pointer hover:bg-gray-100"
                onClick={() => toggleSort('added_date')}
              >
                Datum {sortBy === 'added_date' && (sortDir === 'asc' ? '↑' : '↓')}
              </th>
              <th className="w-12"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredPapers.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                  Keine Paper gefunden
                </td>
              </tr>
            ) : (
              filteredPapers.map(paper => (
                <tr 
                  key={paper.id} 
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => navigate(`/reading/${paper.id}`)}
                >
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900 truncate max-w-md">{paper.title}</p>
                    <p className="text-sm text-gray-500">{paper.doi}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                      paper.status === 'completed' ? 'bg-green-100 text-green-700' :
                      paper.status === 'reading' ? 'bg-amber-100 text-amber-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {STATUS_LABELS[paper.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {paper.excerpt?.citability || '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {format(parseISO(paper.added_date), 'dd.MM.yy')}
                  </td>
                  <td className="px-4 py-3">
                    <a
                      href={`https://doi.org/${paper.doi}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-gray-400 hover:text-primary"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      <p className="text-sm text-gray-500">
        {filteredPapers.length} von {papers.length} Paper
      </p>
    </div>
  )
}
