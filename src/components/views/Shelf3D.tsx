import { ContactShadows, OrbitControls } from '@react-three/drei'
import { Canvas, useThree, type ThreeEvent } from '@react-three/fiber'
import { useEffect, useMemo, useState } from 'react'
import * as THREE from 'three'
import { contrastText } from '../../domain/color'
import { LINE_HEIGHT } from '../../domain/label'
import { cellAt, unitGeometry, unitOffsets, type UnitCell } from '../../domain/geometry'
import { isBlocked } from '../../domain/kallax'
import { TOP_HEIGHT } from '../../domain/packer'
import type { Game, Placement, ShelfUnit, Zone } from '../../domain/types'
import { zoneRuns, type ZoneRun } from '../../domain/zones'
import { useBoxColor } from '../../hooks/useBoxColor'
import { useGamesById, useLayout } from '../../hooks/useLayout'
import { useZonesById } from '../../hooks/useZones'
import { useT } from '../../i18n'
import { useAppStore } from '../../store/appStore'
import { fitBoxLabel, LABEL_FONT, LABEL_WEIGHT } from '../boxLabel'
import { zoneName } from '../labels'

/*
 * Scene units are centimetres. The shelves stand on y = 0 with their front
 * face on z = 0; the viewer looks towards -z.
 */

function Panel({ position, size, color }: { position: [number, number, number]; size: [number, number, number]; color: string }) {
  return (
    <mesh position={position} castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} roughness={0.55} metalness={0.02} />
    </mesh>
  )
}

/** Procedural frame of a unit built from its panels. */
function UnitFrame({ unit }: { unit: ShelfUnit }) {
  const { panels, cells, depth } = unitGeometry(unit)
  const z = -depth / 2
  return (
    <group>
      {panels.map((p, i) => (
        <Panel
          key={i}
          position={[p.x + p.width / 2, p.y + p.height / 2, z]}
          size={[p.width, p.height, depth]}
          color={unit.color}
        />
      ))}
      {cells
        .filter((c) => isBlocked(unit, c.column, c.row))
        .map((c) => (
          <DrawerInsert key={`${c.column}:${c.row}`} cell={c} color={unit.color} />
        ))}
    </group>
  )
}

/** A cube taken by an insert, shown as two drawers. */
function DrawerInsert({ cell, color }: { cell: UnitCell; color: string }) {
  const { width, height, depth } = cell.size
  const h = height / 2
  const front = useMemo(() => new THREE.Color(color).multiplyScalar(0.92), [color])
  return (
    <group position={[cell.x + width / 2, cell.y, 0]}>
      {[0, 1].map((i) => (
        <group key={i} position={[0, i * h + h / 2, 0]}>
          <mesh position={[0, 0, -depth / 2]} castShadow receiveShadow>
            <boxGeometry args={[width - 0.4, h - 0.4, depth]} />
            <meshStandardMaterial color={front} roughness={0.6} />
          </mesh>
          <mesh position={[0, 0, 0.6]}>
            <boxGeometry args={[Math.min(8, width / 3), 1, 1.2]} />
            <meshStandardMaterial color="#9aa0a6" metalness={0.6} roughness={0.35} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

const PX_PER_CM = 14
const STRIP_PX_PER_CM = 24

/** Back of a cube reserved to a zone, tinted with the zone colour. */
function ZoneBack({ unit, cell, zone }: { unit: ShelfUnit; cell: UnitCell; zone: Zone }) {
  const color = useMemo(() => new THREE.Color(unit.color).lerp(new THREE.Color(zone.color), 0.6), [unit.color, zone.color])
  return (
    <mesh
      position={[cell.x + cell.size.width / 2, cell.y + cell.size.height / 2, -unitGeometry(unit).depth + 0.05]}
      receiveShadow
    >
      <planeGeometry args={[cell.size.width, cell.size.height]} />
      <meshStandardMaterial color={color} roughness={0.8} />
    </mesh>
  )
}

/** Label of a zone on the front edge of the panel under its cubes, like a label-maker strip. */
function ZoneStrip({ run, zone }: { run: ZoneRun; zone: Zone }) {
  const t = useT()
  const text = zoneName(t, zone)
  const height = Math.min(run.below, 2)
  const width = run.width
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(width * STRIP_PX_PER_CM)
    canvas.height = Math.round(height * STRIP_PX_PER_CM)
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = zone.color
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = contrastText(zone.color)
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = `${LABEL_WEIGHT} ${canvas.height * 0.7}px ${LABEL_FONT}`
    ctx.fillText(text, canvas.width / 2, canvas.height / 2, canvas.width * 0.95)
    const tex = new THREE.CanvasTexture(canvas)
    tex.colorSpace = THREE.SRGBColorSpace
    tex.anisotropy = 4
    return tex
  }, [text, zone.color, width, height])
  useEffect(() => () => texture.dispose(), [texture])
  return (
    <mesh position={[run.x + width / 2, run.y - run.below / 2, 0.03]}>
      <planeGeometry args={[width, height]} />
      <meshStandardMaterial map={texture} roughness={0.5} />
    </mesh>
  )
}

/** Draws the visible face of a box: background colour and title. */
function useLabelTexture(name: string, color: string, faceW: number, faceH: number, vertical: boolean) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(16, Math.round(faceW * PX_PER_CM))
    canvas.height = Math.max(16, Math.round(faceH * PX_PER_CM))
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = color
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    // Subtle edge shading for a cardboard look.
    const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height)
    grad.addColorStop(0, 'rgba(255,255,255,.10)')
    grad.addColorStop(1, 'rgba(0,0,0,.18)')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    const along = vertical ? faceH : faceW
    const across = vertical ? faceW : faceH
    const label = fitBoxLabel(name, { width: along * 0.9, height: across, maxFont: 2.6, minFont: 8 / PX_PER_CM })
    if (label) {
      const fontSize = label.fontSize * PX_PER_CM
      ctx.save()
      ctx.translate(canvas.width / 2, canvas.height / 2)
      if (vertical) ctx.rotate(-Math.PI / 2)
      ctx.fillStyle = contrastText(color)
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.font = `${LABEL_WEIGHT} ${fontSize}px ${LABEL_FONT}`
      const first = -((label.lines.length - 1) / 2) * LINE_HEIGHT * fontSize
      label.lines.forEach((line, i) => ctx.fillText(line, 0, first + i * LINE_HEIGHT * fontSize))
      ctx.restore()
    }

    const tex = new THREE.CanvasTexture(canvas)
    tex.colorSpace = THREE.SRGBColorSpace
    tex.anisotropy = 4
    return tex
  }, [name, color, faceW, faceH, vertical])
  useEffect(() => () => texture.dispose(), [texture])
  return texture
}

