'use client'

import { useEffect, useState } from 'react'

const LINES = [
  { t: '[boot]', m: 'mahzend_ogg v1.0.0 — osint recon terminal', tone: 'dim' },
  { t: '[ ok ]', m: 'initializing kernel modules ......... 6/6', tone: 'ok' },
  { t: '[ ok ]', m: 'tcp connect scanner ................ ready', tone: 'ok' },
  { t: '[ ok ]', m: 'dns-over-https resolver ............ online', tone: 'ok' },
  { t: '[ ok ]', m: 'rdap / whois channel ............... online', tone: 'ok' },
  { t: '[ ok ]', m: 'geoip triangulation ................ locked', tone: 'ok' },
  { t: '[ ok ]', m: 'orbital globe renderer ............. armed', tone: 'ok' },
  { t: '[ >> ]', m: 'access granted. welcome, operator.', tone: 'accent' },
]

export function BootScreen({ onDone }: { onDone: () => void }) {
  const [visible, setVisible] = useState(0)
  const [fading, setFading] = useState(false)

  useEffect(() => {
    if (visible >= LINES.length) {
      const t = setTimeout(() => setFading(true), 500)
      const d = setTimeout(onDone, 1050)
      return () => {
        clearTimeout(t)
        clearTimeout(d)
      }
    }
    const t = setTimeout(() => setVisible((v) => v + 1), 180)
    return () => clearTimeout(t)
  }, [visible, onDone])

  return (
    <div
      onClick={onDone}
      className={`scanlines fixed inset-0 z-50 flex cursor-pointer flex-col items-center justify-center bg-background transition-opacity duration-500 ${
        fading ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <pre className="mb-6 text-center text-[10px] leading-tight text-primary text-glow sm:text-sm">
        {String.raw`
 __  __   _   _  _ ______ ___  _ ___    ___   ___  ___
|  \/  | /_\ | || |_  / _|| \| |   \  / _ \ / __|/ __|
| |\/| |/ _ \| __ |/ /| _|| .  | |) || (_) | (_ | (_ |
|_|  |_/_/ \_\_||_/___|___||_|\_|___/  \___/ \___|\___|
`}
      </pre>
      <div className="w-full max-w-md px-6 font-mono text-xs sm:text-sm">
        {LINES.slice(0, visible).map((l, i) => (
          <div key={i} className="flex gap-2">
            <span
              className={
                l.tone === 'accent'
                  ? 'text-accent'
                  : l.tone === 'ok'
                    ? 'text-primary'
                    : 'text-muted-foreground'
              }
            >
              {l.t}
            </span>
            <span className="text-foreground">{l.m}</span>
          </div>
        ))}
        {visible < LINES.length && (
          <span className="inline-block h-4 w-2 animate-blink bg-primary align-middle" />
        )}
      </div>
      <p className="mt-8 text-[10px] uppercase tracking-widest text-muted-foreground">
        click to skip
      </p>
    </div>
  )
}
