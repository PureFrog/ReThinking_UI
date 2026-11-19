// SERVER ONLY — never import this from app/proto3d (tests/daily-quest.test.mjs checks it). The sample event at levels
// 4 and 5 (a rival held alongside, a scene that judges it): packs still to come, so they live with the server's course
// (feedback 2026-11-19), used by db/functions and the tests.
import type {Bar,Card,DailyPack,Observe} from '../../core/game/daily/model';
import {SOLBIT,SOL_BEFORE,SOL_AFTER,seriesForPacks,PACK_LEN} from './solbit';
import {DANPUNG} from './danpung';
// ── the same event at levels 4 and 5 (design 3-3 several companies; levels 1~3 keep one) ─────────────────────────────
// 다온포장 (made up too): a rival that promised to keep its dividend instead of buying — the same principle, kept.
// Its prices are pinned to its cards: 발표 당일 +1.3% (39→40), 실적 날 −5% 영업이익 with the price flat-ish.
const daonClose=seriesForPacks([[0,29500],[39,30000],[40,30400],[55,31000],[79,30800],[80,30500],[100,31200]],PACK_LEN,23,.01).map(v=>Math.round(v/50)*50);
const DAON:Bar[]=daonClose.map((c,t)=>[t===0?c:Math.round(daonClose[t-1]*(1+(((t*53)%9)-4)/1000)/50)*50,c]);
const daonBiz='산업용 포장재 제조. 솔빛산업과 같은 식품 회사들에 납품하는 경쟁사.';
const [S1,S2,S3]=SOLBIT.scenes;
const c5:Card={...S1.cards[4],fact:'솔빛산업 주가 −7%, 같은 날 시장 −0.3%, 다온포장 +1.3%',keys:[...S1.cards[4].keys,'다온포장','+1.3%']};
const b1:Card={about:'B',id:'b1',kind:'공시',when:'2년 전 · 다온포장 주주서한',fact:'다온포장: 당분간 인수 없이 배당을 유지하겠다고 밝힘',compare:'다온포장 경영진이 밝힌 기준',source:'주주서한',rel:'alt',keys:['다온포장','배당','유지','인수 없이']};
const b2:Card={about:'B',id:'b2',kind:'재무',when:'실적 발표 · 확정',fact:'다온포장 영업이익 −5%, 배당은 약속대로 유지',compare:'전년 같은 분기 대비',source:'분기보고서',rel:'alt',keys:['다온포장','−5%','-5%','배당','유지']};
// the rival's profit is one more target to pick (its −5% is card b2 at the first integrated results)
const withDaon=(o:Observe,at:Record<string,number>):Observe=>({...o,targets:[...o.targets,{id:'daon',label:'다온포장의 영업이익',about:'B'}],
  actual:{...o.actual,...Object.fromEntries(Object.entries(at).map(([p,change])=>[`daon@${p}`,{change,source:`다온포장 분기보고서 (예시)`}]))}});
const L4_BEFORE=withDaon(SOL_BEFORE,{r1:-5,r2:-2}),L4_AFTER=withDaon(SOL_AFTER,{r2:-2,r3:1});
export const SOLBIT_L4:DailyPack={...SOLBIT,id:'sample-solbit-l4',others:[{slot:'B',alias:'다온포장',business:daonBiz,qty:60,prices:DAON}],
  scenes:[{...S1,cards:[...S1.cards.slice(0,4),c5],observe:L4_BEFORE},{...S2,cards:[...S2.cards,b1],observe:L4_BEFORE},{...S3,cards:[...S3.cards,b2],observe:L4_AFTER}]};
// level 5: scene 2 judges 다온포장 (the trade-press piece names it); scenes 1 and 3 stay on 솔빛산업
const d4:Card={...S2.cards[3],about:'B',fact:'다온포장도 같은 공급사와 가격 협상 중이라는 보도',keys:[...S2.cards[3].keys,'다온포장']};
export const SOLBIT_L5:DailyPack={...SOLBIT_L4,id:'sample-solbit-l5',
  scenes:[SOLBIT_L4.scenes[0],{...SOLBIT_L4.scenes[1],target:'B',cards:[S2.cards[0],S2.cards[2],d4,b1],focus:['b1','d4'],
    situation:'발표 15거래일 뒤예요. 오늘은 경쟁사 다온포장을 판단해요. 솔빛산업의 심사 자료는 비교 자료로 함께 열려 있어요.',
    ask:'인수 대신 배당을 약속한 다온포장, 같은 공급사 협상 소식은 그 약속의 무게를 바꾸나?',check:'다온포장의 다음 실적은 아직 확인 전',
    hints:{tori:'다온포장이 약속한 건 배당이야, 이익이야? 둘을 나눠 볼까?',moa:'협상 보도는 다온포장이 직접 낸 자료야, 업계지가 쓴 거야?',luon:'솔빛산업은 기준을 넘겼고 다온포장은 지켰어. 그게 어느 쪽이 나은지까지 말해 줄까?'}},
    SOLBIT_L4.scenes[2]]};
// every pack the server can settle (the two samples are public; the level packs are not: they never ship in the app)
const PACKS=[DANPUNG,SOLBIT,SOLBIT_L4,SOLBIT_L5];
// the sample for a level when no official pack is assigned: 입문·기초 단풍식품 (판매량), 중급 솔빛산업, then the rival
export const serverPackOf=(level:number)=>level>=5?SOLBIT_L5:level===4?SOLBIT_L4:level===3?SOLBIT:DANPUNG;
export const serverPackById=(id:string)=>PACKS.find(p=>p.id===id)??null;
