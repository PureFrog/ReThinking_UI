// built from db/functions/debate-chat/index.ts by tools/build-functions.mjs. Do not edit; rebuild.

// app/core/llmModel.ts
var LLM_DEFAULT = "gpt-6-luna";
var isReasoning = (model) => /^(gpt-[5-9]|o\d)/.test(model);
function chatBody(model, messages, o) {
  return isReasoning(model) ? { model, messages, max_completion_tokens: o.out * 4 + 400, reasoning_effort: !o.effort || o.effort === "minimal" ? "low" : o.effort } : { model, messages, max_tokens: o.out, ...o.temperature != null ? { temperature: o.temperature } : {} };
}

// app/core/friend.ts
var FRIEND_TALK = {
  maxIn: 200,
  history: 10,
  perDay: 30
  /* answers a day */
};
var UNSAFE = /(^|\s)(사라|사 둬|사둬|사 봐|팔아|팔라|팔 때|살 때|물타기|풀매수|몰빵)|매수|매도|손절|익절|오를\s?거|오른다|오를 것|떨어질\s?거|떨어진다|떨어질 것|목표가|수익\s?보장/;

// app/core/debate-chat.ts
function debatePrompt(c, history, message) {
  const s = c.stock;
  const about = !s ? "\uACE0\uB978 \uC885\uBAA9 \uC5C6\uC74C" : `${s.name}${s.code ? ` (${s.code})` : ""} \xB7 \uB0B4 \uC218\uC775\uB960 ${s.rate}% \xB7 ${s.real ? "\uC2E4\uC81C \uC2DC\uC138" : "\uC608\uC2DC \uC885\uBAA9(\uC22B\uC790\uB294 \uBAA8\uC758 \uB370\uC774\uD130)"}`;
  const notes = c.notes.length ? c.notes.slice(0, 8).map((n) => "- " + n).join("\n") : "- (\uC774 \uC885\uBAA9\uC5D0 \uB300\uD574 \uBAA8\uB378\uC774 \uC9DA\uC740 \uAC83 \uC5C6\uC74C)";
  const system = [
    '\uB108\uB294 "\uB8E8\uC628"\uC774\uC57C. \uD22C\uC790 \uD310\uB2E8 \uAE30\uB85D \uC571 rethinking!\uC758 \uD1A0\uB860 \uC0C1\uB300. \uC720\uC800\uAC00 \uC885\uBAA9\uC744 \uC65C \uAC16\uACE0 \uC788\uB294\uC9C0 \uB9D0\uD558\uBA74, \uBC18\uB300\uD3B8\uC5D0\uC11C \uC9C8\uBB38\uC744 \uB358\uC838 \uADF8 \uD310\uB2E8\uC744 \uB2E4\uC2DC \uC0DD\uAC01\uD574 \uBCF4\uAC8C \uD574.',
    "\uD558\uB294 \uC77C: \uC720\uC800 \uC774\uC720\uC758 \uBE48\uD2C8 \uD558\uB098\uB97C \uC9DA\uACE0, \uBC18\uB300 \uADFC\uAC70\uB97C \uCC3E\uC544\uBCF4\uAC8C \uD558\uAC70\uB098, \uC0DD\uAC01\uC744 \uBC14\uAFC0 \uC870\uAC74(\uC22B\uC790\xB7\uB0A0\uC9DC\xB7\uC0AC\uAC74)\uC744 \uC815\uD558\uAC8C \uBB3B\uB294\uB2E4. \uD55C \uBC88\uC5D0 \uC9C8\uBB38\uC740 \uD558\uB098.",
    '\uADFC\uAC70\uB294 \uC544\uB798 "\uBAA8\uB378\uC774 \uC9DA\uC740 \uAC83"\uACFC \uC720\uC800\uAC00 \uD55C \uB9D0\uB9CC \uC4F4\uB2E4. \uB274\uC2A4\xB7\uC2E4\uC801\xB7\uACF5\uC2DC \uAC19\uC740 \uC0AC\uC2E4\uC744 \uC9C0\uC5B4\uB0B4\uC9C0 \uC54A\uB294\uB2E4. \uBAA8\uB974\uBA74 \uBAA8\uB978\uB2E4\uACE0 \uD558\uACE0 \uD655\uC778\uD560 \uAC70\uB9AC\uB85C \uB3CC\uB9B0\uB2E4.',
    '\uC808\uB300 \uD558\uC9C0 \uC54A\uB294 \uAC83: \uC0AC\uB77C/\uD314\uC544/\uB9E4\uC218/\uB9E4\uB3C4/\uC190\uC808 \uAC19\uC740 \uB9E4\uB9E4 \uAD8C\uC720, "\uC624\uB97C \uAC70\uC57C" "\uB5A8\uC5B4\uC9C8 \uAC70\uC57C" \uAC19\uC740 \uAC00\uACA9 \uC608\uCE21, \uBAA9\uD45C\uAC00, \uC218\uC775 \uC57D\uC18D. \uACB0\uC815\uC740 \uC720\uC800 \uBAAB\uC774\uB77C\uACE0 \uB9D0\uD55C\uB2E4.',
    "\uB9D0\uD22C: \uBC18\uB9D0, \uCC28\uBD84\uD558\uACE0 \uAC74\uC870\uD558\uAC8C. \uB450 \uBB38\uC7A5 \uC548\uCABD, 120\uC790 \uC548\uCABD. \uC774\uBAA8\uC9C0 \uAE08\uC9C0.",
    `\uC885\uBAA9: ${about}`,
    `\uBAA8\uB378\uC774 \uC9DA\uC740 \uAC83:
${notes}`,
    `\uC9C0\uAE08 ${c.hour}\uC2DC.`
  ].join("\n");
  return [
    { role: "system", content: system },
    ...history.slice(-FRIEND_TALK.history).map((l) => ({ role: l.who === "bori" ? "assistant" : "user", content: l.text })),
    { role: "user", content: message.slice(0, FRIEND_TALK.maxIn) }
  ];
}
var debateSafe = (text) => {
  const t = text.trim().slice(0, 200);
  return !t || UNSAFE.test(t) ? "\u2026\uC0AC\uACE0\uD314\uC9C0\uB294 \uB124\uAC00 \uC815\uD574. \uB09C \uADF8 \uD310\uB2E8\uC774 \uC5B4\uB514\uC11C \uD2C0\uB9B4 \uC218 \uC788\uB294\uC9C0\uB9CC \uAC19\uC774 \uBCFC\uAC8C. \uC9C0\uAE08 \uC774\uC720\uAC00 \uAE68\uC9C0\uB294 \uC870\uAC74\uC740 \uBB50\uC57C?" : t;
};

