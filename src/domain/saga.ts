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

const isRootOf = (root: string, base: string) => base === root || base.startsWith(root + ' ')

/**
 * Groups games into sagas. Explicit `saga` values always win, and a game whose
 * base name starts with an explicit saga joins it; otherwise a game joins the
 * saga of another game whose base name is a whole-word prefix of its own
 * (e.g. "zombicide" ⊂ "zombicide invader"). Games alone are left out.
 */
export function detectSagas(games: Game[], autoDetect: boolean): Record<string, string> {
  const result: Record<string, string> = {}
  for (const g of games) if (g.saga?.trim()) result[g.id] = g.saga.trim()
  if (!autoDetect) return result

  // Longest first, so "Star Wars: Outer Rim" wins over "Star Wars".
  const explicit = [...new Set(Object.values(result))]
    .map((saga) => ({ saga, root: sagaBase(saga) }))
    .filter((e) => e.root.length >= 3)
    .sort((a, b) => b.root.length - a.root.length)
  for (const g of games) {
    if (result[g.id]) continue
    const base = sagaBase(g.name)
    const match = explicit.find((e) => isRootOf(e.root, base))
    if (match) result[g.id] = match.saga
  }

  const pending = games.filter((g) => !result[g.id])
  const bases = pending.map((g) => ({ game: g, base: sagaBase(g.name) }))
  // Shortest bases first, so they become the root of longer titles.
  const roots = [...new Set(bases.map((b) => b.base))].filter((b) => b.length >= 3).sort((a, b) => a.length - b.length)

  const rootOf = new Map<string, string>()
  for (const { base } of bases) {
    const root = roots.find((r) => isRootOf(r, base))
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

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })

const byYear = (a: Game, b: Game) =>
  (a.year ?? Number.POSITIVE_INFINITY) - (b.year ?? Number.POSITIVE_INFINITY) || collator.compare(a.name, b.name)

/** A title split at its subtitle marks: "Nemesis: Lockdown – Stretch Goals" → nemesis, lockdown, stretch goals. */
function titleParts(name: string): string[] {
  return name
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .split(/\s*[:–—]\s*|\s+-\s+/)
    .map((p) => p.trim())
    .filter(Boolean)
}

const startsTitle = (a: string[], b: string[]) => a.length < b.length && a.every((p, i) => p === b[i])

/**
 * Order of the chapters of a saga: every game followed by its expansions.
 * A game goes under the one whose title starts its own ("Nemesis: Lockdown –
 * Stretch Goals" under "Nemesis: Lockdown"); an expansion with no such title
 * goes under the latest base game released before it. Under a game, its
 * expansions come first and the games of the series after; each by year.
 */
export function orderSaga(games: Game[]): Game[] {
  const parts = new Map(games.map((g) => [g, titleParts(g.name)]))
  const parent = new Map<Game, Game>()
  for (const g of games) {
    const own = parts.get(g)!
    let best: Game | undefined
    for (const other of games) {
      const theirs = parts.get(other)!
      if (other !== g && startsTitle(theirs, own) && (!best || theirs.length > parts.get(best)!.length)) best = other
    }
    if (best) parent.set(g, best)
  }
  const bases = games.filter((g) => !parent.has(g) && !g.expansion).sort(byYear)
  for (const g of games) {
    if (parent.has(g) || !g.expansion || bases.length === 0) continue
    const before = bases.filter((b) => (b.year ?? Number.POSITIVE_INFINITY) <= (g.year ?? Number.NEGATIVE_INFINITY))
    parent.set(g, before.at(-1) ?? bases[0]!)
  }

  const children = new Map<Game, Game[]>()
  for (const [child, p] of parent) children.set(p, [...(children.get(p) ?? []), child])
  const expansionsFirst = (a: Game, b: Game) => Number(!a.expansion) - Number(!b.expansion) || byYear(a, b)
  const basesFirst = (a: Game, b: Game) => Number(!!a.expansion) - Number(!!b.expansion) || byYear(a, b)
  const out: Game[] = []
  const visit = (g: Game) => {
    out.push(g)
    for (const c of (children.get(g) ?? []).sort(expansionsFirst)) visit(c)
  }
  // Expansions are roots only when the saga has no base game.
  for (const root of games.filter((g) => !parent.has(g)).sort(basesFirst)) visit(root)
  return out
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
