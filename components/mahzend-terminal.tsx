'use client'

import { useCallback, useEffect, useState } from 'react'
import type { GeoTarget, ToolId } from '@/lib/types'
import { BootScreen } from '@/components/boot-screen'
import { GlobeView } from '@/components/globe-view'
import { CipherLab } from '@/components/tools/cipher-lab'
import { HostRecon } from '@/components/tools/host-recon'
import { IdentityOsint } from '@/components/tools/identity-osint'
import { PhotoOsint } from '@/components/tools/photo-osint'
import { PortScan } from '@/components/tools/port-scan'
import { cn } from '@/lib/utils'

const MENU: { id: ToolId; index: string; label: string; sub: string }[] = [
  { id: 'scan', index: '01', label: 'Port Scan', sub: 'tcp connect' },
  { id: 'photo', index: '02', label: 'Photo OSINT', sub: 'exif / gps' },
  { id: 'identity', index: '03', label: 'Identity', sub: 'user / email' },
  { id: 'recon', index: '04', label: 'Host Recon', sub: 'dns / whois' },
  { id: 'globe', index: '05', label: 'Recon Globe', sub: '3d map' },
  { id: 'cipher', index: '06', label: 'Cipher Lab', sub: 'encode / hash' },
]

function Clock() {
  const [time, setTime] = useState('--:--:--')
  useEffect(() => {
    const tick = () =>
      setTime(
        new Date().toLocaleTimeString('en-GB', { hour12: false, timeZone: 'UTC' }),
      )
    tick()
    const i = setInterval(tick, 1000)
    return () => clearInterval(i)
  }, [])
  return <span>{time} UTC</span>
}

export function MahzendTerminal() {
  const [booted, setBooted] = useState(false)
  const [active, setActive] = useState<ToolId>('scan')
  const [targets, setTargets] = useState<GeoTarget[]>([])

  const pushTargets = useCallback((incoming: GeoTarget[]) => {
    setTargets((prev) => {
      const map = new Map(prev.map((t) => [t.id, t]))
      for (const t of incoming) map.set(t.id, t)
      return Array.from(map.values())
    })
  }, [])

  const clearTargets = useCallback(() => setTargets([]), [])

  return (
    <>
      {!booted && <BootScreen onDone={() => setBooted(true)} />}

      <div className="scanlines relative mx-auto flex min-h-screen max-w-7xl flex-col animate-flicker">
        {/* header */}
        <header className="flex flex-col gap-3 border-b border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-sm border border-primary/60 bg-primary/10 text-primary text-glow">
              M
            </div>
            <div>
              <h1 className="text-sm font-bold uppercase tracking-[0.25em] text-primary text-glow">
                Mahzend_ogg
              </h1>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                osint // recon terminal
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-[10px] uppercase tracking-widest text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-primary animate-blink" />
              online
            </span>
            <span>runtime: nodejs</span>
            <span>{targets.length} pins</span>
            <Clock />
          </div>
        </header>

        {/* body */}
        <div className="flex flex-1 flex-col lg:flex-row">
          {/* nav */}
          <nav className="flex gap-2 overflow-x-auto border-b border-border p-3 lg:w-56 lg:shrink-0 lg:flex-col lg:overflow-visible lg:border-b-0 lg:border-r">
            {MENU.map((m) => (
              <button
                key={m.id}
                onClick={() => setActive(m.id)}
                className={cn(
                  'group flex shrink-0 items-center gap-3 rounded-sm border px-3 py-2 text-left transition-colors lg:w-full',
                  active === m.id
                    ? 'border-primary/60 bg-primary/10 text-primary box-glow'
                    : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground',
                )}
              >
                <span
                  className={cn(
                    'text-xs',
                    active === m.id ? 'text-accent' : 'text-muted-foreground',
                  )}
                >
                  {m.index}
                </span>
                <span className="flex flex-col">
                  <span className="text-xs font-bold uppercase tracking-wider">
                    {m.label}
                  </span>
                  <span className="text-[10px] normal-case tracking-normal text-muted-foreground">
                    {m.sub}
                  </span>
                </span>
              </button>
            ))}
            <div className="mt-auto hidden px-3 pt-4 lg:block">
              <p className="text-[10px] leading-relaxed text-muted-foreground">
                real keyless intel via rdap, dns-over-https, ipwho.is & public
                platform apis. authorized targets only.
              </p>
            </div>
          </nav>

          {/* main */}
          <main className="min-w-0 flex-1 bg-card/30">
            <div className={active === 'scan' ? 'block' : 'hidden'}>
              <PortScan onTargets={pushTargets} />
            </div>
            <div className={active === 'photo' ? 'block' : 'hidden'}>
              <PhotoOsint onTargets={pushTargets} />
            </div>
            <div className={active === 'identity' ? 'block' : 'hidden'}>
              <IdentityOsint />
            </div>
            <div className={active === 'recon' ? 'block' : 'hidden'}>
              <HostRecon onTargets={pushTargets} />
            </div>
            {/* Globe stays mounted so pins & camera persist between tabs */}
            <div className={active === 'globe' ? 'block' : 'hidden'}>
              <GlobeView targets={targets} onClear={clearTargets} />
            </div>
            <div className={active === 'cipher' ? 'block' : 'hidden'}>
              <CipherLab />
            </div>
          </main>
        </div>

        <footer className="border-t border-border px-4 py-2 text-center text-[10px] uppercase tracking-widest text-muted-foreground">
          mahzend_ogg — for authorized security research & education only
        </footer>
      </div>
    </>
  )
}
