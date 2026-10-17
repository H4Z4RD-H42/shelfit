/*
 * Box labels
 * ----------
 * A title is split into at most a few lines so that it can be written as large
 * as possible on the visible face of a box. Every way of breaking it between
 * words is tried; breaks at a subtitle (after ":" or before a dash) are
 * preferred, breaks right after a short word ("La", "of", "the") avoided.
 */

/** Width of `text` written with a font size of 1. */
export type Measure = (text: string) => number

export interface LabelBox {
  /** Room along the text direction. */
  width: number
  /** Room across the text direction (box thickness). */
  height: number
  maxFont: number
  /** Below this size the text is truncated instead of shrunk further. */
  minFont: number
}

export interface FittedLabel {
  lines: string[]
  fontSize: number
}

/** Distance between two baselines, in font sizes. */
export const LINE_HEIGHT = 1.15
/** Share of the thickness a single line may take. */
const ONE_LINE = 0.5
/** Share of the thickness a block of lines may take. */
const BLOCK = 0.8
const MAX_LINES = 3

const DASH = /^[–—-]$/

const blockHeight = (lines: number) => 1 + (lines - 1) * LINE_HEIGHT

/** Joins words into a line, dropping dashes left dangling at its ends. */
function joinLine(words: string[]): string {
  let start = 0
  let end = words.length
  while (start < end && DASH.test(words[start]!)) start++
  while (end > start && DASH.test(words[end - 1]!)) end--
  return words.slice(start, end).join(' ')
}

/** Preference for breaking a title between `before` and `after`. */
function breakBonus(before: string, after: string): number {
  if (/[:;]$/.test(before) || DASH.test(after) || DASH.test(before)) return 1.15
  if (after.startsWith('(')) return 1.08
  if (before.length <= 3 && /^\p{L}+\.?$/u.test(before)) return 0.85
  return 1
}

/** Every way of choosing up to `max` break positions among `gaps` gaps. */
function* breakings(gaps: number, max: number, from = 0, chosen: number[] = []): Generator<number[]> {
  yield chosen
  if (chosen.length === max) return
  for (let i = from; i < gaps; i++) yield* breakings(gaps, max, i + 1, [...chosen, i])
}

function split(words: string[], breaks: number[]): string[] {
  const lines: string[] = []
  let start = 0
  for (const b of [...breaks, words.length - 1]) {
    lines.push(joinLine(words.slice(start, b + 1)))
    start = b + 1
  }
  return lines
}

function fontFor(lines: string[], box: LabelBox, measure: Measure): number {
  const widest = Math.max(...lines.map(measure))
  const byWidth = widest > 0 ? box.width / widest : box.maxFont
  const room = lines.length === 1 ? box.height * ONE_LINE : box.height * BLOCK
  return Math.min(box.maxFont, byWidth, room / blockHeight(lines.length))
}

/** Shortens `text` with an ellipsis until it is at most `width` wide. */
function truncate(text: string, width: number, measure: Measure): string {
  if (measure(text) <= width) return text
  let t = text
  while (t.length > 1 && measure(t + '…') > width) t = t.slice(0, -1).trimEnd()
  return t + '…'
}

/**
 * Lays out `name` on a face of the given size: picks the line breaks that let
 * the text be largest. Returns undefined when not even one line fits.
 */
export function fitLabel(name: string, box: LabelBox, measure: Measure): FittedLabel | undefined {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0 || box.width <= 0) return undefined

  let best: FittedLabel & { score: number } = { lines: [], fontSize: 0, score: 0 }
  // Largest text overall, used when nothing reaches the minimum size.
  let largest: FittedLabel = { lines: [], fontSize: 0 }
  for (const breaks of breakings(words.length - 1, MAX_LINES - 1)) {
    const lines = split(words, breaks)
    if (lines.some((l) => !l)) continue
    const fontSize = fontFor(lines, box, measure)
    if (fontSize > largest.fontSize) largest = { lines, fontSize }
    if (fontSize < box.minFont) continue
    // Fewer lines read better: they win when the size is the same (e.g. capped).
    let score = fontSize * 0.95 ** breaks.length
    for (const b of breaks) score *= breakBonus(words[b]!, words[b + 1]!)
    // A line made of a single short word looks like a typo.
    if (lines.length > 1 && lines.some((l) => l.length <= 2)) score *= 0.8
    if (score > best.score + 1e-9) best = { lines, fontSize, score }
  }
  if (best.lines.length > 0) return { lines: best.lines, fontSize: best.fontSize }
  if (largest.lines.length === 0) return undefined

  // Too long even when broken: write it at the minimum size, truncated.
  const fontSize = box.minFont
  let count = largest.lines.length
  while (count > 0 && fontSize * blockHeight(count) > box.height * (count === 1 ? ONE_LINE : BLOCK)) count--
  if (count === 0) return undefined
  const kept = largest.lines.slice(0, count)
  if (count < largest.lines.length) kept[count - 1] += ' ' + largest.lines.slice(count).join(' ')
  const width = box.width / fontSize
  return { lines: kept.map((l) => truncate(l, width, measure)), fontSize }
}
