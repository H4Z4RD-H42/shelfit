import { isBucketKey } from '../domain/grouping'
import type { GroupKey, UnplacedReason, Zone } from '../domain/types'
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

/** Name of a zone: the one given by the user, or the tag, or the name of its rule. */
export function zoneName(t: Translate, zone: Zone): string {
  return zone.name?.trim() || (zone.rule === 'tag' && zone.tag?.trim()) || t(`zones.rule.${zone.rule}`)
}
