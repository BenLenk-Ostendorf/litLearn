import { useState, useMemo } from 'react'
import { useData } from '../context/DataContext'
import { Brain, Check, X, Eye, EyeOff, ChevronDown, ChevronUp } from 'lucide-react'
import { format, parseISO, isToday, isPast, addWeeks } from 'date-fns'

const FIBONACCI = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89]

function getFibonacciWeeks(index) {
  return FIBONACCI[Math.min(index, FIBONACCI.length - 1)]
}

export default function Review() {
  const { papers, updatePaper } = useData()
  
  const [currentIndex, setCurrentIndex] = useState(0)
  const [showAnswer, setShowAnswer] = useState(false)
  const [userAnswer, setUserAnswer] = useState('')
  const [showDetails, setShowDetails] = useState(false)
  const [reviewedToday, setReviewedToday] = useState(0)

  const dueReviews = useMemo(() => {
    return papers
      .filter(p => {
        if (p.status !== 'completed' || !p.spaced_repetition?.next_review_date) return false
        if (p.spaced_repetition.expired) return false
        const reviewDate = parseISO(p.spaced_repetition.next_review_date)
        return isToday(reviewDate) || isPast(reviewDate)
      })
      .sort((a, b) => 
        parseISO(a.spaced_repetition.next_review_date) - parseISO(b.spaced_repetition.next_review_date)
      )
  }, [papers])

  const currentPaper = dueReviews[currentIndex]
  const canReviewMore = reviewedToday < 3

  const handleRecall = async (recalled) => {
    if (!currentPaper) return
    
    const sr = currentPaper.spaced_repetition
    const now = new Date()
    
    let newFibIndex, newIntervalWeeks
    
    if (recalled) {
      newFibIndex = sr.fibonacci_index + 1
      newIntervalWeeks = getFibonacciWeeks(newFibIndex)
    } else {
      newFibIndex = 0
      newIntervalWeeks = 1
    }
    
    // Check if paper would expire before next review
    const expiryYears = currentPaper.excerpt?.expiry_years || 999
    const addedDate = parseISO(currentPaper.added_date)
    const expiryDate = new Date(addedDate)
    expiryDate.setFullYear(expiryDate.getFullYear() + expiryYears)
    
    const nextReviewDate = addWeeks(now, newIntervalWeeks)
    const expired = nextReviewDate > expiryDate
    
    const newReviewHistory = [
      ...sr.review_history,
      { date: format(now, 'yyyy-MM-dd'), recalled_correctly: recalled }
    ]
    
    await updatePaper(currentPaper.id, {
      spaced_repetition: {
        ...sr,
        next_review_date: format(nextReviewDate, 'yyyy-MM-dd'),
        current_interval_weeks: newIntervalWeeks,
        fibonacci_index: newFibIndex,
        review_history: newReviewHistory,
        expired
      }
    })
    
    // Move to next or finish
    setReviewedToday(prev => prev + 1)
    setShowAnswer(false)
    setUserAnswer('')
    setShowDetails(false)
    
    if (currentIndex < dueReviews.length - 1 && reviewedToday + 1 < 3) {
      setCurrentIndex(prev => prev + 1)
    }
  }

  if (dueReviews.length === 0) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-12rem)]">
        <div className="text-center">
          <Brain className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-xl font-medium text-gray-700 mb-2">Keine Reviews fällig</p>
          <p className="text-gray-500">Komm später wieder!</p>
        </div>
      </div>
    )
  }

  if (!canReviewMore || currentIndex >= dueReviews.length) {
    const remaining = dueReviews.length - currentIndex
    return (
      <div className="flex items-center justify-center h-[calc(100vh-12rem)]">
        <div className="text-center">
          <Check className="w-16 h-16 text-success mx-auto mb-4" />
          <p className="text-xl font-medium text-gray-700 mb-2">
            {reviewedToday} Reviews abgeschlossen!
          </p>
          {remaining > 0 && (
            <p className="text-gray-500">
              {remaining} weitere Reviews warten auf morgen (max. 3 pro Tag)
            </p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Progress */}
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-gray-500">
          Review {reviewedToday + 1} von max. 3 heute
        </p>
        <p className="text-sm text-gray-500">
          {dueReviews.length - currentIndex} Paper in der Queue
        </p>
      </div>

      {/* Review Card */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Question */}
        <div className="p-6 border-b border-gray-200">
          <p className="text-sm text-gray-500 mb-2">Paper</p>
          <h2 className="text-xl font-semibold text-gray-900 mb-1">{currentPaper.title}</h2>
          <p className="text-sm text-gray-500">{currentPaper.doi}</p>
          
          <div className="mt-6">
            <p className="text-sm font-medium text-gray-700 mb-2">
              Was waren die Hauptaussagen dieses Papers?
            </p>
            <textarea
              value={userAnswer}
              onChange={(e) => setUserAnswer(e.target.value)}
              placeholder="Schreibe deine Erinnerung auf..."
              className="w-full h-32 px-4 py-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-primary focus:border-primary"
              disabled={showAnswer}
            />
          </div>
          
          {!showAnswer && (
            <button
              onClick={() => setShowAnswer(true)}
              className="mt-4 flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <Eye className="w-4 h-4" />
              Antwort zeigen
            </button>
          )}
        </div>

        {/* Answer */}
        {showAnswer && (
          <div className="p-6 bg-gray-50">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-gray-700">Gespeicherte Hauptaussagen</p>
              <EyeOff className="w-4 h-4 text-gray-400" />
            </div>
            
            <div className="bg-white rounded-lg p-4 border border-gray-200 mb-4">
              <p className="text-gray-800 whitespace-pre-wrap">
                {currentPaper.excerpt?.main_claims?.final || 'Keine Hauptaussagen gespeichert'}
              </p>
            </div>

            {/* Expandable details */}
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
            >
              {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              Weitere Details
            </button>
            
            {showDetails && (
              <div className="mt-4 space-y-4">
                {currentPaper.excerpt?.topics?.final?.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-1">Themen</p>
                    <div className="flex flex-wrap gap-1">
                      {currentPaper.excerpt.topics.final.map(topic => (
                        <span key={topic} className="px-2 py-1 bg-gray-200 rounded text-sm">
                          {topic}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                {currentPaper.excerpt?.key_concepts?.final?.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-1">Konzepte</p>
                    <div className="flex flex-wrap gap-1">
                      {currentPaper.excerpt.key_concepts.final.map(concept => (
                        <span key={concept} className="px-2 py-1 bg-purple-100 rounded text-sm">
                          {concept}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                {currentPaper.excerpt?.critical_notes?.final && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-1">Kritische Anmerkungen</p>
                    <p className="text-sm text-gray-600">{currentPaper.excerpt.critical_notes.final}</p>
                  </div>
                )}
              </div>
            )}

            {/* Self-assessment */}
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => handleRecall(false)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-error text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                <X className="w-5 h-5" />
                Nicht gewusst
              </button>
              <button
                onClick={() => handleRecall(true)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-success text-white rounded-lg hover:bg-green-600 transition-colors"
              >
                <Check className="w-5 h-5" />
                Gewusst
              </button>
            </div>
            
            <p className="text-xs text-gray-500 text-center mt-3">
              Aktuelles Intervall: {currentPaper.spaced_repetition.current_interval_weeks} Woche(n) • 
              Fibonacci-Index: {currentPaper.spaced_repetition.fibonacci_index}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
