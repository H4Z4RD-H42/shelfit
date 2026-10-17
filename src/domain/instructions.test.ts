import { describe, expect, it } from 'vitest'
import { placementSteps } from './instructions'
import type { Placement } from './types'

const p = (gameId: string, column: number, level: number, orientation: Placement['orientation']): Placement => ({
  gameId,
  orientation,
  order: 0,
  column,
  level,
  x: 0,
  y: 0,
  z: 0,
  sx: 1,
  sy: 1,
  sz: 1,
})

describe('placementSteps', () => {
  it('lists columns left to right and stacks from the bottom up', () => {
    const steps = placementSteps([p('top', 1, 1, 'horizontal'), p('book', 0, 0, 'vertical'), p('bottom', 1, 0, 'horizontal')])
    expect(steps).toEqual([
      { kind: 'standing', gameIds: ['book'] },
      { kind: 'stack', gameIds: ['bottom', 'top'] },
    ])
  })
})
