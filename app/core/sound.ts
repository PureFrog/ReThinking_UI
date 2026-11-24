// ux-spec 7장 sound: the effects and the friends' voices are made here with Web Audio, no files (decided 2026-11-09).
// Background music comes from a library later; until then there is none. Everything stays silent until the player
// has said yes once (the browser also needs a press before it lets a page make sound).

export type SoundSettings={on:boolean|null;sfx:number;voice:number;music:number};
export const DEFAULT_SOUND:SoundSettings={on:null,sfx:.7,voice:.6,music:.5};
export type Effect='click'|'tap'|'open'|'close'|'step-grass'|'step-wood'|'water'|'pickup'|'unwrap'|'heart'|'letter'|'thud'|'door'|'sparkle'|'tick'|'reveal-hit'|'reveal-miss'|'stamp'|'sprout'|'chord'|'dig'|'bury'|'glass';

let settings:SoundSettings=DEFAULT_SOUND;
let ctx:AudioContext|null=null,sfxBus:GainNode|null=null,voiceBus:GainNode|null=null,noiseBuf:AudioBuffer|null=null;
const last:Partial<Record<string,number>>={};

export function configure(s:SoundSettings){settings=s;if(sfxBus)sfxBus.gain.value=s.sfx;if(voiceBus)voiceBus.gain.value=s.voice}
// On a press: make (or wake) the audio context. Without a press first the browser keeps it suspended.
export function unlock(){if(typeof window==='undefined'||!settings.on)return;try{if(!ctx){const A=window.AudioContext??(window as any).webkitAudioContext;if(!A)return;ctx=new A();sfxBus=ctx.createGain();voiceBus=ctx.createGain();sfxBus.connect(ctx.destination);voiceBus.connect(ctx.destination);configure(settings);
 noiseBuf=ctx.createBuffer(1,ctx.sampleRate,ctx.sampleRate);const d=noiseBuf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1}if(ctx.state==='suspended')void ctx.resume()}catch{ctx=null}}
const ready=()=>!!(settings.on&&ctx&&ctx.state==='running');
// what played last, for the tests (no sound reaches them)
const mark=(name:string)=>{if(typeof document!=='undefined')document.documentElement.dataset.lastSound=name};

type Tone={f:number;to?:number;at?:number;dur:number;type?:OscillatorType;gain?:number;attack?:number;vibrato?:number};
function tone(bus:GainNode,t:Tone){const c=ctx!,o=c.createOscillator(),g=c.createGain(),s=c.currentTime+(t.at??0),end=s+t.dur;o.type=t.type??'sine';o.frequency.setValueAtTime(t.f,s);if(t.to)o.frequency.exponentialRampToValueAtTime(t.to,end);
 if(t.vibrato){const l=c.createOscillator(),lg=c.createGain();l.frequency.value=t.vibrato;lg.gain.value=t.f*.02;l.connect(lg).connect(o.frequency);l.start(s);l.stop(end)}
 const v=t.gain??.3;g.gain.setValueAtTime(0,s);g.gain.linearRampToValueAtTime(v,s+(t.attack??.005));g.gain.exponentialRampToValueAtTime(.0001,end);o.connect(g).connect(bus);o.start(s);o.stop(end+.02)}
type Noise={dur:number;at?:number;f:number;to?:number;q?:number;kind?:BiquadFilterType;gain?:number;attack?:number};
function noise(bus:GainNode,n:Noise){const c=ctx!,src=c.createBufferSource(),fl=c.createBiquadFilter(),g=c.createGain(),s=c.currentTime+(n.at??0),end=s+n.dur;src.buffer=noiseBuf;src.loop=true;src.playbackRate.value=.8+Math.random()*.4;fl.type=n.kind??'bandpass';fl.frequency.setValueAtTime(n.f,s);if(n.to)fl.frequency.exponentialRampToValueAtTime(n.to,end);fl.Q.value=n.q??1;
 const v=n.gain??.3;g.gain.setValueAtTime(0,s);g.gain.linearRampToValueAtTime(v,s+(n.attack??.005));g.gain.exponentialRampToValueAtTime(.0001,end);src.connect(fl).connect(g).connect(bus);src.start(s,Math.random()*.5);src.stop(end+.02)}
const jitter=(f:number,by=.06)=>f*(1-by+Math.random()*by*2);

