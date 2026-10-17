import { describe, expect, it } from 'vitest'
import { dimsSourceAfterEdit } from './sizes'

const d = (width: number) => ({ width, height: 30, depth: 7 })

describe('dimsSourceAfterEdit', () => {
  it('marks new or changed sizes as manual', () => {
    expect(dimsSourceAfterEdit(undefined, d(30))).toBe('manual')
    expect(dimsSourceAfterEdit({ dims: d(30), dimsSource: 'import' }, d(31))).toBe('manual')
  })

  it('keeps the origin of untouched sizes and clears it when sizes are removed', () => {
    expect(dimsSourceAfterEdit({ dims: d(30), dimsSource: 'import' }, d(30))).toBe('import')
    expect(dimsSourceAfterEdit({ dims: d(30), dimsSource: 'manual' }, undefined)).toBeUndefined()
  })
})
