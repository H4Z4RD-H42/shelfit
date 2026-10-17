import type { Game } from '../domain/types'

type Sample = [name: string, width: number, height: number, depth: number, year: number]

/** Demo collection. Box sizes are indicative and rounded to the half centimetre. */
const SAMPLES: Sample[] = [
  ['Zombicide', 30, 30, 9.5, 2012],
  ['Zombicide: Season 2 – Prison Outbreak', 30, 30, 9.5, 2013],
  ['Zombicide: Black Plague', 30.5, 30.5, 9.5, 2015],
  ['Zombicide: Green Horde', 30.5, 30.5, 9.5, 2018],
  ['Zombicide: Invader', 30.5, 30.5, 10, 2019],
  ['Zombicide 2nd Edition', 30.5, 30.5, 11, 2020],
  ['Catan', 29.5, 29.5, 7, 1995],
  ['Catan: Seafarers', 29.5, 29.5, 7, 1997],
  ['Ticket to Ride', 30, 30, 7.5, 2004],
  ['Ticket to Ride: Europe', 30, 30, 7.5, 2005],
  ['Pandemic', 30, 22.5, 5.5, 2008],
  ['Pandemic Legacy: Season 1', 30, 30, 7.5, 2015],
  ['Pandemic Legacy: Season 2', 30, 30, 7.5, 2017],
  ['Wingspan', 29.5, 29.5, 7.5, 2019],
  ['Terraforming Mars', 29.5, 29.5, 7.5, 2016],
  ['Azul', 26.5, 26.5, 7.5, 2017],
  ['Splendor', 23, 23, 7, 2014],
  ['7 Wonders', 30, 30, 9, 2010],
  ['Carcassonne', 28, 28, 7, 2000],
  ['Codenames', 22.5, 16, 5.5, 2015],
  ['Dixit', 27.5, 27.5, 7, 2008],
  ['Spirit Island', 30.5, 30.5, 10, 2017],
  ['Scythe', 30, 30, 9.5, 2016],
  ['Dune: Imperium', 30, 30, 7, 2020],
  ['Everdell', 30, 30, 10, 2018],
  ['Cascadia', 27, 27, 7, 2021],
  ['Gloomhaven', 41.5, 30, 19, 2017],
  ['Exploding Kittens', 15.5, 10.5, 4, 2015],
  ['Love Letter', 15, 10, 2.5, 2012],
  ['Hanabi', 12, 12, 4, 2010],
  ['The Crew', 13.5, 9.5, 2.5, 2019],
]

export function sampleCollection(makeId: () => string): Game[] {
  const now = Date.now()
  return SAMPLES.map(([name, width, height, depth, year], i) => ({
    id: makeId(),
    name,
    dims: { width, height, depth },
    year,
    orientation: 'inherit',
    createdAt: now + i,
  }))
}
