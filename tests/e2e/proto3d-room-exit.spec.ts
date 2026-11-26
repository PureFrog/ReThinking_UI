import { test, expect } from "./fixtures";
// 피드백 2026-11-26: 거장의 집(·오락실)에서 마을로 나올 때 removeChild 에러가 없어야 한다
test.describe.configure({ timeout: 200_000 });
for (const mode of ["plain","book","arcade"]) test("exit "+mode, async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", e => errors.push(e.message+"\n"+(e.stack||"").split("\n").slice(0,12).join("\n")));
  page.on("console", m => { if (m.type()==="error") errors.push("console: "+m.text().slice(0,400)); });
  await page.addInitScript(() => Object.assign(window, { __localAuth: true, __noLanding: true, __noHouse: true, __noIntro: true, __noTutorial: true, __talkAll: true }));
  await page.addInitScript(() => { const o=Node.prototype.removeChild; Node.prototype.removeChild=function(this:any,c:any){ if(c.parentNode!==this){ const d=(n:any)=>n? (n.nodeName+"."+(n.className&&n.className.baseVal===undefined?n.className:"")+"#"+(n.dataset?.testid||"")+" parent="+(n.parentNode?n.parentNode.nodeName+"."+(n.parentNode.className||""):"none")+" conn="+n.isConnected):"null"; console.error("RMBAD this="+d(this)+" child="+d(c)+" html="+String(c.innerHTML||"").slice(0,300)+" T="+Date.now()); } return o.call(this,c) } as any; });
  await page.goto("/?demo&hour=10&weather=clear");
  await page.waitForFunction(() => (window as any).__proto3d?.ready, null, { timeout: 60_000 });
  await page.evaluate((m) => (window as any).__proto3d.landmark(m==="arcade"?"arcade":"master"), mode);
  await page.waitForTimeout(3000);
  await page.waitForTimeout(2500);
  if (mode==="book") { await page.evaluate(() => (window as any).__proto3d.study.pick("02")); await page.waitForTimeout(800); await page.keyboard.press("Escape"); await page.waitForTimeout(800); }
  if (mode==="talk") { await page.mouse.move(195,400); await page.waitForTimeout(500); }
  
  await page.locator(mode==="arcade"?".ac-out":".ms-door").first().click({force:true});
  await page.waitForTimeout(4000);
  
  expect(errors.filter(e=>/removeChild/.test(e))).toEqual([]);
});
