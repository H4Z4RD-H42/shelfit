import { describe, expect, it } from 'vitest'
import { createBackup, parseBackup, parseCsv } from './backup'
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

  it('skips rows without valid sizes and fails without required columns', () => {
    expect(parseCsv('name,width,height,depth\nGood,1,2,3\nBad,0,2,3')).toHaveLength(1)
    expect(() => parseCsv('name,width\nA,1')).toThrow(/height/)
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
