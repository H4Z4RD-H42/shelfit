import { sameDims } from './sizes'
import { hasDims, type CubeSize, type Game, type GameOrientation, type PackOptions, type ShelfUnit, type Zone } from './types'

export const BACKUP_FORMAT = 'shelf-planner-backup'
export const BACKUP_VERSION = 3

export interface Backup {
  format: typeof BACKUP_FORMAT
  version: number
  exportedAt: string
  games: Game[]
  units: ShelfUnit[]
  cube: CubeSize
  options: PackOptions
  /** Added in version 3. */
  zones?: Zone[]
}

export function createBackup(data: Pick<Backup, 'games' | 'units' | 'cube' | 'options' | 'zones'>): Backup {
  return { format: BACKUP_FORMAT, version: BACKUP_VERSION, exportedAt: new Date().toISOString(), ...data }
}

const isPositive = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && n > 0

function isGame(value: unknown): value is Game {
  const g = value as Game
  return typeof g?.id === 'string' && typeof g.name === 'string' && (g.dims === undefined || hasDims(g))
}

function isZone(value: unknown): value is Zone {
  const z = value as Zone
  return typeof z?.id === 'string' && typeof z.rule === 'string' && typeof z.place === 'string'
}

export function parseBackup(text: string): Backup {
  const data = JSON.parse(text) as Partial<Backup>
  if (data.format !== BACKUP_FORMAT) throw new Error('unknown format')
  if ((data.version ?? 0) > BACKUP_VERSION) throw new Error('backup made by a newer version')
  if (!Array.isArray(data.games) || !data.games.every(isGame)) throw new Error('invalid games')
  if (!Array.isArray(data.units) || data.units.length === 0) throw new Error('invalid shelves')
  if (!data.cube || !isPositive(data.cube.width) || !isPositive(data.cube.height) || !isPositive(data.cube.depth))
    throw new Error('invalid cube size')
  if (data.zones !== undefined && !(Array.isArray(data.zones) && data.zones.every(isZone))) throw new Error('invalid zones')
  return data as Backup
}

/** Splits a CSV line honouring double quotes. */
function splitCsvLine(line: string, separator: string): string[] {
  const cells: string[] = []
  let cell = ''
  let quoted = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') {
        cell += '"'
        i++
      } else if (ch === '"') quoted = false
      else cell += ch
    } else if (ch === '"') quoted = true
    else if (ch === separator) {
      cells.push(cell.trim())
      cell = ''
    } else cell += ch
  }
  cells.push(cell.trim())
  return cells
}

/** Accepted header names for each field, in order of preference. */
const HEADERS = {
  name: ['name', 'nome', 'objectname', 'title', 'titolo'],
  bggId: ['bggid', 'bgg_id', 'objectid'],
  width: ['width', 'larghezza', 'w'],
  height: ['height', 'altezza', 'length', 'lunghezza', 'h'],
  depth: ['depth', 'spessore', 'profondita', 'profondità', 'd'],
  saga: ['saga', 'series', 'serie'],
  year: ['yearpublished', 'year', 'anno'],
  orientation: ['orientation', 'orientamento'],
  genre: ['genre', 'genere', 'category', 'categoria'],
  designer: ['designer', 'designers', 'autore', 'autori', 'author'],
  publisher: ['publisher', 'editore', 'version_publishers'],
  language: ['version_languages', 'language', 'lingua'],
  minPlayers: ['minplayers', 'min_players', 'giocatori_min'],
  maxPlayers: ['maxplayers', 'max_players', 'giocatori_max'],
  playTime: ['playingtime', 'playtime', 'durata'],
  complexity: ['avgweight', 'complexity', 'complessita', 'complessità'],
  rating: ['rating', 'voto'],
  plays: ['numplays', 'plays', 'partite'],
  forTrade: ['fortrade'],
  tags: ['tags', 'etichette'],
  own: ['own'],
  itemType: ['itemtype'],
  versionName: ['version_nickname'],
  versionPublishers: ['version_publishers'],
} as const

type Column = keyof typeof HEADERS

const ORIENTATIONS: Record<string, GameOrientation> = {
  vertical: 'vertical',
  verticale: 'vertical',
  horizontal: 'horizontal',
  orizzontale: 'horizontal',
  auto: 'auto',
}

export type ImportedGame = Omit<Game, 'id' | 'createdAt'>

/**
 * Imports games from a CSV with a header row. Recognised columns: name, width,
 * height, depth (cm, decimal comma allowed), saga, year, orientation, bggId.
 * A BoardGameGeek collection export is recognised too: only owned items are
 * kept and, since BGG exports no box sizes, games come without dimensions.
 */
