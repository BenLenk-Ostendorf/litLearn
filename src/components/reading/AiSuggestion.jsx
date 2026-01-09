import { Sparkles, Copy, Check } from 'lucide-react'
import { useState } from 'react'

export default function AiSuggestion({ suggestion, onAdopt }) {
  const [copied, setCopied] = useState(false)

  if (!suggestion) return null

  const handleCopy = async () => {
    await navigator.clipboard.writeText(suggestion)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="mt-3 p-4 bg-ai-suggestion rounded-lg border border-ai-border">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="w-4 h-4 text-purple-600" />
        <span className="text-sm font-medium text-purple-700">KI-Vorschlag</span>
      </div>
      
      <p className="text-sm text-gray-700 whitespace-pre-wrap mb-3">{suggestion}</p>
      
      <div className="flex gap-2">
        <button
          onClick={onAdopt}
          className="flex items-center gap-1 px-3 py-1.5 bg-purple-600 text-white text-sm rounded hover:bg-purple-700 transition-colors"
        >
          <Check className="w-4 h-4" />
          Übernehmen
        </button>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 px-3 py-1.5 bg-white text-gray-700 text-sm rounded border border-gray-300 hover:bg-gray-50 transition-colors"
        >
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          {copied ? 'Kopiert!' : 'Kopieren'}
        </button>
      </div>
    </div>
  )
}
