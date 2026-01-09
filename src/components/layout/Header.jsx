import { useLocation } from 'react-router-dom'

const pageTitles = {
  '/': 'Dashboard',
  '/inbox': 'Inbox',
  '/reading': 'Paper lesen',
  '/review': 'Spaced Repetition',
  '/search': 'Suche',
  '/settings': 'Einstellungen'
}

export default function Header() {
  const location = useLocation()
  const basePath = '/' + (location.pathname.split('/')[1] || '')
  const title = pageTitles[basePath] || 'LitLearn'

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center px-6">
      <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
    </header>
  )
}
