import net from 'node:net'
import { NextResponse } from 'next/server'
import { geolocate, isIp, normalizeTarget, resolveDns } from '@/lib/server/lookups'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// A real TCP connect scan (equivalent to `nmap -sT`) — no raw sockets required.
const PORT_SERVICES: Record<number, string> = {
  21: 'ftp',
  22: 'ssh',
  23: 'telnet',
  25: 'smtp',
  53: 'domain',
  80: 'http',
  110: 'pop3',
  111: 'rpcbind',
  135: 'msrpc',
  139: 'netbios-ssn',
  143: 'imap',
  443: 'https',
  445: 'microsoft-ds',
  993: 'imaps',
  995: 'pop3s',
  1433: 'ms-sql',
  1723: 'pptp',
  3306: 'mysql',
  3389: 'ms-wbt-server',
  5432: 'postgresql',
  5900: 'vnc',
  6379: 'redis',
  8080: 'http-proxy',
  8443: 'https-alt',
  9200: 'elasticsearch',
  27017: 'mongodb',
}

const DEFAULT_PORTS = Object.keys(PORT_SERVICES).map(Number)

function checkPort(host: string, port: number, timeout: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket()
    let settled = false
    const finish = (open: boolean) => {
      if (settled) return
      settled = true
      socket.destroy()
      resolve(open)
    }
    socket.setTimeout(timeout)
    socket.once('connect', () => finish(true))
    socket.once('timeout', () => finish(false))
    socket.once('error', () => finish(false))
    try {
      socket.connect(port, host)
    } catch {
      finish(false)
    }
  })
}

export async function POST(req: Request) {
  let body: { target?: string; ports?: number[] }
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
  const ports =
    Array.isArray(body.ports) && body.ports.length
      ? body.ports.filter((p) => Number.isInteger(p) && p > 0 && p < 65536).slice(0, 64)
      : DEFAULT_PORTS

  // Resolve to an IP for display + geolocation.
  let ip: string | undefined = isIp(host) ? host : undefined
  if (!ip) {
    const a = await resolveDns(host, 'A')
    ip = a[0]?.value
  }

  const started = Date.now()
  // Bounded concurrency so we do not open too many sockets at once.
  const results: { port: number; service: string; state: 'open' | 'closed' }[] = []
  const queue = [...ports]
  const workers = Array.from({ length: 12 }, async () => {
    while (queue.length) {
      const port = queue.shift()
      if (port === undefined) break
      const open = await checkPort(ip ?? host, port, 1800)
      results.push({
        port,
        service: PORT_SERVICES[port] ?? 'unknown',
        state: open ? 'open' : 'closed',
      })
    }
  })
  await Promise.all(workers)
  results.sort((a, b) => a.port - b.port)

  const geo = ip ? await geolocate(ip) : null

  return NextResponse.json({
    host,
    ip: ip ?? null,
    elapsedMs: Date.now() - started,
    scanned: ports.length,
    open: results.filter((r) => r.state === 'open').length,
    results,
    geo,
  })
}
