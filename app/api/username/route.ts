import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const UA =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122 Safari/537.36'

type SiteResult = {
  site: string
  url: string
  state: 'found' | 'notfound' | 'unknown'
}

async function probe(
  site: string,
  url: string,
  decide: (res: Response) => Promise<'found' | 'notfound' | 'unknown'>,
): Promise<SiteResult> {
  try {
    const controller = new AbortController()
    const t = setTimeout(() => controller.abort(), 6000)
    const res = await fetch(url, {
      headers: { 'user-agent': UA, accept: '*/*' },
      redirect: 'manual',
      signal: controller.signal,
      cache: 'no-store',
    })
    clearTimeout(t)
    return { site, url, state: await decide(res) }
  } catch {
    return { site, url, state: 'unknown' }
  }
}

const byStatus = async (res: Response): Promise<'found' | 'notfound' | 'unknown'> => {
  if (res.status >= 200 && res.status < 300) return 'found'
  if (res.status === 404) return 'notfound'
  return 'unknown'
}

export async function POST(req: Request) {
  let body: { username?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 })
  }

  const username = body.username?.trim().replace(/^@/, '')
  if (!username || !/^[a-zA-Z0-9._-]{1,39}$/.test(username)) {
    return NextResponse.json({ error: 'invalid username' }, { status: 400 })
  }
  const u = encodeURIComponent(username)

  const checks: Promise<SiteResult>[] = [
    probe('GitHub', `https://api.github.com/users/${u}`, byStatus),
    probe('GitLab', `https://gitlab.com/api/v4/users?username=${u}`, async (res) => {
      if (!res.ok) return 'unknown'
      const arr = (await res.json()) as unknown[]
      return Array.isArray(arr) && arr.length > 0 ? 'found' : 'notfound'
    }),
    probe('Reddit', `https://www.reddit.com/user/${u}/about.json`, byStatus),
    probe('Dev.to', `https://dev.to/api/users/by_username?url=${u}`, byStatus),
    probe('Gravatar', `https://gravatar.com/${u}`, byStatus),
    probe('Instagram', `https://www.instagram.com/${u}/`, byStatus),
    probe('Telegram', `https://t.me/${u}`, byStatus),
    probe('Pinterest', `https://www.pinterest.com/${u}/`, byStatus),
    probe('TikTok', `https://www.tiktok.com/@${u}`, byStatus),
    probe('Steam', `https://steamcommunity.com/id/${u}`, async (res) =>
      res.status >= 200 && res.status < 300 ? 'found' : 'unknown',
    ),
  ]

  const results = await Promise.all(checks)

  return NextResponse.json({
    username,
    results,
    found: results.filter((r) => r.state === 'found').length,
    checked: results.length,
  })
}
