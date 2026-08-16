'use client'

import { useEffect, useMemo, useState } from 'react'
import { LocaleContext, resolveLocale, defaultLocale, translate, type Locale, type TranslationKey } from '@/lib/i18n'

function getBrowserLocale(): Locale {
  if (typeof navigator === 'undefined') return defaultLocale
  const languages = navigator.languages?.length ? navigator.languages : [navigator.language]
  return resolveLocale(languages?.[0] ?? undefined)
}

function getStoredLocale(): Locale | null {
  if (typeof window === 'undefined') return null
  const saved = window.localStorage.getItem('neichef-locale')
  return saved && ['en', 'es'].includes(saved) ? (saved as Locale) : null
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<Locale>(defaultLocale)

  useEffect(() => {
    const preferred = getStoredLocale() ?? getBrowserLocale()
    setLocale(preferred)
  }, [])

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = locale
    }
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('neichef-locale', locale)
    }
  }, [locale])

  const contextValue = useMemo(
    () => ({
      locale,
      setLocale: (value: Locale) => setLocale(resolveLocale(value)),
      t: (key: TranslationKey) => translate(key, locale),
    }),
    [locale],
  )

  return <LocaleContext.Provider value={contextValue}>{children}</LocaleContext.Provider>
}
