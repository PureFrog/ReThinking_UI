// built from db/functions/portfolio-read/index.ts by tools/build-functions.mjs. Do not edit; rebuild.

// app/core/llmModel.ts
var VISION_DEFAULT = "gpt-4.1-mini";
var isReasoning = (model) => /^(gpt-[5-9]|o\d)/.test(model);
function chatBody(model, messages, o) {
  return isReasoning(model) ? { model, messages, max_completion_tokens: o.out * 4 + 400, reasoning_effort: !o.effort || o.effort === "minimal" ? "low" : o.effort } : { model, messages, max_tokens: o.out, ...o.temperature != null ? { temperature: o.temperature } : {} };
}

// app/core/capture.ts
var CAPTURE = { maxSide: 1600, maxBytes: 25e5, maxRows: 30 };
function capturePrompt() {
  return [
    '\uB108\uB294 \uC99D\uAD8C \uC571 "\uBCF4\uC720 \uC885\uBAA9" \uD654\uBA74 \uCEA1\uCC98\uC5D0\uC11C \uC885\uBAA9 \uBAA9\uB85D\uB9CC \uC77D\uB294 \uB3C4\uAD6C\uB2E4.',
    "\uD654\uBA74\uC5D0 \uBCF4\uC774\uB294 \uBAA8\uB4E0 \uBCF4\uC720 \uC885\uBAA9\uC744 \uC704\uC5D0\uC11C \uC544\uB798 \uC21C\uC11C\uB85C \uBE60\uC9D0\uC5C6\uC774 \uC77D\uB294\uB2E4. \uD55C \uD654\uBA74\uC5D0 \uC5EC\uB7EC \uC885\uBAA9\uC774 \uC788\uB294 \uAC83\uC774 \uBCF4\uD1B5\uC774\uB2E4.",
    "\uAC01 \uC885\uBAA9\uB9C8\uB2E4 \uC885\uBAA9\uBA85, \uC218\uC775\uB960(%), \uBCF4\uC720 \uC218\uB7C9(\uC8FC), \uD3C9\uADE0 \uB9E4\uC785\uAC00(\uC6D0)\uB97C \uC77D\uB294\uB2E4. \uD654\uBA74\uC5D0 \uC5C6\uB294 \uAC12\uC740 null\uB85C \uB454\uB2E4. \uCD94\uCE21\uD574\uC11C \uCC44\uC6B0\uC9C0 \uC54A\uB294\uB2E4.",
    "\uC218\uC775\uB960\uC740 \uBD80\uD638\uB97C \uC9C0\uD0A8\uB2E4(\uBE68\uAC15\xB7+\uB294 \uC591\uC218, \uD30C\uB791\xB7-\uB294 \uC74C\uC218). \uD3C9\uAC00\uC190\uC775 \uAE08\uC561(\uC6D0)\uC744 \uC218\uC775\uB960\uB85C \uCC29\uAC01\uD558\uC9C0 \uC54A\uB294\uB2E4.",
    "\uC218\uC775\uB960\uC740 \uB0B4 \uD3C9\uADE0 \uB9E4\uC785\uAC00 \uB300\uBE44 \uC218\uC775\uB960\uC774\uB2E4. \uD604\uC7AC\uAC00 \uC606\uC758 \uB4F1\uB77D\uB960(\uC624\uB298 \uD558\uB8E8 \uC8FC\uAC00 \uBCC0\uB3D9)\uC740 \uC218\uC775\uB960\uC774 \uC544\uB2C8\uB2E4: \uADF8\uB7F0 \uD654\uBA74\uC774\uBA74 rate\uB294 null\uB85C \uB450\uACE0 \uD604\uC7AC\uAC00\uB97C current\uC5D0 \uC801\uB294\uB2E4.",
    "\uACC4\uC88C\uBC88\uD638, \uC0AC\uB78C \uC774\uB984, \uCD1D \uD3C9\uAC00\uAE08\uC561, \uC608\uC218\uAE08\uC740 \uC808\uB300 \uCD9C\uB825\uD558\uC9C0 \uC54A\uB294\uB2E4. \uC885\uBAA9\uC774 \uC544\uB2CC \uC904(\uD569\uACC4, \uAD11\uACE0, \uBA54\uB274)\uC740 \uBE80\uB2E4.",
    'JSON \uBC30\uC5F4\uB9CC \uCD9C\uB825\uD55C\uB2E4. \uC6D0\uC18C: {"name":\uC885\uBAA9\uBA85,"rate":\uC22B\uC790|null,"quantity":\uC22B\uC790|null,"price":\uD3C9\uADE0 \uB9E4\uC785\uAC00 \uC22B\uC790|null,"current":\uD604\uC7AC\uAC00 \uC22B\uC790|null}. \uC885\uBAA9\uC774 \uD558\uB098\uB3C4 \uC5C6\uC73C\uBA74 [].'
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
    const q = num(x.quantity), p = num(x.price), cur = num(x.current);
    const rate = p != null && p > 0 && cur != null && cur > 0 ? (cur / p - 1) * 100 : num(x.rate);
    out.push({ name, rate: rate != null && rate > -100 && rate < 1e4 ? Math.round(rate * 100) / 100 : 0, ...q != null && q > 0 && q < 1e9 ? { quantity: Math.round(q) } : {}, ...p != null && p > 0 && p < 1e9 ? { price: Math.round(p) } : {} });
    seen.add(name);
    if (out.length >= CAPTURE.maxRows) break;
  }
  return out;
}

