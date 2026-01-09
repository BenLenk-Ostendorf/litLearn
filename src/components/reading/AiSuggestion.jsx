import { Sparkles, Copy, Check, X } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

export default function AiSuggestion({ suggestion, onAdopt, onDismiss }) {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)

  if (!suggestion) return null

  const handleCopy = async () => {
    await navigator.clipboard.writeText(suggestion)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="mt-3 p-4 bg-ai-suggestion rounded-lg border border-ai-border">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-600" />
          <span className="text-sm font-medium text-purple-700">{t('excerpt.aiSuggestion')}</span>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
            title={t('common.close')}
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      
      <p className="text-sm text-gray-700 whitespace-pre-wrap mb-3">{suggestion}</p>
      
      <div className="flex gap-2">
        <button
          onClick={onAdopt}
          className="flex items-center gap-1 px-3 py-1.5 bg-purple-600 text-white text-sm rounded hover:bg-purple-700 transition-colors"
        >
          <Check className="w-4 h-4" />
          {t('excerpt.adopt')}
        </button>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 px-3 py-1.5 bg-white text-gray-700 text-sm rounded border border-gray-300 hover:bg-gray-50 transition-colors"
        >
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          {copied ? t('common.copied') : t('common.copy')}
        </button>
      </div>
    </div>
  )
}
