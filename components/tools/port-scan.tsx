'use client'

import { useState } from 'react'
import type { PushTargets } from '@/lib/types'
import {
  CommandBar,
  Console,
  ErrorLine,
  Hint,
  KV,
  Line,
  PanelHeader,
  Pill,
} from '@/components/terminal/primitives'

type ScanData = {
  host: string
  ip: string | null
  elapsedMs: number
  scanned: number
  open: number
  results: { port: number; service: string; state: 'open' | 'closed' }[]
  geo: {
    success: boolean
    lat?: number
    lng?: number
    city?: string
    country?: string
    ip: string
  } | null
}

export function PortScan({ onTargets }: { onTargets: PushTargets }) {
  const [target, setTarget] = useState('scanme.nmap.org')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<ScanData | null>(null)

  async function run() {
    setLoading(true)
    setError(null)
    setData(null)
    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ target }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'scan failed')
      setData(json)
      if (json.geo?.success && json.geo.lat != null) {
        onTargets([
          {
            id: `scan:${json.host}`,
            label: json.host,
            lat: json.geo.lat,
            lng: json.geo.lng,
            kind: 'scan',
            detail: `${json.open} open ports · ${json.ip}`,
          },
        ])
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'scan failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col">
      <PanelHeader
        index="01"
        title="Port / Service Scan"
        desc="Real TCP connect scan (nmap -sT equivalent) across 27 common service ports."
      />
      <div className="flex flex-col gap-4 p-4">
        <CommandBar
          label="host"
          value={target}
          onChange={setTarget}
          onSubmit={run}
          loading={loading}
          placeholder="host or ip to scan"
          cta="scan"
        />
        <Hint>
          Authorized targets only. Scan hosts you own or have permission to test.
        </Hint>

        {error && (
          <Console>
            <ErrorLine>{error}</ErrorLine>
          </Console>
        )}

        {data && (
          <Console>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Pill tone="accent">{data.host}</Pill>
              {data.ip && <Pill tone="dim">{data.ip}</Pill>}
              <Pill tone={data.open > 0 ? 'ok' : 'dim'}>{data.open} open</Pill>
              <span className="text-muted-foreground">
                {data.scanned} ports · {data.elapsedMs}ms
              </span>
            </div>
            <div className="mb-1 flex gap-2 border-b border-border pb-1 text-[10px] uppercase tracking-wider text-muted-foreground">
              <span className="w-16">port</span>
              <span className="w-20">state</span>
              <span>service</span>
            </div>
            <div className="flex flex-col gap-0.5">
              {data.results
                .filter((r) => r.state === 'open')
                .map((r) => (
                  <div key={r.port} className="flex gap-2">
                    <span className="w-16 text-primary">{r.port}/tcp</span>
                    <span className="w-20 text-primary">open</span>
                    <span className="text-foreground">{r.service}</span>
                  </div>
                ))}
              {data.open === 0 && (
                <Line tone="dim">no open ports found in scanned range</Line>
              )}
            </div>
            {data.open > 0 && (
              <details className="mt-2">
                <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                  show closed/filtered ({data.scanned - data.open})
                </summary>
                <div className="mt-1 flex flex-col gap-0.5">
                  {data.results
                    .filter((r) => r.state === 'closed')
                    .map((r) => (
                      <div key={r.port} className="flex gap-2 text-muted-foreground">
                        <span className="w-16">{r.port}/tcp</span>
                        <span className="w-20">closed</span>
                        <span>{r.service}</span>
                      </div>
                    ))}
                </div>
              </details>
            )}
            {data.geo?.success && (
              <div className="mt-2 border-t border-border pt-2">
                <KV
                  k="geo"
                  v={`${data.geo.city ?? '?'}, ${data.geo.country ?? '?'} — pinned to globe`}
                />
              </div>
            )}
          </Console>
        )}
      </div>
    </div>
  )
}
