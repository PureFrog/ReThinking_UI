// built from db/functions/jigi-llm/index.ts by tools/build-functions.mjs. Do not edit; rebuild.

// app/core/llmModel.ts
var LLM_DEFAULT = "gpt-6-luna";
var isReasoning = (model) => /^(gpt-[5-9]|o\d)/.test(model);
function chatBody(model, messages, o) {
  return isReasoning(model) ? { model, messages, max_completion_tokens: o.out * 4 + 400, reasoning_effort: o.effort ?? "low" } : { model, messages, max_tokens: o.out, ...o.temperature != null ? { temperature: o.temperature } : {} };
}

// app/core/jigi/stocks.ts
var EPOCH = Date.UTC(2014, 0, 1);
var END = Date.UTC(2029, 0, 1);

// app/core/jigi/extract.ts
var DOMAINS = ["\uBB3C\uAC00", "\uACBD\uAE30", "\uACE0\uC6A9", "\uD1B5\uD654\uC815\uCC45", "\uAD6D\uCC44\uAE08\uB9AC", "\uAE08\uB9AC\uC2A4\uD504\uB808\uB4DC", "\uD658\uC728", "\uC6D0\uC790\uC7AC", "\uAE30\uC5C5\uC2E4\uC801", "\uC8FC\uAC00", "\uC9C0\uC815\uD559", "\uB9E4\uB9E4\uD589\uB3D9"];
var FORMS = ["\uC218\uCE58", "\uBC29\uD5A5", "\uC608\uC0C1\uCE58 \uBE44\uAD50", "\uC0AC\uAC74 \uBC1C\uC0DD", "\uCD94\uC138", "\uC778\uACFC \uC8FC\uC7A5", "\uD589\uB3D9", "\uBC18\uB300 \uC2DC\uB098\uB9AC\uC624"];
var ROLES = ["\uCD5C\uCD08 \uC804\uC81C", "\uC911\uAC04 \uC804\uB2EC \uACFC\uC815", "\uC790\uC0B0\uAC00\uACA9 \uACB0\uACFC", "\uD589\uB3D9"];
var DIRS = ["\uC0C1\uC2B9", "\uD558\uB77D", "\uC5C6\uC74C"];

