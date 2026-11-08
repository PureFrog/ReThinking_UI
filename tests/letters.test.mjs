import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import ts from 'typescript';import {pathToFileURL} from 'node:url';
const dir=fs.mkdtempSync(new URL('../.letters-test-',import.meta.url));
for(const n of ['care','letters']){let code=ts.transpileModule(fs.readFileSync(new URL('../app/'+n+'.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText;code=code.replace(/from ['"]\.\/(\w[\w-]*)['"]/g,'from "./$1.mjs"');fs.writeFileSync(dir+'/'+n+'.mjs',code)}
const {monthlyLetter,dueLetter,letterLines,prevMonth}=await import(pathToFileURL(dir+'/letters.mjs'));
process.on('exit',()=>fs.rmSync(dir,{recursive:true,force:true}));
const e=(day,think,mood='',name='새봄반도체')=>({id:day+think,holdingId:1,name,day,saw:'',think,mood});
const journal=[e('2026-10-02','계약 연장 소식이 궁금했어','curious'),e('2026-10-02','',''),e('2026-10-09','공장 증설 계획이 내 이유랑 아직 맞는지 다시 보고 싶어','curious','꽃빛뷰티'),e('2026-10-20','짧게','calm'),e('2026-11-01','이번 달 첫 기록','sunny')];

// 12.7 the letter counts days written (not entries), the most picked mood and quotes the user's own line back
test('the October letter sums up October only',()=>{
 const l=monthlyLetter(journal,{'b1':'2026-10-15','b2':'2026-09-30'},'2026-10');
 assert.equal(l.days,3);assert.deepEqual(l.gold,['b1']);assert.equal(l.mood,'curious');
 assert.equal(l.quote.name,'꽃빛뷰티');assert.equal(l.quote.day,'2026-10-09');assert.equal(l.read,false);
});
test('a month with nothing written or finished brings no letter',()=>{assert.equal(monthlyLetter(journal,{},'2026-08'),null)});
test('last month\'s letter is due once, January looks back at December',()=>{
 assert.equal(dueLetter([],journal,{},'2026-11-05').month,'2026-10');
 assert.equal(dueLetter([{month:'2026-10'}],journal,{},'2026-11-05'),null);
 assert.equal(prevMonth('2027-01'),'2026-12');
});
test('long lines are cut to one line of the letter',()=>{const l=monthlyLetter([e('2026-10-03','가'.repeat(80))],{},'2026-10');assert.equal(l.quote.text.length,40);assert.ok(l.quote.text.endsWith('…'))});
// 3장 대화 금기: the letter never talks about returns, prices or what to do with the stock
test('the letter never mentions returns, prices or trading',()=>{
 const text=letterLines(monthlyLetter(journal,{b1:'2026-10-15'},'2026-10'),()=>'반도체 기초').join(' ');
 for(const w of ['수익','%','팔아','사 ','오를','떨어질','가격','매수','매도'])assert.ok(!text.includes(w),w);
 assert.match(text,/3일/);assert.match(text,/반도체 기초/);assert.match(text,/궁금/);
});
