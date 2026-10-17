/**
 * Core domain model. All lengths are expressed in centimetres.
 */

/** Global orientation policy for the packer. */
export type OrientationMode = 'auto' | 'vertical' | 'horizontal'

/** Per-game orientation preference; `inherit` defers to the global mode. */
export type GameOrientation = 'inherit' | OrientationMode

/** Physical orientation of a placed box. */
export type Orientation = 'vertical' | 'horizontal'

/** Box dimensions as listed by the publisher/BGG, in any order. */
export interface BoxDimensions {
  width: number
  height: number
  depth: number
}

export interface Game {
  id: string
  name: string
  /** Missing until the user (or a BGG lookup) provides the box size. */
  dims?: BoxDimensions
  /** Explicit saga/series name; overrides auto-detection. */
  saga?: string
  orientation: GameOrientation
  /** Optional custom colour (CSS hex) used for the box rendering. */
  color?: string
  year?: number
  weightKg?: number
  bggId?: number
  /** Edition owned, e.g. "Italian edition · Ghenos Games". */
  version?: string
  expansion?: boolean
  /** Kept off the shelves (e.g. an expansion stored in its base box). */
  excluded?: boolean
  /** Stored on top of the shelves instead of inside a cube. */
  onTop?: boolean
  genre?: string
  /** Designer(s); lists use ";" as separator. */
  designer?: string
  /** Publisher(s) of the owned edition; lists use ";" as separator. */
  publisher?: string
  language?: string
  minPlayers?: number
  maxPlayers?: number
  /** Playing time in minutes. */
  playTime?: number
  /** BGG complexity ("weight"), 1 to 5. */
  complexity?: number
  /** Personal rating, 1 to 10. */
  rating?: number
  imageUrl?: string
  createdAt: number
}

export function hasDims(game: Pick<Game, 'dims'>): game is { dims: BoxDimensions } {
  const d = game.dims
  return !!d && d.width > 0 && d.height > 0 && d.depth > 0
}

/** Interior size of a single cube (compartment). */
export interface CubeSize {
  width: number
  height: number
  depth: number
}

export interface ShelfUnit {
  id: string
  name: string
  columns: number
  rows: number
  /** CSS colour of the frame. */
  color: string
  /** Cubes not available for games (drawers, doors, other uses), as `column:row` keys. */
  blocked?: string[]
}

export type SortKey = 'name' | 'year' | 'size' | 'weight' | 'color' | 'added' | 'complexity' | 'playtime' | 'rating'
export type GroupKey = 'genre' | 'designer' | 'publisher' | 'complexity' | 'players' | 'playtime' | 'language' | 'year'

export interface GroupLevel {
  key: GroupKey
  direction: SortDirection
}

/** Horizontal alignment of the boxes inside a cube and inside each stack. */
export type Align = 'left' | 'center' | 'right'
export type SortDirection = 'asc' | 'desc'
export type Strategy = 'ordered' | 'compact'
export type FillOrder = 'rows' | 'columns'

export interface PackOptions {
  orientation: OrientationMode
  strategy: Strategy
  sortBy: SortKey
  sortDirection: SortDirection
  /** Grouping levels, outermost first (at most two in the UI). */
  groupBy: GroupLevel[]
  /** Start every outermost group in a fresh cube. */
  groupStartsNewCube: boolean
  /** Keep games of the same saga next to each other. */
  groupSagas: boolean
  /** Infer sagas from game names when not set explicitly. */
  autoDetectSagas: boolean
  /** Prefer moving a whole saga to the next cube instead of splitting it. */
  keepSagasInCube: boolean
  /** In ordered mode, let later games fill leftover gaps of earlier cubes. */
  fillGaps: boolean
  fillOrder: FillOrder
  /** Extra room (cm) added to each box side when checking the fit. */
  clearance: number
  /** Maximum height (cm) of horizontal stacks; 0 means the cube height. */
  maxStackHeight: number
  /** How far (cm) a box may stick out of the front of a cube. */
  overhang: number
  /** Put on top of the shelves the games that fit in no cube. */
  oversizedOnTop: boolean
  align: Align
}

/** A box placed inside a cube. Coordinates are relative to the cube's
 * bottom-left-front interior corner: x to the right, y up, z towards the back. */
export interface Placement {
  gameId: string
  orientation: Orientation
  /** Position of the game in the packing sequence (reading order). */
  order: number
  /** Column of the cube the box is in, from the left (0-based). */
  column: number
  /** Position in a stack, from the bottom (0-based); 0 for standing boxes. */
  level: number
  x: number
  y: number
  z: number
  /** Extent along x, y and z (actual box size, without clearance). */
  sx: number
  sy: number
  sz: number
}

/** Boxes lying on the top panel of a unit; y is measured from the top panel. */
export interface TopLayout {
  unitId: string
  placements: Placement[]
}

export interface CubeLayout {
  /** Global index in the cube sequence. */
  index: number
  unitId: string
  column: number
  row: number
  placements: Placement[]
  /** Width (cm) of the cube front consumed by columns. */
  usedWidth: number
}

export type UnplacedReason = 'no-size' | 'too-big' | 'no-space'

export interface UnplacedGame {
  gameId: string
  reason: UnplacedReason
}

export interface LayoutStats {
  totalGames: number
  placedGames: number
  totalCubes: number
  usedCubes: number
  /** Volume of placed boxes / volume of used cubes (0..1). */
  volumeFill: number
}

export interface Layout {
  cubes: CubeLayout[]
  tops: TopLayout[]
  unplaced: UnplacedGame[]
  /** Saga name resolved for each game id (explicit or detected). */
  sagas: Record<string, string>
  /** Outermost group of each game id, when grouping is active. */
  groups: Record<string, string>
  stats: LayoutStats
}
