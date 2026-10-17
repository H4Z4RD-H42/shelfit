import { describe, expect, it } from 'vitest'
import { fitLabel, LINE_HEIGHT, type LabelBox } from './label'

// Monospaced approximation: every character is 0.55 font sizes wide.
const measure = (text: string) => text.length * 0.55

const spine = (width: number, height: number): LabelBox => ({ width, height, maxFont: 2.6, minFont: 0.6 })

describe('fitLabel', () => {
  it('keeps short titles on one line', () => {
    expect(fitLabel('Azul', spine(27, 7), measure)).toEqual({ lines: ['Azul'], fontSize: 2.6 })
  })

  it('breaks long titles at a subtitle, writing them larger', () => {
    const label = fitLabel('Black Rose Wars: Rebirth – Apocalypse', spine(27, 7), measure)!
    expect(label.lines).toEqual(['Black Rose Wars:', 'Rebirth – Apocalypse'])
    expect(label.fontSize).toBeGreaterThan(27 / measure('Black Rose Wars: Rebirth – Apocalypse'))
  })

  it('uses no more lines than needed once the text reaches its maximum size', () => {
    expect(fitLabel('Black Rose Wars: Rebirth', spine(27, 14), measure)!.lines).toEqual(['Black Rose Wars:', 'Rebirth'])
  })

  it('drops a dash left at the start or end of a line', () => {
    expect(fitLabel('Galaxy Trucker – Missions', spine(14, 7), measure)!.lines).toEqual(['Galaxy Trucker', 'Missions'])
  })

  it('prefers the break after a colon', () => {
    expect(fitLabel('The Thing: Avamposto Norvegese', spine(27, 7), measure)!.lines).toEqual([
      'The Thing:',
      'Avamposto Norvegese',
    ])
  })

  it('does not leave a short word at the end of a line', () => {
    const lines = fitLabel('La Guerra dell’Anello Seconda Edizione', spine(14, 8), measure)!.lines
    expect(lines.every((l) => !/\b(La|di|of|the)$/.test(l))).toBe(true)
  })

  it('keeps the text block within the thickness of the box', () => {
    const box = spine(12, 3)
    const label = fitLabel('Nemesis: Retaliation – Support Squad Expansion', box, measure)!
    const n = label.lines.length
    expect(label.fontSize * (1 + (n - 1) * LINE_HEIGHT)).toBeLessThanOrEqual(box.height * 0.8 + 1e-9)
    for (const l of label.lines) expect(measure(l) * label.fontSize).toBeLessThanOrEqual(box.width + 1e-9)
  })

  it('truncates at the minimum size when nothing else fits', () => {
    const label = fitLabel('Supercalifragilisticexpialidocious', { width: 5, height: 2, maxFont: 2.6, minFont: 0.8 }, measure)!
    expect(label.fontSize).toBe(0.8)
    expect(label.lines).toHaveLength(1)
    expect(label.lines[0]!.endsWith('…')).toBe(true)
    expect(measure(label.lines[0]!) * 0.8).toBeLessThanOrEqual(5 + 1e-9)
  })

  it('gives up when not even one line fits', () => {
    expect(fitLabel('Root', { width: 10, height: 0.5, maxFont: 2.6, minFont: 0.8 }, measure)).toBeUndefined()
  })
})
