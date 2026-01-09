import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDown } from 'lucide-react'

const languages = [
  { code: 'en', name: 'English', displayCode: 'EN', color: 'bg-blue-500' },
  { code: 'de', name: 'Deutsch', displayCode: 'DE', color: 'bg-red-500' }
]

export default function LanguageSwitcher() {
  const { i18n } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)

  const currentLanguage = languages.find(lang => lang.code === i18n.language) || languages[0]

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLanguageChange = (langCode) => {
    i18n.changeLanguage(langCode)
    setIsOpen(false)
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
        aria-label="Change language"
        title={currentLanguage.name}
      >
        <div className="flex items-center gap-2">
          <div className={`w-6 h-6 rounded-full ${currentLanguage.color} flex items-center justify-center`}>
            <span className="text-xs font-bold text-white">{currentLanguage.displayCode}</span>
          </div>
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-600 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => handleLanguageChange(lang.code)}
              className={`w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-50 transition-colors ${
                lang.code === currentLanguage.code ? 'bg-blue-50' : ''
              }`}
            >
              <div className={`w-6 h-6 rounded-full ${lang.color} flex items-center justify-center flex-shrink-0`}>
                <span className="text-xs font-bold text-white">{lang.displayCode}</span>
              </div>
              <span className={`text-sm flex-1 text-left ${lang.code === currentLanguage.code ? 'font-medium text-primary' : 'text-gray-700'}`}>
                {lang.name}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
