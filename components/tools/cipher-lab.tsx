'use client'

import { useEffect, useState } from 'react'
import { md5 } from '@/lib/md5'
import { PanelHeader, Pill } from '@/components/terminal/primitives'
import { cn } from '@/lib/utils'

type Op = {
  id: string
  label: string
  group: 'encode' | 'decode' | 'hash'
  run: (input: string) => string | Promise<string>
}

const b64encode = (s: string) => btoa(unescape(encodeURIComponent(s)))
const b64decode = (s: string) => decodeURIComponent(escape(atob(s.trim())))
const toHexStr = (s: string) =>
  Array.from(new TextEncoder().encode(s))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join(' ')
const fromHexStr = (s: string) => {
  const bytes = s.trim().split(/\s+/).map((h) => parseInt(h, 16))
  return new TextDecoder().decode(Uint8Array.from(bytes))
}
const rot13 = (s: string) =>
  s.replace(/[a-z]/gi, (c) => {
    const base = c <= 'Z' ? 65 : 97
    return String.fromCharCode(((c.charCodeAt(0) - base + 13) % 26) + base)
  })
const toBinary = (s: string) =>
  Array.from(new TextEncoder().encode(s))
    .map((b) => b.toString(2).padStart(8, '0'))
    .join(' ')
const fromBinary = (s: string) =>
  new TextDecoder().decode(
    Uint8Array.from(s.trim().split(/\s+/).map((b) => parseInt(b, 2))),
  )

async function subtleHash(algo: string, input: string): Promise<string> {
  const buf = await crypto.subtle.digest(algo, new TextEncoder().encode(input))
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

const OPS: Op[] = [
  { id: 'b64e', label: 'Base64 →', group: 'encode', run: b64encode },
  { id: 'hexe', label: 'Hex →', group: 'encode', run: toHexStr },
  { id: 'urle', label: 'URL →', group: 'encode', run: (s) => encodeURIComponent(s) },
  { id: 'bine', label: 'Binary →', group: 'encode', run: toBinary },
  { id: 'rot13', label: 'ROT13', group: 'encode', run: rot13 },
  { id: 'b64d', label: '← Base64', group: 'decode', run: b64decode },
  { id: 'hexd', label: '← Hex', group: 'decode', run: fromHexStr },
  { id: 'urld', label: '← URL', group: 'decode', run: (s) => decodeURIComponent(s) },
  { id: 'bind', label: '← Binary', group: 'decode', run: fromBinary },
  { id: 'md5', label: 'MD5', group: 'hash', run: (s) => md5(s) },
  { id: 'sha1', label: 'SHA-1', group: 'hash', run: (s) => subtleHash('SHA-1', s) },
  { id: 'sha256', label: 'SHA-256', group: 'hash', run: (s) => subtleHash('SHA-256', s) },
  { id: 'sha512', label: 'SHA-512', group: 'hash', run: (s) => subtleHash('SHA-512', s) },
]

const GROUP_LABEL: Record<Op['group'], string> = {
  encode: 'encode',
  decode: 'decode',
  hash: 'digest',
}

export function CipherLab() {
  const [input, setInput] = useState('Mahzend_ogg')
  const [opId, setOpId] = useState('b64e')
  const [output, setOutput] = useState('')
  const [err, setErr] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let cancelled = false
    const op = OPS.find((o) => o.id === opId)!
    Promise.resolve()
      .then(() => op.run(input))
      .then((res) => {
        if (!cancelled) {
          setOutput(res)
          setErr(false)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setOutput('// malformed input for this operation')
          setErr(true)
        }
      })
    return () => {
      cancelled = true
    }
  }, [input, opId])

  async function copy() {
    try {
      await navigator.clipboard.writeText(output)
      setCopied(true)
      setTimeout(() => setCopied(false), 1200)
    } catch {
      /* clipboard blocked */
    }
  }

  return (
    <div className="flex flex-col">
      <PanelHeader
        index="06"
        title="Cipher & Hash Lab"
        desc="Encode, decode and digest text — Base64, Hex, URL, Binary, ROT13 and MD5/SHA. Runs entirely offline."
      />
      <div className="flex flex-col gap-4 p-4">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          spellCheck={false}
          rows={3}
          className="w-full resize-y rounded-sm border border-input bg-background/60 p-3 text-sm text-foreground outline-none focus:border-primary focus:box-glow"
          placeholder="type or paste payload…"
        />

        {(['encode', 'decode', 'hash'] as const).map((group) => (
          <div key={group} className="flex flex-col gap-1.5">
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
              {GROUP_LABEL[group]}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {OPS.filter((o) => o.group === group).map((o) => (
                <button
                  key={o.id}
                  onClick={() => setOpId(o.id)}
                  className={cn(
                    'rounded-sm border px-2.5 py-1 text-xs transition-colors',
                    opId === o.id
                      ? 'border-primary/60 bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground',
                  )}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        ))}

        <div className="rounded-sm border border-border bg-background/40">
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <div className="flex items-center gap-2">
              <Pill tone="accent">{OPS.find((o) => o.id === opId)?.label}</Pill>
              <span className="text-[10px] text-muted-foreground">
                {output.length} chars
              </span>
            </div>
            <button
              onClick={copy}
              className="text-xs text-muted-foreground transition-colors hover:text-primary"
            >
              {copied ? 'copied ✓' : 'copy'}
            </button>
          </div>
          <pre
            className={cn(
              'max-h-48 overflow-auto whitespace-pre-wrap break-all p-3 text-xs',
              err ? 'text-destructive' : 'text-primary',
            )}
          >
            {output || '// output'}
          </pre>
        </div>
      </div>
    </div>
  )
}
