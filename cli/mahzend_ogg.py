#!/usr/bin/env python3
"""
Mahzend_ogg — OSINT & recon terminal (Linux CLI edition).

A dependency-free companion to the web dashboard. Everything here uses only
the Python standard library plus free, keyless public APIs (Google DoH,
rdap.org, ipwho.is and public platform endpoints).

Usage:
    python3 mahzend_ogg.py

For authorized security research and education only. Only scan or probe
systems you own or have explicit written permission to test.
"""

import base64
import hashlib
import json
import socket
import ssl
import sys
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor

G = "\033[92m"   # green
C = "\033[96m"   # cyan
Y = "\033[93m"   # yellow
R = "\033[91m"   # red
D = "\033[2m"    # dim
B = "\033[1m"    # bold
X = "\033[0m"    # reset

UA = "Mozilla/5.0 (X11; Linux x86_64) mahzend_ogg/1.0"

BANNER = rf"""{G}{B}
 __  __   _   _  _ ______ ___  _ ___    ___   ___  ___
|  \/  | /_\ | || |_  / _|| \| |   \  / _ \ / __|/ __|
| |\/| |/ _ \| __ |/ /| _|| .  | |) || (_) | (_ | (_ |
|_|  |_/_/ \_\_||_/___|___||_|\_|___/  \___/ \___|\___|
{X}{D}        osint // recon terminal — linux edition{X}
"""

PORTS = {
    21: "ftp", 22: "ssh", 23: "telnet", 25: "smtp", 53: "domain",
    80: "http", 110: "pop3", 143: "imap", 443: "https", 445: "microsoft-ds",
    993: "imaps", 995: "pop3s", 3306: "mysql", 3389: "ms-wbt-server",
    5432: "postgresql", 6379: "redis", 8080: "http-proxy", 8443: "https-alt",
    9200: "elasticsearch", 27017: "mongodb",
}


def get_json(url, timeout=8):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/json"})
    ctx = ssl.create_default_context()
    with urllib.request.urlopen(req, timeout=timeout, context=ctx) as r:
        return json.loads(r.read().decode("utf-8", "replace"))


def http_status(url, timeout=8):
    req = urllib.request.Request(url, headers={"User-Agent": UA}, method="GET")
    ctx = ssl.create_default_context()
    try:
        with urllib.request.urlopen(req, timeout=timeout, context=ctx) as r:
            return r.status
    except urllib.error.HTTPError as e:
        return e.code
    except Exception:
        return None


def doh(name, rtype):
    try:
        data = get_json(f"https://dns.google/resolve?name={urllib.parse.quote(name)}&type={rtype}")
        return [a["data"].strip('"') for a in data.get("Answer", [])]
    except Exception:
        return []


def normalize(host):
    host = host.strip()
    if "://" in host:
        host = host.split("://", 1)[1]
    return host.split("/")[0].split("?")[0].split(":")[0].lower()


# ---------------------------------------------------------------- [1] scan
def port_scan():
    target = normalize(input(f"{G}host>{X} "))
    if not target:
        return
    try:
        ip = socket.gethostbyname(target)
    except Exception:
        print(f"{R}✖ could not resolve host{X}")
        return
    print(f"{D}scanning {target} ({ip}) — {len(PORTS)} ports…{X}")

    def check(port):
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(1.8)
        try:
            return port, s.connect_ex((ip, port)) == 0
        except Exception:
            return port, False
        finally:
            s.close()

    with ThreadPoolExecutor(max_workers=16) as pool:
        results = sorted(pool.map(check, PORTS))
    opened = [(p, PORTS[p]) for p, ok in results if ok]
    print(f"\n{B}PORT      STATE   SERVICE{X}")
    for p, svc in opened:
        print(f"{G}{p}/tcp".ljust(10) + "open".ljust(8) + svc + X)
    if not opened:
        print(f"{D}no open ports found{X}")
    geo(ip, quiet=True)


# ------------------------------------------------------------ [2] photo osint
def photo_osint():
    path = input(f"{G}image path>{X} ").strip()
    if not path:
        return
    try:
        from PIL import Image
        from PIL.ExifTags import GPSTAGS, TAGS
    except ImportError:
        print(f"{Y}Pillow not installed. Run: pip install Pillow{X}")
        print(f"{D}(the web dashboard parses EXIF with zero setup){X}")
        return
    try:
        img = Image.open(path)
    except Exception as e:
        print(f"{R}✖ {e}{X}")
        return
    exif = img._getexif() or {}
    if not exif:
        print(f"{D}no EXIF metadata (likely stripped){X}")
        return
    gps = {}
    for tag_id, val in exif.items():
        tag = TAGS.get(tag_id, tag_id)
        if tag == "GPSInfo":
            for t, v in val.items():
                gps[GPSTAGS.get(t, t)] = v
            continue
        print(f"{C}{str(tag).ljust(22)}{X}{val}")
    if gps:
        print(f"{R}{B}GPS EXPOSED:{X} {gps}")


