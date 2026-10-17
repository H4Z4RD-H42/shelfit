import type { Game } from './types'

const EDITION_WORDS = [
  'edition',
  'edizione',
  'deluxe',
  'revised',
  'anniversary',
  'big box',
  'collector',
  'collectors',
  'second',
  'third',
  'fourth',
  'fifth',
  'seconda',
  'terza',
  'nuova',
  'new',
  'legacy',
  'season',
  'stagione',
  'chapter',
  'capitolo',
  'part',
  'parte',
  'vol',
  'volume',
  'book',
  'libro',
]

const ROMAN = /^(?:i|ii|iii|iv|v|vi|vii|viii|ix|x)$/
const ORDINAL = /^\d+(?:st|nd|rd|th|a|o|°|ª|º)?$/

/** Normalises a game title to the "franchise" part of its name. */
export function sagaBase(name: string): string {
  let base = name.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
  // Subtitles: "Zombicide: Black Plague", "Catan – Seafarers", "Dune (2019)".
  base = base.split(/\s*[:–—([]\s*|\s+-\s+/)[0] ?? base
  base = base.replace(/[^a-z0-9&' ]+/g, ' ')
  const words = base.split(/\s+/).filter(Boolean)
  while (words.length > 1) {
    const last = words[words.length - 1]!
    if (ROMAN.test(last) || ORDINAL.test(last) || EDITION_WORDS.includes(last)) words.pop()
    else break
  }
  return words.join(' ')
}

/**
 * Groups games into sagas. Explicit `saga` values always win; otherwise a game
 * joins the saga of another game whose base name is a whole-word prefix of its
 * own (e.g. "zombicide" ⊂ "zombicide invader"). Games alone are left out.
 */
export function detectSagas(games: Game[], autoDetect: boolean): Record<string, string> {
  const result: Record<string, string> = {}
  for (const g of games) if (g.saga?.trim()) result[g.id] = g.saga.trim()
  if (!autoDetect) return result

  const pending = games.filter((g) => !result[g.id])
  const bases = pending.map((g) => ({ game: g, base: sagaBase(g.name) }))
  // Shortest bases first, so they become the root of longer titles.
  const roots = [...new Set(bases.map((b) => b.base))].filter((b) => b.length >= 3).sort((a, b) => a.length - b.length)

  const rootOf = new Map<string, string>()
  for (const { base } of bases) {
    const root = roots.find((r) => base === r || base.startsWith(r + ' '))
    if (root) rootOf.set(base, root)
  }

  const members = new Map<string, Game[]>()
  for (const { game, base } of bases) {
    const root = rootOf.get(base)
    if (!root) continue
    const list = members.get(root) ?? []
    list.push(game)
    members.set(root, list)
  }

  for (const [root, list] of members) {
    if (list.length < 2) continue
    const label = displayName(root, list)
    for (const g of list) result[g.id] = label
  }
  return result
}

/** Recovers the original casing of a saga root from one of its titles. */
function displayName(root: string, games: Game[]): string {
  const shortest = [...games].sort((a, b) => a.name.length - b.name.length)[0]!
  const words = root.split(' ').length
  const original = shortest.name
    .split(/\s*[:–—([]\s*|\s+-\s+/)[0]!
    .split(/\s+/)
    .slice(0, words)
    .join(' ')
  return sagaBase(original) === root ? original : root.replace(/\b\w/g, (c) => c.toUpperCase())
}
