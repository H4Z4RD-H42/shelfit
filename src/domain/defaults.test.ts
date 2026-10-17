import { describe, expect, it } from 'vitest'
import { DEFAULT_OPTIONS, migrateUnits, normalizeOptions } from './defaults'
import type { PackOptions, ShelfUnit } from './types'

describe('normalizeOptions', () => {
  it('upgrades options saved by older versions', () => {
    const old = { strategy: 'compact', groupBy: ['publisher'] } as unknown as Partial<PackOptions>
    expect(normalizeOptions(old)).toEqual({
      ...DEFAULT_OPTIONS,
      strategy: 'compact',
      groupBy: [{ key: 'publisher', direction: 'asc' }],
    })
  })

  it('returns the defaults when nothing was saved', () => {
    expect(normalizeOptions(undefined)).toEqual(DEFAULT_OPTIONS)
  })

  it('drops the settings that moved to the units', () => {
    const old = { overhang: 5, overhangSide: 'back', oversizedOnTop: false } as unknown as Partial<PackOptions>
    expect(normalizeOptions(old)).toEqual(DEFAULT_OPTIONS)
  })
})

describe('migrateUnits', () => {
  const unit: ShelfUnit = { id: 'u', name: 'U', columns: 2, rows: 2, color: '#fff' }

  it('gives every unit the overhang and top settings of the old options', () => {
    expect(migrateUnits([unit], { overhang: 5, overhangSide: 'back', oversizedOnTop: false })).toEqual([
      { ...unit, overhang: 5, overhangSide: 'back', topFree: false },
    ])
    expect(migrateUnits([unit], {})).toEqual([{ ...unit, overhang: 0, overhangSide: 'front', topFree: true }])
  })

  it('keeps the settings a unit already has', () => {
    const own: ShelfUnit = { ...unit, overhang: 2, overhangSide: 'front', topFree: true }
    expect(migrateUnits([own], { overhang: 5, overhangSide: 'back', oversizedOnTop: false })).toEqual([own])
  })
})
