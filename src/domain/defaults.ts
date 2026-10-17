import type { PackOptions } from './types'

export const DEFAULT_OPTIONS: PackOptions = {
  orientation: 'auto',
  strategy: 'ordered',
  sortBy: 'name',
  sortDirection: 'asc',
  groupSagas: true,
  autoDetectSagas: true,
  keepSagasInCube: true,
  fillGaps: false,
  fillOrder: 'rows',
  clearance: 0.3,
  maxStackHeight: 0,
}
