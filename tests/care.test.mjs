import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const load=async f=>import('data:text/javascript;base64,'+Buffer.from(ts.transpileModule(fs.readFileSync(new URL('../app/'+f,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText).toString('base64'));
const {saveJournal,answerNews,canSave,wateredToday,journalPrompt}=await load('care.ts');
const {mockQuizFor,NEWS_ITEMS,newsProvider}=await load('news.ts');
const entry=(holdingId,day,saw='')=>({id:day+holdingId,holdingId,name:'새봄반도체',day,saw,think:'',mood:''});

// 13.7-7 watering = journal: one sunlight piece per tree per day, more writing is kept but not paid
test('a journal pays once per tree per day and is always kept',()=>{
 let r=saveJournal({},[],entry(1,'2026-11-02','계약 연장'));assert.equal(r.reward,true);assert.ok(wateredToday(r.care,1,'2026-11-02'));
 r=saveJournal(r.care,r.journal,entry(1,'2026-11-02','하나 더'));assert.equal(r.reward,false);assert.equal(r.journal.length,2);
 assert.equal(saveJournal(r.care,r.journal,entry(2,'2026-11-02','다른 나무')).reward,true,'another tree pays');
 assert.equal(saveJournal(r.care,r.journal,entry(1,'2026-11-03','다음 날')).reward,true,'the next day pays');
});
test('one filled box is enough to save a journal (12.1)',()=>{
 assert.equal(canSave({saw:'',think:'',mood:''}),false);assert.equal(canSave({saw:'  ',think:'',mood:''}),false);
 assert.ok(canSave({saw:'',think:'',mood:'calm'}));assert.ok(canSave({saw:'',think:'유지',mood:''}));
 assert.notEqual(journalPrompt('2026-11-02'),journalPrompt('2026-11-03'),'the prompt changes daily');
});
// 13.7-8 fertilizer = news OX: the statement is the news as it happened or turned around, never "is there such news"
test('the news quiz shows a real item either way round and the answer key follows it',()=>{
 const seen=new Set();for(let d=1;d<=20;d++){const q=mockQuizFor(NEWS_ITEMS,'새봄반도체','2026-11-'+String(d).padStart(2,'0'),[]);const item=NEWS_ITEMS.find(n=>n.id===q.id);
  assert.equal(q.statement,q.truth?item.fact:item.flipped);assert.equal(q.fact,item.fact);assert.ok(q.why);assert.doesNotMatch(q.statement,/정보가 있|사실일까|소식이 있/);seen.add(q.truth)}
 assert.deepEqual([...seen].sort(),[false,true],'some days true, some turned around');
 for(const n of NEWS_ITEMS)for(const s of [n.fact,n.flipped,n.why])assert.doesNotMatch(s,/매수|매도|사라|팔아|오를 것|내릴 것|목표가/,'no trading advice or price calls');
});
test('the next quiz is an item not answered yet; a right answer pays once a day',()=>{
 const day='2026-11-02';const q=newsProvider.quizFor('별숲게임즈',day,[]);const next=newsProvider.quizFor('별숲게임즈',day,[q.id]);assert.notEqual(next.id,q.id);
 let r=answerNews({},1,q.id,false,day);assert.equal(r.reward,false);assert.deepEqual(r.care[1].answered,[q.id]);
 r=answerNews(r.care,1,next.id,true,day);assert.equal(r.reward,true);
 assert.equal(answerNews(r.care,1,'bs-3',true,day).reward,false,'one paid answer a day');
 assert.equal(newsProvider.quizFor('없는회사',day,[]),null);
});

const {stickers,weekCount,weekDays,monthGrid}=await load('care.ts');
const QB=await load('quiz-books.ts');const A=await load('achievements.ts');
// 12.2 calendar: a sticker per day written, a Mon–Sun week, aim 4 days
test('the calendar puts one sticker on each day written and counts this week',()=>{
 const j=[entry(1,'2026-11-02'),{...entry(2,'2026-11-02'),mood:'calm'},entry(1,'2026-11-04'),entry(1,'2026-11-09')];
 assert.deepEqual(stickers(j),{'2026-11-02':'calm','2026-11-04':'','2026-11-09':''});
 assert.deepEqual(weekDays('2026-11-05'),['2026-11-02','2026-11-03','2026-11-04','2026-11-05','2026-11-06','2026-11-07','2026-11-08']);
 assert.equal(weekCount(j,'2026-11-05'),2);assert.equal(weekCount(j,'2026-11-09'),1);
 const g=monthGrid('2026-11-15');assert.ok(g.every(w=>w.length===7));assert.equal(g.flat().filter(Boolean).length,30);assert.equal(g[0].indexOf('2026-11-01'),6,'Nov 1 2026 is a Sunday');
});
// 12.3 quiz books: gold when all right, bookmark on a miss, 3 paid new answers a day
test('a book turns gold when every page is right; a miss bookmarks the page and it comes back first',()=>{
 const b=QB.BOOKS[0];let p=QB.blankQuiz();const day='2026-11-02';
 let r=QB.answerBook(p,b.id,0,1-b.questions[0].answer,day);assert.equal(r.right,false);assert.equal(r.reward,false);p=r.progress;assert.ok(QB.hasMark(p,b));assert.equal(QB.nextQuestion(p,b),0);
 for(const i of [0,1,2]){r=QB.answerBook(p,b.id,i,b.questions[i].answer,day);p=r.progress;assert.equal(r.gold,i===2)}
 assert.ok(QB.isGold(p,b));assert.equal(QB.hasMark(p,b),false);assert.equal(QB.firstOpenBook(p).id,QB.BOOKS[1].id);
 assert.equal(p.daily.paid,3);const b2=QB.BOOKS[1];r=QB.answerBook(p,b2.id,0,b2.questions[0].answer,day);assert.equal(r.reward,false,'only 3 paid a day');
 assert.equal(QB.answerBook(r.progress,b2.id,1,b2.questions[1].answer,'2026-11-03').reward,true,'the next day pays again');
 for(const book of QB.BOOKS)for(const q of book.questions)for(const s of [q.q,q.why,...q.options])assert.doesNotMatch(s,/매수하|매도하|사세요|파세요|오를 거|목표가/);
});
// 12.5 milestones: reached once, brought by the next friend
test('milestones are reached once and wait for a friend to bring them',()=>{
 const j1=[entry(1,'2026-11-02','첫')];let earned=A.newlyReached({},{journal:j1,gold:0,weeks:0},'2026-11-02');
 assert.deepEqual(Object.keys(earned),['first-journal']);assert.deepEqual(A.pendingGifts(earned),[{id:'ach-first-journal',item:'첫 일지 액자'}]);
 assert.deepEqual(A.newlyReached(earned,{journal:j1,gold:0,weeks:0},'2026-11-03'),{},'not twice');
 earned={...earned,'first-journal':{...earned['first-journal'],delivered:true}};assert.deepEqual(A.pendingGifts(earned),[]);
 assert.equal(A.goalWeeks(['2026-11-02','2026-11-03','2026-11-04','2026-11-05','2026-11-09'],4),1);
});
// 12.4 retrospective: luon brings a page back at 30 and 90 days; a reply ties a knot on that tree's ribbon
test('a journal page comes back at 30 and 90 days, once a day, and each answer ties a knot',async()=>{
 const R=await load('retro.ts');const page=(id,holdingId,day,think='계약이 이어질 것 같아서')=>({id,holdingId,name:'새봄반도체',day,saw:'',think,mood:''});
 const j=[page('a',1,'2026-10-01'),page('b',2,'2026-10-05'),page('c',1,'2026-10-20'),page('m',1,'2026-09-01',''/* mood only: nothing to reread */)];
 assert.equal(R.dueRetro(j,[],[1,2],'2026-10-30'),null,'29 days is not yet');
 let d=R.dueRetro(j,[],[1,2],'2026-10-31');assert.equal(d.entry.id,'a');assert.equal(d.mark,30);assert.equal(d.days,30);assert.equal(R.retroLine(d),'…30일 전에 이렇게 써놨더라.');
 assert.equal(R.dueRetro(j,[],[2],'2026-10-31'),null,'a removed tree is not brought back');
 let rs=R.answerRetro([],d,'half','  반쯤은 맞았어 ','2026-10-31');assert.deepEqual(rs[0],{entryId:'a',holdingId:1,mark:30,verdict:'half',reply:'반쯤은 맞았어',day:'2026-10-31'});
 assert.equal(R.dueRetro(j,rs,[1,2],'2026-10-31'),null,'one a day');
 d=R.dueRetro(j,rs,[1,2],'2026-11-04');assert.equal(d.entry.id,'b');rs=R.answerRetro(rs,d,'kept','','2026-11-04');
 assert.equal(R.dueRetro(j,rs,[1,2],'2026-11-05'),null,'a is done at 30, c is not 30 yet');
 d=R.dueRetro(j,rs,[1,2],'2026-12-30');assert.equal(d.entry.id,'a');assert.equal(d.mark,90);rs=R.answerRetro(rs,d,'changed','이유가 바뀌었어','2026-12-30');
 d=R.dueRetro(j,rs,[1,2],'2027-01-31');assert.equal(d.entry.id,'b');assert.equal(d.mark,90,'past 90 days, the 30-day turn is skipped');
 assert.deepEqual(R.knots(rs),{1:2,2:1});
 assert.equal(R.dueRetro([page('t',1,'2026-11-06')],[],[1],'2026-11-06',R.shiftDay('2026-11-06',30)).days,30,'?ahead looks ahead');
 for(const v of R.VERDICTS)assert.doesNotMatch(v.label,/수익|올랐|떨어/);
 const five=Array.from({length:5},(_,i)=>({entryId:String(i)}));assert.ok('retro-5' in A.newlyReached({},{journal:[],gold:0,weeks:0,retros:five.length},'2026-11-06'));
 assert.ok(!('retro-5' in A.newlyReached({},{journal:[],gold:0,weeks:0,retros:4},'2026-11-06')));
});
// 12.2 a week with 4 journal days hangs a ribbon; the newest such week not yet congratulated is the one a friend cheers
test('weeks that reached the aim are congratulated once, newest first',async()=>{
 const C=await load('care.ts');const days=d=>d.map(x=>entry(1,x));
 const j=days(['2026-11-02','2026-11-03','2026-11-04','2026-11-04','2026-11-09','2026-11-10','2026-11-11','2026-11-13','2026-11-16']);
 assert.equal(C.weekKey('2026-11-08'),'2026-11-02');assert.deepEqual(C.goalWeekKeys(j),['2026-11-09'],'3 distinct days is not 4');
 assert.equal(C.pendingCheer(j,[]),'2026-11-09');assert.equal(C.pendingCheer(j,['2026-11-09']),null);
 const j2=[...j,entry(1,'2026-11-05')];assert.deepEqual(C.goalWeekKeys(j2),['2026-11-02','2026-11-09']);assert.equal(C.pendingCheer(j2,['2026-11-09']),'2026-11-02');
});
