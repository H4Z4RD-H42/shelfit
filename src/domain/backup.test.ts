import { describe, expect, it } from 'vitest'
import { createBackup, mergeGames, parseBackup, parseCsv } from './backup'
import { DEFAULT_OPTIONS } from './defaults'
import { KALLAX_CUBE } from './kallax'

describe('parseCsv', () => {
  it('reads Italian headers, semicolons and decimal commas', () => {
    const csv =
      'Nome;Larghezza;Altezza;Spessore;Saga;Anno\n"Zombicide: Black Plague";30,5;30,5;9,5;Zombicide;2015\nAzul;26.5;26.5;7.5;;2017'
    expect(parseCsv(csv)).toEqual([
      {
        name: 'Zombicide: Black Plague',
        dims: { width: 30.5, height: 30.5, depth: 9.5 },
        saga: 'Zombicide',
        year: 2015,
        orientation: 'inherit',
      },
      { name: 'Azul', dims: { width: 26.5, height: 26.5, depth: 7.5 }, saga: undefined, year: 2017, orientation: 'inherit' },
    ])
  })

  it('keeps games without a valid size and fails without a name column', () => {
    const rows = parseCsv('name,width,height,depth\nGood,1,2,3\nNo size,0,2,3')
    expect(rows.map((r) => r.dims)).toEqual([{ width: 1, height: 2, depth: 3 }, undefined])
    expect(() => parseCsv('title2,width\nA,1')).toThrow(/name/)
  })

  it('reads a BoardGameGeek collection export', () => {
    const csv = [
      'objectname,objectid,rating,own,itemtype,yearpublished,year,version_publishers,version_nickname',
      '"Azul","230802","0","1","standalone","2018","","Ghenos Games","Italian edition"',
      '"Root: Kit del Vagabondo","309977","0","1","expansion","2020","","Leder Games; MS Edizioni",""',
      '"Wishlist only","1","0","0","standalone","2020","","",""',
    ].join('\n')
    expect(parseCsv(csv)).toEqual([
      {
        name: 'Azul',
        bggId: 230802,
        year: 2018,
        expansion: false,
        version: 'Italian edition · Ghenos Games',
        publisher: 'Ghenos Games',
        orientation: 'inherit',
      },
      {
        name: 'Root: Kit del Vagabondo',
        bggId: 309977,
        year: 2020,
        expansion: true,
        version: 'Leder Games; MS Edizioni',
        publisher: 'Leder Games; MS Edizioni',
        orientation: 'inherit',
      },
    ])
  })
})

describe('mergeGames', () => {
  let n = 0
  const id = () => `new${++n}`

  it('updates existing games without losing manual data', () => {
    const existing = [
      {
        id: 'a',
        name: 'Azul',
        bggId: 230802,
        dims: { width: 26, height: 26, depth: 7 },
        orientation: 'vertical' as const,
        createdAt: 1,
      },
      { id: 'b', name: 'Catan', orientation: 'inherit' as const, createdAt: 2 },
    ]
    const result = mergeGames(
      existing,
      [
        { name: 'Azul (IT)', bggId: 230802, year: 2018, orientation: 'inherit' },
        { name: 'catan', dims: { width: 29, height: 29, depth: 7 }, orientation: 'inherit' },
        { name: 'Root', bggId: 237182, orientation: 'inherit' },
      ],
      id,
      100,
    )
    expect(result.added).toBe(1)
    expect(result.updated).toBe(2)
    // Azul keeps its manual size and Catan gets one: only the new Root lacks a size.
    expect(result.missing).toBe(1)
    expect(result.games[0]).toMatchObject({ name: 'Azul', year: 2018, orientation: 'vertical', dims: { width: 26 } })
    expect(result.games[1]!.dims).toEqual({ width: 29, height: 29, depth: 7 })
    expect(result.games[2]).toMatchObject({ id: 'new1', name: 'Root', bggId: 237182, createdAt: 102 })
  })
})

describe('mergeGames and sizes typed by hand', () => {
  it('never overwrites sizes typed by hand, but updates imported ones', () => {
    const existing = [
      {
        id: 'a',
        name: 'A',
        bggId: 1,
        dims: { width: 30, height: 30, depth: 7 },
        dimsSource: 'manual' as const,
        orientation: 'inherit' as const,
        createdAt: 1,
      },
      {
        id: 'b',
        name: 'B',
        bggId: 2,
        dims: { width: 20, height: 20, depth: 5 },
        dimsSource: 'import' as const,
        orientation: 'inherit' as const,
        createdAt: 2,
      },
    ]
    const result = mergeGames(
      existing,
      [
        { name: 'A', bggId: 1, dims: { width: 31, height: 31, depth: 8 }, orientation: 'inherit' },
        { name: 'B', bggId: 2, dims: { width: 21, height: 21, depth: 6 }, orientation: 'inherit' },
        { name: 'C', bggId: 3, dims: { width: 10, height: 10, depth: 2 }, orientation: 'inherit' },
      ],
      () => 'c',
      0,
    )
    expect(result.games[0]!.dims).toEqual({ width: 30, height: 30, depth: 7 })
    expect(result.games[1]).toMatchObject({ dims: { width: 21 }, dimsSource: 'import' })
    expect(result.games[2]).toMatchObject({ dimsSource: 'import' })
    expect(result.keptManual).toBe(1)
  })
})

describe('backup', () => {
  it('round-trips', () => {
    const data = {
      games: [{ id: 'a', name: 'A', dims: { width: 1, height: 2, depth: 3 }, orientation: 'inherit' as const, createdAt: 1 }],
      units: [{ id: 'u', name: 'U', columns: 2, rows: 2, color: '#fff' }],
      cube: KALLAX_CUBE,
      options: DEFAULT_OPTIONS,
    }
    expect(parseBackup(JSON.stringify(createBackup(data)))).toMatchObject(data)
  })

  it('rejects foreign files', () => {
    expect(() => parseBackup('{"games": []}')).toThrow(/format/)
  })
})
