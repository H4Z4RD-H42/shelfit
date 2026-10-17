/** Public BGG page listing the editions of a game, with their box sizes. */
export function bggVersionsUrl(bggId: number): string {
  return `https://boardgamegeek.com/boardgame/${bggId}/versions`
}

export function bggGameUrl(bggId: number): string {
  return `https://boardgamegeek.com/boardgame/${bggId}`
}

const CM_PER_INCH = 2.54

/** BGG lists sizes in inches; round to the millimetre. */
export function inchesToCm(inches: number): number {
  return Math.round(inches * CM_PER_INCH * 10) / 10
}
