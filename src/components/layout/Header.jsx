import { useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import LanguageSwitcher from '../LanguageSwitcher'

const pageKeys = {
  '/': 'dashboard.title',
  '/inbox': 'inbox.title',
  '/reading': 'reading.title',
  '/review': 'spacedRepetition.title',
  '/search': 'search.title',
  '/settings': 'settings.title'
}

export default function Header() {
  const location = useLocation()
  const { t } = useTranslation()
  const basePath = '/' + (location.pathname.split('/')[1] || '')
  const titleKey = pageKeys[basePath]
  const title = titleKey ? t(titleKey) : 'LitLearn'

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
      <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
      <LanguageSwitcher />
    </header>
  )
}
