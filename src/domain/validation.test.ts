import { describe, expect, it } from 'vitest'
import { validateGame } from './validation'

const base = { name: 'Azul', dims: {} }

describe('validateGame', () => {
  it('accepts any decimal value', () => {
    expect(
      validateGame({ ...base, dims: { width: 30.7, height: 30.7, depth: 7.3 }, complexity: 2.26, rating: 7.3 }),
    ).toBeUndefined()
  })

  it('reports the real problems', () => {
    expect(validateGame({ ...base, name: ' ' })).toBe('name')
    expect(validateGame({ ...base, dims: { width: 30, height: 30 } })).toBe('dims')
    expect(validateGame({ ...base, dims: { width: 30, height: 30, depth: 0 } })).toBe('dims')
    expect(validateGame({ ...base, minPlayers: 5, maxPlayers: 2 })).toBe('players')
    expect(validateGame({ ...base, complexity: 6 })).toBe('complexity')
    expect(validateGame({ ...base, rating: 0.5 })).toBe('rating')
    expect(validateGame({ ...base, year: 2018.5 })).toBe('year')
    expect(validateGame({ ...base, plays: 1.5 })).toBe('plays')
    expect(validateGame({ ...base, plays: 0 })).toBeUndefined()
  })
})