export function parseCsv(text: string): ImportedGame[] {
  const lines = text
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .filter((l) => l.trim())
  if (lines.length < 2) throw new Error('no rows')
  const first = lines[0]!
  const separator = [';', ',', '\t'].sort((a, b) => first.split(b).length - first.split(a).length)[0]!
  const header = splitCsvLine(first, separator).map((h) => h.toLowerCase())
  const idx = {} as Record<Column, number>
  for (const key of Object.keys(HEADERS) as Column[]) {
    const alias = HEADERS[key].find((a) => header.includes(a))
    idx[key] = alias ? header.indexOf(alias) : -1
  }
  if (idx.name < 0) throw new Error('missing column "name"')

  const num = (v: string | undefined) => Number((v ?? '').replace(',', '.'))
  return lines.slice(1).flatMap((line) => {
    const cells = splitCsvLine(line, separator)
    const at = (key: Column) => (idx[key] >= 0 ? cells[idx[key]] || undefined : undefined)
    const name = at('name')
    if (!name) return []
    if (idx.own >= 0 && at('own') !== '1') return []

    const dims = { width: num(at('width')), height: num(at('height')), depth: num(at('depth')) }
    const year = num(at('year'))
    const bggId = num(at('bggId'))
    const version = [at('versionName'), at('versionPublishers')].filter(Boolean).join(' · ')
    const game: ImportedGame = {
      name,
      orientation: ORIENTATIONS[(at('orientation') ?? '').toLowerCase()] ?? 'inherit',
    }
    if (hasDims({ dims })) game.dims = dims
    if (at('saga')) game.saga = at('saga')
    if (Number.isInteger(year) && year > 0) game.year = year
    if (Number.isInteger(bggId) && bggId > 0) game.bggId = bggId
    if (version) game.version = version
    if (at('itemType')) game.expansion = at('itemType') === 'expansion'
    // Unlike the other numbers, 0 plays is meaningful: never played.
    const plays = num(at('plays'))
    if (at('plays') !== undefined && Number.isInteger(plays) && plays >= 0) game.plays = plays
    if (idx.forTrade >= 0) game.forTrade = at('forTrade') === '1'
    const tags = at('tags')
      ?.split(/[;,]/)
      .map((t) => t.trim())
      .filter(Boolean)
    if (tags?.length) game.tags = tags
    for (const key of ['genre', 'designer', 'publisher', 'language'] as const) {
      const value = at(key)
      if (value) game[key] = value
    }
    // BGG writes 0 for unknown numbers.
    for (const key of ['minPlayers', 'maxPlayers', 'playTime', 'complexity', 'rating'] as const) {
      const value = num(at(key))
      if (Number.isFinite(value) && value > 0) game[key] = Math.round(value * 100) / 100
    }
    return [game]
  })
}

const normalizeName = (name: string) => name.trim().toLowerCase()

/** Fields an import may update on a game already in the collection. */
const MERGED_FIELDS = [
  'dims',
  'saga',
  'year',
  'bggId',
  'version',
  'expansion',
  'genre',
  'designer',
  'publisher',
  'language',
  'minPlayers',
  'maxPlayers',
  'playTime',
  'complexity',
  'rating',
  'plays',
  'forTrade',
  'categories',
  'tags',
] as const satisfies readonly (keyof ImportedGame)[]

/**
 * Adds imported games to the collection. A game already present (same BGG id,
 * or same name when there is no id) is updated with the fields the import
 * provides, so that re-importing never wipes sizes or choices made by hand.
 * `missing` counts the imported games that are still without a size,
 * `keptManual` the sizes typed by hand that the import would have changed.
 */
export function mergeGames(
  existing: Game[],
  incoming: ImportedGame[],
  makeId: () => string,
  now: number,
): { games: Game[]; added: number; updated: number; missing: number; keptManual: number } {
  const games = existing.slice()
  const touched = new Set<number>()
  let keptManual = 0
  const byBgg = new Map<number, number>()
  const byName = new Map<string, number>()
  const index = (g: Game, i: number) => {
    if (g.bggId) byBgg.set(g.bggId, i)
    byName.set(normalizeName(g.name), i)
  }
  games.forEach(index)

  let added = 0
  let updated = 0
  incoming.forEach((row, n) => {
    const i = row.bggId ? byBgg.get(row.bggId) : byName.get(normalizeName(row.name))
    if (i === undefined) {
      const game: Game = { ...row, ...(row.dims && { dimsSource: 'import' }), id: makeId(), createdAt: now + n }
      games.push(game)
      index(game, games.length - 1)
      touched.add(games.length - 1)
      added++
      return
    }
    const old = games[i]!
    const patch: Partial<Game> = {}
    for (const key of MERGED_FIELDS) {
      if (row[key] !== undefined) Object.assign(patch, { [key]: row[key] })
    }
    if (patch.dims) {
      // Sizes typed by hand come from a tape measure: they beat any import.
      if (old.dimsSource === 'manual' && hasDims(old)) {
        delete patch.dims
        if (!sameDims(old.dims, row.dims)) keptManual++
      } else patch.dimsSource = 'import'
    }
    if (row.orientation !== 'inherit') patch.orientation = row.orientation
    games[i] = { ...old, ...patch }
    index(games[i]!, i)
    touched.add(i)
    updated++
  })
  // Counted on the merged games: sizes entered by hand survive a re-import.
  const missing = [...touched].filter((i) => !hasDims(games[i]!)).length
  return { games, added, updated, missing, keptManual }
}