function GameBox({
  game,
  color,
  p,
  origin,
  selected,
  onSelect,
  onHover,
}: {
  game: Game
  color: string
  p: Placement
  origin: { x: number; y: number }
  selected: boolean
  onSelect: () => void
  onHover: (hovered: boolean) => void
}) {
  const vertical = p.orientation === 'vertical'
  const texture = useLabelTexture(game.name, color, p.sx, p.sy, vertical)
  const side = useMemo(() => new THREE.Color(color).multiplyScalar(0.8), [color])
  const emissive = selected ? '#f59e3c' : '#000000'

  // boxGeometry material order: +x, -x, +y, -y, +z (front), -z.
  return (
    <mesh
      position={[origin.x + p.x + p.sx / 2, origin.y + p.y + p.sy / 2, -(p.z + p.sz / 2)]}
      castShadow
      receiveShadow
      onClick={(e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation()
        onSelect()
      }}
      onPointerOver={(e) => {
        e.stopPropagation()
        onHover(true)
      }}
      onPointerOut={() => onHover(false)}
    >
      <boxGeometry args={[p.sx, p.sy, p.sz]} />
      {[0, 1, 2, 3].map((i) => (
        <meshStandardMaterial
          key={i}
          attach={`material-${i}`}
          color={side}
          roughness={0.7}
          emissive={emissive}
          emissiveIntensity={0.25}
        />
      ))}
      <meshStandardMaterial attach="material-4" map={texture} roughness={0.6} emissive={emissive} emissiveIntensity={0.25} />
      <meshStandardMaterial attach="material-5" color={side} roughness={0.7} />
    </mesh>
  )
}

const CAMERA_FOV = 40

/**
 * Places the camera so that the whole scene fits the canvas, whatever its
 * proportions: a portrait phone needs to step back much more than a monitor.
 */
function FitCamera({
  center,
  width,
  height,
  depth,
}: {
  center: [number, number, number]
  width: number
  height: number
  depth: number
}) {
  const camera = useThree((s) => s.camera)
  const size = useThree((s) => s.size)
  const [cx, cy, cz] = center
  useEffect(() => {
    const tan = Math.tan(((CAMERA_FOV / 2) * Math.PI) / 180)
    const aspect = size.width / Math.max(1, size.height)
    const fit = Math.max(height / 2 / tan, width / 2 / (tan * aspect))
    const distance = fit * 1.15 + depth
    camera.position.set(cx + distance * 0.2, cy + distance * 0.1, distance)
    camera.lookAt(cx, cy, cz)
  }, [camera, size.width, size.height, cx, cy, cz, width, height, depth])
  return null
}

