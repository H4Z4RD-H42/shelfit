import type { GroupKey, GroupLevel, PackOptions } from './types'

export const DEFAULT_OPTIONS: PackOptions = {
  orientation: 'auto',
  strategy: 'ordered',
  sortBy: 'name',
  sortDirection: 'asc',
  groupBy: [],
  groupStartsNewCube: false,
  groupSagas: true,
  autoDetectSagas: true,
  keepSagasInCube: true,
  fillGaps: false,
  fillOrder: 'rows',
  clearance: 0.3,
  maxStackHeight: 0,
  overhang: 0,
  oversizedOnTop: false,
  align: 'left',
  longSideFront: false,
}

/** Fills options saved by older versions (missing fields, groupBy as plain keys). */
export function normalizeOptions(options: Partial<PackOptions> | undefined): PackOptions {
  const merged = { ...DEFAULT_OPTIONS, ...options }
  const levels = (merged.groupBy as (GroupLevel | GroupKey)[]).map((g): GroupLevel =>
    typeof g === 'string' ? { key: g, direction: 'asc' } : g,
  )
  return { ...merged, groupBy: levels }
}
