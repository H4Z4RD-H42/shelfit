import { isCustom, kallaxShape } from './geometry'
import { KALLAX_CUBE } from './kallax'
import type { CubeSize, GroupKey, GroupLevel, OverhangSide, PackOptions, RuleId, ShelfUnit } from './types'

/**
 * Default order of importance. Every game on the shelves comes first; the
 * last rules are given up first: a game moved into a gap costs less order
 * than a saga split or a box laid differently.
 */
export const RULES: RuleId[] = [
  'allIn',
  'stackHeight',
  'orientation',
  'longSideFront',
  'groupCube',
  'sagaInLine',
  'sagaInCube',
  'strictOrder',
]

/** Keeps the known rules once each; rules missing from an older list go last. */
export function normalizePriorities(list: readonly RuleId[] | undefined): RuleId[] {
  const known = (list ?? []).filter((r, i, all) => RULES.includes(r) && all.indexOf(r) === i)
  return [...known, ...RULES.filter((r) => !known.includes(r))]
}

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
  clearance: 0.5,
  maxStackHeight: 0,
  align: 'left',
  longSideFront: false,
  priorities: RULES,
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

const sameCube = (a: CubeSize, b: CubeSize) => a.width === b.width && a.height === b.height && a.depth === b.depth

/**
 * Before 0.14 one cube size, editable, applied to every unit. KALLAX units now
 * always have the standard sizes, so units with other sizes become custom.
 */
export function migrateCube(units: ShelfUnit[], cube: CubeSize | undefined): ShelfUnit[] {
  if (!cube || sameCube(cube, KALLAX_CUBE)) return units
  return units.map((u) => (isCustom(u) ? u : { ...u, kind: 'custom', custom: kallaxShape(u, cube) }))
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
  return { ...merged, groupBy: levels, priorities: normalizePriorities(merged.priorities) }
}
