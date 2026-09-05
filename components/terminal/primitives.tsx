'use client'

import type { FormEvent, ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function PanelHeader({
  title,
  index,
  desc,
}: {
  title: string
  index: string
  desc: string
}) {
  return (
    <div className="border-b border-border px-4 py-3">
      <div className="flex items-center gap-2">
        <span className="text-accent">[{index}]</span>
        <h2 className="text-sm font-bold uppercase tracking-widest text-primary text-glow">
          {title}
        </h2>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{desc}</p>
    </div>
  )
}

export function CommandBar({
  label = 'target',
  value,
  onChange,
  onSubmit,
  placeholder,
  loading,
  disabled,
  cta = 'run',
}: {
  label?: string
  value: string
  onChange: (v: string) => void
  onSubmit: () => void
  placeholder?: string
  loading?: boolean
  disabled?: boolean
  cta?: string
}) {
  return (
    <form
      onSubmit={(e: FormEvent) => {
        e.preventDefault()
        if (!loading && !disabled) onSubmit()
      }}
      className="flex flex-col gap-2 sm:flex-row sm:items-center"
    >
      <div className="flex flex-1 items-center gap-2 rounded-sm border border-input bg-background/60 px-3 py-2 focus-within:border-primary focus-within:box-glow">
        <span className="shrink-0 text-primary">{label}&gt;</span>
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/60"
        />
      </div>
      <button
        type="submit"
        disabled={loading || disabled}
        className="shrink-0 rounded-sm border border-primary/60 bg-primary/10 px-4 py-2 text-sm font-bold uppercase tracking-wider text-primary transition-colors hover:bg-primary/20 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {loading ? 'running…' : cta}
      </button>
    </form>
  )
}

export function Console({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'min-h-24 rounded-sm border border-border bg-background/40 p-3 text-xs leading-relaxed',
        className,
      )}
    >
      {children}
    </div>
  )
}

const TONE: Record<string, string> = {
  ok: 'text-primary',
  info: 'text-foreground',
  dim: 'text-muted-foreground',
  warn: 'text-[var(--warn)]',
  bad: 'text-destructive',
  accent: 'text-accent',
}

export function Line({
  prefix = '›',
  tone = 'info',
  children,
}: {
  prefix?: string
  tone?: keyof typeof TONE | string
  children: ReactNode
}) {
  return (
    <div className="flex gap-2">
      <span className="select-none text-muted-foreground">{prefix}</span>
      <span className={cn('min-w-0 break-words', TONE[tone] ?? 'text-foreground')}>
        {children}
      </span>
    </div>
  )
}

export function KV({ k, v }: { k: string; v: ReactNode }) {
  return (
    <div className="flex gap-2">
      <span className="w-28 shrink-0 text-muted-foreground">{k}</span>
      <span className="min-w-0 break-words text-foreground">{v}</span>
    </div>
  )
}

export function Pill({
  tone = 'dim',
  children,
}: {
  tone?: 'ok' | 'bad' | 'warn' | 'dim' | 'accent'
  children: ReactNode
}) {
  const styles: Record<string, string> = {
    ok: 'border-primary/50 bg-primary/10 text-primary',
    bad: 'border-destructive/50 bg-destructive/10 text-destructive',
    warn: 'border-[var(--warn)]/50 bg-[var(--warn)]/10 text-[var(--warn)]',
    accent: 'border-accent/50 bg-accent/10 text-accent',
    dim: 'border-border bg-muted/40 text-muted-foreground',
  }
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-sm border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider',
        styles[tone],
      )}
    >
      {children}
    </span>
  )
}

export function ErrorLine({ children }: { children: ReactNode }) {
  return (
    <Line prefix="✖" tone="bad">
      {children}
    </Line>
  )
}

export function Hint({ children }: { children: ReactNode }) {
  return <p className="text-xs text-muted-foreground">{children}</p>
}
