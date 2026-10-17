import { del, get, set } from 'idb-keyval'
import { nanoid } from 'nanoid'
import { create } from 'zustand'
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware'
import { sampleCollection } from '../data/sampleCollection'
import { mergeGames, type ImportedGame } from '../domain/backup'
import { DEFAULT_OPTIONS, migrateUnits, normalizeOptions, type LegacySpaceOptions } from '../domain/defaults'
import { KALLAX_CUBE, KALLAX_FINISHES } from '../domain/kallax'
import type { CubeSize, Game, PackOptions, ShelfUnit, Zone, ZoneRule } from '../domain/types'
import { newZone } from '../domain/zones'
import { detectLanguage, type Language } from '../i18n/language'

export type ViewMode = '3d' | 'front' | 'list'
export type PanelTab = 'collection' | 'shelves' | 'options'
export type ColorBy = 'game' | 'group'
/** Page shown on phones, where the shelves and the panels do not fit side by side. */
export type MobileScreen = 'shelf' | 'panel'

export interface AppState {
  games: Game[]
  units: ShelfUnit[]
  cube: CubeSize
  options: PackOptions
  zones: Zone[]
  language: Language
  view: ViewMode
  panel: PanelTab
  colorBy: ColorBy
  mobileScreen: MobileScreen
  selectedId: string | null
  /** Game open in the editor: an id, `new`, or nothing. */
  editing: string | null

  addGame: (game: Omit<Game, 'id' | 'createdAt'>) => void
  updateGame: (id: string, patch: Partial<Omit<Game, 'id'>>) => void
  removeGame: (id: string) => void
  /** Merges imported games into the collection. */
  importGames: (games: ImportedGame[]) => { added: number; updated: number; missing: number; keptManual: number }
  loadSample: () => void
  clearGames: () => void

  addUnit: () => void
  updateUnit: (id: string, patch: Partial<Omit<ShelfUnit, 'id'>>) => void
  removeUnit: (id: string) => void
  setCube: (cube: CubeSize) => void

  addZone: (rule?: ZoneRule) => void
  updateZone: (id: string, patch: Partial<Omit<Zone, 'id'>>) => void
  removeZone: (id: string) => void
  /** Moves a zone up (-1) or down (+1) in the list: earlier zones win. */
  moveZone: (id: string, delta: -1 | 1) => void

  setOptions: (patch: Partial<PackOptions>) => void
  resetOptions: () => void
  setLanguage: (language: Language) => void
  setView: (view: ViewMode) => void
  setColorBy: (colorBy: ColorBy) => void
  setPanel: (panel: PanelTab) => void
  showShelf: () => void
  /** Selects a game and shows it on the shelves. */
  locate: (id: string) => void
  select: (id: string | null) => void
  edit: (id: string | null) => void
  restore: (data: Pick<AppState, 'games' | 'units' | 'cube' | 'options'> & { zones?: Zone[] }) => void
}

const idbStorage: StateStorage = {
  getItem: async (name) => (await get<string>(name)) ?? null,
  setItem: (name, value) => set(name, value),
  removeItem: (name) => del(name),
}

const newUnit = (n: number): ShelfUnit => ({
  id: nanoid(),
  name: `KALLAX ${n}`,
  columns: 4,
  rows: 4,
  color: KALLAX_FINISHES[0]!.color,
})

