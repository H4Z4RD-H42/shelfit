export type Language = 'it' | 'en'

export function detectLanguage(): Language {
  return typeof navigator !== 'undefined' && navigator.language.toLowerCase().startsWith('it') ? 'it' : 'en'
}
