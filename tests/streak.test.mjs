import test from 'node:test';
import {load} from './load-app.mjs';
import assert from 'node:assert/strict';
const {STREAK,blankStreak,checkStreak,answerStreak,bonusAt,rescueLeft,shownCount,missedDays}=await load('core/streak');
// answers one quiz on each day given, starting from s
const play=(s,...days)=>days.reduce((v,d)=>answerStreak(v,d).streak,s);
const run=n=>play(blankStreak(),...Array.from({length:n},(_,i)=>'2026-11-'+String(1+i).padStart(2,'0')));

// 13.7-11 a day counts once, whatever quiz and whether right or wrong
test('a day counts once; the next day carries the run on',()=>{
 let r=answerStreak(blankStreak(),'2026-11-01');assert.equal(r.counted,true);assert.equal(r.streak.count,1);
 r=answerStreak(r.streak,'2026-11-01');assert.equal(r.counted,false);assert.equal(r.streak.count,1,'a second quiz the same day adds nothing');
 r=answerStreak(r.streak,'2026-11-02');assert.equal(r.streak.count,2);assert.equal(r.streak.best,2);
 assert.equal(run(5).count,5);
});

test('bonuses grow with the run and repeat after the last one',()=>{
 assert.deepEqual(STREAK.bonuses.map(b=>bonusAt(b.days)),STREAK.bonuses.map(b=>b.sun));
 assert.equal(bonusAt(4),0);
 const last=STREAK.bonuses.at(-1);assert.equal(bonusAt(last.days+STREAK.repeat),last.sun);assert.equal(bonusAt(last.days+1),0);
 let s=run(2);const r=answerStreak(s,'2026-11-03');assert.equal(r.bonus,bonusAt(3));
});

// one missed day: the friend's last chance, once per run
test('one missed day offers the rescue; enough quizzes keep the run',()=>{
 const s=run(5)/* last 11-05 */;assert.equal(missedDays(s,'2026-11-07'),1);
 let c=checkStreak(s,'2026-11-07');assert.deepEqual(c.notice,{kind:'rescue',run:5,day:'2026-11-07'});assert.equal(rescueLeft(c),STREAK.rescueQuizzes);
 assert.equal(shownCount(c,'2026-11-07'),5,'the run at stake still shows');
 assert.deepEqual(checkStreak(c,'2026-11-07'),c,'checking again the same day changes nothing');
 let r;for(let i=1;i<STREAK.rescueQuizzes;i++){r=answerStreak(c,'2026-11-07');c=r.streak;assert.equal(r.counted,false);assert.equal(rescueLeft(c),STREAK.rescueQuizzes-i)}
 r=answerStreak(c,'2026-11-07');assert.equal(r.rescued,true);assert.equal(r.streak.count,6);assert.equal(r.streak.rescued,true);assert.equal(r.streak.notice,null);
 assert.equal(answerStreak(r.streak,'2026-11-08').streak.count,7,'the run goes on');
});

test('the rescue is once per run: a second miss resets',()=>{
 let s=run(3);s=checkStreak(s,'2026-11-05');for(let i=0;i<STREAK.rescueQuizzes;i++)s=answerStreak(s,'2026-11-05').streak;assert.equal(s.count,4);
 const c=checkStreak(s,'2026-11-07');assert.equal(c.count,0);assert.deepEqual(c.notice,{kind:'reset',run:4,day:'2026-11-07'});assert.equal(c.rescued,false,'a new run gets its own rescue');
});

test('missing the reset days in a row ends the run with no rescue',()=>{
 const s=run(10),day='2026-11-'+String(10+STREAK.resetDays+1).padStart(2,'0');
 const c=checkStreak(s,day);assert.equal(c.count,0);assert.equal(c.notice.kind,'reset');assert.equal(c.notice.run,10);assert.equal(c.best,10,'the best run is kept');
 assert.equal(answerStreak(c,day).streak.count,1,'today starts a new run');
 assert.equal(shownCount(s,day),0,'a lost run shows 0 before the garden even checks');
});

test('a rescue left unfinished is gone the next day',()=>{
 let s=checkStreak(run(4),'2026-11-06');s=answerStreak(s,'2026-11-06').streak;assert.equal(rescueLeft(s),STREAK.rescueQuizzes-1);
 const c=checkStreak(s,'2026-11-07');assert.equal(c.count,0);assert.equal(c.notice.kind,'reset');assert.equal(c.rescue,null);
});

test('nothing to lose: a new player or an empty run gets no friend',()=>{
 assert.deepEqual(checkStreak(blankStreak(),'2026-11-07'),blankStreak());
});
