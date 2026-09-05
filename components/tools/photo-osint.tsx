'use client'

import exifr from 'exifr'
import { useRef, useState } from 'react'
import type { PushTargets } from '@/lib/types'
import {
  Console,
  ErrorLine,
  Hint,
  KV,
  Line,
  PanelHeader,
  Pill,
} from '@/components/terminal/primitives'

type Meta = {
  name: string
  sizeKb: number
  type: string
  gps: { lat: number; lng: number } | null
  tags: Record<string, string>
}

function fmt(v: unknown): string | null {
  if (v == null) return null
  if (v instanceof Date) return v.toISOString().replace('T', ' ').slice(0, 19)
  if (Array.isArray(v)) return v.join(', ')
  if (typeof v === 'number') return String(Math.round(v * 1000) / 1000)
  const s = String(v).trim()
  return s.length ? s : null
}

const INTERESTING: [string, string][] = [
  ['Make', 'camera make'],
  ['Model', 'camera model'],
  ['LensModel', 'lens'],
  ['DateTimeOriginal', 'taken'],
  ['CreateDate', 'created'],
  ['Software', 'software'],
  ['ExposureTime', 'exposure'],
  ['FNumber', 'aperture'],
  ['ISO', 'iso'],
  ['FocalLength', 'focal len'],
  ['ExifImageWidth', 'width'],
  ['ExifImageHeight', 'height'],
  ['Orientation', 'orientation'],
  ['Artist', 'artist'],
  ['Copyright', 'copyright'],
]

export function PhotoOsint({ onTargets }: { onTargets: PushTargets }) {
  const [meta, setMeta] = useState<Meta | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    setLoading(true)
    setError(null)
    setMeta(null)
    setPreview(URL.createObjectURL(file))
    try {
      const raw = (await exifr.parse(file, { gps: true }).catch(() => null)) as
        | Record<string, unknown>
        | null
      const gps = await exifr.gps(file).catch(() => null)

      const tags: Record<string, string> = {}
      for (const [key, label] of INTERESTING) {
        const val = fmt(raw?.[key])
        if (val) tags[label] = val
      }

      const parsed: Meta = {
        name: file.name,
        sizeKb: Math.round(file.size / 102.4) / 10,
        type: file.type || 'unknown',
        gps: gps && gps.latitude != null ? { lat: gps.latitude, lng: gps.longitude } : null,
        tags,
      }
      setMeta(parsed)

      if (parsed.gps) {
        onTargets([
          {
            id: `photo:${file.name}:${parsed.gps.lat}`,
            label: file.name,
            lat: parsed.gps.lat,
            lng: parsed.gps.lng,
            kind: 'photo',
            detail: `EXIF GPS · ${parsed.gps.lat.toFixed(4)}, ${parsed.gps.lng.toFixed(4)}`,
          },
        ])
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'could not parse image')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col">
      <PanelHeader
        index="02"
        title="Photo OSINT"
        desc="Extract EXIF metadata, camera fingerprint and hidden GPS coordinates from an image — parsed locally in your browser."
      />
      <div className="flex flex-col gap-4 p-4">
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault()
            const f = e.dataTransfer.files?.[0]
            if (f) handleFile(f)
          }}
          className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-sm border border-dashed border-primary/40 bg-background/40 px-4 py-8 text-center transition-colors hover:border-primary hover:bg-primary/5"
        >
          <span className="text-2xl text-primary">[ + ]</span>
          <span className="text-sm text-foreground">drop image or click to load</span>
          <Hint>jpg / png / tiff / heic — never uploaded, parsed on-device</Hint>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) handleFile(f)
            }}
          />
        </div>

        {loading && <Line tone="dim">parsing metadata…</Line>}

        {error && (
          <Console>
            <ErrorLine>{error}</ErrorLine>
          </Console>
        )}

        {meta && (
          <div className="flex gap-3">
            {preview && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={preview || '/placeholder.svg'}
                alt="loaded target"
                className="h-24 w-24 shrink-0 rounded-sm border border-border object-cover"
              />
            )}
            <Console className="flex-1">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <Pill tone="accent">{meta.type}</Pill>
                <Pill tone="dim">{meta.sizeKb} KB</Pill>
                {meta.gps ? (
                  <Pill tone="bad">GPS exposed</Pill>
                ) : (
                  <Pill tone="ok">no GPS</Pill>
                )}
              </div>
              <div className="flex flex-col gap-1">
                <KV k="file" v={meta.name} />
                {meta.gps && (
                  <KV
                    k="gps"
                    v={
                      <a
                        href={`https://www.google.com/maps?q=${meta.gps.lat},${meta.gps.lng}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-accent hover:underline"
                      >
                        {meta.gps.lat.toFixed(5)}, {meta.gps.lng.toFixed(5)} → maps
                      </a>
                    }
                  />
                )}
                {Object.entries(meta.tags).map(([k, v]) => (
                  <KV key={k} k={k} v={v} />
                ))}
                {Object.keys(meta.tags).length === 0 && !meta.gps && (
                  <Line tone="dim">
                    no EXIF metadata found — likely stripped by a social platform
                  </Line>
                )}
              </div>
            </Console>
          </div>
        )}
      </div>
    </div>
  )
}
