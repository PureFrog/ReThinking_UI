// built from db/functions/news-feed/index.ts by tools/build-functions.mjs. Do not edit; rebuild.

// app/core/content/live/rss.ts
var ENT = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", middot: "\xB7", hellip: "\u2026", lsquo: "\u2018", rsquo: "\u2019", ldquo: "\u201C", rdquo: "\u201D", ndash: "\u2013", mdash: "\u2014" };
function decode(s) {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => e[0] === "#" ? String.fromCodePoint(e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : Number(e.slice(1))) : ENT[e.toLowerCase()] ?? m);
}
var cdata = (s) => s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1");
function excerpt(raw, max = 160) {
  if (!raw) return null;
  const strip = (s) => s.replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ").replace(/<\/?(p|br|div|li|ul|ol|h\d|tr|td|table|figure|figcaption)\b[^>]*>/gi, " ").replace(/<[^>]+>/g, "");
  let t = strip(decode(strip(cdata(raw))));
  t = decode(t).replace(/\s+/g, " ").trim();
  t = t.replace(/\s*(?:\[[^\]]*기자\]|[가-힣]{2,4}\s?기자\s?[\w.+-]+@[\w.-]+|[\w.+-]+@[\w.-]+\.\w+|ⓒ.*|©.*|무단\s?전재.*|저작권자.*)$/u, "").trim();
  if (t.length < 8) return null;
  if (t.length <= max) return t;
  const cut = t.slice(0, max), end = Math.max(cut.lastIndexOf("\uB2E4. "), cut.lastIndexOf(". "), cut.lastIndexOf("\uC694. "));
  return end > max * 0.5 ? cut.slice(0, end + 1).trim() : cut.replace(/\s+\S*$/, "").trim() + "\u2026";
}

