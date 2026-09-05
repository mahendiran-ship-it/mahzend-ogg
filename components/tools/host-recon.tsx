'use client'

import { useState } from 'react'
import type { PushTargets } from '@/lib/types'
import {
  CommandBar,
  Console,
  ErrorLine,
  KV,
  Line,
  PanelHeader,
  Pill,
} from '@/components/terminal/primitives'

type ReconData = {
  host: string
  targetIsIp: boolean
  dns: Record<string, { type: string; value: string; ttl?: number }[]>
  geo: {
    success: boolean
    ip: string
    city?: string
    region?: string
    country?: string
    countryCode?: string
    isp?: string
    org?: string
    asn?: string
    lat?: number
    lng?: number
  } | null
  rdap: {
    found: boolean
    registrar?: string
    status?: string[]
    events?: { action: string; date: string }[]
    nameservers?: string[]
  }
  fingerprint: {
    reachable: boolean
    scheme?: string
    status?: number
    server?: string
    poweredBy?: string
  }
}

export function HostRecon({ onTargets }: { onTargets: PushTargets }) {
  const [target, setTarget] = useState('vercel.com')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<ReconData | null>(null)

  async function run() {
    setLoading(true)
    setError(null)
    setData(null)
    try {
      const res = await fetch('/api/recon', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ target }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'lookup failed')
      setData(json)
      if (json.geo?.success && json.geo.lat != null) {
        onTargets([
          {
            id: `recon:${json.host}`,
            label: json.host,
            lat: json.geo.lat,
            lng: json.geo.lng,
            kind: 'recon',
            detail: `${json.geo.city ?? '?'}, ${json.geo.country ?? '?'} · ${json.geo.ip}`,
          },
        ])
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'lookup failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col">
      <PanelHeader
        index="04"
        title="Host Recon"
        desc="DNS records, RDAP/WHOIS, HTTP fingerprint and IP geolocation for any domain or address."
      />
      <div className="flex flex-col gap-4 p-4">
        <CommandBar
          label="host"
          value={target}
          onChange={setTarget}
          onSubmit={run}
          loading={loading}
          placeholder="example.com or 8.8.8.8"
          cta="recon"
        />

        {error && (
          <Console>
            <ErrorLine>{error}</ErrorLine>
          </Console>
        )}

        {data && (
          <div className="flex flex-col gap-3">
            <Console>
              <div className="mb-2 flex items-center gap-2">
                <Pill tone="accent">geo</Pill>
                {data.geo?.success ? (
                  <span className="text-primary">located</span>
                ) : (
                  <span className="text-muted-foreground">no geo data</span>
                )}
              </div>
              {data.geo?.success ? (
                <div className="flex flex-col gap-1">
                  <KV k="ip" v={data.geo.ip} />
                  <KV
                    k="location"
                    v={`${data.geo.city ?? '?'}, ${data.geo.region ?? ''} ${data.geo.country ?? ''} (${data.geo.countryCode ?? '?'})`}
                  />
                  <KV k="isp" v={data.geo.isp ?? '—'} />
                  <KV k="org" v={data.geo.org ?? '—'} />
                  <KV k="asn" v={data.geo.asn ?? '—'} />
                  <KV k="coords" v={`${data.geo.lat}, ${data.geo.lng}`} />
                </div>
              ) : (
                <Line tone="dim">could not geolocate the resolved address</Line>
              )}
            </Console>

            <Console>
              <div className="mb-2 flex items-center gap-2">
                <Pill tone="accent">http</Pill>
                {data.fingerprint.reachable ? (
                  <span className="text-primary">
                    {data.fingerprint.scheme?.toUpperCase()} {data.fingerprint.status}
                  </span>
                ) : (
                  <span className="text-muted-foreground">no web server</span>
                )}
              </div>
              {data.fingerprint.reachable && (
                <div className="flex flex-col gap-1">
                  <KV k="server" v={data.fingerprint.server ?? '—'} />
                  <KV k="powered-by" v={data.fingerprint.poweredBy ?? '—'} />
                </div>
              )}
            </Console>

            {!data.targetIsIp && (
              <Console>
                <div className="mb-2 flex items-center gap-2">
                  <Pill tone="accent">dns</Pill>
                  <span className="text-muted-foreground">records</span>
                </div>
                <div className="flex flex-col gap-1">
                  {Object.entries(data.dns).flatMap(([type, recs]) =>
                    recs.map((r, i) => (
                      <Line key={`${type}-${i}`} prefix={type} tone="ok">
                        {r.value}
                        {r.ttl != null && (
                          <span className="ml-2 text-muted-foreground">ttl={r.ttl}</span>
                        )}
                      </Line>
                    )),
                  )}
                  {Object.values(data.dns).every((r) => r.length === 0) && (
                    <Line tone="dim">no records returned</Line>
                  )}
                </div>
              </Console>
            )}

            {data.rdap.found && (
              <Console>
                <div className="mb-2 flex items-center gap-2">
                  <Pill tone="accent">whois</Pill>
                  <span className="text-muted-foreground">rdap</span>
                </div>
                <div className="flex flex-col gap-1">
                  <KV k="registrar" v={data.rdap.registrar ?? '—'} />
                  {data.rdap.events?.map((ev, i) => (
                    <KV key={i} k={ev.action} v={ev.date?.slice(0, 10)} />
                  ))}
                  {data.rdap.nameservers && data.rdap.nameservers.length > 0 && (
                    <KV k="nameservers" v={data.rdap.nameservers.join(', ')} />
                  )}
                  {data.rdap.status && data.rdap.status.length > 0 && (
                    <KV k="status" v={data.rdap.status.join(', ')} />
                  )}
                </div>
              </Console>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