// app/core/jigi/llm.ts
var LLM_LIMIT = {
  perDay: 40,
  text: 1200
  /* characters of a journal sent */
};
var UNSAFE = /(^|\s)(사라|사 둬|팔아|팔라|물타기|풀매수|몰빵)|매수하세요|매도하세요|매수해|매도해|오를\s?거야|오른다고|떨어질\s?거야|목표가|수익\s?보장|실력이 (없|부족)|능력이 (없|부족)/;
var jigiSafe = (t) => !!t.trim() && !UNSAFE.test(t);
function extractPrompt(j) {
  return [
    { role: "system", content: [
      "\uB108\uB294 \uD22C\uC790\uC77C\uC9C0 \uC6D0\uBB38\uC744 \uAD6C\uC870\uD654\uD558\uB294 \uB3C4\uAD6C\uB2E4. \uC6D0\uBB38\uC5D0 \uC2E4\uC81C\uB85C \uC801\uD78C \uC608\uCE21\uACFC \uD589\uB3D9\uB9CC \uBB38\uC7A5 \uB2E8\uC704\uB85C \uBF51\uB294\uB2E4.",
      "\uC0C8 \uAC00\uC124\uC744 \uB9CC\uB4E4\uAC70\uB098 \uB17C\uB9AC \uC5F0\uACB0\uC744 \uBCF4\uD0DC\uC9C0 \uC54A\uB294\uB2E4. \uC6D0\uBB38\uC5D0 \uC5C6\uB294 \uAE30\uD55C\xB7\uC218\uCE58\xB7\uD655\uC2E0\uB3C4\uB294 \uCC44\uC6B0\uC9C0 \uC54A\uB294\uB2E4.",
      `JSON \uBC30\uC5F4\uB9CC \uCD9C\uB825\uD55C\uB2E4. \uC6D0\uC18C: {"text":\uC6D0\uBB38\uC5D0 \uAC00\uAE4C\uC6B4 \uD55C \uBB38\uC7A5,"src":"\uD575\uC2EC \uAC00\uC124"|"\uBC18\uB300 \uADFC\uAC70","domain":${JSON.stringify(DOMAINS)} \uC911 \uD558\uB098,"form":${JSON.stringify(FORMS)} \uC911 \uD558\uB098,"role":${JSON.stringify(ROLES)} \uC911 \uD558\uB098,"dir":"\uC0C1\uC2B9"|"\uD558\uB77D"|"\uC5C6\uC74C"}`,
      '\uC8FC\uC885\uBAA9 \uC8FC\uAC00\uC758 \uBC29\uD5A5 \uC608\uCE21\uB9CC domain "\uC8FC\uAC00"\xB7form "\uBC29\uD5A5"\uC73C\uB85C \uB454\uB2E4. \uBC18\uB300 \uADFC\uAC70\uC5D0\uC11C \uC628 \uBB38\uC7A5\uC740 form "\uBC18\uB300 \uC2DC\uB098\uB9AC\uC624"\uB2E4.'
    ].join("\n") },
    { role: "user", content: `\uC8FC\uC885\uBAA9: ${j.stock?.name ?? "\uBBF8\uC815"}
[\uD575\uC2EC \uAC00\uC124]
${j.f.hypo.slice(0, LLM_LIMIT.text)}
[\uBC18\uB300 \uADFC\uAC70]
${(j.f.opt.counter ?? "(\uC5C6\uC74C)").slice(0, LLM_LIMIT.text)}` }
  ];
}
function parseExtract(raw, j) {
  let v;
  try {
    v = JSON.parse(raw.replace(/^```(json)?|```$/g, "").trim());
  } catch {
    return null;
  }
  if (!Array.isArray(v)) return null;
  const src = (j.f.hypo + " " + (j.f.opt.counter ?? "")).replace(/\s+/g, "");
  const out = v.flatMap((h) => {
    if (!h || typeof h.text !== "string") return [];
    const text = h.text.trim().slice(0, 300);
    if (text.length < 4 || !jigiSafe(text)) return [];
    const chars = [...text.replace(/\s+/g, "")], seen = chars.filter((ch) => src.includes(ch)).length;
    if (seen / chars.length < 0.8) return [];
    const counter = h.src === "\uBC18\uB300 \uADFC\uAC70", form = counter ? "\uBC18\uB300 \uC2DC\uB098\uB9AC\uC624" : FORMS.includes(h.form) ? String(h.form) : "\uCD94\uC138";
    return [{
      text,
      src: counter ? "\uBC18\uB300 \uADFC\uAC70" : "\uD575\uC2EC \uAC00\uC124",
      domain: DOMAINS.includes(h.domain) ? String(h.domain) : "\uACBD\uAE30",
      form,
      role: ROLES.includes(h.role) ? String(h.role) : "\uC911\uAC04 \uC804\uB2EC \uACFC\uC815",
      dir: DIRS.includes(h.dir) ? h.dir : "\uC5C6\uC74C",
      endDate: counter || form === "\uD589\uB3D9" ? "" : j.f.checkDate
    }];
  });
  return out.length ? out : null;
}
function assistPrompt(j, block, title) {
  return [
    { role: "system", content: [
      "\uB108\uB294 \uD22C\uC790\uC77C\uC9C0 \uC791\uC131\uC744 \uB3D5\uB294\uB2E4. \uC0AC\uC6A9\uC790\uAC00 \uC2A4\uC2A4\uB85C \uC0DD\uAC01\uD558\uB3C4\uB85D \uC9C8\uBB38 2\uAC1C\uB9CC \uD55C\uAD6D\uC5B4 \uD574\uC694\uCCB4\uB85C \uC4F4\uB2E4.",
      "\uC9C8\uBB38\uC740 \uC774 \uC77C\uC9C0\uC758 \uC885\uBAA9\xB7\uAC00\uC124\xB7\uC774\uC720\uC5D0 \uB9DE\uCD98\uB2E4. \uB2F5\uC744 \uB300\uC2E0 \uC4F0\uC9C0 \uC54A\uACE0, \uBE44\uC911\xB7\uAC00\uACA9\xB7\uAE30\uAC04\xB7\uB9E4\uB9E4 \uC774\uC720\uB97C \uC9C0\uC5B4\uB0B4\uC9C0 \uC54A\uB294\uB2E4.",
      "\uC0AC\uB77C/\uD314\uB77C \uAC19\uC740 \uB9E4\uB9E4 \uAD8C\uC720\uC640 \uAC00\uACA9 \uC608\uCE21\uC740 \uD558\uC9C0 \uC54A\uB294\uB2E4. \uC9C8\uBB38 \uB450 \uC904\uB9CC \uCD9C\uB825\uD55C\uB2E4."
    ].join("\n") },
    { role: "user", content: `\uCE78: ${title} (${block})
\uC885\uBAA9: ${j.stock?.name ?? "\uBBF8\uC815"}
\uD55C \uC77C: ${j.f.action}
\uAC00\uC124: ${j.f.hypo.slice(0, 600)}
\uC774\uC720: ${j.f.reason.slice(0, 600)}` }
  ];
}
function parseAssist(raw) {
  const qs = raw.split("\n").map((s) => s.replace(/^[-\d.)\s]+/, "").trim()).filter((s) => s.length >= 6 && s.length <= 140 && jigiSafe(s)).slice(0, 2);
  return qs.length ? qs : null;
}
function explainPrompt(topic, facts) {
  return [
    { role: "system", content: [
      '\uD22C\uC790\uC77C\uC9C0 \uBD84\uC11D \uD654\uBA74\uC758 \uC124\uBA85 \uBB38\uB2E8\uC744 \uC4F4\uB2E4. "\uACC4\uC0B0 \uACB0\uACFC"\uB294 \uCF54\uB4DC\uAC00 \uACC4\uC0B0\uD55C \uC0AC\uC2E4\uC774\uB2E4. \uC774 \uC0AC\uC2E4\uB9CC \uC4F0\uACE0 \uC22B\uC790\uB97C \uC0C8\uB85C \uB9CC\uB4E4\uC9C0 \uC54A\uB294\uB2E4.',
      '2~3\uBB38\uC7A5, \uD55C\uAD6D\uC5B4 \uD574\uC694\uCCB4. \uAD00\uCC30\uB41C \uC0AC\uC2E4\uC744 \uBA3C\uC800 \uB9D0\uD558\uACE0, \uAC00\uB2A5\uD55C \uD574\uC11D\uC740 "~\uC77C \uC218 \uC788\uC5B4\uC694"\uB85C \uAD6C\uBD84\uD55C\uB2E4. \uC6D0\uC778\uC744 \uB2E8\uC815\uD558\uC9C0 \uC54A\uACE0 \uC0AC\uB78C\uC744 \uD3C9\uAC00\uD558\uC9C0 \uC54A\uB294\uB2E4.',
      "\uC801\uC911\uB960 \uC21C\uC704\uB97C \uB2A5\uB825 \uC21C\uC704\uB85C \uB9D0\uD558\uC9C0 \uC54A\uB294\uB2E4. \uD45C\uBCF8\uC774 \uC801\uC73C\uBA74 \uADF8 \uC810\uC744 \uB9D0\uD55C\uB2E4. \uB9E4\uB9E4 \uAD8C\uC720\uB098 \uAC00\uACA9 \uC608\uCE21\uC740 \uD558\uC9C0 \uC54A\uB294\uB2E4. \uBB38\uB2E8\uB9CC \uCD9C\uB825\uD55C\uB2E4."
    ].join("\n") },
    { role: "user", content: `\uC8FC\uC81C: ${topic}
\uACC4\uC0B0 \uACB0\uACFC: ${JSON.stringify(facts).slice(0, 2e3)}` }
  ];
}
function checkExplain(raw, facts) {
  const t = raw.trim().slice(0, 460);
  if (!jigiSafe(t) || t.length < 10) return null;
  const known = new Set((JSON.stringify(facts).match(/\d+(\.\d+)?/g) ?? []).map(Number));
  for (const n of (t.match(/\d+(\.\d+)?/g) ?? []).map(Number)) if (n !== 95 && !known.has(n)) return null;
  return t;
}