// app/core/content/live/naver.ts
var NAVER_NEWS_URL = "https://naverapihub.apigw.ntruss.com/search/v1/news";
var ALIASES = {
  "035420": ["\uB124\uC774\uBC84", "NAVER"],
  "005490": ["\uD3EC\uC2A4\uCF54\uD640\uB529\uC2A4", "POSCO\uD640\uB529\uC2A4", "\uD3EC\uC2A4\uCF54"],
  "005380": ["\uD604\uB300\uCC28", "\uD604\uB300\uC790\uB3D9\uCC28"],
  "373220": ["LG\uC5D0\uB108\uC9C0\uC194\uB8E8\uC158", "LG\uC5D4\uC194"],
  "207940": ["\uC0BC\uC131\uBC14\uC774\uC624\uB85C\uC9C1\uC2A4", "\uC0BC\uC131\uBC14\uC774\uC624"],
  "012450": ["\uD55C\uD654\uC5D0\uC5B4\uB85C\uC2A4\uD398\uC774\uC2A4", "\uD55C\uD654\uC5D0\uC5B4\uB85C"],
  "105560": ["KB\uAE08\uC735", "KB\uAE08\uC735\uC9C0\uC8FC"],
  "055550": ["\uC2E0\uD55C\uC9C0\uC8FC", "\uC2E0\uD55C\uAE08\uC735"],
  "086790": ["\uD558\uB098\uAE08\uC735\uC9C0\uC8FC", "\uD558\uB098\uAE08\uC735"],
  "068270": ["\uC140\uD2B8\uB9AC\uC628"],
  "000270": ["\uAE30\uC544"],
  "051910": ["LG\uD654\uD559"],
  "006400": ["\uC0BC\uC131SDI"],
  "028260": ["\uC0BC\uC131\uBB3C\uC0B0"],
  "032830": ["\uC0BC\uC131\uC0DD\uBA85"],
  "003550": ["LG"],
  "034730": ["SK"],
  "017670": ["SK\uD154\uB808\uCF64", "SKT"],
  "030200": ["KT"],
  "066570": ["LG\uC804\uC790"],
  "009150": ["\uC0BC\uC131\uC804\uAE30"],
  "010130": ["\uACE0\uB824\uC544\uC5F0"],
  "011200": ["HMM"],
  "316140": ["\uC6B0\uB9AC\uAE08\uC735\uC9C0\uC8FC", "\uC6B0\uB9AC\uAE08\uC735"]
};
var namesOf = (code, name) => [.../* @__PURE__ */ new Set([...ALIASES[code] ?? [], name])];
var naverQuery = (name, code = "") => ({ query: `"${namesOf(code, name)[0]}"`, display: "100", start: "1", sort: "date" });
var esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
function namesCompany(name, title) {
  const latin = /^[A-Za-z0-9]/.test(name);
  const re = new RegExp(`${latin ? "(?<![A-Za-z0-9])" : ""}${esc(name)}(?:\uC0B0\uC5C5)?(?:\uC740|\uB294|\uC774|\uAC00|\uC744|\uB97C|\uC758|\uC640|\uACFC|\uB3C4|\uC5D0\uC11C|\uC5D0\uAC8C|\uC5D0|\uB85C|\uC73C\uB85C|\uB9CC|\uAE4C\uC9C0|\uBD80\uD130|\uC8FC|\u682A|\u793E)?(?![\uAC00-\uD7A3A-Za-z0-9])`);
  return re.test(title);
}
var PRESS = {
  "yna.co.kr": "\uC5F0\uD569\uB274\uC2A4",
  "yonhapnewstv.co.kr": "\uC5F0\uD569\uB274\uC2A4TV",
  "newsis.com": "\uB274\uC2DC\uC2A4",
  "news1.kr": "\uB274\uC2A41",
  "mk.co.kr": "\uB9E4\uC77C\uACBD\uC81C",
  "hankyung.com": "\uD55C\uAD6D\uACBD\uC81C",
  "edaily.co.kr": "\uC774\uB370\uC77C\uB9AC",
  "mt.co.kr": "\uBA38\uB2C8\uD22C\uB370\uC774",
  "sedaily.com": "\uC11C\uC6B8\uACBD\uC81C",
  "fnnews.com": "\uD30C\uC774\uB0B8\uC15C\uB274\uC2A4",
  "asiae.co.kr": "\uC544\uC2DC\uC544\uACBD\uC81C",
  "heraldcorp.com": "\uD5E4\uB7F4\uB4DC\uACBD\uC81C",
  "biz.chosun.com": "\uC870\uC120\uBE44\uC988",
  "chosun.com": "\uC870\uC120\uC77C\uBCF4",
  "joongang.co.kr": "\uC911\uC559\uC77C\uBCF4",
  "donga.com": "\uB3D9\uC544\uC77C\uBCF4",
  "hani.co.kr": "\uD55C\uACA8\uB808",
  "khan.co.kr": "\uACBD\uD5A5\uC2E0\uBB38",
  "kmib.co.kr": "\uAD6D\uBBFC\uC77C\uBCF4",
  "seoul.co.kr": "\uC11C\uC6B8\uC2E0\uBB38",
  "munhwa.com": "\uBB38\uD654\uC77C\uBCF4",
  "segye.com": "\uC138\uACC4\uC77C\uBCF4",
  "hankookilbo.com": "\uD55C\uAD6D\uC77C\uBCF4",
  "etnews.com": "\uC804\uC790\uC2E0\uBB38",
  "zdnet.co.kr": "\uC9C0\uB514\uB137\uCF54\uB9AC\uC544",
  "thebell.co.kr": "\uB354\uBCA8",
  "newspim.com": "\uB274\uC2A4\uD54C",
  "inews24.com": "\uC544\uC774\uB274\uC2A424",
  "ajunews.com": "\uC544\uC8FC\uACBD\uC81C",
  "dt.co.kr": "\uB514\uC9C0\uD138\uD0C0\uC784\uC2A4",
  "bizwatch.co.kr": "\uBE44\uC988\uB2C8\uC2A4\uC6CC\uCE58",
  "businesspost.co.kr": "\uBE44\uC988\uB2C8\uC2A4\uD3EC\uC2A4\uD2B8",
  "ebn.co.kr": "EBN",
  "nocutnews.co.kr": "\uB178\uCEF7\uB274\uC2A4",
  "kbs.co.kr": "KBS",
  "sbs.co.kr": "SBS",
  "imbc.com": "MBC",
  "ytn.co.kr": "YTN",
  "mbn.co.kr": "MBN",
  "wowtv.co.kr": "\uD55C\uAD6D\uACBD\uC81CTV",
  "sbsbiz.co.kr": "SBS Biz",
  "etoday.co.kr": "\uC774\uD22C\uB370\uC774",
  "g-enews.com": "\uAE00\uB85C\uBC8C\uC774\uCF54\uB178\uBBF9",
  "getnews.co.kr": "\uAE00\uB85C\uBC8C\uACBD\uC81C\uC2E0\uBB38",
  "e-science.co.kr": "\uC774\uCF54\uB178\uBBF8\uC0AC\uC774\uC5B8\uC2A4",
  "pinpointnews.co.kr": "\uD540\uD3EC\uC778\uD2B8\uB274\uC2A4",
  "issuenbiz.com": "\uC774\uC288\uC564\uBE44\uC988",
  "newslock.co.kr": "\uB274\uC2A4\uB77D",
  "industrynews.co.kr": "\uC778\uB354\uC2A4\uD2B8\uB9AC\uB274\uC2A4",
  "newsway.co.kr": "\uB274\uC2A4\uC6E8\uC774",
  "dailian.co.kr": "\uB370\uC77C\uB9AC\uC548",
  "mediapen.com": "\uBBF8\uB514\uC5B4\uD39C",
  "ddaily.co.kr": "\uB514\uC9C0\uD138\uB370\uC77C\uB9AC",
  "theguru.co.kr": "\uB354\uAD6C\uB8E8",
  "thelec.kr": "\uB514\uC77C\uB809",
  "pinchannel.co.kr": "\uD540\uCC44\uB110",
  "econovill.com": "\uC774\uCF54\uB178\uBBF9\uB9AC\uBDF0",
  "econonews.co.kr": "\uC774\uCF54\uB178\uB274\uC2A4",
  "kpinews.kr": "KPI\uB274\uC2A4",
  "newdaily.co.kr": "\uB274\uB370\uC77C\uB9AC",
  "metroseoul.co.kr": "\uBA54\uD2B8\uB85C\uC2E0\uBB38",
  "viva100.com": "\uBE0C\uB9BF\uC9C0\uACBD\uC81C",
  "skyedaily.com": "\uC2A4\uCE74\uC774\uB370\uC77C\uB9AC",
  "straightnews.co.kr": "\uC2A4\uD2B8\uB808\uC774\uD2B8\uB274\uC2A4",
  "sisajournal-e.com": "\uC2DC\uC0AC\uC800\uB110e",
  "sisajournal.com": "\uC2DC\uC0AC\uC800\uB110",
  "fntimes.com": "\uD55C\uAD6D\uAE08\uC735\uC2E0\uBB38",
  "ceoscoredaily.com": "CEO\uC2A4\uCF54\uC5B4\uB370\uC77C\uB9AC",
  "widedaily.com": "\uC640\uC774\uB4DC\uACBD\uC81C",
  "tf.co.kr": "\uB354\uD329\uD2B8",
  "nspna.com": "NSP\uD1B5\uC2E0",
  "enewstoday.co.kr": "\uC774\uB274\uC2A4\uD22C\uB370\uC774",
  "busan.com": "\uBD80\uC0B0\uC77C\uBCF4",
  "kookje.co.kr": "\uAD6D\uC81C\uC2E0\uBB38",
  "imaeil.com": "\uB9E4\uC77C\uC2E0\uBB38",
  "kyongbuk.co.kr": "\uACBD\uBD81\uC77C\uBCF4",
  "joongboo.com": "\uC911\uBD80\uC77C\uBCF4"
};
function pressOf(url) {
  let host = "";
  try {
    host = new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "\uC5B8\uB860\uC0AC";
  }
  for (let h = host; h.includes("."); h = h.slice(h.indexOf(".") + 1)) if (PRESS[h]) return PRESS[h];
  return host || "\uC5B8\uB860\uC0AC";
}
var THEME_WORDS = [
  ["\uACF5\uC2DC", /공시|자사주|자기주식|유상증자|무상증자|전환사채|신주인수권|감자|합병|분할|대표이사|최대주주|배당|상장폐지|거래정지/],
  ["\uC2E4\uC801", /실적|영업이익|매출|순이익|분기|어닝|컨센서스|흑자|적자|목표가|가이던스/],
  ["\uC815\uCC45", /정부|정책|규제|법안|금리|관세|세제|지원책|금융위|공정위|국회|당국/]
];
var themeOf = (title, summary) => THEME_WORDS.find(([, re]) => re.test(title) || !!summary && re.test(summary))?.[0] ?? "\uC5C5\uD669";
function byline(t) {
  if (!t) return t;
  const out = t.replace(/^\|?\s*[^|]{0,24}기자\s*\|\s*/u, "").replace(/^\[[^\]]{0,24}\]\s*/u, "").replace(/^(?:\p{L}{2,12}\s)?[가-힣]{2,4}\s?기자\s*=\s*|^\p{L}{2,12}\s[가-힣]{2,4}\s기자\s+/u, "").trim();
  return out.length >= 8 ? out : t;
}
var idOf = (url) => {
  let h = 2166136261;
  for (const c of url) {
    h ^= c.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return "nv-" + (h >>> 0).toString(36);
};
var plain = (s) => decode(s.replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim();
function naverItems(reply, code, name) {
  const items = reply?.items;
  if (!Array.isArray(items)) return [];
  const out = [], seen = /* @__PURE__ */ new Set(), names = namesOf(code, name);
  for (const r of items) {
    if (typeof r?.title !== "string" || typeof r.pubDate !== "string") continue;
    const t = Date.parse(r.pubDate), title = plain(r.title);
    const url = typeof r.originallink === "string" && /^https?:\/\//.test(r.originallink) ? r.originallink : typeof r.link === "string" && /^https?:\/\//.test(r.link) ? r.link : null;
    if (!Number.isFinite(t) || !url || !title || !names.some((n) => namesCompany(n, title))) continue;
    const key = title.replace(/\[[^\]]*\]|\([^)]*\)|[^\p{L}\p{N}]/gu, "");
    if (seen.has(key)) continue;
    seen.add(key);
    const summary = byline(excerpt(typeof r.description === "string" ? r.description : null));
    out.push({ id: idOf(url), code, title, summary, press: pressOf(url), publishedAt: new Date(t).toISOString(), url, theme: themeOf(title, summary) });
  }
  return out.sort((a, b) => a.publishedAt < b.publishedAt ? 1 : -1);
}

