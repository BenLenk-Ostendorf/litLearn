import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import Sidebar from './Sidebar'
import Header from './Header'
import { useData } from '../../context/DataContext'
import { FolderOpen, AlertCircle } from 'lucide-react'
import LanguageSwitcher from '../LanguageSwitcher'

export default function Layout({ children }) {
  const { t } = useTranslation()
  const { directoryHandle, requestDirectoryAccess, initializeData, isLoading, error, clearError } = useData()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  useEffect(() => {
    if (directoryHandle) {
      initializeData(directoryHandle)
    }
  }, [directoryHandle, initializeData])

  if (!directoryHandle) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="absolute top-4 right-4">
          <LanguageSwitcher />
        </div>
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <FolderOpen className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">LitLearn</h1>
          <p className="text-gray-600 mb-6">
            {t('settings.selectFolder', 'Select the project folder where your paper data should be stored.')}
          </p>
          <button
            onClick={requestDirectoryAccess}
            className="w-full bg-primary text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-600 transition-colors"
          >
            {t('settings.selectFolderButton', 'Select Folder')}
          </button>
          <p className="text-sm text-gray-500 mt-4">
            {t('settings.requiresBrowser', 'Requires Chrome or Edge browser')}
          </p>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">{t('common.loading')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
      
      <div className={`flex-1 flex flex-col transition-all duration-300 ${sidebarCollapsed ? 'ml-16' : 'ml-64'}`}>
        <Header />
        
        {error && (
          <div className="mx-6 mt-4 bg-error/10 border border-error/20 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-error flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-error font-medium">{t('common.error')}</p>
              <p className="text-error/80 text-sm">{error}</p>
            </div>
            <button
              onClick={clearError}
              className="text-error/60 hover:text-error text-sm"
            >
              {t('common.close')}
            </button>
          </div>
        )}
        
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
