// built from db/functions/portfolio-read/index.ts by tools/build-functions.mjs. Do not edit; rebuild.

// app/core/llmModel.ts
var VISION_DEFAULT = "gpt-4.1-mini";
var isReasoning = (model) => /^(gpt-[5-9]|o\d)/.test(model);
function chatBody(model, messages, o) {
  return isReasoning(model) ? { model, messages, max_completion_tokens: o.out * 4 + 400, reasoning_effort: o.effort ?? "low" } : { model, messages, max_tokens: o.out, ...o.temperature != null ? { temperature: o.temperature } : {} };
}

// app/core/capture.ts
var CAPTURE = { maxSide: 1600, maxBytes: 25e5, maxRows: 30 };
function capturePrompt() {
  return [
    '\uB108\uB294 \uC99D\uAD8C \uC571 "\uBCF4\uC720 \uC885\uBAA9" \uD654\uBA74 \uCEA1\uCC98\uC5D0\uC11C \uC885\uBAA9 \uBAA9\uB85D\uB9CC \uC77D\uB294 \uB3C4\uAD6C\uB2E4.',
    "\uD654\uBA74\uC5D0 \uBCF4\uC774\uB294 \uBAA8\uB4E0 \uBCF4\uC720 \uC885\uBAA9\uC744 \uC704\uC5D0\uC11C \uC544\uB798 \uC21C\uC11C\uB85C \uBE60\uC9D0\uC5C6\uC774 \uC77D\uB294\uB2E4. \uD55C \uD654\uBA74\uC5D0 \uC5EC\uB7EC \uC885\uBAA9\uC774 \uC788\uB294 \uAC83\uC774 \uBCF4\uD1B5\uC774\uB2E4.",
    "\uAC01 \uC885\uBAA9\uB9C8\uB2E4 \uC885\uBAA9\uBA85, \uC218\uC775\uB960(%), \uBCF4\uC720 \uC218\uB7C9(\uC8FC), \uD3C9\uADE0 \uB9E4\uC785\uAC00(\uC6D0)\uB97C \uC77D\uB294\uB2E4. \uD654\uBA74\uC5D0 \uC5C6\uB294 \uAC12\uC740 null\uB85C \uB454\uB2E4. \uCD94\uCE21\uD574\uC11C \uCC44\uC6B0\uC9C0 \uC54A\uB294\uB2E4.",
    "\uC218\uC775\uB960\uC740 \uBD80\uD638\uB97C \uC9C0\uD0A8\uB2E4(\uBE68\uAC15\xB7+\uB294 \uC591\uC218, \uD30C\uB791\xB7-\uB294 \uC74C\uC218). \uD3C9\uAC00\uC190\uC775 \uAE08\uC561(\uC6D0)\uC744 \uC218\uC775\uB960\uB85C \uCC29\uAC01\uD558\uC9C0 \uC54A\uB294\uB2E4.",
    "\uACC4\uC88C\uBC88\uD638, \uC0AC\uB78C \uC774\uB984, \uCD1D \uD3C9\uAC00\uAE08\uC561, \uC608\uC218\uAE08\uC740 \uC808\uB300 \uCD9C\uB825\uD558\uC9C0 \uC54A\uB294\uB2E4. \uC885\uBAA9\uC774 \uC544\uB2CC \uC904(\uD569\uACC4, \uAD11\uACE0, \uBA54\uB274)\uC740 \uBE80\uB2E4.",
    'JSON \uBC30\uC5F4\uB9CC \uCD9C\uB825\uD55C\uB2E4. \uC6D0\uC18C: {"name":\uC885\uBAA9\uBA85,"rate":\uC22B\uC790|null,"quantity":\uC22B\uC790|null,"price":\uC22B\uC790|null}. \uC885\uBAA9\uC774 \uD558\uB098\uB3C4 \uC5C6\uC73C\uBA74 [].'
  ].join("\n");
}
var num = (v) => {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v.replace(/[,%원주\s+]/g, ""));
    return Number.isFinite(n) ? n : null;
  }
  return null;
};
function parseCapture(raw) {
  let v;
  try {
    v = JSON.parse(raw.replace(/^```(json)?|```$/g, "").trim());
  } catch {
    return null;
  }
  if (!Array.isArray(v)) return null;
  const seen = /* @__PURE__ */ new Set(), out = [];
  for (const x of v) {
    if (!x || typeof x.name !== "string") continue;
    const name = x.name.replace(/\s+/g, " ").trim().slice(0, 30);
    if (name.length < 1 || /^[\d\s-]+$/.test(name) || /계좌|합계|총\s?평가|예수금/.test(name) || seen.has(name)) continue;
    const rate = num(x.rate), q = num(x.quantity), p = num(x.price);
    out.push({ name, rate: rate != null && rate > -100 && rate < 1e4 ? Math.round(rate * 100) / 100 : 0, ...q != null && q > 0 && q < 1e9 ? { quantity: Math.round(q) } : {}, ...p != null && p > 0 && p < 1e9 ? { price: Math.round(p) } : {} });
    seen.add(name);
    if (out.length >= CAPTURE.maxRows) break;
  }
  return out;
}

