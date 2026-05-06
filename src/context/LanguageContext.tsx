import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import zh from '../locales/zh'
import en from '../locales/en'

interface LanguageContextValue {
  lang: string
  toggleLang: () => void
  setLang: (lang: 'zh' | 'en') => void
  t: (key: string) => string
}

const dictionaries: Record<string, Record<string, string>> = { zh, en }
const LanguageContext = createContext<LanguageContextValue | null>(null)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<string>(() => localStorage.getItem('lang') || 'zh')

  const applyLang = useCallback((next: 'zh' | 'en') => {
    setLang(next)
    localStorage.setItem('lang', next)
    document.documentElement.lang = next
  }, [])

  const toggleLang = useCallback(() => {
    applyLang(lang === 'zh' ? 'en' : 'zh')
  }, [applyLang, lang])

  const t = useCallback((key: string): string => {
    return dictionaries[lang]?.[key] || dictionaries['en']?.[key] || key
  }, [lang])

  return (
    <LanguageContext.Provider value={{ lang, toggleLang, setLang: applyLang, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useT() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useT must be used within LanguageProvider')
  return ctx
}