# ------------------------------------------------------- [3] identity osint
def identity_osint():
    who = input(f"{G}username or email>{X} ").strip().lstrip("@")
    if not who:
        return
    if "@" in who and "." in who.split("@")[-1]:
        domain = who.split("@")[1]
        md5 = hashlib.md5(who.encode()).hexdigest()
        mx = doh(domain, "MX")
        grav = http_status(f"https://www.gravatar.com/avatar/{md5}?d=404")
        print(f"{C}domain{X}       {domain}")
        print(f"{C}deliverable{X}  {G+'yes' if mx else R+'no MX'}{X}")
        for m in mx:
            print(f"{D}  MX {m}{X}")
        print(f"{C}gravatar{X}     {G+'registered' if grav==200 else D+'none'}{X}")
        print(f"{C}md5{X}          {md5}")
        return
    sites = {
        "GitHub": f"https://api.github.com/users/{who}",
        "Reddit": f"https://www.reddit.com/user/{who}/about.json",
        "GitLab": f"https://gitlab.com/{who}",
        "Instagram": f"https://www.instagram.com/{who}/",
        "Telegram": f"https://t.me/{who}",
        "TikTok": f"https://www.tiktok.com/@{who}",
        "Steam": f"https://steamcommunity.com/id/{who}",
    }
    print(f"{D}hunting @{who}…{X}")
    with ThreadPoolExecutor(max_workers=8) as pool:
        statuses = dict(zip(sites, pool.map(lambda u: http_status(u), sites.values())))
    for site, st in statuses.items():
        if st and 200 <= st < 300:
            print(f"{G}[+] {site.ljust(12)} found{X}  {sites[site]}")
        elif st == 404:
            print(f"{D}[-] {site.ljust(12)} none{X}")
        else:
            print(f"{Y}[?] {site.ljust(12)} unknown ({st}){X}")


# ---------------------------------------------------------- [4] host recon
def host_recon():
    target = normalize(input(f"{G}host>{X} "))
    if not target:
        return
    for rt in ("A", "AAAA", "MX", "NS", "TXT"):
        for rec in doh(target, rt):
            print(f"{G}{rt.ljust(5)}{X}{rec}")
    a = doh(target, "A")
    if a:
        geo(a[0])
    try:
        info = get_json(f"https://rdap.org/domain/{target}")
        print(f"{C}registrar{X}    {_registrar(info)}")
        for ev in info.get("events", []):
            print(f"{D}  {ev.get('eventAction')}: {ev.get('eventDate','')[:10]}{X}")
    except Exception:
        pass


def _registrar(info):
    for e in info.get("entities", []):
        if "registrar" in e.get("roles", []):
            for f in e.get("vcardArray", [None, []])[1]:
                if f[0] == "fn":
                    return f[3]
    return "—"


def geo(ip, quiet=False):
    try:
        d = get_json(f"https://ipwho.is/{ip}")
        if not d.get("success", True):
            return
        loc = f"{d.get('city','?')}, {d.get('country','?')}"
        print(f"{C}geoip{X}        {ip} → {loc} [{d.get('latitude')},{d.get('longitude')}]")
        if not quiet:
            print(f"{C}isp{X}          {d.get('connection',{}).get('isp','—')}")
    except Exception:
        pass


# ------------------------------------------------------------- [5] globe
def globe():
    print(f"{C}The interactive 3D recon globe lives in the web dashboard.{X}")
    print(f"{D}Start it with:  pnpm install && pnpm dev  → http://localhost:3000{X}")
    print(f"{D}Every recon/scan target you run there is pinned live on the globe.{X}")


# ---------------------------------------------------------- [6] cipher lab
def cipher_lab():
    text = input(f"{G}payload>{X} ")
    b = text.encode()
    print(f"{C}base64{X}       {base64.b64encode(b).decode()}")
    print(f"{C}hex{X}          {b.hex()}")
    rot = text.translate(str.maketrans(
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
        "NOPQRSTUVWXYZABCDEFGHIJKLMnopqrstuvwxyzabcdefghijklm"))
    print(f"{C}rot13{X}        {rot}")
    for algo in ("md5", "sha1", "sha256", "sha512"):
        print(f"{C}{algo.ljust(12)}{X}{hashlib.new(algo, b).hexdigest()}")


TOOLS = {
    "1": ("Port / Service Scan", port_scan),
    "2": ("Photo OSINT (EXIF/GPS)", photo_osint),
    "3": ("Username / Email Intel", identity_osint),
    "4": ("Host Recon (DNS/WHOIS/GeoIP)", host_recon),
    "5": ("Recon Globe (web)", globe),
    "6": ("Cipher & Hash Lab", cipher_lab),
}


def menu():
    print(BANNER)
    while True:
        print(f"\n{B}select a module:{X}")
        for k, (name, _) in TOOLS.items():
            print(f"  {C}[{k}]{X} {name}")
        print(f"  {D}[q] quit{X}")
        choice = input(f"\n{G}mahzend_ogg>{X} ").strip().lower()
        if choice in ("q", "quit", "exit"):
            print(f"{D}stay curious. stay ethical.{X}")
            return
        tool = TOOLS.get(choice)
        if not tool:
            print(f"{R}unknown module{X}")
            continue
        print(f"\n{D}── {tool[0]} ──{X}")
        try:
            tool[1]()
        except KeyboardInterrupt:
            print()
        except Exception as e:
            print(f"{R}✖ {e}{X}")


if __name__ == "__main__":
    try:
        menu()
    except (KeyboardInterrupt, EOFError):
        print(f"\n{D}exit{X}")
        sys.exit(0)
