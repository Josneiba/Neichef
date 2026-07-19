'use client'

import { useEffect, useMemo, useState } from 'react'
import { LocaleContext, resolveLocale, defaultLocale, translate, type Locale, type TranslationKey } from '@/lib/i18n'

function getBrowserLocale(): Locale {
  if (typeof navigator === 'undefined') return defaultLocale
  const languages = navigator.languages?.length ? navigator.languages : [navigator.language]
  return resolveLocale(languages?.[0] ?? undefined)
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<Locale>(defaultLocale)

  useEffect(() => {
    setLocale(getBrowserLocale())
  }, [])

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = locale
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
