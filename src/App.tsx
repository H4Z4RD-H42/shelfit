import { Box, LayoutGrid, Library, List, Printer, Rows3, Settings2 } from 'lucide-react'
import { Suspense, lazy, type ReactNode } from 'react'
import { GameDetails } from './components/GameDetails'
import { LensButton, LensPanel } from './components/LensPanel'
import { Logo } from './components/Logo'
import { CollectionPanel } from './components/panels/CollectionPanel'
import { OptionsPanel } from './components/panels/OptionsPanel'
import { ShelvesPanel } from './components/panels/ShelvesPanel'
import { PrintSheet } from './components/PrintSheet'
import { StatsBar } from './components/StatsBar'
import { cx } from './components/styles'
import { Button } from './components/ui'
import { FrontView } from './components/views/FrontView'
import { ListView } from './components/views/ListView'
import { APP_NAME, APP_VERSION } from './config'
import { useIsDesktop } from './hooks/useMediaQuery'
import { useT } from './i18n'
import { useAppStore, type PanelTab, type ViewMode } from './store/appStore'

// three.js is heavy: load the 3D view on demand.
const Shelf3D = lazy(() => import('./components/views/Shelf3D').then((m) => ({ default: m.Shelf3D })))

const PANEL_ICONS: Record<PanelTab, ReactNode> = {
  collection: <Library className="size-4" />,
  shelves: <Rows3 className="size-4" />,
  options: <Settings2 className="size-4" />,
}
const PANELS: PanelTab[] = ['collection', 'shelves', 'options']

function PanelContent() {
  const panel = useAppStore((s) => s.panel)
  return (
    <div className="min-h-0 flex-1">
      {panel === 'collection' && <CollectionPanel />}
      {panel === 'shelves' && <ShelvesPanel />}
      {panel === 'options' && <OptionsPanel />}
    </div>
  )
}

function Footer() {
  const t = useT()
  return (
    <footer className="space-y-0.5 border-t border-line px-5 py-3 text-[10px] leading-snug text-ink-faint">
      <p>{t('footer.trademark')}</p>
      <p>
        v{APP_VERSION} · {t('app.workInProgress')}
      </p>
    </footer>
  )
}

function ViewSwitcher() {
  const t = useT()
  const view = useAppStore((s) => s.view)
  const setView = useAppStore((s) => s.setView)
  const views: { id: ViewMode; label: string; icon: ReactNode }[] = [
    { id: '3d', label: t('view.3d'), icon: <Box className="size-4" /> },
    { id: 'front', label: t('view.front'), icon: <LayoutGrid className="size-4" /> },
    { id: 'list', label: t('view.list'), icon: <List className="size-4" /> },
  ]
  return (
    <div className="flex rounded-lg border border-line bg-surface-2 p-0.5">
      {views.map((v) => (
        <button
          key={v.id}
          type="button"
          onClick={() => setView(v.id)}
          title={v.label}
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
  )
}

function ToolbarActions() {
  const t = useT()
  const language = useAppStore((s) => s.language)
  const setLanguage = useAppStore((s) => s.setLanguage)
  return (
    <>
      <Button variant="ghost" className="px-2 py-1 text-xs" onClick={() => window.print()} title={t('print.button')}>
        <Printer className="size-4" />
        <span className="hidden sm:inline">{t('print.button')}</span>
      </Button>
      <Button variant="ghost" className="px-2 py-1 text-xs" onClick={() => setLanguage(language === 'it' ? 'en' : 'it')}>
        {t('lang.switch')}
      </Button>
    </>
  )
}

/** The shelves drawn in the chosen view, with the details of the selected game. */
function ShelfStage() {
  const view = useAppStore((s) => s.view)
  const isDesktop = useIsDesktop()
  return (
    <div className="relative min-h-0 flex-1 bg-stage">
      {view === '3d' && (
        <Suspense fallback={null}>
          <Shelf3D />
        </Suspense>
      )}
      {view === 'front' && <FrontView />}
      {view === 'list' && <ListView />}
      <GameDetails />
      <LensButton />
      {isDesktop && <LensPanel />}
    </div>
  )
}

function DesktopLayout() {
  const t = useT()
  const panel = useAppStore((s) => s.panel)
  const setPanel = useAppStore((s) => s.setPanel)
  return (
    <div className="flex h-full">
      <aside className="flex w-[22rem] flex-none flex-col border-r border-line bg-surface-0 lg:w-[24rem]">
        <header className="flex items-center gap-3 px-5 pt-5 pb-3">
          <Logo className="size-9" />
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-lg leading-tight font-bold">{APP_NAME}</h1>
            <p className="truncate text-xs text-ink-soft">{t('app.tagline')}</p>
          </div>
        </header>
        <nav className="flex border-b border-line">
          {PANELS.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setPanel(id)}
              className={cx(
                'flex flex-1 items-center justify-center gap-2 border-b-2 px-3 py-3 text-sm font-medium transition-colors',
                panel === id ? 'border-accent text-ink' : 'border-transparent text-ink-soft hover:text-ink',
              )}
            >
              {PANEL_ICONS[id]}
              {t(`tab.${id}`)}
            </button>
          ))}
        </nav>
        <PanelContent />
        <Footer />
      </aside>

      <main className="relative flex min-h-0 flex-1 flex-col">
        <div className="flex flex-wrap items-center gap-3 border-b border-line bg-surface-0/60 px-4 py-2.5 backdrop-blur">
          <ViewSwitcher />
          <div className="hidden flex-1 lg:block">
            <StatsBar />
          </div>
          <span className="flex-1 lg:hidden" />
          <ToolbarActions />
        </div>
        <div className="border-b border-line px-4 py-2 lg:hidden">
          <StatsBar />
        </div>
        <ShelfStage />
      </main>
    </div>
  )
}

