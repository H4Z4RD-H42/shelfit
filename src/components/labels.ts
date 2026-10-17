import type { UnplacedReason } from '../domain/types'
import type { MessageKey } from '../i18n'

export const UNPLACED_LABEL: Record<UnplacedReason, MessageKey> = {
  'no-size': 'game.noSize',
  'too-big': 'game.tooBig',
  'no-space': 'game.noSpace',
}