// app/core/jigi/stocks.ts
var EPOCH = Date.UTC(2014, 0, 1);
var END = Date.UTC(2029, 0, 1);

// app/core/jigi/llm.ts
var LLM_LIMIT = {
  perDay: 40,
  text: 1200
  /* characters of a journal sent */
};

// db/functions/portfolio-read/index.ts
var cors = { "access-control-allow-origin": "*", "access-control-allow-headers": "authorization, apikey, content-type, x-client-info", "access-control-allow-methods": "POST, OPTIONS" };
var json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "content-type": "application/json" } });
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  const url = Deno.env.get("SUPABASE_URL"), key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"), openai = Deno.env.get("OPENAI_API_KEY");
  if (!openai) return json({ error: "no-llm" }, 503);
  const me = await (await fetch(`${url}/auth/v1/user`, { headers: { apikey: key, authorization: req.headers.get("authorization") ?? "" } })).json().catch(() => null);
  if (!me?.id) return json({ error: "sign-in" }, 401);
  const { image } = await req.json().catch(() => ({}));
  if (typeof image !== "string" || !/^data:image\/(jpeg|png|webp);base64,/.test(image) || image.length > CAPTURE.maxBytes * 1.4) return json({ error: "bad-image" }, 400);
  const day = new Date(Date.now() + 9 * 36e5).toISOString().slice(0, 10);
  const take = await fetch(`${url}/rest/v1/rpc/llm_take`, { method: "POST", headers: { apikey: key, authorization: `Bearer ${key}`, "content-type": "application/json" }, body: JSON.stringify({ p: me.id, d: day, cap: LLM_LIMIT.perDay }) });
  if (!take.ok || !await take.json()) return json({ error: "limit" }, 429);
  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { authorization: `Bearer ${openai}`, "content-type": "application/json" },
    body: JSON.stringify(chatBody(
      Deno.env.get("OPENAI_VISION_MODEL") ?? VISION_DEFAULT,
      [{ role: "system", content: capturePrompt() }, { role: "user", content: [{ type: "text", text: "\uC774 \uCEA1\uCC98\uC758 \uBCF4\uC720 \uC885\uBAA9\uC744 \uC77D\uC5B4 \uC918." }, { type: "image_url", image_url: { url: image, detail: "high" } }] }],
      { out: 1500, temperature: 0 }
    ))
  });
  if (!r.ok) return json({ error: "llm" }, 502);
  const holdings = parseCapture((await r.json())?.choices?.[0]?.message?.content ?? "");
  return holdings ? json({ holdings }) : json({ error: "unreadable" }, 422);
});
