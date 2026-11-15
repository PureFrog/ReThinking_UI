// built from db/functions/friend-chat/index.ts by tools/build-functions.mjs. Do not edit; rebuild.

// app/core/friend.ts
var FRIEND_TALK = {
  maxIn: 200,
  history: 10,
  perDay: 30
  /* answers a day */
};
function friendPrompt(c, history, message) {
  const garden = [
    c.holdings.length ? `\uC815\uC6D0\uC5D0 \uC788\uB294 \uC885\uBAA9: ${c.holdings.slice(0, 8).join(", ")}` : "\uC815\uC6D0\uC5D0 \uC544\uC9C1 \uC885\uBAA9\uC774 \uC5C6\uC74C",
    c.due ? `\uCC44\uC810 \uB098\uC628 \uD310\uB2E8 ${c.due}\uAC1C` : "",
    c.signal ? `${c.signal.analyst}\uAC00 ${c.signal.name}\uC5D0\uC11C \uC2E0\uD638\uB97C \uC9DA\uC74C` : ""
  ].filter(Boolean).join(" / ");
  const system = [
    '\uB108\uB294 "\uBCF4\uB9AC"\uC57C. \uD22C\uC790 \uD310\uB2E8 \uAE30\uB85D \uC571 rethinking!\uC758 \uC815\uC6D0\uC5D0 \uC0AC\uB294 \uAE30\uB2C8\uD53C\uADF8 \uCE5C\uAD6C. \uBD84\uC11D\uAC00\uAC00 \uC544\uB2C8\uB77C \uC218\uB2E4 \uB5A0\uB294 \uCE5C\uAD6C\uC57C.',
    "\uB9D0\uD22C: \uBC18\uB9D0, \uC9E7\uACE0 \uBE60\uB974\uACE0 \uB2E4\uC815\uD558\uACE0 \uC0B4\uC9DD \uCC38\uACAC\uC7C1\uC774. \uD55C\uB450 \uBB38\uC7A5, 80\uC790 \uC548\uCABD. \uC774\uBAA8\uC9C0\xB7\uB290\uB08C\uD45C \uB0A8\uBC1C \uAE08\uC9C0.",
    '\uC808\uB300 \uD558\uC9C0 \uC54A\uB294 \uAC83: \uC0AC\uB77C/\uD314\uC544/\uB9E4\uC218/\uB9E4\uB3C4/\uC190\uC808 \uAC19\uC740 \uB9E4\uB9E4 \uAD8C\uC720, "\uC624\uB97C \uAC70\uC57C" "\uB5A8\uC5B4\uC9C8 \uAC70\uC57C" \uAC19\uC740 \uAC00\uACA9 \uC608\uCE21, \uBAA9\uD45C\uAC00, \uC218\uC775 \uC57D\uC18D.',
    '\uC885\uBAA9 \uD310\uB2E8\uC744 \uBB3C\uC73C\uBA74 "\uADF8\uAC74 \uB124\uAC00 \uC815\uD560 \uC77C"\uC774\uB77C\uACE0 \uD558\uACE0, \uBD84\uC11D\uAC00 \uB178\uD2B8(\uD1A0\uB9AC\xB7\uBAA8\uC544\xB7\uB8E8\uC628)\uB098 \uC77C\uC9C0\uB97C \uBCF4\uB77C\uACE0 \uB3CC\uB824 \uB9D0\uD574.',
    "\uBAA8\uB974\uB294 \uC0AC\uC2E4\uC740 \uC9C0\uC5B4\uB0B4\uC9C0 \uB9D0\uACE0 \uBAA8\uB978\uB2E4\uACE0 \uD574. \uAC1C\uC778\uC815\uBCF4(\uC2E4\uBA85, \uACC4\uC88C, \uBE44\uBC00\uBC88\uD638)\uB97C \uBB3B\uC9C0 \uB9C8.",
    `\uC624\uB298 \uC815\uC6D0: ${garden}. \uC9C0\uAE08 ${c.hour}\uC2DC.`
  ].join("\n");
  return [
    { role: "system", content: system },
    ...history.slice(-FRIEND_TALK.history).map((l) => ({ role: l.who === "bori" ? "assistant" : "user", content: l.text })),
    { role: "user", content: message.slice(0, FRIEND_TALK.maxIn) }
  ];
}
var UNSAFE = /(^|\s)(사라|사 둬|사둬|사 봐|팔아|팔라|팔 때|살 때|물타기|풀매수|몰빵)|매수|매도|손절|익절|오를\s?거|오른다|오를 것|떨어질\s?거|떨어진다|떨어질 것|목표가|수익\s?보장/;
var friendSafe = (text) => {
  const t = text.trim().slice(0, 160);
  return !t || UNSAFE.test(t) ? "\uC74C, \uADF8\uAC74 \uB0B4\uAC00 \uB9D0\uD560 \uAC8C \uC544\uB2C8\uC57C. \uBD84\uC11D\uAC00 \uB178\uD2B8 \uBCF4\uACE0 \uB124\uAC00 \uC815\uD574 \uBD10." : t;
};

// db/functions/friend-chat/index.ts
var cors = { "access-control-allow-origin": "*", "access-control-allow-headers": "authorization, apikey, content-type, x-client-info", "access-control-allow-methods": "POST, OPTIONS" };
var json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "content-type": "application/json" } });
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  const url = Deno.env.get("SUPABASE_URL"), key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"), openai = Deno.env.get("OPENAI_API_KEY");
  if (!openai) return json({ error: "no-llm" }, 503);
  const me = await (await fetch(`${url}/auth/v1/user`, { headers: { apikey: key, authorization: req.headers.get("authorization") ?? "" } })).json().catch(() => null);
  if (!me?.id) return json({ error: "sign-in" }, 401);
  const { ctx, history, message } = await req.json().catch(() => ({}));
  if (!ctx || typeof message !== "string" || !message.trim()) return json({ error: "bad-request" }, 400);
  const day = new Date(Date.now() + 9 * 36e5).toISOString().slice(0, 10);
  const take = await fetch(`${url}/rest/v1/rpc/friend_talk_take`, {
    method: "POST",
    headers: { apikey: key, authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({ p: me.id, d: day, cap: FRIEND_TALK.perDay })
  });
  if (!take.ok) return json({ error: "count" }, 500);
  if (!await take.json()) return json({ text: "\uC624\uB298\uC740 \uC218\uB2E4 \uB9CE\uC774 \uB5A8\uC5C8\uB2E4! \uB0B4\uC77C \uB610 \uC598\uAE30\uD558\uC790.", limit: true });
  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { authorization: `Bearer ${openai}`, "content-type": "application/json" },
    body: JSON.stringify({ model: Deno.env.get("OPENAI_MODEL") ?? "gpt-4.1-mini", messages: friendPrompt(ctx, (history ?? []).filter((l) => l && typeof l.text === "string"), message), max_tokens: 160, temperature: 0.8 })
  });
  if (!r.ok) return json({ error: "llm" }, 502);
  const out = await r.json();
  return json({ text: friendSafe(out?.choices?.[0]?.message?.content ?? "") });
});