// Each effect: a few short tones and filtered noise, kept soft (the garden dislikes loud sounds, 1장).
const EFFECTS:Record<Effect,(b:GainNode)=>void>={
 click:b=>tone(b,{f:jitter(1050,.03),to:820,dur:.05,type:'triangle',gain:.18}),
 tap:b=>tone(b,{f:jitter(700,.04),to:560,dur:.06,gain:.1}),
 open:b=>{tone(b,{f:523,dur:.09,type:'triangle',gain:.16});tone(b,{f:784,at:.06,dur:.12,type:'triangle',gain:.14})},
 close:b=>{tone(b,{f:698,dur:.08,type:'triangle',gain:.13});tone(b,{f:466,at:.05,dur:.11,type:'triangle',gain:.12})},
 'step-grass':b=>noise(b,{f:jitter(2400,.15),dur:.07,q:.9,gain:.07}),
 'step-wood':b=>{tone(b,{f:jitter(170,.1),to:120,dur:.07,gain:.14});noise(b,{f:900,dur:.04,kind:'lowpass',gain:.05})},
 water:b=>{noise(b,{f:900,to:2200,dur:.8,q:2,gain:.12,attack:.08});for(let i=0;i<4;i++)tone(b,{f:jitter(900+i*180,.15),to:1400+i*200,at:.15+i*.14,dur:.06,gain:.05})},
 pickup:b=>[523,659,784].forEach((f,i)=>tone(b,{f,at:i*.06,dur:.14,type:'triangle',gain:.13})),
 unwrap:b=>{noise(b,{f:3500,dur:.22,kind:'highpass',gain:.08});[1047,1319,1568,2093].forEach((f,i)=>tone(b,{f,at:.16+i*.07,dur:.22,gain:.07}))},
 heart:b=>{tone(b,{f:660,dur:.18,gain:.12,vibrato:6});tone(b,{f:880,at:.12,dur:.28,gain:.11,vibrato:6})},
 letter:b=>{noise(b,{f:2800,to:4200,dur:.18,q:.7,gain:.08});noise(b,{f:3200,at:.16,dur:.14,q:.7,gain:.06})},
 thud:b=>{tone(b,{f:130,to:58,dur:.18,gain:.3});noise(b,{f:500,dur:.12,kind:'lowpass',gain:.12})},
 door:b=>{tone(b,{f:310,to:420,dur:.35,type:'triangle',gain:.05,vibrato:9,attack:.05});tone(b,{f:110,to:70,at:.3,dur:.14,gain:.2})},
 sparkle:b=>[1568,2093,2637].forEach((f,i)=>tone(b,{f,at:i*.05,dur:.18,type:'triangle',gain:.06})),
 // the 3D grade reveal (proto3d ui/Loop.tsx Grades): a counter ticking, the verdict stamping down, then hit or miss
 tick:b=>tone(b,{f:jitter(1800,.02),dur:.025,type:'square',gain:.025}),
 stamp:b=>{tone(b,{f:160,to:70,dur:.16,gain:.26});noise(b,{f:700,dur:.08,kind:'lowpass',gain:.14})},
 'reveal-hit':b=>{[523,659,784,1047].forEach((f,i)=>tone(b,{f,at:i*.07,dur:.32,type:'triangle',gain:.12}));[1568,2093].forEach((f,i)=>tone(b,{f,at:.3+i*.06,dur:.25,gain:.05}))},
 // wow pass (docs/brief-wow.md): a tree breaking the ground, the garden done, digging, a capsule going in, its glass lid
 sprout:b=>{tone(b,{f:jitter(110,.06),to:52,dur:.22,gain:.34});noise(b,{f:380,to:180,dur:.16,kind:'lowpass',gain:.16})},
 chord:b=>{[392,494,587,740].forEach((f,i)=>tone(b,{f,at:i*.045,dur:1.1,type:'triangle',gain:.07,attack:.04}));tone(b,{f:196,dur:1.2,gain:.08,attack:.05})},
 dig:b=>{noise(b,{f:520,to:260,dur:.32,kind:'lowpass',q:.8,gain:.2,attack:.03});noise(b,{f:1400,at:.12,dur:.12,q:1.2,gain:.05})},
 bury:b=>{noise(b,{f:600,to:220,dur:.24,kind:'lowpass',gain:.16});tone(b,{f:140,to:70,at:.12,dur:.18,gain:.24})},
 glass:b=>{tone(b,{f:1760,dur:.5,gain:.06});tone(b,{f:2637,at:.04,dur:.4,gain:.04});tone(b,{f:880,dur:.3,type:'triangle',gain:.05})},
 'reveal-miss':b=>{tone(b,{f:330,to:300,dur:.22,type:'triangle',gain:.12});tone(b,{f:247,to:220,at:.16,dur:.42,type:'triangle',gain:.12})},
};
// steps come quickly: a minimum gap keeps them from piling up
const GAP:Partial<Record<Effect,number>>={'step-grass':90,'step-wood':90,click:30,tap:30,tick:70};


