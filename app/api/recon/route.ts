import { NextResponse } from 'next/server'
import {
  fetchHttpFingerprint,
  geolocate,
  isIp,
  normalizeTarget,
  rdapDomain,
  resolveDns,
} from '@/lib/server/lookups'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  let body: { target?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 })
  }

  const raw = body.target?.trim()
  if (!raw) {
    return NextResponse.json({ error: 'target required' }, { status: 400 })
  }

  const host = normalizeTarget(raw)
  const targetIsIp = isIp(host)

  const [aRecords, aaaa, mx, ns, txt, fingerprint] = await Promise.all([
    targetIsIp ? Promise.resolve([]) : resolveDns(host, 'A'),
    targetIsIp ? Promise.resolve([]) : resolveDns(host, 'AAAA'),
    targetIsIp ? Promise.resolve([]) : resolveDns(host, 'MX'),
    targetIsIp ? Promise.resolve([]) : resolveDns(host, 'NS'),
    targetIsIp ? Promise.resolve([]) : resolveDns(host, 'TXT'),
    fetchHttpFingerprint(host),
  ])

  const primaryIp = targetIsIp ? host : aRecords[0]?.value
  const [geo, rdap] = await Promise.all([
    primaryIp ? geolocate(primaryIp) : Promise.resolve(null),
    targetIsIp ? Promise.resolve({ found: false }) : rdapDomain(host),
  ])

  return NextResponse.json({
    host,
    targetIsIp,
    dns: { A: aRecords, AAAA: aaaa, MX: mx, NS: ns, TXT: txt },
    geo,
    rdap,
    fingerprint,
  })
}
