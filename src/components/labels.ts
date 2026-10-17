import { isCustom } from '../domain/geometry'
import { isBucketKey } from '../domain/grouping'
import type { GroupKey, ShelfUnit, UnplacedReason, Zone } from '../domain/types'
import type { MessageKey } from '../i18n'

type Translate = (key: MessageKey, params?: Record<string, string | number>) => string

export const UNPLACED_LABEL: Record<UnplacedReason, MessageKey> = {
  'no-size': 'game.noSize',
  'too-big': 'game.tooBig',
  'no-space': 'game.noSpace',
  'zone-full': 'game.zoneFull',
}

/** Human-readable name of a group value. */
export function groupLabel(t: Translate, key: GroupKey, value: string | undefined): string {
  if (value === undefined || value === '') return t('group.unknown')
  if (key === 'year') return t('bucket.decade', { decade: value })
  return isBucketKey(key) ? t(`bucket.${key}.${value}` as MessageKey) : value
}

/** Where a cube is in its unit: row and column of a KALLAX grid, compartment of a column otherwise. */
export function cubePosition(t: Translate, unit: Pick<ShelfUnit, 'kind'> | undefined, column: number, row: number): string {
  return unit && isCustom(unit)
    ? t('list.positionCustom', { column: column + 1, n: row + 1 })
    : t('list.position', { row: row + 1, column: column + 1 })
}

/** Name of a zone: the one given by the user, or the tag, or the name of its rule. */
export function zoneName(t: Translate, zone: Zone): string {
  return zone.name?.trim() || (zone.rule === 'tag' && zone.tag?.trim()) || t(`zones.rule.${zone.rule}`)
}