/**
 * Phones get one full-screen page at a time, chosen from a bottom navigation
 * bar, instead of a cramped split between the shelves and the panels.
 */
function MobileLayout() {
  const t = useT()
  const screen = useAppStore((s) => s.mobileScreen)
  const panel = useAppStore((s) => s.panel)
  const { showShelf, setPanel } = useAppStore.getState()
  const onShelf = screen === 'shelf'

  const tabs: { id: string; label: string; icon: ReactNode; active: boolean; onClick: () => void }[] = [
    { id: 'shelf', label: t('tab.shelf'), icon: <Box className="size-5" />, active: onShelf, onClick: showShelf },
    ...PANELS.map((id) => ({
      id,
      label: t(`tab.${id}`),
      icon: PANEL_ICONS[id],
      active: !onShelf && panel === id,
      onClick: () => setPanel(id),
    })),
  ]

  return (
    <div className="flex h-dvh flex-col">
      <header className="flex items-center gap-2 border-b border-line bg-surface-0 px-3 py-2">
        <Logo className="size-7 shrink-0" />
        {onShelf ? <ViewSwitcher /> : <h1 className="font-display text-base font-bold">{t(`tab.${panel}`)}</h1>}
        <span className="flex-1" />
        <ToolbarActions />
      </header>

      {onShelf ? (
        <main className="relative flex min-h-0 flex-1 flex-col">
          <div className="border-b border-line bg-surface-0 px-3 py-2">
            <StatsBar />
          </div>
          <ShelfStage />
          <LensPanel docked />
        </main>
      ) : (
        <section className="flex min-h-0 flex-1 flex-col bg-surface-0">
          <PanelContent />
        </section>
      )}

      <nav className="flex border-t border-line bg-surface-0 pb-[env(safe-area-inset-bottom)]">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={tab.onClick}
            aria-current={tab.active ? 'page' : undefined}
            className={cx(
              'flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition-colors [&_svg]:size-5',
              tab.active ? 'text-accent' : 'text-ink-soft',
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </nav>
    </div>
  )
}

export default function App() {
  const isDesktop = useIsDesktop()
  return (
    <>
      {isDesktop ? <DesktopLayout /> : <MobileLayout />}
      <PrintSheet />
    </>
  )
}
