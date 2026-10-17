import { fitLabel, type FittedLabel, type LabelBox } from '../domain/label'

export const LABEL_FONT = '"Space Grotesk Variable", "Inter Variable", sans-serif'
export const LABEL_WEIGHT = 600

const SAMPLE_SIZE = 100
const font = `${LABEL_WEIGHT} ${SAMPLE_SIZE}px ${LABEL_FONT}`
const widths = new Map<string, number>()
let ctx: CanvasRenderingContext2D | null | undefined

/** Width of `text` in the box label font at size 1, measured on a canvas. */
function measure(text: string): number {
  const cached = widths.get(text)
  if (cached !== undefined) return cached
  ctx ??= document.createElement('canvas').getContext('2d')
  if (!ctx) return text.length * 0.55
  ctx.font = font
  const width = ctx.measureText(text).width / SAMPLE_SIZE
  // Widths measured with a fallback font would stay wrong once the real one loads.
  if (document.fonts?.check(font)) widths.set(text, width)
  return width
}

/** Lays out a game title on a box face, see `fitLabel`. */
export function fitBoxLabel(name: string, box: LabelBox): FittedLabel | undefined {
  return fitLabel(name, box, measure)
}