export const useAppStore = create<AppState>()(
  persist(
    (setState, getState) => ({
      games: [],
      units: [newUnit(1)],
      cube: KALLAX_CUBE,
      options: DEFAULT_OPTIONS,
      zones: [],
      language: detectLanguage(),
      view: '3d',
      colorBy: 'game',
      mobileScreen: 'shelf',
      panel: 'collection',
      selectedId: null,
      editing: null,

      addGame: (game) => setState((s) => ({ games: [...s.games, { ...game, id: nanoid(), createdAt: Date.now() }] })),
      updateGame: (id, patch) => setState((s) => ({ games: s.games.map((g) => (g.id === id ? { ...g, ...patch } : g)) })),
      removeGame: (id) =>
        setState((s) => ({ games: s.games.filter((g) => g.id !== id), selectedId: s.selectedId === id ? null : s.selectedId })),
      importGames: (rows) => {
        const result = mergeGames(getState().games, rows, nanoid, Date.now())
        setState({ games: result.games })
        const { added, updated, missing, keptManual } = result
        return { added, updated, missing, keptManual }
      },
      loadSample: () => setState((s) => ({ games: [...s.games, ...sampleCollection(nanoid)] })),
      clearGames: () => setState({ games: [], selectedId: null }),

      addUnit: () => setState((s) => ({ units: [...s.units, newUnit(s.units.length + 1)] })),
      updateUnit: (id, patch) => setState((s) => ({ units: s.units.map((u) => (u.id === id ? { ...u, ...patch } : u)) })),
      removeUnit: (id) => setState((s) => ({ units: s.units.length > 1 ? s.units.filter((u) => u.id !== id) : s.units })),
      setCube: (cube) => setState({ cube }),

      addZone: (rule) => setState((s) => ({ zones: [...s.zones, newZone(nanoid(), s.zones, rule)] })),
      updateZone: (id, patch) => setState((s) => ({ zones: s.zones.map((z) => (z.id === id ? { ...z, ...patch } : z)) })),
      removeZone: (id) =>
        setState((s) => ({
          zones: s.zones.filter((z) => z.id !== id),
          // Forget the choices made by hand for the zone.
          games: s.games.map((g) => {
            if (g.zones?.[id] === undefined) return g
            const { [id]: _, ...rest } = g.zones
            return { ...g, zones: Object.keys(rest).length ? rest : undefined }
          }),
        })),
      moveZone: (id, delta) =>
        setState((s) => {
          const i = s.zones.findIndex((z) => z.id === id)
          const j = i + delta
          if (i < 0 || j < 0 || j >= s.zones.length) return {}
          const zones = s.zones.slice()
          ;[zones[i], zones[j]] = [zones[j]!, zones[i]!]
          return { zones }
        }),

      setOptions: (patch) => setState((s) => ({ options: { ...s.options, ...patch } })),
      resetOptions: () => setState({ options: DEFAULT_OPTIONS }),
      setLanguage: (language) => setState({ language }),
      setView: (view) => setState({ view }),
      setColorBy: (colorBy) => setState({ colorBy }),
      setPanel: (panel) => setState({ panel, mobileScreen: 'panel' }),
      showShelf: () => setState({ mobileScreen: 'shelf' }),
      locate: (selectedId) => setState({ selectedId, mobileScreen: 'shelf' }),
      select: (selectedId) => setState({ selectedId }),
      edit: (editing) => setState(editing ? { editing, panel: 'collection', mobileScreen: 'panel' } : { editing }),
      restore: ({ games, units, cube, options, zones }) =>
        setState({
          games,
          // Backups made before 0.13 keep the overhang and the top in the options.
          units: migrateUnits(units, options as LegacySpaceOptions),
          cube,
          options: normalizeOptions(options),
          zones: zones ?? [],
          selectedId: null,
        }),
    }),
    {
      name: 'shelf-planner',
      version: 3,
      storage: createJSONStorage(() => idbStorage),
      migrate: (persisted, version) => {
        const p = (persisted ?? {}) as Partial<AppState>
        const legacy = p.options as (PackOptions & LegacySpaceOptions) | undefined
        // v2: games that fit in no cube go on top of the shelves by default.
        if (version < 2 && legacy) legacy.oversizedOnTop = true
        // v3: overhang and top became settings of each unit.
        if (version < 3 && p.units) p.units = migrateUnits(p.units, legacy ?? {})
        return p as AppState
      },
      partialize: (s) => ({
        games: s.games,
        units: s.units,
        cube: s.cube,
        options: s.options,
        zones: s.zones,
        language: s.language,
        view: s.view,
        colorBy: s.colorBy,
      }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<AppState>
        return { ...current, ...p, options: normalizeOptions(p.options) }
      },
    },
  ),
)
