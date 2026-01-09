import { useEffect } from 'react'
import { Clock } from 'lucide-react'

export default function Timer({ running, duration, elapsed, onTick }) {
  useEffect(() => {
    if (!running) return
    
    const interval = setInterval(() => {
      onTick(prev => prev + 1)
    }, 1000)
    
    return () => clearInterval(interval)
  }, [running, onTick])

  const remaining = Math.max(0, duration - elapsed)
  const minutes = Math.floor(remaining / 60)
  const seconds = remaining % 60

  const percentage = (elapsed / duration) * 100
  
  let colorClass = 'text-gray-700'
  let bgClass = 'bg-gray-100'
  
  if (remaining <= 300) { // 5 minutes
    colorClass = 'text-orange-600'
    bgClass = 'bg-orange-100'
  } else if (remaining <= 600) { // 10 minutes
    colorClass = 'text-yellow-600'
    bgClass = 'bg-yellow-100'
  }
  
  if (remaining === 0) {
    colorClass = 'text-error'
    bgClass = 'bg-error/10'
  }

  return (
    <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${bgClass}`}>
      <Clock className={`w-5 h-5 ${colorClass}`} />
      <span className={`font-mono text-lg font-medium ${colorClass}`}>
        {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
      </span>
      {remaining === 0 && (
        <span className="text-sm text-error ml-2">Zeit ist um!</span>
      )}
    </div>
  )
}
