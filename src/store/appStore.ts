import { del, get, set } from 'idb-keyval'
import { nanoid } from 'nanoid'
import { create } from 'zustand'
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware'
import { sampleCollection } from '../data/sampleCollection'
import { mergeGames, type ImportedGame } from '../domain/backup'
import { DEFAULT_OPTIONS, normalizeOptions } from '../domain/defaults'
import { KALLAX_CUBE, KALLAX_FINISHES } from '../domain/kallax'
import type { CubeSize, Game, PackOptions, ShelfUnit } from '../domain/types'
import { detectLanguage, type Language } from '../i18n/language'

export type ViewMode = '3d' | 'front' | 'list'
export type PanelTab = 'collection' | 'shelves' | 'options'
export type ColorBy = 'game' | 'group'

export interface AppState {
  games: Game[]
  units: ShelfUnit[]
  cube: CubeSize
  options: PackOptions
  language: Language
  view: ViewMode
  panel: PanelTab
  colorBy: ColorBy
  selectedId: string | null
  /** Game open in the editor: an id, `new`, or nothing. */
  editing: string | null

  addGame: (game: Omit<Game, 'id' | 'createdAt'>) => void
  updateGame: (id: string, patch: Partial<Omit<Game, 'id'>>) => void
  removeGame: (id: string) => void
  /** Merges imported games into the collection. */
  importGames: (games: ImportedGame[]) => { added: number; updated: number; missing: number }
  loadSample: () => void
  clearGames: () => void

  addUnit: () => void
  updateUnit: (id: string, patch: Partial<Omit<ShelfUnit, 'id'>>) => void
  removeUnit: (id: string) => void
  setCube: (cube: CubeSize) => void

  setOptions: (patch: Partial<PackOptions>) => void
  resetOptions: () => void
  setLanguage: (language: Language) => void
  setView: (view: ViewMode) => void
  setColorBy: (colorBy: ColorBy) => void
  setPanel: (panel: PanelTab) => void
  select: (id: string | null) => void
  edit: (id: string | null) => void
  restore: (data: Pick<AppState, 'games' | 'units' | 'cube' | 'options'>) => void
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
      language: detectLanguage(),
      view: '3d',
      colorBy: 'game',
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
        return { added: result.added, updated: result.updated, missing: result.missing }
      },
      loadSample: () => setState((s) => ({ games: [...s.games, ...sampleCollection(nanoid)] })),
      clearGames: () => setState({ games: [], selectedId: null }),

      addUnit: () => setState((s) => ({ units: [...s.units, newUnit(s.units.length + 1)] })),
      updateUnit: (id, patch) => setState((s) => ({ units: s.units.map((u) => (u.id === id ? { ...u, ...patch } : u)) })),
      removeUnit: (id) => setState((s) => ({ units: s.units.length > 1 ? s.units.filter((u) => u.id !== id) : s.units })),
      setCube: (cube) => setState({ cube }),

      setOptions: (patch) => setState((s) => ({ options: { ...s.options, ...patch } })),
      resetOptions: () => setState({ options: DEFAULT_OPTIONS }),
      setLanguage: (language) => setState({ language }),
      setView: (view) => setState({ view }),
      setColorBy: (colorBy) => setState({ colorBy }),
      setPanel: (panel) => setState({ panel }),
      select: (selectedId) => setState({ selectedId }),
      edit: (editing) => setState(editing ? { editing, panel: 'collection' } : { editing }),
      restore: ({ games, units, cube, options }) =>
        setState({ games, units, cube, options: normalizeOptions(options), selectedId: null }),
    }),
    {
      name: 'shelf-planner',
      version: 1,
      storage: createJSONStorage(() => idbStorage),
      partialize: (s) => ({
        games: s.games,
        units: s.units,
        cube: s.cube,
        options: s.options,
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
