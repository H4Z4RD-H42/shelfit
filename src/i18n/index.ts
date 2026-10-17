import { useCallback } from 'react'
import { useAppStore } from '../store/appStore'
import { en } from './en'
import { it, type Messages } from './it'
import type { Language } from './language'

export type MessageKey = keyof Messages

const catalogs: Record<Language, Messages> = { it, en }

export function translate(lang: Language, key: MessageKey, params?: Record<string, string | number>): string {
  const text = catalogs[lang][key]
  if (!params) return text
  return text.replace(/\{(\w+)\}/g, (_, name: string) => String(params[name] ?? `{${name}}`))
}

export function useT() {
  const lang = useAppStore((s) => s.language)
  return useCallback((key: MessageKey, params?: Record<string, string | number>) => translate(lang, key, params), [lang])
}