// db/functions/debate-chat/index.ts
var cors = { "access-control-allow-origin": "*", "access-control-allow-headers": "authorization, apikey, content-type, x-client-info", "access-control-allow-methods": "POST, OPTIONS" };
var json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "content-type": "application/json" } });
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  const url = Deno.env.get("SUPABASE_URL"), key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"), openai = Deno.env.get("OPENAI_API_KEY");
  if (!openai) return json({ error: "no-llm" }, 503);
  const me = await (await fetch(`${url}/auth/v1/user`, { headers: { apikey: key, authorization: req.headers.get("authorization") ?? "" } })).json().catch(() => null);
  if (!me?.id) return json({ error: "sign-in" }, 401);
  const inv = await fetch(`${url}/rest/v1/invite_uses?player_id=eq.${me.id}&select=player_id`, { headers: { apikey: key, authorization: `Bearer ${key}` } }).catch(() => null);
  if (!inv?.ok || !(await inv.json()).length) return json({ error: "invite" }, 403);
  const { ctx, history, message } = await req.json().catch(() => ({}));
  if (!ctx || typeof message !== "string" || !message.trim()) return json({ error: "bad-request" }, 400);
  const safeCtx = { hour: Number(ctx.hour) || 0, stock: ctx.stock && typeof ctx.stock.name === "string" ? {
    name: ctx.stock.name.slice(0, 30),
    code: typeof ctx.stock.code === "string" ? ctx.stock.code.slice(0, 12) : null,
    real: !!ctx.stock.real,
    rate: Number(ctx.stock.rate) || 0
  } : null, notes: Array.isArray(ctx.notes) ? ctx.notes.filter((n) => typeof n === "string").slice(0, 8).map((n) => n.slice(0, 200)) : [] };
  const day = new Date(Date.now() + 9 * 36e5).toISOString().slice(0, 10);
  const take = await fetch(`${url}/rest/v1/rpc/friend_talk_take`, {
    method: "POST",
    headers: { apikey: key, authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({ p: me.id, d: day, cap: FRIEND_TALK.perDay })
  });
  if (!take.ok) return json({ error: "count" }, 500);
  if (!await take.json()) return json({ text: "\uC624\uB298\uC740 \uC598\uAE30 \uB9CE\uC774 \uD588\uB2E4. \uB0B4\uC77C \uC774\uC5B4\uC11C \uD558\uC790.", limit: true });
  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { authorization: `Bearer ${openai}`, "content-type": "application/json" },
    body: JSON.stringify(chatBody(Deno.env.get("OPENAI_MODEL") ?? LLM_DEFAULT, debatePrompt(safeCtx, (history ?? []).filter((l) => l && typeof l.text === "string"), message), { out: 220, temperature: 0.6, effort: "minimal" }))
  });
  if (!r.ok) return json({ error: "llm", status: r.status, detail: (await r.text().catch(() => "")).slice(0, 300) }, 502);
  const out = await r.json();
  return json({ text: debateSafe(out?.choices?.[0]?.message?.content ?? "") });
});
