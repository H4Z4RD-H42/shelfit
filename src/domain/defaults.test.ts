import { describe, expect, it } from 'vitest'
import { DEFAULT_OPTIONS, normalizeOptions } from './defaults'
import type { PackOptions } from './types'

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
})
