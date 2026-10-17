import { useCallback } from 'react'
import { autoColor, gameColor } from '../domain/color'
import type { Game } from '../domain/types'
import { useAppStore } from '../store/appStore'
import { useLayout } from './useLayout'
import { useLensPaint } from './useLens'

const UNGROUPED = '#7c818c'
/** Boxes faded out by the filters of the lens. */
export const DIMMED_COLOR = '#80858f'

/** Colour of a box: the map of the lens when one is on, else the "colour by group" preference. */
export function useBoxColor(): (game: Game) => string {
  const colorBy = useAppStore((s) => s.colorBy)
  const grouped = useAppStore((s) => s.options.groupBy.length > 0)
  const { groups } = useLayout()
  const { matches, colors } = useLensPaint()
  return useCallback(
    (game: Game) => {
      if (matches && !matches.has(game.id)) return DIMMED_COLOR
      const heat = colors?.get(game.id)
      if (heat) return heat
      if (colorBy !== 'group' || !grouped) return gameColor(game)
      const group = groups[game.id]
      return group === undefined ? UNGROUPED : autoColor(`group:${group}`)
    },
    [colorBy, grouped, groups, matches, colors],
  )
}