// app/content/kosdaq120.ts
var KOSDAQ120 = [
  { code: "095270", name: "\uC6E8\uC774\uBE0C\uC77C\uB809\uD2B8\uB85C", listed: true },
  { code: "217730", name: "\uAC15\uC2A4\uD15C\uBC14\uC774\uC624\uD14D", listed: true },
  { code: "018290", name: "\uBE0C\uC774\uD2F0\uC9C0\uC5E0\uD53C", listed: true },
  { code: "036560", name: "\uC601\uD48D\uC815\uBC00", listed: true },
  { code: "086820", name: "\uBC14\uC774\uC624\uC194\uB8E8\uC158", listed: true },
  { code: "028300", name: "\uC5D0\uC774\uCE58\uC5D8\uBE44", listed: true },
  { code: "125210", name: "\uC544\uBAA8\uADF8\uB9B0\uD14D", listed: true },
  { code: "136480", name: "\uD558\uB9BC", listed: true },
  { code: "200670", name: "\uD734\uBA54\uB515\uC2A4", listed: true },
  { code: "225190", name: "\uC0BC\uC591\uC635\uD2F1\uC2A4", listed: true },
  { code: "078150", name: "HB\uD14C\uD06C\uB180\uB7EC\uC9C0", listed: true },
  { code: "023410", name: "\uC720\uC9C4\uAE30\uC5C5", listed: true },
  { code: "078130", name: "\uAD6D\uC77C\uC81C\uC9C0", listed: true },
  { code: "095700", name: "\uC81C\uB125\uC2E0", listed: true },
  { code: "222040", name: "\uCF54\uC2A4\uB9E5\uC2A4\uC5D4\uBE44\uD2F0", listed: true },
  { code: "151910", name: "\uB098\uB178\uC2A4", listed: false },
  { code: "014970", name: "\uC0BC\uB96D\uBB3C\uC0B0", listed: true },
  { code: "214150", name: "\uD074\uB798\uC2DC\uC2A4", listed: true },
  { code: "066970", name: "\uC5D8\uC564\uC5D0\uD504", listed: false },
  { code: "073110", name: "\uC5D8\uC5E0\uC5D0\uC2A4", listed: true },
  { code: "051500", name: "CJ\uD504\uB808\uC2DC\uC6E8\uC774", listed: true },
  { code: "108790", name: "\uC778\uD130\uD30C\uD06C", listed: false },
  { code: "065650", name: "\uBA54\uB514\uD504\uB860", listed: true },
  { code: "319660", name: "\uD53C\uC5D0\uC2A4\uCF00\uC774", listed: true },
  { code: "016250", name: "\uC774\uD14C\uD06C\uAC74\uC124", listed: true },
  { code: "030960", name: "\uC591\uC9C0\uC0AC", listed: true },
  { code: "023900", name: "\uD48D\uAD6D\uC8FC\uC815", listed: true },
  { code: "131390", name: "\uD53C\uC564\uC774\uC194\uB8E8\uC158", listed: false },
  { code: "121440", name: "\uACE8\uD504\uC874\uB274\uB518\uD640\uB529\uC2A4", listed: true },
  { code: "036630", name: "\uC138\uC885\uD154\uB808\uCF64", listed: true },
  { code: "267980", name: "\uB9E4\uC77C\uC720\uC5C5", listed: true },
  { code: "008290", name: "\uC6D0\uD48D\uBB3C\uC0B0", listed: false },
  { code: "065130", name: "\uD0D1\uC5D4\uC9C0\uB2C8\uC5B4\uB9C1", listed: true },
  { code: "052020", name: "\uC5D0\uC2A4\uD2F0\uD050\uBE0C", listed: true },
  { code: "095660", name: "\uB124\uC624\uC704\uC988", listed: true },
  { code: "048530", name: "\uC778\uD2B8\uB860\uBC14\uC774\uC624", listed: true },
  { code: "039440", name: "\uC5D0\uC2A4\uD2F0\uC544\uC774", listed: true },
  { code: "043370", name: "\uD3C9\uD654\uC815\uACF5", listed: true },
  { code: "290650", name: "\uC5D8\uC564\uC528\uBC14\uC774\uC624", listed: true },
  { code: "073070", name: "\uC5D0\uC2A4\uBAA8", listed: false },
  { code: "016670", name: "\uD3EC\uBE44\uC2A4\uD2F0\uC564\uC528", listed: true },
  { code: "042600", name: "\uC0C8\uB85C\uB2C9\uC2A4", listed: true },
  { code: "009730", name: "\uCF54\uC13C", listed: true },
  { code: "308100", name: "\uAE4C\uC2A4\uD154\uBC14\uC791", listed: true },
  { code: "056730", name: "\uD3EC\uC2A4\uB9C1\uD06C", listed: true },
  { code: "302550", name: "\uB9AC\uBA54\uB4DC", listed: true },
  { code: "126880", name: "\uC81C\uC774\uC5D4\uCF00\uC774\uD788\uD130", listed: true },
  { code: "134780", name: "\uD654\uC9C4", listed: false },
  { code: "004650", name: "\uCC3D\uD574\uC5D0\uD0C4\uC62C", listed: true },
  { code: "064800", name: "\uD544\uB9C1\uD06C", listed: true },
  { code: "112240", name: "\uC5D0\uC2A4\uC5D0\uD504\uC528", listed: false },
  { code: "034940", name: "\uC870\uC544\uC81C\uC57D", listed: true },
  { code: "004780", name: "\uB300\uB959\uC81C\uAD00", listed: true },
  { code: "087260", name: "\uBAA8\uBC14\uC77C\uC5B4\uD50C\uB77C\uC774\uC5B8\uC2A4", listed: true },
  { code: "140670", name: "\uC54C\uC5D0\uC2A4\uC624\uD1A0\uBA54\uC774\uC158", listed: true },
  { code: "083450", name: "GST", listed: true },
  { code: "189980", name: "\uD765\uAD6D\uC5D0\uD504\uC5D4\uBE44", listed: true },
  { code: "041590", name: "\uC82C\uBC31\uC2A4\uC9C0\uC624", listed: true },
  { code: "250000", name: "\uBCF4\uB77C\uD2F0\uC54C", listed: true },
  { code: "288620", name: "\uC5D0\uC2A4\uD4E8\uC5BC\uC140", listed: true },
  { code: "036170", name: "\uC528\uD2F0\uC820", listed: true },
  { code: "065680", name: "\uC6B0\uC8FC\uC77C\uB809\uD2B8\uB85C", listed: true },
  { code: "067570", name: "\uC5D4\uBE0C\uC774\uC5D0\uC774\uCE58\uCF54\uB9AC\uC544", listed: true },
  { code: "068330", name: "\uC77C\uC2E0\uBC14\uC774\uC624", listed: true },
  { code: "133750", name: "\uBA54\uAC00\uC5E0\uB514", listed: true },
  { code: "100030", name: "\uBAA8\uBC14\uC77C\uB9AC\uB354", listed: true },
  { code: "234100", name: "\uC138\uC6D0", listed: true },
  { code: "099750", name: "\uC774\uC9C0\uCF00\uC5B4\uD14D", listed: true },
  { code: "073640", name: "\uC0BC\uC6D0\uD14C\uD06C", listed: true },
  { code: "124560", name: "\uD0DC\uC6C5\uB85C\uC9C1\uC2A4", listed: true },
  { code: "241690", name: "\uC720\uB2C8\uD14C\uD06C\uB178", listed: true },
  { code: "062970", name: "\uD53C\uD53C\uC544\uC774", listed: true },
  { code: "123410", name: "\uCF54\uB9AC\uC544\uC5D0\uD504\uD2F0", listed: true },
  { code: "056700", name: "\uC2E0\uD654\uC778\uD130\uD14D", listed: true },
  { code: "238200", name: "\uBE44\uD53C\uB3C4", listed: true },
  { code: "052860", name: "\uC544\uC774\uC564\uC528", listed: true },
  { code: "122310", name: "\uC81C\uB178\uB808\uC774", listed: true },
  { code: "088910", name: "\uB3D9\uC6B0\uD31C\uD22C\uD14C\uC774\uBE14", listed: true },
  { code: "083500", name: "\uC5D0\uD504\uC5D4\uC5D0\uC2A4\uD14C\uD06C", listed: true },
  { code: "049080", name: "\uAE30\uAC00\uB808\uC778", listed: true },
  { code: "072950", name: "\uBE5B\uC0D8\uC804\uC790", listed: true },
  { code: "264850", name: "\uC774\uB79C\uC2DC\uC2A4", listed: true },
  { code: "317830", name: "\uC5D0\uC2A4\uD53C\uC2DC\uC2A4\uD15C\uC2A4", listed: true },
  { code: "141020", name: "\uD3EC\uD2F0\uC2A4", listed: false },
  { code: "226440", name: "\uD55C\uC1A1\uB124\uC624\uD14D", listed: false },
  { code: "094190", name: "\uC774\uC5D8\uCF00\uC774", listed: false },
  { code: "126600", name: "BGF\uC5D0\uCF54\uBA38\uD2F0\uB9AC\uC5BC\uC988", listed: true },
  { code: "060300", name: "\uB808\uB4DC\uB85C\uBC84", listed: false },
  { code: "001000", name: "\uC2E0\uB77C\uC12C\uC720", listed: true },
  { code: "096610", name: "\uC54C\uC5D0\uD504\uC138\uBBF8", listed: false },
  { code: "204840", name: "\uC9C0\uC5D8\uD31C\uD14D", listed: true },
  { code: "058220", name: "\uC544\uB9AC\uC628", listed: false },
  { code: "054300", name: "\uD32C\uC2A4\uD0C0\uC5D4\uD130\uD504\uB77C\uC774\uC988", listed: true },
  { code: "035460", name: "\uAE30\uC0B0\uD154\uB808\uCF64", listed: true },
  { code: "218150", name: "\uBBF8\uB798\uC0DD\uBA85\uC790\uC6D0", listed: true },
  { code: "093380", name: "\uD48D\uAC15", listed: true },
  { code: "317770", name: "\uC288\uD504\uB9AC\uB9C8\uC544\uC774\uB514", listed: true },
  { code: "072470", name: "\uC6B0\uB9AC\uC0B0\uC5C5\uD640\uB529\uC2A4", listed: true },
  { code: "083650", name: "\uBE44\uC5D0\uC774\uCE58\uC544\uC774", listed: true },
  { code: "263540", name: "\uC0D8\uCF54", listed: false },
  { code: "032580", name: "\uD53C\uB378\uB9AD\uC2A4", listed: true },
  { code: "054340", name: "\uD53C\uC564\uD154", listed: false },
  { code: "131220", name: "\uB300\uD55C\uACFC\uD559", listed: true },
  { code: "030270", name: "\uC5D0\uC2A4\uB9C8\uD06C", listed: false },
  { code: "170030", name: "\uD604\uB300\uACF5\uC5C5", listed: true },
  { code: "053660", name: "\uD604\uC9C4\uC18C\uC7AC", listed: false },
  { code: "092600", name: "\uC564\uC528\uC564", listed: true },
  { code: "265560", name: "\uC601\uD654\uD14C\uD06C", listed: true },
  { code: "158310", name: "\uC2A4\uD0C0\uBAA8\uBE4C\uB9AC\uD2F0", listed: false },
  { code: "091440", name: "\uD154\uB808\uD544\uB4DC", listed: true },
  { code: "069330", name: "\uC720\uC544\uC774\uB514", listed: true },
  { code: "072770", name: "\uC728\uD638", listed: true },
  { code: "043910", name: "\uC790\uC5F0\uACFC\uD658\uACBD", listed: true },
  { code: "010470", name: "\uC624\uB9AC\uCF64", listed: true },
  { code: "054630", name: "\uC5D0\uC774\uB514\uCE69\uC2A4", listed: false },
  { code: "027580", name: "\uC0C1\uBCF4", listed: true },
  { code: "039670", name: "\uD55C\uB958\uD0C0\uC784\uC988", listed: false },
  { code: "031860", name: "\uC5D4\uC5D0\uC2A4\uC5D4", listed: true },
  { code: "089150", name: "\uCF00\uC774\uC528\uD2F0", listed: true },
  { code: "082850", name: "\uC6B0\uB9AC\uBC14\uC774\uC624", listed: true }
];
var KOSDAQ_LISTED = KOSDAQ120.filter((s) => s.listed);

// app/core/jigi/stocks.ts
var KOSDAQ_STOCKS = KOSDAQ_LISTED.map((k) => {
  const n = parseInt(k.code.replace(/\D/g, ""), 10) || 1;
  const anchor = Math.round((2e3 + n * 7919 % 58e3) / 50) * 50;
  return { code: k.code, name: k.name, mkt: "KOSDAQ", anchor, vol: 0.045 };
});
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
  const inv = await fetch(`${url}/rest/v1/invite_uses?player_id=eq.${me.id}&select=player_id`, { headers: { apikey: key, authorization: `Bearer ${key}` } }).catch(() => null);
  if (!inv?.ok || !(await inv.json()).length) return json({ error: "invite" }, 403);
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
