# Mahzend_ogg

```
 __  __   _   _  _ ______ ___  _ ___    ___   ___  ___
|  \/  | /_\ | || |_  / _|| \| |   \  / _ \ / __|/ __|
| |\/| |/ _ \| __ |/ /| _|| .  | |) || (_) | (_ | (_ |
|_|  |_/_/ \_\_||_/___|___||_|\_|___/  \___/ \___|\___|
        osint // recon terminal
```

A hacker-terminal OSINT & recon toolkit with **6 modules** and a live **3D recon
globe**. Ships as a web dashboard (Next.js) and a dependency-free Linux CLI.
All intelligence comes from **real, keyless public sources** — no API keys, no
mock data.

> [!WARNING]
> For **authorized security research and education only**. Only scan, probe, or
> profile systems and accounts you own or have explicit written permission to
> test. You are responsible for how you use this tool.

---

## Modules

| # | Module | What it does | Data source |
|---|--------|--------------|-------------|
| 01 | **Port / Service Scan** | Real TCP connect scan (`nmap -sT` equivalent) across common service ports | `node:net` sockets |
| 02 | **Photo OSINT** | Extract EXIF metadata, camera fingerprint & hidden GPS from an image (parsed on-device) | `exifr` (browser) |
| 03 | **Username / Email Intel** | Enumerate accounts across platforms; profile emails via MX + provider + Gravatar | GitHub/Reddit/GitLab APIs, Gravatar, DoH |
| 04 | **Host Recon** | DNS records, RDAP/WHOIS, HTTP fingerprint & IP geolocation | Google DoH, rdap.org, ipwho.is |
| 05 | **Live Recon Globe** | Zoomable 3D globe — every geolocated target gets pinned with pulse rings & arcs | `react-globe.gl` / Three.js |
| 06 | **Cipher & Hash Lab** | Base64 / Hex / URL / Binary / ROT13 encode-decode + MD5 / SHA-1 / SHA-256 / SHA-512 | fully offline |

Any target you geolocate in **Host Recon**, **Port Scan**, or via **Photo GPS**
is automatically plotted on the **3D globe**, which flies to the newest pin.

---

## Web dashboard

```bash
pnpm install
pnpm dev
# open http://localhost:3000
```

Built with **Next.js 16** (App Router), **React 19**, **Tailwind CSS v4**,
**Three.js** via `react-globe.gl`, and **SWR**. Real lookups run in Node route
handlers under `app/api/*`.

### Structure

```
app/
  api/
    recon/route.ts      # DNS + RDAP + geo + HTTP fingerprint
    scan/route.ts       # real TCP connect port scan (node:net)
    username/route.ts   # cross-platform presence checks
    email/route.ts      # MX + provider + Gravatar
  page.tsx
components/
  mahzend-terminal.tsx  # shell: boot screen, nav, tool router
  boot-screen.tsx
  globe-view.tsx        # 3D recon globe
  tools/                # the 6 tool panels
  terminal/primitives.tsx
lib/
  server/lookups.ts     # shared keyless OSINT helpers
  md5.ts                # MD5 (Web Crypto has no MD5)
cli/
  mahzend_ogg.py        # Linux CLI edition
```

---

## Linux CLI

The classic numbered-menu terminal experience — no Node, no dependencies
(Python 3 standard library only; `Pillow` is optional, just for Photo OSINT).

```bash
python3 cli/mahzend_ogg.py
```

```
select a module:
  [1] Port / Service Scan
  [2] Photo OSINT (EXIF/GPS)
  [3] Username / Email Intel
  [4] Host Recon (DNS/WHOIS/GeoIP)
  [5] Recon Globe (web)
  [6] Cipher & Hash Lab
  [q] quit
```

Optional EXIF support:

```bash
pip install Pillow
```

---

## Notes & limitations

- **Port scanning** uses TCP connect scans, the same technique as `nmap -sT`.
  Raw-packet SYN/stealth scans require elevated privileges and are out of scope
  for a browser/serverless runtime — use the CLI on a host you control for those.
- Some platforms (Instagram, TikTok, etc.) actively block automated checks;
  those are reported as **unknown**, not confirmed. Always verify manually.
- All third-party sources are free and keyless; results depend on their uptime
  and rate limits.

## License

MIT — see `LICENSE`. Use responsibly.
