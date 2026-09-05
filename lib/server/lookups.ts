// Shared server-side OSINT helpers. All sources are free & keyless.

const DOH = 'https://dns.google/resolve'

export type DnsRecord = { type: string; value: string; ttl?: number }

const DNS_TYPE_NAMES: Record<number, string> = {
  1: 'A',
  2: 'NS',
  5: 'CNAME',
  15: 'MX',
  16: 'TXT',
  28: 'AAAA',
  257: 'CAA',
}

export async function resolveDns(
  name: string,
  type: string,
): Promise<DnsRecord[]> {
  try {
    const res = await fetch(
      `${DOH}?name=${encodeURIComponent(name)}&type=${type}`,
      { headers: { accept: 'application/dns-json' }, cache: 'no-store' },
    )
    if (!res.ok) return []
    const data = (await res.json()) as {
      Answer?: { name: string; type: number; TTL: number; data: string }[]
    }
    if (!data.Answer) return []
    return data.Answer.map((a) => ({
      type: DNS_TYPE_NAMES[a.type] ?? String(a.type),
      value: a.data.replace(/"/g, ''),
      ttl: a.TTL,
    }))
  } catch {
    return []
  }
}

export type GeoInfo = {
  ip: string
  success: boolean
  country?: string
  countryCode?: string
  region?: string
  city?: string
  lat?: number
  lng?: number
  isp?: string
  org?: string
  asn?: string
  timezone?: string
}

export async function geolocate(ip: string): Promise<GeoInfo> {
  try {
    const res = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}`, {
      cache: 'no-store',
    })
    const d = (await res.json()) as any
    if (!d || d.success === false) return { ip, success: false }
    return {
      ip,
      success: true,
      country: d.country,
      countryCode: d.country_code,
      region: d.region,
      city: d.city,
      lat: d.latitude,
      lng: d.longitude,
      isp: d.connection?.isp,
      org: d.connection?.org,
      asn: d.connection?.asn ? `AS${d.connection.asn}` : undefined,
      timezone: d.timezone?.id,
    }
  } catch {
    return { ip, success: false }
  }
}

const IPV4 = /^(\d{1,3}\.){3}\d{1,3}$/

export function isIp(host: string): boolean {
  return IPV4.test(host) || host.includes(':')
}

// Normalize whatever the user typed (URL, host, IP) into a bare hostname.
export function normalizeTarget(input: string): string {
  let t = input.trim()
  t = t.replace(/^[a-z]+:\/\//i, '')
  t = t.split('/')[0]
  t = t.split('?')[0]
  t = t.replace(/:\d+$/, '')
  return t.toLowerCase()
}

export type RdapInfo = {
  found: boolean
  handle?: string
  name?: string
  registrar?: string
  status?: string[]
  events?: { action: string; date: string }[]
  nameservers?: string[]
}

export async function rdapDomain(domain: string): Promise<RdapInfo> {
  try {
    const res = await fetch(`https://rdap.org/domain/${encodeURIComponent(domain)}`, {
      cache: 'no-store',
    })
    if (!res.ok) return { found: false }
    const d = (await res.json()) as any
    const registrar = (d.entities ?? []).find((e: any) =>
      (e.roles ?? []).includes('registrar'),
    )
    const registrarName = registrar?.vcardArray?.[1]?.find(
      (f: any) => f[0] === 'fn',
    )?.[3]
    return {
      found: true,
      handle: d.handle,
      name: d.ldhName,
      registrar: registrarName,
      status: d.status,
      events: (d.events ?? []).map((e: any) => ({
        action: e.eventAction,
        date: e.eventDate,
      })),
      nameservers: (d.nameservers ?? []).map((n: any) => n.ldhName),
    }
  } catch {
    return { found: false }
  }
}

export async function fetchHttpFingerprint(host: string): Promise<{
  reachable: boolean
  scheme?: string
  status?: number
  server?: string
  poweredBy?: string
  headers?: Record<string, string>
}> {
  for (const scheme of ['https', 'http']) {
    try {
      const controller = new AbortController()
      const t = setTimeout(() => controller.abort(), 5000)
      const res = await fetch(`${scheme}://${host}`, {
        method: 'GET',
        redirect: 'manual',
        signal: controller.signal,
        cache: 'no-store',
      })
      clearTimeout(t)
      const headers: Record<string, string> = {}
      res.headers.forEach((v, k) => {
        headers[k] = v
      })
      return {
        reachable: true,
        scheme,
        status: res.status,
        server: res.headers.get('server') ?? undefined,
        poweredBy: res.headers.get('x-powered-by') ?? undefined,
        headers,
      }
    } catch {
      // try next scheme
    }
  }
  return { reachable: false }
}
