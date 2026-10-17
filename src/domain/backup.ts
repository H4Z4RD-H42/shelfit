import type { CubeSize, Game, GameOrientation, PackOptions, ShelfUnit } from './types'

export const BACKUP_FORMAT = 'shelf-planner-backup'
export const BACKUP_VERSION = 1

export interface Backup {
  format: typeof BACKUP_FORMAT
  version: number
  exportedAt: string
  games: Game[]
  units: ShelfUnit[]
  cube: CubeSize
  options: PackOptions
}

export function createBackup(data: Pick<Backup, 'games' | 'units' | 'cube' | 'options'>): Backup {
  return { format: BACKUP_FORMAT, version: BACKUP_VERSION, exportedAt: new Date().toISOString(), ...data }
}

const isPositive = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && n > 0

function isGame(value: unknown): value is Game {
  const g = value as Game
  return (
    typeof g?.id === 'string' &&
    typeof g.name === 'string' &&
    isPositive(g.dims?.width) &&
    isPositive(g.dims?.height) &&
    isPositive(g.dims?.depth)
  )
}

export function parseBackup(text: string): Backup {
  const data = JSON.parse(text) as Partial<Backup>
  if (data.format !== BACKUP_FORMAT) throw new Error('unknown format')
  if ((data.version ?? 0) > BACKUP_VERSION) throw new Error('backup made by a newer version')
  if (!Array.isArray(data.games) || !data.games.every(isGame)) throw new Error('invalid games')
  if (!Array.isArray(data.units) || data.units.length === 0) throw new Error('invalid shelves')
  if (!data.cube || !isPositive(data.cube.width) || !isPositive(data.cube.height) || !isPositive(data.cube.depth))
    throw new Error('invalid cube size')
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

const HEADERS: Record<string, string[]> = {
  name: ['name', 'nome', 'objectname', 'title', 'titolo'],
  width: ['width', 'larghezza', 'w'],
  height: ['height', 'altezza', 'length', 'lunghezza', 'h'],
  depth: ['depth', 'spessore', 'profondita', 'profondità', 'd'],
  saga: ['saga', 'series', 'serie'],
  year: ['year', 'anno', 'yearpublished'],
  orientation: ['orientation', 'orientamento'],
}

const ORIENTATIONS: Record<string, GameOrientation> = {
  vertical: 'vertical',
  verticale: 'vertical',
  horizontal: 'horizontal',
  orizzontale: 'horizontal',
  auto: 'auto',
}

/**
 * Imports games from a CSV with a header row. Recognised columns: name, width,
 * height, depth (cm, decimal comma allowed), saga, year, orientation.
 */
export function parseCsv(text: string): Omit<Game, 'id' | 'createdAt'>[] {
  const lines = text
    .replace(/^﻿/, '')
    .split(/\r?\n/)
    .filter((l) => l.trim())
  if (lines.length < 2) throw new Error('no rows')
  const first = lines[0]!
  const separator = [';', ',', '\t'].sort((a, b) => first.split(b).length - first.split(a).length)[0]!
  const header = splitCsvLine(first, separator).map((h) => h.toLowerCase())
  const col = (key: string) => header.findIndex((h) => HEADERS[key]!.includes(h))
  const idx = Object.fromEntries(Object.keys(HEADERS).map((k) => [k, col(k)]))
  for (const key of ['name', 'width', 'height', 'depth']) if (idx[key]! < 0) throw new Error(`missing column "${key}"`)

  const num = (v: string | undefined) => Number((v ?? '').replace(',', '.'))
  return lines.slice(1).flatMap((line) => {
    const cells = splitCsvLine(line, separator)
    const at = (key: string) => (idx[key]! >= 0 ? cells[idx[key]!] : undefined)
    const name = at('name')
    const dims = { width: num(at('width')), height: num(at('height')), depth: num(at('depth')) }
    if (!name || !isPositive(dims.width) || !isPositive(dims.height) || !isPositive(dims.depth)) return []
    const year = num(at('year'))
    return [
      {
        name,
        dims,
        saga: at('saga') || undefined,
        year: Number.isInteger(year) && year > 0 ? year : undefined,
        orientation: ORIENTATIONS[(at('orientation') ?? '').toLowerCase()] ?? 'inherit',
      },
    ]
  })
}
