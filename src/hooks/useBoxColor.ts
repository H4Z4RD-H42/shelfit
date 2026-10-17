import { useCallback } from 'react'
import { autoColor, gameColor } from '../domain/color'
import type { Game } from '../domain/types'
import { useAppStore } from '../store/appStore'
import { useLayout } from './useLayout'

const UNGROUPED = '#7c818c'

/** Colour of a box, following the "colour by group" preference. */
export function useBoxColor(): (game: Game) => string {
  const colorBy = useAppStore((s) => s.colorBy)
  const grouped = useAppStore((s) => s.options.groupBy.length > 0)
  const { groups } = useLayout()
  return useCallback(
    (game: Game) => {
      if (colorBy !== 'group' || !grouped) return gameColor(game)
      const group = groups[game.id]
      return group === undefined ? UNGROUPED : autoColor(`group:${group}`)
    },
    [colorBy, grouped, groups],
  )
}