export function Shelf3D() {
  const units = useAppStore((s) => s.units)
  const selectedId = useAppStore((s) => s.selectedId)
  const select = useAppStore((s) => s.select)
  const layout = useLayout()
  const games = useGamesById()
  const boxColor = useBoxColor()
  const zonesById = useZonesById()
  const runs = zoneRuns(layout.cubes, units)
  const [hovered, setHovered] = useState<string | null>(null)

  const offsets = useMemo(() => unitOffsets(units), [units])
  const sizes = units.map(unitGeometry)
  const totalWidth = offsets.length ? offsets[offsets.length - 1]! + sizes[sizes.length - 1]!.width : 0
  const maxHeight = Math.max(...sizes.map((s) => s.height))
  const maxDepth = Math.max(...sizes.map((s) => s.depth))
  const center: [number, number, number] = [totalWidth / 2, maxHeight / 2, -maxDepth / 2]
  // Boxes stored on top make the scene taller.
  const sceneHeight = maxHeight + (layout.tops.length > 0 ? TOP_HEIGHT : 0)
  const unitIndex = new Map(units.map((u, i) => [u.id, i]))

  useEffect(() => {
    document.body.style.cursor = hovered ? 'pointer' : ''
    return () => {
      document.body.style.cursor = ''
    }
  }, [hovered])

  const hoveredGame = hovered ? games.get(hovered) : undefined

  return (
    <div className="relative h-full w-full">
      <Canvas shadows dpr={[1, 2]} camera={{ fov: CAMERA_FOV, near: 1, far: 5000 }} onPointerMissed={() => select(null)}>
        <color
          attach="background"
          args={[getComputedStyle(document.documentElement).getPropertyValue('--stage').trim() || '#12151b']}
        />
        <hemisphereLight args={['#ffffff', '#8a7f72', 0.9]} />
        <directionalLight
          position={[center[0] + 120, maxHeight + 160, 220]}
          intensity={1.6}
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-camera-left={-totalWidth}
          shadow-camera-right={totalWidth}
          shadow-camera-top={maxHeight * 1.5}
          shadow-camera-bottom={-maxHeight}
          shadow-bias={-0.0005}
        />
        <directionalLight position={[center[0] - 200, maxHeight, 150]} intensity={0.35} />

        {units.map((unit, i) => (
          <group key={unit.id} position={[offsets[i]!, 0, 0]}>
            <UnitFrame unit={unit} />
            {layout.cubes.map((c) => {
              const zone = c.zoneId && c.unitId === unit.id ? zonesById.get(c.zoneId) : undefined
              const cell = zone && cellAt(sizes[i]!, c.column, c.row)
              return zone && cell ? <ZoneBack key={c.index} unit={unit} cell={cell} zone={zone} /> : null
            })}
            {runs.map((run) => {
              const zone = run.unitId === unit.id ? zonesById.get(run.zoneId) : undefined
              return zone ? <ZoneStrip key={`${run.x}:${run.y}`} run={run} zone={zone} /> : null
            })}
          </group>
        ))}

        {layout.cubes.map((c) => {
          const ui = unitIndex.get(c.unitId)
          if (ui === undefined) return null
          const cell = cellAt(sizes[ui]!, c.column, c.row)
          if (!cell) return null
          const origin = { x: offsets[ui]! + cell.x, y: cell.y }
          return c.placements.map((p) => {
            const game = games.get(p.gameId)
            return game ? (
              <GameBox
                key={p.gameId}
                game={game}
                color={boxColor(game)}
                p={p}
                origin={origin}
                selected={p.gameId === selectedId}
                onSelect={() => select(p.gameId)}
                onHover={(h) => setHovered((cur) => (h ? p.gameId : cur === p.gameId ? null : cur))}
              />
            ) : null
          })
        })}

        {layout.tops.map((top) => {
          const ui = unitIndex.get(top.unitId)
          if (ui === undefined) return null
          const origin = { x: offsets[ui]!, y: sizes[ui]!.top.y }
          return top.placements.map((p) => {
            const game = games.get(p.gameId)
            return game ? (
              <GameBox
                key={p.gameId}
                game={game}
                color={boxColor(game)}
                p={p}
                origin={origin}
                selected={p.gameId === selectedId}
                onSelect={() => select(p.gameId)}
                onHover={(h) => setHovered((cur) => (h ? p.gameId : cur === p.gameId ? null : cur))}
              />
            ) : null
          })
        })}

        <ContactShadows
          position={[center[0], 0, center[2]]}
          scale={Math.max(totalWidth, 100) * 1.6}
          opacity={0.45}
          blur={2.4}
          far={60}
        />
        <FitCamera center={center} width={totalWidth} height={sceneHeight} depth={maxDepth} />
        <OrbitControls
          target={center}
          enableDamping
          minDistance={40}
          maxDistance={3000}
          maxPolarAngle={Math.PI / 2 - 0.02}
          makeDefault
        />
      </Canvas>
      {hoveredGame && (
        <div className="pointer-events-none absolute top-4 left-1/2 -translate-x-1/2 rounded-full bg-surface-0/90 px-4 py-1.5 text-sm font-medium shadow-lg backdrop-blur">
          {hoveredGame.name}
        </div>
      )}
    </div>
  )
}
