'use client'

import { useState } from 'react'
import {
  CommandBar,
  Console,
  ErrorLine,
  KV,
  Line,
  PanelHeader,
  Pill,
} from '@/components/terminal/primitives'
import { cn } from '@/lib/utils'

type UserResult = {
  username: string
  found: number
  checked: number
  results: { site: string; url: string; state: 'found' | 'notfound' | 'unknown' }[]
}

type EmailResult = {
  email: string
  domain: string
  provider: string
  deliverable: boolean
  mx: string[]
  gravatar: boolean
  gravatarUrl: string | null
  md5: string
}

export function IdentityOsint() {
  const [mode, setMode] = useState<'username' | 'email'>('username')
  const [value, setValue] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<UserResult | null>(null)
  const [email, setEmail] = useState<EmailResult | null>(null)

  async function run() {
    setLoading(true)
    setError(null)
    setUser(null)
    setEmail(null)
    try {
      if (mode === 'username') {
        const res = await fetch('/api/username', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ username: value }),
        })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error ?? 'lookup failed')
        setUser(json)
      } else {
        const res = await fetch('/api/email', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ email: value }),
        })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error ?? 'lookup failed')
        setEmail(json)
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
        index="03"
        title="Username / Email Intel"
        desc="Enumerate accounts across platforms, or profile an email via MX, provider and Gravatar."
      />
      <div className="flex flex-col gap-4 p-4">
        <div className="flex gap-1">
          {(['username', 'email'] as const).map((m) => (
            <button
              key={m}
              onClick={() => {
                setMode(m)
                setValue('')
                setError(null)
                setUser(null)
                setEmail(null)
              }}
              className={cn(
                'rounded-sm border px-3 py-1 text-xs font-bold uppercase tracking-wider transition-colors',
                mode === m
                  ? 'border-primary/60 bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:text-foreground',
              )}
            >
              {m}
            </button>
          ))}
        </div>

        <CommandBar
          label={mode}
          value={value}
          onChange={setValue}
          onSubmit={run}
          loading={loading}
          placeholder={mode === 'username' ? 'e.g. torvalds' : 'e.g. name@example.com'}
          cta="hunt"
        />

        {error && (
          <Console>
            <ErrorLine>{error}</ErrorLine>
          </Console>
        )}

        {user && (
          <Console>
            <div className="mb-2 flex items-center gap-2">
              <Pill tone="accent">@{user.username}</Pill>
              <Pill tone="ok">{user.found} hits</Pill>
              <span className="text-muted-foreground">{user.checked} platforms</span>
            </div>
            <div className="flex flex-col gap-0.5">
              {user.results.map((r) => (
                <div key={r.site} className="flex items-center gap-2">
                  <span
                    className={cn(
                      'w-24',
                      r.state === 'found'
                        ? 'text-primary'
                        : r.state === 'notfound'
                          ? 'text-muted-foreground'
                          : 'text-[var(--warn)]',
                    )}
                  >
                    {r.site}
                  </span>
                  <span className="w-20">
                    {r.state === 'found' ? (
                      <Pill tone="ok">found</Pill>
                    ) : r.state === 'notfound' ? (
                      <Pill tone="dim">none</Pill>
                    ) : (
                      <Pill tone="warn">unknown</Pill>
                    )}
                  </span>
                  {r.state === 'found' && (
                    <a
                      href={r.url}
                      target="_blank"
                      rel="noreferrer"
                      className="min-w-0 truncate text-accent hover:underline"
                    >
                      {r.url.replace(/^https?:\/\//, '')}
                    </a>
                  )}
                </div>
              ))}
            </div>
            <p className="mt-2 text-[10px] text-muted-foreground">
              &quot;unknown&quot; = platform blocked automated checks; verify manually.
            </p>
          </Console>
        )}

        {email && (
          <Console>
            <div className="mb-2 flex items-center gap-2">
              <Pill tone="accent">{email.email}</Pill>
              {email.deliverable ? (
                <Pill tone="ok">deliverable</Pill>
              ) : (
                <Pill tone="bad">no MX</Pill>
              )}
            </div>
            <div className="flex flex-col gap-1">
              <KV k="provider" v={email.provider} />
              <KV k="domain" v={email.domain} />
              <KV
                k="gravatar"
                v={
                  email.gravatar ? (
                    <span className="flex items-center gap-2">
                      <span className="text-primary">registered</span>
                      {email.gravatarUrl && (
                        <a
                          href={email.gravatarUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-accent hover:underline"
                        >
                          view avatar
                        </a>
                      )}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">none</span>
                  )
                }
              />
              <KV k="md5" v={<span className="break-all">{email.md5}</span>} />
              {email.mx.length > 0 && (
                <div className="mt-1 flex flex-col gap-0.5">
                  {email.mx.map((m, i) => (
                    <Line key={i} prefix="MX" tone="ok">
                      {m}
                    </Line>
                  ))}
                </div>
              )}
            </div>
          </Console>
        )}
      </div>
    </div>
  )
}
