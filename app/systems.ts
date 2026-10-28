export const dayKey=(now=new Date())=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
export const daysBetween=(a:string,b:string)=>Math.max(0,Math.floor((Date.parse(b)-Date.parse(a))/86400000)||0);
export const stages=['처음 만남','아는 사이','친구','단짝','가족 같은'];
export const relationshipStage=(points:number)=>[0,10,30,60,100].filter(n=>points>=n).length-1;
export const catalog=[
 {id:'bench',name:'정원 벤치',price:18,type:'furniture',color:0xb99571,w:2,h:1},
 {id:'pond',name:'작은 연못',price:24,type:'furniture',color:0x91b9b8,w:2,h:2},
 {id:'bed',name:'포근한 침대',price:24,type:'furniture',color:0xe0cfae,w:2,h:1},
 {id:'star',name:'작은 별 조명',price:12,type:'furniture',color:0xe6c77d,w:1,h:1},
 {id:'hat',name:'산책 모자',price:8,type:'hat'}, {id:'glasses',name:'여름 선글라스',price:8,type:'face'},
 {id:'letter',name:'꽃 편지지',price:4,type:'gift'}, {id:'acorn',name:'도토리 주머니',price:4,type:'gift'}, {id:'yarn',name:'별 털실',price:4,type:'gift'},
];
export const defaults={timeMode:'realtime',careExpiryDays:30,reducedMotion:false,typeSpeed:'normal',fontSize:'normal',sound:false,volume:.25,playerName:'정균',hatColor:'#789383'};
export function vitality(c:any={},day=dayKey(),expiry=30){const recordLive=!!c.recordedAt&&daysBetween(c.recordedAt,day)<=expiry;const waterLive=!!c.wateredAt&&daysBetween(c.wateredAt,day)<3;const talkLive=!!c.talkedAt&&daysBetween(c.talkedAt,day)<7;const expired=!!c.recordedAt&&!recordLive;return {score:expired?0:(waterLive?1:0)+(recordLive?2:0)+(talkLive?1:0),wet:c.wateredAt===day,ribbon:c.reason??'',recordedAt:c.recordedAt??null};}
export function cellsFor(d:any){const w=d.rotation?d.h??1:d.w??1,h=d.rotation?d.w??1:d.h??1;return Array.from({length:w*h},(_,i)=>({x:d.x+i%w,y:d.y+Math.floor(i/w)}));}
export function chooseVisitor(s:any,day=dayKey()){if(s.holdings.some((h:any)=>h.rate< -10))return 0;if(s.care&&Object.values(s.care).some((c:any)=>c.recordedAt&&daysBetween(c.recordedAt,day)>30))return 2;return Number(day.replaceAll('-',''))%3;}
export const giftReaction=(friend:number,item:string)=>[['꽃','편지','차'],['도토리','열매','상자'],['별','털실','담요']][friend].some(k=>item.includes(k))?'아주 좋아함':item==='위로 사탕'?'고마워함':'어색해함';
function reward(s:any,key:string,amount:number,day:string){const k=day+':'+key;if(s.rewards[k])return s;s.rewards={...s.rewards,[k]:true};s.sunlight+=amount;return s;}
function bond(s:any,id:number,points:number,day:string,key:string){const r={...s.relationships[id]},daily={...r.daily};const token=day+':'+key;if(daily[token])return s;const gain=Math.min(points,12-(daily[day]??0));if(gain<=0)return s;daily[token]=true;daily[day]=(daily[day]??0)+gain;r.points+=gain;r.daily=daily;r.stage=relationshipStage(r.points);s.relationships=s.relationships.map((v:any,i:number)=>i===id?r:v);return s;}
export function gardenAction(state:any,a:any){const day=a.day??dayKey();let s={...state,care:{...state.care},rewards:{...state.rewards},memories:[...state.memories]};const remember=(text:string)=>{s.memories=[{id:day+':'+a.kind+':'+Date.now(),day,text},...s.memories].slice(0,80)};
 if(a.kind==='water'){const c=s.care[a.id]??{};if(c.wateredAt===day)return state;s.care[a.id]={...c,wateredAt:day};reward(s,'water:'+a.id,2,day);}
 if(a.kind==='record'){const reason=String(a.reason??'').trim().slice(0,160);if(!reason)return state;s.care[a.id]={...s.care[a.id],reason,recordedAt:day};reward(s,'record:'+a.id,8,day);remember(a.name+'에 약속 리본: '+reason);}
 if(a.kind==='chat'){bond(s,a.friend,2,day,'chat');}
 if(a.kind==='treeTalk'){bond(s,a.friend,4,day,'treeTalk');s.care[a.id]={...s.care[a.id],talkedAt:day,decision:a.decision,decidedAt:day};reward(s,'treeTalk',8,day);remember(a.name+' · '+a.decision+'로 기록했어요.');}
 if(a.kind==='quiz'){reward(s,'quiz:'+a.id,4,day);}
 if(a.kind==='read'){s.letters=s.letters.map((l:any)=>({...l,read:true}));reward(s,'read',2,day);}
 if(a.kind==='buy'){const item=catalog.find(x=>x.id===a.id);if(!item||s.sunlight<item.price||s.inventory.some((i:any)=>i.id===item.id))return state;s.sunlight-=item.price;s.inventory=[...s.inventory,item];}
 if(a.kind==='give'){const item=s.inventory.find((i:any)=>i.id===a.id);if(!item||item.type!=='gift')return state;s.inventory=s.inventory.filter((i:any)=>i.id!==a.id);bond(s,a.friend,giftReaction(a.friend,item.name)==='아주 좋아함'?5:2,day,'gift');s.relationships=s.relationships.map((r:any,i:number)=>i===a.friend?{...r,lastGift:item.name}:r);remember(['모아','토리','루온'][a.friend]+'에게 '+item.name+'을 건넸어요.');}
 if(a.kind==='visit'){s.lastVisitDay=day;s.relationships=s.relationships.map((r:any,i:number)=>i===a.friend?{...r,lastVisit:day}:r);}
 if(a.kind==='session'){if(s.lastSessionDay!==day){const id=chooseVisitor(s,day);s.letters=[{day,friend:id,read:false,text:['오늘은 네 마음이 어떤지 궁금했어. 급한 결정 없이 잠깐 쉬어갈래?','내가 들은 모의 소식인데, 기록장에 사건 자료가 있대이. 같이 확인해보자!','지난번 생각, 아직 같아? 반대 근거도 한 줄 적어 봐.'][id]},...s.letters].slice(0,20);s.lastSessionDay=day;}}
 if(a.kind==='equip'){s.slots={...s.slots,[a.slot]:s.slots[a.slot]===a.item?null:a.item};}
 if(a.kind==='settings')s.settings={...s.settings,...a.value};
 if(a.kind==='surfaces')s.surfaces={...s.surfaces,...a.value};
 if(a.kind==='onboard'){s.onboarded=true;s.settings={...s.settings,playerName:String(a.name||'나').slice(0,12),hatColor:a.color};remember('작은 정원으로 이사 왔어요.');}
 return s;
}
