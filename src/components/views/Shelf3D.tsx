import { ContactShadows, OrbitControls } from '@react-three/drei'
import { Canvas, type ThreeEvent } from '@react-three/fiber'
import { useEffect, useMemo, useState } from 'react'
import * as THREE from 'three'
import { contrastText, gameColor } from '../../domain/color'
import { FRAME, cubeOrigin, unitOffsets, unitOuterSize } from '../../domain/kallax'
import type { CubeSize, Game, Placement, ShelfUnit } from '../../domain/types'
import { useGamesById, useLayout } from '../../hooks/useLayout'
import { useAppStore } from '../../store/appStore'

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

/** Procedural KALLAX frame built from its panels. */
function KallaxFrame({ unit, cube }: { unit: ShelfUnit; cube: CubeSize }) {
  const { width, height, depth } = unitOuterSize(unit, cube)
  const z = -depth / 2
  const panels: { position: [number, number, number]; size: [number, number, number] }[] = [
    { position: [FRAME.outer / 2, height / 2, z], size: [FRAME.outer, height, depth] },
    { position: [width - FRAME.outer / 2, height / 2, z], size: [FRAME.outer, height, depth] },
    { position: [width / 2, FRAME.outer / 2, z], size: [width - 2 * FRAME.outer, FRAME.outer, depth] },
    { position: [width / 2, height - FRAME.outer / 2, z], size: [width - 2 * FRAME.outer, FRAME.outer, depth] },
  ]
  for (let c = 1; c < unit.columns; c++) {
    const x = FRAME.outer + c * cube.width + (c - 0.5) * FRAME.inner
    panels.push({ position: [x, height / 2, z], size: [FRAME.inner, height - 2 * FRAME.outer, depth] })
  }
  for (let r = 1; r < unit.rows; r++) {
    const y = FRAME.outer + r * cube.height + (r - 0.5) * FRAME.inner
    panels.push({ position: [width / 2, y, z], size: [width - 2 * FRAME.outer, FRAME.inner, depth] })
  }
  return (
    <group>
      {panels.map((p, i) => (
        <Panel key={i} {...p} color={unit.color} />
      ))}
    </group>
  )
}

const PX_PER_CM = 14

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

    const along = vertical ? canvas.height : canvas.width
    const across = vertical ? canvas.width : canvas.height
    let fontSize = Math.min(across * 0.5, 2.6 * PX_PER_CM)
    ctx.save()
    ctx.translate(canvas.width / 2, canvas.height / 2)
    if (vertical) ctx.rotate(-Math.PI / 2)
    ctx.fillStyle = contrastText(color)
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    const font = (size: number) => `600 ${size}px "Space Grotesk Variable", "Inter Variable", sans-serif`
    ctx.font = font(fontSize)
    const maxWidth = along * 0.9
    while (fontSize > 8 && ctx.measureText(name).width > maxWidth) {
      fontSize -= 1
      ctx.font = font(fontSize)
    }
    let label = name
    while (label.length > 1 && ctx.measureText(label).width > maxWidth) label = label.slice(0, -2) + '…'
    ctx.fillText(label, 0, 0)
    ctx.restore()

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
  p,
  origin,
  selected,
  onSelect,
  onHover,
}: {
  game: Game
  p: Placement
  origin: { x: number; y: number }
  selected: boolean
  onSelect: () => void
  onHover: (hovered: boolean) => void
}) {
  const color = gameColor(game)
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

export function Shelf3D() {
  const units = useAppStore((s) => s.units)
  const cube = useAppStore((s) => s.cube)
  const selectedId = useAppStore((s) => s.selectedId)
  const select = useAppStore((s) => s.select)
  const layout = useLayout()
  const games = useGamesById()
  const [hovered, setHovered] = useState<string | null>(null)

  const offsets = useMemo(() => unitOffsets(units, cube), [units, cube])
  const sizes = units.map((u) => unitOuterSize(u, cube))
  const totalWidth = offsets.length ? offsets[offsets.length - 1]! + sizes[sizes.length - 1]!.width : 0
  const maxHeight = Math.max(...sizes.map((s) => s.height))
  const center: [number, number, number] = [totalWidth / 2, maxHeight / 2, -FRAME.depth / 2]
  const distance = Math.max(totalWidth, maxHeight) * 1.25 + 60
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
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: [center[0] + distance * 0.25, center[1] + distance * 0.12, distance], fov: 40, near: 1, far: 5000 }}
        onPointerMissed={() => select(null)}
      >
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
            <KallaxFrame unit={unit} cube={cube} />
          </group>
        ))}

        {layout.cubes.map((c) => {
          const ui = unitIndex.get(c.unitId)
          if (ui === undefined) return null
          const o = cubeOrigin(units[ui]!, c.column, c.row, cube)
          const origin = { x: offsets[ui]! + o.x, y: o.y }
          return c.placements.map((p) => {
            const game = games.get(p.gameId)
            return game ? (
              <GameBox
                key={p.gameId}
                game={game}
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
        <OrbitControls
          target={center}
          enableDamping
          minDistance={40}
          maxDistance={distance * 3}
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