// db/functions/jigi-llm/index.ts
var cors = { "access-control-allow-origin": "*", "access-control-allow-headers": "authorization, apikey, content-type, x-client-info", "access-control-allow-methods": "POST, OPTIONS" };
var json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "content-type": "application/json" } });
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  const url = Deno.env.get("SUPABASE_URL"), key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"), openai = Deno.env.get("OPENAI_API_KEY");
  if (!openai) return json({ fallback: true, error: "no-llm" });
  const me = await (await fetch(`${url}/auth/v1/user`, { headers: { apikey: key, authorization: req.headers.get("authorization") ?? "" } })).json().catch(() => null);
  if (!me?.id) return json({ error: "sign-in" }, 401);
  const b = await req.json().catch(() => ({}));
  const messages = b.mode === "extract" && b.journal ? extractPrompt(b.journal) : b.mode === "assist" && b.journal && b.block ? assistPrompt(b.journal, b.block, b.title ?? b.block) : b.mode === "explain" && b.topic ? explainPrompt(b.topic, b.facts) : null;
  if (!messages) return json({ error: "bad-request" }, 400);
  const day = new Date(Date.now() + 9 * 36e5).toISOString().slice(0, 10);
  const take = await fetch(`${url}/rest/v1/rpc/llm_take`, {
    method: "POST",
    headers: { apikey: key, authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({ p: me.id, d: day, cap: LLM_LIMIT.perDay })
  });
  if (!take.ok || !await take.json()) return json({ fallback: true, limit: true });
  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { authorization: `Bearer ${openai}`, "content-type": "application/json" },
    body: JSON.stringify(chatBody(Deno.env.get("OPENAI_MODEL") ?? LLM_DEFAULT, messages, { out: b.mode === "extract" ? 700 : 260, temperature: b.mode === "extract" ? 0 : 0.4 }))
  });
  if (!r.ok) return json({ fallback: true, error: "llm" });
  const text = (await r.json())?.choices?.[0]?.message?.content ?? "";
  if (b.mode === "extract") {
    const d = parseExtract(text, b.journal);
    return json(d ? { drafts: d } : { fallback: true });
  }
  if (b.mode === "assist") {
    const q = parseAssist(text);
    return json(q ? { questions: q } : { fallback: true });
  }
  const t = checkExplain(text, b.facts);
  return json(t ? { text: t } : { fallback: true });
});
