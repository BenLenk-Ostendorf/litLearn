import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useData } from '../context/DataContext'
import { Inbox, BookOpen, Brain, Clock, TrendingUp, AlertCircle } from 'lucide-react'
import { isToday, isPast, parseISO, format } from 'date-fns'

function StatCard({ icon: Icon, label, value, color, to }) {
  const content = (
    <div className={`bg-white rounded-xl p-6 border border-gray-200 hover:shadow-md transition-shadow ${to ? 'cursor-pointer' : ''}`}>
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-sm text-gray-600">{label}</p>
        </div>
      </div>
    </div>
  )

  return to ? <Link to={to}>{content}</Link> : content
}

export default function Dashboard() {
  const { papers } = useData()

  const stats = useMemo(() => {
    const now = new Date()
    const inboxCount = papers.filter(p => p.status === 'inbox').length
    const readingCount = papers.filter(p => p.status === 'reading').length
    const completedCount = papers.filter(p => p.status === 'completed').length
    
    const dueToday = papers.filter(p => {
      if (p.status !== 'completed' || !p.spaced_repetition?.next_review_date) return false
      if (p.spaced_repetition.expired) return false
      
      // Only remind for papers with citability >= 7 and at least one project
      const citability = p.excerpt?.citability || 0
      const hasProjects = p.excerpt?.relevant_projects?.length > 0
      if (citability < 7 || !hasProjects) return false
      
      const reviewDate = parseISO(p.spaced_repetition.next_review_date)
      return isToday(reviewDate) || isPast(reviewDate)
    })

    return { inboxCount, readingCount, completedCount, dueToday }
  }, [papers])

  const upcomingReviews = useMemo(() => {
    return papers
      .filter(p => {
        if (p.status !== 'completed' || !p.spaced_repetition?.next_review_date) return false
        if (p.spaced_repetition.expired) return false
        
        // Only remind for papers with citability >= 7 and at least one project
        const citability = p.excerpt?.citability || 0
        const hasProjects = p.excerpt?.relevant_projects?.length > 0
        if (citability < 7 || !hasProjects) return false
        
        const reviewDate = parseISO(p.spaced_repetition.next_review_date)
        return isToday(reviewDate) || isPast(reviewDate)
      })
      .sort((a, b) => 
        parseISO(a.spaced_repetition.next_review_date) - parseISO(b.spaced_repetition.next_review_date)
      )
      .slice(0, 5)
  }, [papers])

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          icon={Inbox} 
          label="In der Inbox" 
          value={stats.inboxCount} 
          color="bg-blue-500"
          to="/inbox"
        />
        <StatCard 
          icon={BookOpen} 
          label="In Bearbeitung" 
          value={stats.readingCount} 
          color="bg-amber-500"
          to="/reading"
        />
        <StatCard 
          icon={Brain} 
          label="Fällige Reviews" 
          value={stats.dueToday.length} 
          color="bg-purple-500"
          to="/review"
        />
        <StatCard 
          icon={TrendingUp} 
          label="Abgeschlossen" 
          value={stats.completedCount} 
          color="bg-green-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-gray-500" />
            Anstehende Reviews (max. 3 pro Tag)
          </h2>
          
          {upcomingReviews.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Keine Reviews fällig</p>
          ) : (
            <div className="space-y-3">
              {upcomingReviews.map((paper, index) => (
                <div 
                  key={paper.id} 
                  className={`p-3 rounded-lg border ${index < 3 ? 'bg-purple-50 border-purple-200' : 'bg-gray-50 border-gray-200 opacity-60'}`}
                >
                  <p className="font-medium text-gray-900 truncate">{paper.title}</p>
                  <p className="text-sm text-gray-500">
                    {format(parseISO(paper.spaced_repetition.next_review_date), 'dd.MM.yyyy')}
                    {index >= 3 && ' (wartet)'}
                  </p>
                </div>
              ))}
            </div>
          )}
          
          {stats.dueToday.length > 0 && (
            <Link 
              to="/review" 
              className="mt-4 block w-full bg-primary text-white text-center py-3 rounded-lg font-medium hover:bg-blue-600 transition-colors"
            >
              Review starten ({Math.min(3, stats.dueToday.length)} Paper)
            </Link>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Inbox className="w-5 h-5 text-gray-500" />
            Schnellaktionen
          </h2>
          
          <div className="space-y-3">
            <Link 
              to="/inbox" 
              className="block w-full bg-gray-100 text-gray-900 text-center py-3 rounded-lg font-medium hover:bg-gray-200 transition-colors"
            >
              Paper hinzufügen
            </Link>
            
            {stats.inboxCount > 0 && (
              <Link 
                to="/reading" 
                className="block w-full bg-primary text-white text-center py-3 rounded-lg font-medium hover:bg-blue-600 transition-colors"
              >
                Nächstes Paper lesen
              </Link>
            )}
            
            {stats.readingCount > 0 && (
              <Link 
                to="/reading" 
                className="block w-full bg-amber-500 text-white text-center py-3 rounded-lg font-medium hover:bg-amber-600 transition-colors"
              >
                Lesen fortsetzen
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
