import type { Game } from '../domain/types'

type Sample = [
  name: string,
  width: number,
  height: number,
  depth: number,
  year: number,
  genre: string,
  designer: string,
  players: [min: number, max: number],
  playTime: number,
  complexity: number,
]

/** Demo collection. Box sizes and game data are indicative and rounded. */
const SAMPLES: Sample[] = [
  ['Zombicide', 30, 30, 9.5, 2012, 'Cooperative', 'Raphaël Guiton', [1, 6], 60, 2.4],
  ['Zombicide: Season 2 – Prison Outbreak', 30, 30, 9.5, 2013, 'Cooperative', 'Raphaël Guiton', [1, 6], 60, 2.5],
  ['Zombicide: Black Plague', 30.5, 30.5, 9.5, 2015, 'Cooperative', 'Raphaël Guiton', [1, 6], 60, 2.5],
  ['Zombicide: Green Horde', 30.5, 30.5, 9.5, 2018, 'Cooperative', 'Raphaël Guiton', [1, 6], 60, 2.6],
  ['Zombicide: Invader', 30.5, 30.5, 10, 2019, 'Cooperative', 'Raphaël Guiton', [1, 6], 60, 2.6],
  ['Zombicide 2nd Edition', 30.5, 30.5, 11, 2020, 'Cooperative', 'Raphaël Guiton', [1, 6], 60, 2.4],
  ['Catan', 29.5, 29.5, 7, 1995, 'Family', 'Klaus Teuber', [3, 4], 90, 2.3],
  ['Catan: Seafarers', 29.5, 29.5, 7, 1997, 'Family', 'Klaus Teuber', [3, 4], 90, 2.5],
  ['Ticket to Ride', 30, 30, 7.5, 2004, 'Family', 'Alan R. Moon', [2, 5], 60, 1.8],
  ['Ticket to Ride: Europe', 30, 30, 7.5, 2005, 'Family', 'Alan R. Moon', [2, 5], 60, 1.9],
  ['Pandemic', 30, 22.5, 5.5, 2008, 'Cooperative', 'Matt Leacock', [2, 4], 45, 2.4],
  ['Pandemic Legacy: Season 1', 30, 30, 7.5, 2015, 'Cooperative', 'Rob Daviau', [2, 4], 60, 2.8],
  ['Pandemic Legacy: Season 2', 30, 30, 7.5, 2017, 'Cooperative', 'Rob Daviau', [2, 4], 60, 3.3],
  ['Wingspan', 29.5, 29.5, 7.5, 2019, 'Strategy', 'Elizabeth Hargrave', [1, 5], 70, 2.5],
  ['Terraforming Mars', 29.5, 29.5, 7.5, 2016, 'Strategy', 'Jacob Fryxelius', [1, 5], 120, 3.3],
  ['Azul', 26.5, 26.5, 7.5, 2017, 'Abstract', 'Michael Kiesling', [2, 4], 45, 1.8],
  ['Splendor', 23, 23, 7, 2014, 'Family', 'Marc André', [2, 4], 30, 1.8],
  ['7 Wonders', 30, 30, 9, 2010, 'Strategy', 'Antoine Bauza', [2, 7], 30, 2.3],
  ['Carcassonne', 28, 28, 7, 2000, 'Family', 'Klaus-Jürgen Wrede', [2, 5], 45, 1.9],
  ['Codenames', 22.5, 16, 5.5, 2015, 'Party', 'Vlaada Chvátil', [2, 8], 15, 1.3],
  ['Dixit', 27.5, 27.5, 7, 2008, 'Party', 'Jean-Louis Roubira', [3, 6], 30, 1.2],
  ['Spirit Island', 30.5, 30.5, 10, 2017, 'Cooperative', 'R. Eric Reuss', [1, 4], 120, 4.1],
  ['Scythe', 30, 30, 9.5, 2016, 'Strategy', 'Jamey Stegmaier', [1, 5], 115, 3.4],
  ['Dune: Imperium', 30, 30, 7, 2020, 'Strategy', 'Paul Dennen', [1, 4], 120, 3.0],
  ['Everdell', 30, 30, 10, 2018, 'Strategy', 'James A. Wilson', [1, 4], 80, 2.8],
  ['Cascadia', 27, 27, 7, 2021, 'Family', 'Randy Flynn', [1, 4], 45, 1.9],
  ['Gloomhaven', 41.5, 30, 19, 2017, 'Dungeon crawler', 'Isaac Childres', [1, 4], 120, 3.9],
  ['Exploding Kittens', 15.5, 10.5, 4, 2015, 'Party', 'Elan Lee', [2, 5], 15, 1.1],
  ['Love Letter', 15, 10, 2.5, 2012, 'Card game', 'Seiji Kanai', [2, 4], 20, 1.2],
  ['Hanabi', 12, 12, 4, 2010, 'Cooperative', 'Antoine Bauza', [2, 5], 25, 1.7],
  ['The Crew', 13.5, 9.5, 2.5, 2019, 'Card game', 'Thomas Sing', [2, 5], 20, 2.0],
]

export function sampleCollection(makeId: () => string): Game[] {
  const now = Date.now()
  return SAMPLES.map(
    ([name, width, height, depth, year, genre, designer, [minPlayers, maxPlayers], playTime, complexity], i) => ({
      id: makeId(),
      name,
      dims: { width, height, depth },
      year,
      genre,
      designer,
      minPlayers,
      maxPlayers,
      playTime,
      complexity,
      orientation: 'inherit',
      createdAt: now + i,
    }),
  )
}
