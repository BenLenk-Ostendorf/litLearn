import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDown, ChevronUp, Sparkles, Check, Loader2 } from 'lucide-react'
import TagInput from './TagInput'
import AiSuggestion from './AiSuggestion'
import { useAi } from '../../hooks/useAi'

export default function ExcerptForm({ excerpt, onChange, pdfText, paper, settings, onComplete, saving }) {
  const { t } = useTranslation()
  const [showOptional, setShowOptional] = useState(false)
  const { requestSuggestions, loading: aiLoading, error: aiError } = useAi(settings)
  
  const CITABILITY_LABELS = {
    1: t('excerpt.citabilityLabels.1'), 2: t('excerpt.citabilityLabels.2'),
    3: t('excerpt.citabilityLabels.3'), 4: t('excerpt.citabilityLabels.4'),
    5: t('excerpt.citabilityLabels.5'), 6: t('excerpt.citabilityLabels.6'),
    7: t('excerpt.citabilityLabels.7'), 8: t('excerpt.citabilityLabels.8'),
    9: t('excerpt.citabilityLabels.9'), 10: t('excerpt.citabilityLabels.10')
  }

  const STUDY_TYPES = [
    t('excerpt.studyTypes.metaAnalysis'),
    t('excerpt.studyTypes.rct'),
    t('excerpt.studyTypes.quasiExperimental'),
    t('excerpt.studyTypes.observational'),
    t('excerpt.studyTypes.qualitative'),
    t('excerpt.studyTypes.mixedMethods'),
    t('excerpt.studyTypes.review'),
    t('excerpt.studyTypes.theoretical'),
    t('excerpt.studyTypes.other')
  ]
  
  const [pendingSuggestions, setPendingSuggestions] = useState({
    main_claims: false,
    topics: false,
    critical_notes: false
  })

  // Auto-save to localStorage on every change
  useEffect(() => {
    if (!paper?.id || !excerpt) return
    
    const autoSaveKey = `litlearn_autosave_${paper.id}`
    const autoSaveData = {
      excerpt,
      timestamp: Date.now()
    }
    
    try {
      localStorage.setItem(autoSaveKey, JSON.stringify(autoSaveData))
    } catch (err) {
      console.error('Auto-save failed:', err)
    }
  }, [excerpt, paper?.id])

  // Load auto-saved data on mount
  useEffect(() => {
    if (!paper?.id) return
    
    const autoSaveKey = `litlearn_autosave_${paper.id}`
    try {
      const saved = localStorage.getItem(autoSaveKey)
      if (saved) {
        const { excerpt: savedExcerpt, timestamp } = JSON.parse(saved)
        // Only restore if saved within last 24 hours
        if (Date.now() - timestamp < 24 * 60 * 60 * 1000) {
          onChange(savedExcerpt)
        }
      }
    } catch (err) {
      console.error('Auto-save restore failed:', err)
    }
  }, [paper?.id])

  const handleFieldChange = (field, subfield, value) => {
    onChange({
      [field]: {
        ...excerpt[field],
        [subfield]: value
      }
    })
  }

  const handleSimpleChange = (field, value) => {
    onChange({ [field]: value })
  }

  const requestAiSuggestion = async (field) => {
    if (!pdfText || aiLoading) return
    
    setPendingSuggestions(prev => ({ ...prev, [field]: true }))
    
    try {
      const suggestion = await requestSuggestions(field, {
        paper_title: paper.title,
        doi: paper.doi,
        pdf_text: pdfText,
        user_input: field === 'main_claims' || field === 'critical_notes' 
          ? excerpt[field].user_input 
          : excerpt[field].user_input.join(', ')
      })
      
      if (suggestion) {
        if (field === 'main_claims' || field === 'critical_notes') {
          handleFieldChange(field, 'ai_suggestion', suggestion)
        } else {
          // Parse array suggestions
          const items = suggestion.split(',').map(s => s.trim()).filter(Boolean)
          handleFieldChange(field, 'ai_suggestion', items)
        }
      }
    } catch (err) {
      console.error('AI suggestion error:', err)
    } finally {
      setPendingSuggestions(prev => ({ ...prev, [field]: false }))
    }
  }

  const adoptSuggestion = (field) => {
    if (field === 'main_claims' || field === 'critical_notes') {
      const combined = excerpt[field].user_input + '\n\n' + excerpt[field].ai_suggestion
      handleFieldChange(field, 'final', combined.trim())
    } else {
      const combined = [...new Set([...excerpt[field].user_input, ...excerpt[field].ai_suggestion])]
      handleFieldChange(field, 'final', combined)
    }
  }

  const canRequestAi = (field) => {
    if (field === 'main_claims') return excerpt.main_claims.user_input.length >= 50
    if (field === 'topics') return true // No minimum requirement for tags
    if (field === 'critical_notes') return excerpt.critical_notes.user_input.length >= 20
    return false
  }

  return (
    <div className="p-6 space-y-6">
      {/* Main Claims */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t('excerpt.mainClaimsRequired')} <span className="text-error">*</span>
        </label>
        <textarea
          value={excerpt.main_claims.user_input}
          onChange={(e) => handleFieldChange('main_claims', 'user_input', e.target.value)}
          onBlur={() => {
            if (!excerpt.main_claims.final) {
              handleFieldChange('main_claims', 'final', excerpt.main_claims.user_input)
            }
          }}
          placeholder={t('excerpt.mainClaimsPlaceholder')}
          className="w-full h-32 px-3 py-2 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-primary focus:border-primary"
        />
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-gray-500">
            {excerpt.main_claims.user_input.length} / 50 {t('excerpt.characters')}
          </span>
          <button
            onClick={() => requestAiSuggestion('main_claims')}
            disabled={!canRequestAi('main_claims') || pendingSuggestions.main_claims || !pdfText}
            className="flex items-center gap-1 text-sm text-purple-600 hover:text-purple-700 disabled:text-gray-400 disabled:cursor-not-allowed"
          >
            {pendingSuggestions.main_claims ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            {t('excerpt.aiSuggestion')}
          </button>
        </div>
        
        <AiSuggestion
          suggestion={excerpt.main_claims.ai_suggestion}
          onAdopt={() => adoptSuggestion('main_claims')}
        />
        
        {excerpt.main_claims.ai_suggestion && (
          <div className="mt-3">
            <label className="block text-xs font-medium text-gray-600 mb-1">{t('excerpt.finalVersion')}</label>
            <textarea
              value={excerpt.main_claims.final}
              onChange={(e) => handleFieldChange('main_claims', 'final', e.target.value)}
              className="w-full h-24 px-3 py-2 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-primary focus:border-primary text-sm"
            />
          </div>
        )}
      </div>

      {/* Citability */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t('excerpt.citability')}: {excerpt.citability} ({CITABILITY_LABELS[excerpt.citability]})
        </label>
        <input
          type="range"
          min={1}
          max={10}
          value={excerpt.citability}
          onChange={(e) => handleSimpleChange('citability', parseInt(e.target.value))}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>1 - {t('excerpt.citabilityLabels.1')}</span>
          <span>10 - {t('excerpt.citabilityLabels.10')}</span>
        </div>
      </div>

      {/* Topics & Key Concepts Combined */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t('excerpt.topicsAndConceptsRequired')} <span className="text-error">*</span>
        </label>
        <TagInput
          tags={excerpt.topics.user_input}
          onChange={(tags) => {
            handleFieldChange('topics', 'user_input', tags)
            if (excerpt.topics.final.length === 0) {
              handleFieldChange('topics', 'final', tags)
            }
          }}
          placeholder={t('excerpt.topicsPlaceholder')}
        />
        <div className="flex justify-end mt-2">
          <button
            onClick={() => requestAiSuggestion('topics')}
            disabled={!canRequestAi('topics') || pendingSuggestions.topics || !pdfText}
            className="flex items-center gap-1 text-sm text-purple-600 hover:text-purple-700 disabled:text-gray-400 disabled:cursor-not-allowed"
          >
            {pendingSuggestions.topics ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            {t('excerpt.aiSuggestions')}
          </button>
        </div>
        
        {excerpt.topics.ai_suggestion.length > 0 && (
          <div className="mt-2 p-3 bg-ai-suggestion rounded-lg border border-ai-border">
            <div className="flex flex-wrap gap-1 mb-2">
              {excerpt.topics.ai_suggestion.map(tag => (
                <button
                  key={tag}
                  onClick={() => {
                    if (!excerpt.topics.final.includes(tag)) {
                      handleFieldChange('topics', 'final', [...excerpt.topics.final, tag])
                    }
                  }}
                  className="px-2 py-1 bg-white rounded text-sm hover:bg-purple-100 transition-colors"
                >
                  + {tag}
                </button>
              ))}
            </div>
          </div>
        )}
        
        {excerpt.topics.final.length > 0 && (
          <div className="mt-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">{t('excerpt.finalTags')}</label>
            <TagInput
              tags={excerpt.topics.final}
              onChange={(tags) => handleFieldChange('topics', 'final', tags)}
            />
          </div>
        )}
      </div>

      {/* Study Type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t('excerpt.studyType')}
        </label>
        <select
          value={excerpt.study_type || ''}
          onChange={(e) => handleSimpleChange('study_type', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
        >
          <option value="">{t('excerpt.studyTypePlaceholder')}</option>
          {STUDY_TYPES.map(type => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>
      </div>

      {/* Projects */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t('excerpt.relevantProjects')}
        </label>
        <div className="flex flex-wrap gap-2">
          {settings.projects.map(project => (
            <label
              key={project}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                excerpt.relevant_projects.includes(project)
                  ? 'bg-primary/10 border-primary text-primary'
                  : 'bg-white border-gray-300 hover:border-gray-400'
              }`}
            >
              <input
                type="checkbox"
                checked={excerpt.relevant_projects.includes(project)}
                onChange={(e) => {
                  if (e.target.checked) {
                    handleSimpleChange('relevant_projects', [...excerpt.relevant_projects, project])
                  } else {
                    handleSimpleChange('relevant_projects', excerpt.relevant_projects.filter(p => p !== project))
                  }
                }}
                className="sr-only"
              />
              {excerpt.relevant_projects.includes(project) && <Check className="w-4 h-4" />}
              {project}
            </label>
          ))}
        </div>
      </div>

      {/* Expiry */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t('excerpt.relevanceDuration')}
        </label>
        <div className="flex flex-wrap gap-2">
          {settings.expiry_options.map(years => (
            <label
              key={years}
              className={`px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                excerpt.expiry_years === years
                  ? 'bg-primary text-white border-primary'
                  : 'bg-white border-gray-300 hover:border-gray-400'
              }`}
            >
              <input
                type="radio"
                name="expiry"
                checked={excerpt.expiry_years === years}
                onChange={() => handleSimpleChange('expiry_years', years)}
                className="sr-only"
              />
              {years === 999 ? t('excerpt.always') : t('excerpt.years', { count: years })}
            </label>
          ))}
        </div>
      </div>

      {/* Optional fields */}
      <button
        onClick={() => setShowOptional(!showOptional)}
        className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
      >
        {showOptional ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        {t('excerpt.optionalFields')} {showOptional ? t('excerpt.hide') : t('excerpt.show')}
      </button>

      {showOptional && (
        <div className="space-y-6 pt-4 border-t border-gray-200">
          {/* Sample Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('excerpt.sampleDescription')}
            </label>
            <textarea
              value={excerpt.methodology_sample}
              onChange={(e) => handleSimpleChange('methodology_sample', e.target.value)}
              placeholder={t('excerpt.samplePlaceholder')}
              className="w-full h-24 px-3 py-2 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          {/* Critical Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('excerpt.criticalNotes')}
            </label>
            <textarea
              value={excerpt.critical_notes?.user_input || ''}
              onChange={(e) => {
                const value = e.target.value
                handleFieldChange('critical_notes', 'user_input', value)
                if (!excerpt.critical_notes.final) {
                  handleFieldChange('critical_notes', 'final', value)
                }
              }}
              placeholder={t('excerpt.criticalNotesPlaceholder')}
              className="w-full h-24 px-3 py-2 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
            <div className="flex justify-end mt-2">
              <button
                onClick={() => requestAiSuggestion('critical_notes')}
                disabled={!canRequestAi('critical_notes') || pendingSuggestions.critical_notes || !pdfText}
                className="flex items-center gap-1 text-sm text-purple-600 hover:text-purple-700 disabled:text-gray-400 disabled:cursor-not-allowed"
              >
                {pendingSuggestions.critical_notes ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                {t('excerpt.aiPerspectives')}
              </button>
            </div>
            
            <AiSuggestion
              suggestion={excerpt.critical_notes.ai_suggestion}
              onAdopt={() => adoptSuggestion('critical_notes')}
            />
          </div>
        </div>
      )}

      {/* Complete button */}
      <div className="pt-6 border-t border-gray-200">
        <button
          onClick={onComplete}
          disabled={saving}
          className="w-full py-3 bg-success text-white rounded-lg font-medium hover:bg-green-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {saving ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              {t('excerpt.saving')}
            </>
          ) : (
            <>
              <Check className="w-5 h-5" />
              {t('excerpt.complete')}
            </>
          )}
        </button>
      </div>
    </div>
  )
}
