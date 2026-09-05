'use client'

import dynamic from 'next/dynamic'
import {
  type ComponentType,
  type Ref,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { MeshPhongMaterial } from 'three'
import useSWR from 'swr'
import type { GlobeMethods, GlobeProps } from 'react-globe.gl'
import type { GeoTarget } from '@/lib/types'
import { PanelHeader } from '@/components/terminal/primitives'
import { cn } from '@/lib/utils'

const Globe = dynamic(() => import('react-globe.gl'), {
  ssr: false,
}) as ComponentType<GlobeProps & { ref?: Ref<GlobeMethods> }>

const KIND_COLOR: Record<GeoTarget['kind'], string> = {
  recon: '#38e0c8',
  scan: '#ff5d6c',
  photo: '#ffca4b',
}

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export function GlobeView({
  targets,
  onClear,
}: {
  targets: GeoTarget[]
  onClear: () => void
}) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const globeRef = useRef<GlobeMethods | null>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const [autoRotate, setAutoRotate] = useState(true)

  const globeMaterial = useMemo(
    () =>
      new MeshPhongMaterial({
        color: '#08120f',
        emissive: '#04140d',
        emissiveIntensity: 0.4,
        shininess: 0.7,
      }),
    [],
  )

  const { data: geo } = useSWR<{ features: object[] }>('/countries.geojson', fetcher)

  useLayoutEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      const r = entries[0].contentRect
      setSize({ w: Math.floor(r.width), h: Math.floor(r.height) })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const onReady = useCallback(() => {
    const g = globeRef.current
    if (!g) return
    const controls = g.controls() as {
      autoRotate: boolean
      autoRotateSpeed: number
      enableZoom: boolean
      minDistance: number
      maxDistance: number
    }
    controls.autoRotate = true
    controls.autoRotateSpeed = 0.35
    controls.enableZoom = true
    g.pointOfView({ lat: 20, lng: 0, altitude: 2.5 })
  }, [])

  useEffect(() => {
    const g = globeRef.current
    if (!g) return
    ;(g.controls() as { autoRotate: boolean }).autoRotate = autoRotate
  }, [autoRotate])

  // Fly to the most recently added target.
  useEffect(() => {
    const g = globeRef.current
    const last = targets[targets.length - 1]
    if (!g || !last) return
    g.pointOfView({ lat: last.lat, lng: last.lng, altitude: 1.6 }, 1400)
  }, [targets])

  const flyTo = useCallback((t: GeoTarget) => {
    globeRef.current?.pointOfView({ lat: t.lat, lng: t.lng, altitude: 1.2 }, 1200)
  }, [])

  const zoom = useCallback((factor: number) => {
    const g = globeRef.current
    if (!g) return
    const pov = g.pointOfView()
    g.pointOfView({ altitude: Math.min(6, Math.max(0.4, (pov.altitude ?? 2.5) * factor)) }, 500)
  }, [])

  const arcs = targets.slice(1).map((t, i) => ({
    startLat: targets[i].lat,
    startLng: targets[i].lng,
    endLat: t.lat,
    endLng: t.lng,
  }))

  return (
    <div className="flex flex-col">
      <PanelHeader
        index="05"
        title="Live Recon Globe"
        desc="Every geolocated target from recon, scans and photo GPS is pinned here. Drag to orbit, scroll to zoom."
      />
      <div className="grid gap-4 p-4 lg:grid-cols-[1fr_260px]">
        <div
          ref={wrapRef}
          className="relative h-[380px] overflow-hidden rounded-sm border border-border bg-[#05080a] box-glow sm:h-[460px]"
        >
          {size.w > 0 && (
            <Globe
              ref={globeRef}
              width={size.w}
              height={size.h}
              onGlobeReady={onReady}
              backgroundColor="rgba(0,0,0,0)"
              showGlobe
              showAtmosphere
              atmosphereColor="#2ee6a6"
              atmosphereAltitude={0.18}
              globeMaterial={globeMaterial}
              hexPolygonsData={geo?.features ?? []}
              hexPolygonResolution={3}
              hexPolygonMargin={0.32}
              hexPolygonUseDots
              hexPolygonColor={() => 'rgba(46, 230, 166, 0.42)'}
              pointsData={targets}
              pointLat="lat"
              pointLng="lng"
              pointColor={(d) => KIND_COLOR[(d as GeoTarget).kind]}
              pointAltitude={0.06}
              pointRadius={0.32}
              pointsMerge={false}
              pointLabel={(d) => {
                const t = d as GeoTarget
                return `<div style="font-family:monospace;background:#0a0f0d;border:1px solid #2ee6a6;padding:6px 8px;border-radius:3px;color:#dfffe9;font-size:11px"><b>${t.label}</b><br/>${t.detail ?? ''}</div>`
              }}
              ringsData={targets}
              ringLat="lat"
              ringLng="lng"
              ringColor={(d: unknown) => () => KIND_COLOR[(d as GeoTarget).kind]}
              ringMaxRadius={3}
              ringPropagationSpeed={1.6}
              ringRepeatPeriod={900}
              arcsData={arcs}
              arcColor={() => ['rgba(56,224,200,0.1)', 'rgba(56,224,200,0.8)']}
              arcDashLength={0.5}
              arcDashGap={0.2}
              arcDashAnimateTime={2200}
              arcStroke={0.4}
            />
          )}

          {/* HUD overlay */}
          <div className="pointer-events-none absolute left-3 top-3 flex flex-col gap-1 text-[10px] uppercase tracking-widest text-primary/80">
            <span className="text-glow">MAHZEND_OGG // ORBITAL RECON</span>
            <span className="text-muted-foreground">{targets.length} targets pinned</span>
          </div>

          {/* controls */}
          <div className="absolute bottom-3 right-3 flex gap-1">
            <GlobeBtn onClick={() => zoom(0.7)}>+</GlobeBtn>
            <GlobeBtn onClick={() => zoom(1.4)}>−</GlobeBtn>
            <GlobeBtn active={autoRotate} onClick={() => setAutoRotate((v) => !v)}>
              ⟳
            </GlobeBtn>
          </div>

          {targets.length === 0 && (
            <div className="pointer-events-none absolute inset-x-0 bottom-4 mx-auto w-max max-w-[90%] rounded-sm border border-border bg-background/80 px-3 py-2 text-center text-xs text-muted-foreground">
              run Host Recon, a Port Scan or load a geotagged photo to plot targets
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
              target log
            </span>
            {targets.length > 0 && (
              <button
                onClick={onClear}
                className="text-[10px] uppercase tracking-wider text-destructive hover:underline"
              >
                clear
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2 text-[10px]">
            <span className="flex items-center gap-1 text-muted-foreground">
              <Dot color={KIND_COLOR.recon} /> recon
            </span>
            <span className="flex items-center gap-1 text-muted-foreground">
              <Dot color={KIND_COLOR.scan} /> scan
            </span>
            <span className="flex items-center gap-1 text-muted-foreground">
              <Dot color={KIND_COLOR.photo} /> photo
            </span>
          </div>
          <div className="flex max-h-[400px] flex-col gap-1 overflow-auto">
            {targets.length === 0 && (
              <p className="text-xs text-muted-foreground">no targets yet</p>
            )}
            {[...targets].reverse().map((t) => (
              <button
                key={t.id}
                onClick={() => flyTo(t)}
                className="flex flex-col items-start gap-0.5 rounded-sm border border-border bg-background/40 px-2 py-1.5 text-left transition-colors hover:border-primary/50"
              >
                <span className="flex items-center gap-1.5 text-xs text-foreground">
                  <Dot color={KIND_COLOR[t.kind]} />
                  <span className="truncate">{t.label}</span>
                </span>
                {t.detail && (
                  <span className="truncate text-[10px] text-muted-foreground">
                    {t.detail}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function GlobeBtn({
  children,
  onClick,
  active,
}: {
  children: React.ReactNode
  onClick: () => void
  active?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex h-8 w-8 items-center justify-center rounded-sm border border-border bg-background/70 text-sm text-primary backdrop-blur transition-colors hover:border-primary hover:bg-primary/10',
        active && 'border-primary bg-primary/15',
      )}
    >
      {children}
    </button>
  )
}

function Dot({ color }: { color: string }) {
  return (
    <span
      className="inline-block h-2 w-2 shrink-0 rounded-full"
      style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}` }}
    />
  )
}
