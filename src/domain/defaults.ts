import type { GroupKey, GroupLevel, OverhangSide, PackOptions, ShelfUnit } from './types'

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
  keepSagasInLine: false,
  fillGaps: false,
  fillOrder: 'rows',
  clearance: 0.3,
  maxStackHeight: 0,
  align: 'left',
  longSideFront: false,
}

/** Options of the whole collection that became settings of each unit in 0.13. */
export interface LegacySpaceOptions {
  overhang?: number
  overhangSide?: OverhangSide
  oversizedOnTop?: boolean
}

/** Gives every unit the overhang and top settings that older versions kept in the options. */
export function migrateUnits(units: ShelfUnit[], legacy: LegacySpaceOptions | undefined): ShelfUnit[] {
  if (!legacy) return units
  return units.map((u) => ({
    ...u,
    overhang: u.overhang ?? legacy.overhang ?? 0,
    overhangSide: u.overhangSide ?? legacy.overhangSide ?? 'front',
    topFree: u.topFree ?? legacy.oversizedOnTop ?? true,
  }))
}

/** Fills options saved by older versions (missing fields, groupBy as plain keys). */
export function normalizeOptions(options: Partial<PackOptions> | undefined): PackOptions {
  const {
    overhang: _o,
    overhangSide: _s,
    oversizedOnTop: _t,
    ...rest
  } = (options ?? {}) as Partial<PackOptions> & LegacySpaceOptions
  const merged = { ...DEFAULT_OPTIONS, ...rest }
  const levels = (merged.groupBy as (GroupLevel | GroupKey)[]).map((g): GroupLevel =>
    typeof g === 'string' ? { key: g, direction: 'asc' } : g,
  )
  return { ...merged, groupBy: levels }
}
