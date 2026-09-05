import crypto from 'node:crypto'
import { NextResponse } from 'next/server'
import { resolveDns } from '@/lib/server/lookups'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const PROVIDERS: Record<string, string> = {
  'gmail.com': 'Google Gmail',
  'googlemail.com': 'Google Gmail',
  'outlook.com': 'Microsoft Outlook',
  'hotmail.com': 'Microsoft Hotmail',
  'live.com': 'Microsoft Live',
  'yahoo.com': 'Yahoo Mail',
  'icloud.com': 'Apple iCloud',
  'proton.me': 'Proton Mail',
  'protonmail.com': 'Proton Mail',
  'aol.com': 'AOL Mail',
  'zoho.com': 'Zoho Mail',
}

export async function POST(req: Request) {
  let body: { email?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 })
  }

  const email = body.email?.trim().toLowerCase()
  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'invalid email' }, { status: 400 })
  }

  const domain = email.split('@')[1]
  const md5 = crypto.createHash('md5').update(email).digest('hex')

  // MX records prove the domain can actually receive mail.
  const mx = await resolveDns(domain, 'MX')

  // Gravatar existence check (d=404 => 404 if no avatar registered).
  let gravatar = false
  let gravatarUrl: string | null = null
  try {
    const res = await fetch(`https://www.gravatar.com/avatar/${md5}?d=404`, {
      method: 'GET',
      cache: 'no-store',
    })
    gravatar = res.ok
    if (res.ok) gravatarUrl = `https://www.gravatar.com/avatar/${md5}?s=200`
  } catch {
    gravatar = false
  }

  return NextResponse.json({
    email,
    domain,
    validFormat: true,
    provider: PROVIDERS[domain] ?? 'Custom / self-hosted domain',
    deliverable: mx.length > 0,
    mx: mx.map((m) => m.value),
    md5,
    gravatar,
    gravatarUrl,
  })
}
