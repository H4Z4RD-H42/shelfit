import { isBucketKey } from '../domain/grouping'
import type { GroupKey, UnplacedReason } from '../domain/types'
import type { MessageKey } from '../i18n'

export const UNPLACED_LABEL: Record<UnplacedReason, MessageKey> = {
  'no-size': 'game.noSize',
  'too-big': 'game.tooBig',
  'no-space': 'game.noSpace',
}

/** Human-readable name of a group value. */
export function groupLabel(
  t: (key: MessageKey, params?: Record<string, string | number>) => string,
  key: GroupKey,
  value: string | undefined,
): string {
  if (value === undefined || value === '') return t('group.unknown')
  if (key === 'year') return t('bucket.decade', { decade: value })
  return isBucketKey(key) ? t(`bucket.${key}.${value}` as MessageKey) : value
}
