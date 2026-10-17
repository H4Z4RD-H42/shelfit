import { Box, LayoutGrid, List, Settings2, Library, Rows3 } from 'lucide-react'
import { Suspense, lazy, type ReactNode } from 'react'
import { GameDetails } from './components/GameDetails'
import { Logo } from './components/Logo'
import { CollectionPanel } from './components/panels/CollectionPanel'
import { OptionsPanel } from './components/panels/OptionsPanel'
import { ShelvesPanel } from './components/panels/ShelvesPanel'
import { StatsBar } from './components/StatsBar'
import { Button } from './components/ui'
import { cx } from './components/styles'
import { FrontView } from './components/views/FrontView'
import { ListView } from './components/views/ListView'
import { APP_NAME, APP_VERSION } from './config'
import { useT } from './i18n'
import { useAppStore, type PanelTab, type ViewMode } from './store/appStore'

// three.js is heavy: load the 3D view on demand.
const Shelf3D = lazy(() => import('./components/views/Shelf3D').then((m) => ({ default: m.Shelf3D })))

function TabButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean
  onClick: () => void
  icon: ReactNode
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        'flex flex-1 items-center justify-center gap-2 border-b-2 px-3 py-3 text-sm font-medium transition-colors',
        active ? 'border-accent text-ink' : 'border-transparent text-ink-soft hover:text-ink',
      )}
    >
      {icon}
      {children}
    </button>
  )
}

export default function App() {
  const t = useT()
  const view = useAppStore((s) => s.view)
  const panel = useAppStore((s) => s.panel)
  const language = useAppStore((s) => s.language)
  const { setView, setPanel, setLanguage } = useAppStore.getState()

  const views: { id: ViewMode; label: string; icon: ReactNode }[] = [
    { id: '3d', label: t('view.3d'), icon: <Box className="size-4" /> },
    { id: 'front', label: t('view.front'), icon: <LayoutGrid className="size-4" /> },
    { id: 'list', label: t('view.list'), icon: <List className="size-4" /> },
  ]
  const panels: { id: PanelTab; label: string; icon: ReactNode }[] = [
    { id: 'collection', label: t('tab.collection'), icon: <Library className="size-4" /> },
    { id: 'shelves', label: t('tab.shelves'), icon: <Rows3 className="size-4" /> },
    { id: 'options', label: t('tab.options'), icon: <Settings2 className="size-4" /> },
  ]

  return (
    <div className="flex h-full flex-col md:flex-row">
      <aside className="order-2 flex min-h-0 flex-1 flex-col border-line bg-surface-0 md:order-1 md:w-[22rem] md:flex-none md:border-r lg:w-[24rem]">
        <header className="hidden items-center gap-3 px-5 pt-5 pb-3 md:flex">
          <Logo className="size-9" />
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-lg leading-tight font-bold">{APP_NAME}</h1>
            <p className="truncate text-xs text-ink-soft">{t('app.tagline')}</p>
          </div>
        </header>
        <nav className="flex border-b border-line">
          {panels.map((p) => (
            <TabButton key={p.id} active={panel === p.id} onClick={() => setPanel(p.id)} icon={p.icon}>
              {p.label}
            </TabButton>
          ))}
        </nav>
        <div className="min-h-0 flex-1">
          {panel === 'collection' && <CollectionPanel />}
          {panel === 'shelves' && <ShelvesPanel />}
          {panel === 'options' && <OptionsPanel />}
        </div>
        <footer className="space-y-0.5 border-t border-line px-5 py-3 text-[10px] leading-snug text-ink-faint">
          <p>{t('footer.trademark')}</p>
          <p>
            v{APP_VERSION} · {t('app.workInProgress')}
          </p>
        </footer>
      </aside>

      <main className="relative order-1 flex h-[55vh] min-h-0 flex-col md:order-2 md:h-auto md:flex-1">
        <div className="flex flex-wrap items-center gap-3 border-b border-line bg-surface-0/60 px-4 py-2.5 backdrop-blur">
          <Logo className="size-7 md:hidden" />
          <div className="flex rounded-lg border border-line bg-surface-2 p-0.5">
            {views.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setView(v.id)}
                className={cx(
                  'flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-all',
                  view === v.id ? 'bg-surface-0 text-ink shadow-sm' : 'text-ink-soft hover:text-ink',
                )}
              >
                {v.icon}
                <span className="hidden sm:inline">{v.label}</span>
              </button>
            ))}
          </div>
          <div className="hidden flex-1 lg:block">
            <StatsBar />
          </div>
          <span className="flex-1 lg:hidden" />
          <Button variant="ghost" className="px-2 py-1 text-xs" onClick={() => setLanguage(language === 'it' ? 'en' : 'it')}>
            {t('lang.switch')}
          </Button>
        </div>
        <div className="border-b border-line px-4 py-2 lg:hidden">
          <StatsBar />
        </div>
        <div className="relative min-h-0 flex-1 bg-stage">
          {view === '3d' && (
            <Suspense fallback={null}>
              <Shelf3D />
            </Suspense>
          )}
          {view === 'front' && <FrontView />}
          {view === 'list' && <ListView />}
          <GameDetails />
        </div>
      </main>
    </div>
  )
}
