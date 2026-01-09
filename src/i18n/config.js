import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './locales/en.json'
import de from './locales/de.json'

const resources = {
  en: { translation: en },
  de: { translation: de }
}

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: localStorage.getItem('litlearn_language') || 'en',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    }
  })

i18n.on('languageChanged', (lng) => {
  localStorage.setItem('litlearn_language', lng)
})

export default i18n
