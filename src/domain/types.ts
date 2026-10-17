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

export type DimsSource = 'manual' | 'import'

export interface Game {
  id: string
  name: string
  /** Missing until the user (or a BGG lookup) provides the box size. */
  dims?: BoxDimensions
  /** Where the sizes come from; sizes typed by hand are never overwritten by an import. */
  dimsSource?: DimsSource
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
  /** Logged plays (BGG `numplays`); 0 means never played. */
  plays?: number
  /** Marked for trade or sale in the BGG collection. */
  forTrade?: boolean
  /** BGG categories, e.g. "Party Game" (filled by the BGG API). */
  categories?: string[]
  /** Free labels chosen by the user, used by tag zones. */
  tags?: string[]
  /** Zone choices made by hand: true puts the game in the zone, false keeps it out. */
  zones?: Record<string, boolean>
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

/** Kind of a unit: a KALLAX grid with the standard sizes, or a shelf built column by column. */
export type UnitKind = 'kallax' | 'custom'

/** A column of a custom unit: its interior width and the interior height of each compartment, top to bottom. */
export interface CustomColumn {
  width: number
  cells: number[]
}

/** Shape of a unit built by hand. Columns stand side by side on the floor and may differ in height. */
export interface CustomShape {
  columns: CustomColumn[]
  /** Interior depth of the compartments; the frame is as deep. */
  depth: number
  /** Thickness of the sides, of the top and of the bottom. */
  outer: number
  /** Thickness of the dividers between columns and of the shelves. */
  inner: number
}

export interface ShelfUnit {
  id: string
  name: string
  /** KALLAX when missing. */
  kind?: UnitKind
  /** Grid of a KALLAX unit. */
  columns: number
  rows: number
  /** Shape of a custom unit; kept when the unit goes back to KALLAX. */
  custom?: CustomShape
  /** CSS colour of the frame. */
  color: string
  /** Cubes not available for games (drawers, doors, other uses), as `column:row` keys;
   * in a custom unit `row` counts the compartments of the column from the top. */
  blocked?: string[]
  /** How far (cm) a box deeper than the cubes may stick out of this unit; 0 when missing. */
  overhang?: number
  /** Side deep boxes stick out from: the back needs free room behind the unit. Front when missing. */
  overhangSide?: OverhangSide
  /** False when something else stands on the unit: no games on top of it. */
  topFree?: boolean
}

export type SortKey = 'name' | 'year' | 'size' | 'weight' | 'color' | 'added' | 'complexity' | 'playtime' | 'rating'
export type GroupKey = 'genre' | 'designer' | 'publisher' | 'complexity' | 'players' | 'playtime' | 'language' | 'year'

export interface GroupLevel {
  key: GroupKey
  direction: SortDirection
}

/** Side of the shelf a box deeper than the cube sticks out from. */
export type OverhangSide = 'front' | 'back'

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
  /** Start a saga on the next shelf row (or column) instead of letting it wrap. */
  keepSagasInLine: boolean
  /** In ordered mode, let later games fill leftover gaps of earlier cubes. */
  fillGaps: boolean
  fillOrder: FillOrder
  /** Extra room (cm) added to each box side when checking the fit. */
  clearance: number
  /** Maximum height (cm) of horizontal stacks; 0 means the cube height. */
  maxStackHeight: number
  align: Align
  /** Lying boxes show their long side at the front (otherwise it goes to the back). */
  longSideFront: boolean
}

/** What decides which games belong to a zone. */
export type ZoneRule =
  'small' | 'large' | 'heavy' | 'favorites' | 'solo' | 'duo' | 'children' | 'party' | 'unplayed' | 'forTrade' | 'tag' | 'manual'

/** Where the cubes of a zone are on the shelves. */
export type ZonePlace = 'end' | 'start' | 'bottom' | 'eye' | 'cubes'

/**
 * A part of the shelves reserved to some games (e.g. all the small boxes),
 * taken out of the normal order and given cubes of their own.
 */
export interface Zone {
  id: string
  /** Empty: the default name of the rule. */
  name?: string
  rule: ZoneRule
  /** Label matched by the `tag` rule. */
  tag?: string
  place: ZonePlace
  /** Cubes chosen by hand for the `cubes` place, as `unitId:column:row` keys. */
  cubes?: string[]
  /** Inside the zone: fit as many boxes as possible, or follow the sort order. */
  strategy: Strategy
  /** CSS colour of the zone marks on the shelves. */
  color: string
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
  /** Zone the cube is reserved to. */
  zoneId?: string
}

export type UnplacedReason = 'no-size' | 'too-big' | 'no-space' | 'zone-full'

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
  /** Zone of each game id that belongs to one. */
  zones: Record<string, string>
  zoneStats: Record<string, ZoneStats>
  stats: LayoutStats
}

export interface ZoneStats {
  games: number
  cubes: number
  /** Games of the zone that found no room in its cubes. */
  unplaced: number
}