// Every place a sound belongs (docs/sound-map.md, the same ids). A slot names its temporary synthesised effect, or null
// while it is still empty. Empty slots play nothing but are still marked, so the map can be walked in the game:
// html[data-last-slot] is the last slot reached, html[data-last-sound] the last one that made a sound.
export const SLOTS={
 // 배경음·환경음 (시간 구조 단계에서 연결)
 'bgm-day':null,'bgm-night':null,'amb-day':null,'amb-night':null,'amb-indoor':null,
 // 걸음
 'step-grass':'step-grass','step-wood':'step-wood','step-path':null,'step-stairs':null,'friend-step':null,
 // 공통 화면
 'ui-button':'click','ui-toggle':null,'panel-open':'open','panel-close':'close','world-press':'click','ground-tap':'tap','hover':null,'blocked':null,'thought-pop':null,
 // 대화
 'voice':null/* per letter, see voice() */,'talk-start':null,'talk-next':null,'talk-end':null,'memo-send':null,
 // 친구
 'invite-send':null,'friend-arrive':null,'door-knock':null,'friend-leave':null,'heart':'heart','stage-up':null,'gift-give':null,'gift-arrive':null,'letter-open':'letter','away-traces':null,
 // 정원·나무
 'plant':'sprout','water':'water','feed':null,'care-done':null,'sun-pieces':null,'uproot':null,'tree-tap':null,'promise':null,'calendar':null,'land-open':null,'cheer':null,
 // 선물·서랍·옷
 'gift-pickup':'pickup','gift-open':'unwrap','item-to-drawer':null,'wear':null,'spin':null,
 // 꾸미기
 'decorate-start':null,'decorate-end':null,'decor-pick':null,'decor-rotate':null,'decor-place':'thud','decor-blocked':null,'decor-cancel':null,'decor-store':null,'paint-floor':null,'paint-wall':null,'paint-tile':null,'exterior':null,
 // 집
 'door':'door','stairs':null,'sit':null,'stand':null,'lamp-toggle':null,'furniture-use':null,'house-grow':null,'attic-open':null,'shelf-grow':null,
 // 일지·퀴즈
 // 3D 판정 공개 (ReThink Garden)
 'grade-count':'tick','grade-stamp':'stamp','grade-hit':'reveal-hit','grade-miss':'reveal-miss',
 // 3D 오! 패스 (docs/brief-wow.md W1~W3)
 'garden-born':'chord','cutaway-open':'dig','cutaway-close':'close','capsule-bury':'bury','capsule-mark':'thud','capsule-dig':'dig','capsule-open':'glass',
 // 관측소 원정 (docs/game.md 7, app/proto3d/game/)
 'game-open':'door','game-halt':'thud','game-read':'glass','game-chip':'click','game-stamp':'stamp','game-tear':'unwrap','game-deal':'pickup','game-fill':'tick','game-pin':'tap','game-reveal':'chord','game-hit':'reveal-hit','game-miss':'reveal-miss','game-count':'tick',
 'journal-save':null,'quiz-right':null,'quiz-wrong':null,'quiz-gold':null,'retro-save':null,'streak-day':null,'streak-saved':null,'streak-bonus':null,
} as const satisfies Record<string,Effect|null>;
export type Slot=keyof typeof SLOTS;
export function cue(slot:Slot){if(typeof document!=='undefined')document.documentElement.dataset.lastSlot=slot;const e=SLOTS[slot];if(e)play(e)}
// scene and page events that are a sound slot of their own (app/scene/world.ts emit)
export const EVENT_SLOTS:Partial<Record<string,Slot>>={planted:'plant',removed:'uproot',given:'gift-give',arrived:'friend-arrive','arrival-gift':'gift-arrive','placement-cancelled':'decor-cancel','decor-toggle':'lamp-toggle',cheered:'cheer',promise:'promise',calendar:'calendar','tree-menu':'tree-tap',invite:'invite-send',leave:'friend-leave',rotate:'decor-rotate',spin:'spin','sun-pieces':'sun-pieces','land-moment':'land-open',scene:'stage-up','care-done':'care-done',place:'decor-pick','request-talk':'talk-start','end-talk':'talk-end',advance:'talk-next','retro-done':'retro-save',thought:'thought-pop'};

export function play(name:Effect){if(!ready()||!settings.sfx)return;const now=performance.now(),gap=GAP[name]??0;if(gap&&now-(last[name]??0)<gap)return;last[name]=now;try{EFFECTS[name](sfxBus!);mark(name)}catch{/* a sound is never worth an error */}}