// db/functions/news-feed/index.ts
var cors = { "access-control-allow-origin": "*", "access-control-allow-headers": "authorization, apikey, content-type, x-client-info", "access-control-allow-methods": "POST, OPTIONS" };
var json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "content-type": "application/json" } });
var FRESH_MS = 30 * 6e4;
var MAX_STOCKS = 20;
var PER_STOCK = 8;
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  const url = Deno.env.get("SUPABASE_URL"), key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const id = Deno.env.get("NAVER_API_HUB_CLIENT_ID"), secret = Deno.env.get("NAVER_API_HUB_CLIENT_SECRET");
  if (!id || !secret) return json({ error: "no-news-key" }, 503);
  const me = await (await fetch(`${url}/auth/v1/user`, { headers: { apikey: key, authorization: req.headers.get("authorization") ?? "" } })).json().catch(() => null);
  if (!me?.id) return json({ error: "sign-in" }, 401);
  const inv = await fetch(`${url}/rest/v1/invite_uses?player_id=eq.${me.id}&select=player_id`, { headers: { apikey: key, authorization: `Bearer ${key}` } }).catch(() => null);
  if (!inv?.ok || !(await inv.json()).length) return json({ error: "invite" }, 403);
  const { stocks } = await req.json().catch(() => ({}));
  const list = (Array.isArray(stocks) ? stocks : []).filter((s) => typeof s?.code === "string" && /^\d{6}$/.test(s.code) && typeof s.name === "string" && s.name.length > 0 && s.name.length <= 30).filter((s, i, a) => a.findIndex((x) => x.code === s.code) === i).slice(0, MAX_STOCKS);
  if (!list.length) return json({ news: {}, errors: [] });
  const db = { apikey: key, authorization: `Bearer ${key}`, "content-type": "application/json" };
  const cached = /* @__PURE__ */ new Map();
  const r0 = await fetch(`${url}/rest/v1/news_cache?code=in.(${list.map((s) => s.code).join(",")})&select=code,name,items,fetched_at`, { headers: db }).catch(() => null);
  if (r0?.ok) for (const r of await r0.json()) cached.set(r.code, r);
  const news = {}, errors = [], fresh = [];
  await Promise.all(list.map(async (s) => {
    const c = cached.get(s.code);
    if (c && c.name === s.name && Date.now() - Date.parse(c.fetched_at) < FRESH_MS) {
      news[s.code] = c.items.slice(0, PER_STOCK);
      return;
    }
    try {
      const r = await fetch(`${NAVER_NEWS_URL}?${new URLSearchParams(naverQuery(s.name, s.code))}`, { headers: { "X-NCP-APIGW-API-KEY-ID": id, "X-NCP-APIGW-API-KEY": secret } });
      if (!r.ok) throw new Error(String(r.status));
      const items = naverItems(await r.json(), s.code, s.name);
      fresh.push({ code: s.code, name: s.name, items, fetched_at: (/* @__PURE__ */ new Date()).toISOString() });
      news[s.code] = items.slice(0, PER_STOCK);
    } catch {
      errors.push(s.code);
      if (c) news[s.code] = c.items.slice(0, PER_STOCK);
    }
  }));
  if (fresh.length) await fetch(`${url}/rest/v1/news_cache`, { method: "POST", headers: { ...db, prefer: "resolution=merge-duplicates" }, body: JSON.stringify(fresh) }).catch(() => null);
  return json({ news, errors });
});
