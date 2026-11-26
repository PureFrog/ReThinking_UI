"""Real KRX daily bars → Supabase (price_daily, stock_names; db/migrations/007_invite_prices.sql).

Reads the daily KRX files the sudden-drop pipeline already keeps (investment-evidence-system,
models/sudden/cache/krx/daily/YYYYMMDD.csv, one file per trading day, every KOSPI and KOSDAQ stock) and uploads:
  stock_names  every stock on the latest day (code, name, market, close, market value) for the stock search
  price_daily  daily bars for the stocks the app needs: the top 300 by market value, the 12 journal stocks
               (app/core/jigi/stocks.ts) and every stock in a player's garden (garden_saves)
New stocks get their whole history from --from; stocks already there get only the days after the last one uploaded.

Run it after the daily pipeline (or by hand):
    python tools/prices/push_prices.py --env C:/code/investment-evidence-system/.env
Keys come from the environment or the --env file (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY); they are never printed.
Standard library only.
"""
import argparse
import csv
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

KRX_DEFAULT = Path('C:/code/investment-evidence-system/models/sudden/cache/krx/daily')
JOURNAL_STOCKS = ['005930', '000660', '373220', '005380', '035420', '035720', '068270', '105560', '012450', '005490',
                  '247540', '196170']
TOP = 300
BATCH = 1000


def load_env(path):
    if not path:
        return
    for line in Path(path).read_text(encoding='utf-8').splitlines():
        line = line.strip()
        if not line or line.startswith('#') or '=' not in line:
            continue
        k, v = line.split('=', 1)
        os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


class Supa:
    def __init__(self):
        self.url = os.environ.get('SUPABASE_URL', '').rstrip('/')
        self.key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY', '')
        if not self.url or not self.key:
            sys.exit('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are needed (environment or --env file)')

    def req(self, method, path, body=None, prefer=None):
        h = {'apikey': self.key, 'authorization': f'Bearer {self.key}', 'content-type': 'application/json'}
        if prefer:
            h['prefer'] = prefer
        data = json.dumps(body).encode() if body is not None else None
        r = urllib.request.Request(f'{self.url}/rest/v1/{path}', data=data, headers=h, method=method)
        try:
            with urllib.request.urlopen(r, timeout=60) as resp:
                raw = resp.read()
                return json.loads(raw) if raw else None
        except urllib.error.HTTPError as e:
            sys.exit(f'{method} {path.split("?")[0]} failed: {e.code} {e.read()[:300].decode(errors="replace")}')

    def upsert(self, table, rows, on):
        for i in range(0, len(rows), BATCH):
            self.req('POST', f'{table}?on_conflict={on}', rows[i:i + BATCH], 'resolution=merge-duplicates,return=minimal')


def num(s):
    s = (s or '').replace(',', '').strip()
    return float(s) if s not in ('', '-') else None


def read_day(path):
    with open(path, encoding='utf-8-sig', newline='') as f:
        return list(csv.DictReader(f))


def kosdaq120_codes():
    """The 과수원's virtual stocks (app/content/kosdaq120.ts): their real closes too, so a practice buy follows the market
    (2026-11-26: small KOSDAQ names were outside the top 300 and fell back to the mock walk)."""
    import re
    src = Path(__file__).resolve().parents[2] / 'app' / 'content' / 'kosdaq120.ts'
    try:
        return set(re.findall(r"code:\s*'(\d{6})'", src.read_text(encoding='utf-8')))
    except OSError:
        return set()


def garden_codes(sb):
    codes = set()
    for row in sb.req('GET', 'garden_saves?select=body->holdings') or []:
        for h in row.get('holdings') or []:
            c = (h or {}).get('code')
            if isinstance(c, str) and c.isdigit() and len(c) == 6:
                codes.add(c)
    return codes


def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument('--env', help='a .env file with SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
    ap.add_argument('--krx', default=str(KRX_DEFAULT), help='folder of daily KRX csv files (YYYYMMDD.csv)')
    ap.add_argument('--from', dest='start', default='2024-01-01', help='first day of history for a new stock')
    ap.add_argument('--dry', action='store_true', help='read and count only, upload nothing')
    a = ap.parse_args(argv)
    load_env(a.env)
    files = sorted(p for p in Path(a.krx).glob('*.csv') if p.stem.isdigit() and len(p.stem) == 8)
    start = a.start.replace('-', '')
    files = [p for p in files if p.stem >= start]
    if not files:
        sys.exit(f'no daily files in {a.krx} from {a.start}')
    latest = read_day(files[-1])
    as_of = f'{files[-1].stem[:4]}-{files[-1].stem[4:6]}-{files[-1].stem[6:]}'
    names = [{'code': r['ISU_CD'], 'name': r['ISU_NM'], 'mkt': r['MKT_NM'], 'close': num(r['TDD_CLSPRC']),
              'mktcap': num(r['MKTCAP']), 'as_of': as_of} for r in latest if r.get('ISU_CD')]
    top = [n['code'] for n in sorted(names, key=lambda n: -(n['mktcap'] or 0))[:TOP]]
    sb = None if a.dry else Supa()
    wanted = set(top) | set(JOURNAL_STOCKS) | kosdaq120_codes() | (garden_codes(sb) if sb else set())
    # what is there already: the stocks on the last uploaded day
    last = None if a.dry else (sb.req('GET', 'price_daily?select=d&order=d.desc&limit=1') or [None])[0]
    last_d = last['d'].replace('-', '') if last else None
    have = set() if not last_d else {r['code'] for r in sb.req('GET', f'price_daily?select=code&d=eq.{last["d"]}&limit=5000')}
    fresh = wanted - have
    rows = []
    for p in files:
        day = f'{p.stem[:4]}-{p.stem[4:6]}-{p.stem[6:]}'
        new_day = last_d is None or p.stem > last_d
        if not new_day and not fresh:
            continue
        for r in read_day(p):
            c = r.get('ISU_CD')
            if c not in wanted or not (new_day or c in fresh):
                continue
            o, h, l, cl = num(r['TDD_OPNPRC']), num(r['TDD_HGPRC']), num(r['TDD_LWPRC']), num(r['TDD_CLSPRC'])
            if not cl or not o:  # a halted day has no open; skip it
                continue
            v = num(r['ACC_TRDVOL'])
            rows.append({'code': c, 'd': day, 'o': o, 'h': h, 'l': l, 'c': cl, 'v': int(v) if v is not None else None})
    print(f'latest day {as_of}: {len(names)} names · {len(wanted)} stocks wanted ({len(fresh)} new) · {len(rows)} bars to upload')
    if a.dry:
        return
    sb.upsert('stock_names', names, 'code')
    sb.upsert('price_daily', rows, 'code,d')
    print('uploaded')


if __name__ == '__main__':
    main()
