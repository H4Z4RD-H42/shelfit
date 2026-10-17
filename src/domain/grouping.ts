import type { Game, GroupKey } from './types'

/*
 * Grouping puts related games next to each other on the shelves. Free-text
 * keys (genre, designer, publisher, language) group by their value; numeric
 * keys are split into a few buckets with a natural order.
 */

export const GROUP_KEYS: GroupKey[] = ['genre', 'designer', 'publisher', 'complexity', 'players', 'playtime', 'language']

/** Bucket ids of the numeric keys, in display order. */
export const BUCKETS = {
  complexity: ['light', 'medium', 'heavy'],
  players: ['solo', 'duo', 'group', 'party'],
  playtime: ['short', 'medium', 'long'],
} as const satisfies Partial<Record<GroupKey, readonly string[]>>

export type BucketKey = keyof typeof BUCKETS

export function isBucketKey(key: GroupKey): key is BucketKey {
  return key in BUCKETS
}

/** First entry of a list such as "Awaken Realms; Cranio Creations". */
function firstOf(list: string | undefined): string | undefined {
  return list?.split(/[;,]/)[0]?.trim() || undefined
}

/** The group a game belongs to for `key`, or undefined when unknown. */
export function groupOf(game: Game, key: GroupKey): string | undefined {
  switch (key) {
    case 'genre':
      return game.genre?.trim() || undefined
    case 'designer':
      return firstOf(game.designer)
    case 'publisher':
      return firstOf(game.publisher)
    case 'language':
      return firstOf(game.language)
    case 'complexity': {
      const w = game.complexity
      if (!w) return undefined
      return w < 2 ? 'light' : w < 3 ? 'medium' : 'heavy'
    }
    case 'players': {
      const max = game.maxPlayers
      if (!max) return undefined
      return max <= 1 ? 'solo' : max === 2 ? 'duo' : max <= 5 ? 'group' : 'party'
    }
    case 'playtime': {
      const t = game.playTime
      if (!t) return undefined
      return t <= 30 ? 'short' : t <= 90 ? 'medium' : 'long'
    }
  }
}

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })

/** Orders two group values of the same key; unknown values go last. */
export function compareGroups(key: GroupKey, a: string | undefined, b: string | undefined): number {
  if (a === b) return 0
  if (a === undefined) return 1
  if (b === undefined) return -1
  if (isBucketKey(key)) {
    const order: readonly string[] = BUCKETS[key]
    return order.indexOf(a) - order.indexOf(b)
  }
  return collator.compare(a, b)
}

/** Groups of a game for each grouping level, outermost first. */
export function groupPath(game: Game, keys: GroupKey[]): (string | undefined)[] {
  return keys.map((k) => groupOf(game, k))
}