// 7장 voices: a short syllable per letter, pitched per friend. 모아 high and soft, 토리 quick and round, 루온 low and short.
type Voice={base:number;spread:number;dur:number;type:OscillatorType;gain:number;every:number};
const VOICES:Record<string,Voice>={moa:{base:620,spread:90,dur:.07,type:'sine',gain:.16,every:1},tori:{base:470,spread:120,dur:.045,type:'square',gain:.05,every:1},luon:{base:260,spread:50,dur:.05,type:'triangle',gain:.16,every:2}};
const OTHER:Voice={base:420,spread:80,dur:.06,type:'triangle',gain:.12,every:1};
let letterCount=0;
export function voice(id:string,letter:string){if(!ready()||!settings.voice||!letter.trim()||/[.,!?…~·'"()]/.test(letter))return;const v=VOICES[id]??OTHER;if(++letterCount%v.every)return;
 // the same letter always gets the same pitch, so a line has a tune rather than noise
 const h=letter.codePointAt(0)!%7;try{tone(voiceBus!,{f:v.base+(h/6-.5)*v.spread,dur:v.dur,type:v.type,gain:v.gain,attack:.008});mark('voice-'+id)}catch{/* ignore */}}

// Ambience (the 3D garden): a bed of quiet sounds by where the player is and the time of day, all synthesised.
//   stream   filtered noise, louder near the stream · fire  crackles near the campfire
//   birds    a short chirp now and then by day      · crickets  a soft trill now and then at night
// Levels 0..1 come from the scene (Proto3D) every second; each eases to its new level. Off with the sound.
export type Ambience={stream:number;fire:number;birds:number;crickets:number};
let ambBus:GainNode|null=null,streamGain:GainNode|null=null,fireGain:GainNode|null=null,ambTimer:ReturnType<typeof setInterval>|null=null,amb:Ambience={stream:0,fire:0,birds:0,crickets:0};
function ambStart(){if(!ctx||ambBus)return;const c=ctx;ambBus=c.createGain();ambBus.gain.value=0;ambBus.connect(c.destination);
 const src=c.createBufferSource();src.buffer=noiseBuf;src.loop=true;const lp=c.createBiquadFilter();lp.type='lowpass';lp.frequency.value=900;const bp=c.createBiquadFilter();bp.type='bandpass';bp.frequency.value=420;bp.Q.value=0.4;
 streamGain=c.createGain();streamGain.gain.value=0;src.connect(lp).connect(bp).connect(streamGain).connect(ambBus);src.start();
 // the fire's low breath under its crackles: a warm rumble, heard up close (sitting by it)
 const fs=c.createBufferSource();fs.buffer=noiseBuf;fs.loop=true;fs.playbackRate.value=0.7;const flp=c.createBiquadFilter();flp.type='lowpass';flp.frequency.value=320;
 fireGain=c.createGain();fireGain.gain.value=0;fs.connect(flp).connect(fireGain).connect(ambBus);fs.start();
 // the scattered ones: a chirp, a trill, a crackle, each by chance on a slow tick
 ambTimer=setInterval(()=>{if(!ready()||!ambBus)return;const b=ambBus;
  if(Math.random()<amb.birds*0.35){const f=2400+Math.random()*1400;for(let i=0;i<2+Math.floor(Math.random()*3);i++)tone(b,{f:f*(1+i*0.06),to:f*1.25,at:i*0.09,dur:0.07,gain:0.05*amb.birds})}
  if(Math.random()<amb.crickets*0.5){const f=4200+Math.random()*500;for(let i=0;i<6;i++)tone(b,{f,at:i*0.045,dur:0.03,type:'square',gain:0.012*amb.crickets})}
  if(Math.random()<amb.fire*0.95)for(let i=0;i<1+Math.floor(Math.random()*(2+amb.fire*3));i++)noise(b,{f:1800+Math.random()*1600,at:Math.random()*0.4,dur:0.03,q:2,gain:0.12*amb.fire})},700)}
export function ambience(a:Ambience){amb=a;if(!ready()){if(ambBus)ambBus.gain.value=0;return}ambStart();
 const t=ctx!.currentTime;ambBus!.gain.setTargetAtTime(settings.sfx*0.8,t,0.5);streamGain!.gain.setTargetAtTime(a.stream*0.09,t,0.8);fireGain!.gain.setTargetAtTime(Math.max(0,a.fire-0.5)*0.22,t,a.fire>0.5?0.6:1.2)}
export function ambienceOff(){if(ambBus&&ctx)ambBus.gain.setTargetAtTime(0,ctx.currentTime,0.3);if(ambTimer){clearInterval(ambTimer);ambTimer=null}ambBus=null;streamGain=null;fireGain=null}
