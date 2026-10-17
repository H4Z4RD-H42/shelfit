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
}

export type SortKey = 'name' | 'year' | 'size' | 'weight' | 'color' | 'added'
export type SortDirection = 'asc' | 'desc'
export type Strategy = 'ordered' | 'compact'
export type FillOrder = 'rows' | 'columns'

export interface PackOptions {
  orientation: OrientationMode
  strategy: Strategy
  sortBy: SortKey
  sortDirection: SortDirection
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
}

/** A box placed inside a cube. Coordinates are relative to the cube's
 * bottom-left-front interior corner: x to the right, y up, z towards the back. */
export interface Placement {
  gameId: string
  orientation: Orientation
  /** Position of the game in the packing sequence (reading order). */
  order: number
  x: number
  y: number
  z: number
  /** Extent along x, y and z (actual box size, without clearance). */
  sx: number
  sy: number
  sz: number
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
  unplaced: UnplacedGame[]
  /** Saga name resolved for each game id (explicit or detected). */
  sagas: Record<string, string>
  stats: LayoutStats
}
