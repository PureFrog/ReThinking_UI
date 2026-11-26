// ux-spec 7장 sound: the effects and the friends' voices are made here with Web Audio, no files (decided 2026-11-09).
// Background music comes from a library later; until then there is none. Everything stays silent until the player
// has said yes once (the browser also needs a press before it lets a page make sound).

export type SoundSettings={on:boolean|null;sfx:number;voice:number;music:number};
export const DEFAULT_SOUND:SoundSettings={on:null,sfx:.7,voice:.6,music:.5};
export type Effect='click'|'tap'|'open'|'close'|'step-grass'|'step-wood'|'water'|'pickup'|'unwrap'|'heart'|'letter'|'thud'|'door'|'sparkle'|'tick'|'reveal-hit'|'reveal-miss'|'stamp'|'sprout'|'chord'|'dig'|'bury'|'glass';

let settings:SoundSettings=DEFAULT_SOUND;
let ctx:AudioContext|null=null,sfxBus:GainNode|null=null,voiceBus:GainNode|null=null,noiseBuf:AudioBuffer|null=null;
const last:Partial<Record<string,number>>={};

export function configure(s:SoundSettings){settings=s;if(sfxBus)sfxBus.gain.value=s.sfx;if(voiceBus)voiceBus.gain.value=s.voice;musicLevel()}
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

// 오락실 음악 (피드백 2026-11-26 "오락실에 맞는 음악"): a small chiptune loop made on the spot (no file): a square-wave
// melody over an arpeggio, a triangle bass and a ticking hat, 132 bpm, eight bars round C·Am·F·G. Played at the music
// level while in the arcade; it stops on leaving, while a game runs, or with the sound off.
// 피드백 2026-11-26: each room has its own little piece: 'arcade' (chiptune), 'space' (the neighbours' planets: slow pads,
// a glassy bell arpeggio), 'home' (my house: a music-box melody over soft chords, like a quiet afternoon). One plays at a
// time at the music level; roomMusic(null) stops it. The village's ambience is off while any of them plays (Proto3D).
export type Track='arcade'|'space'|'home'|'builder'|'tailor'|'library'|'dawn'|'dusk';
let chipBus:GainNode|null=null,chipTimer:ReturnType<typeof setInterval>|null=null,chipStep=0,chipTrack:Track|null=null;
const NOTE=(n:number)=>440*Math.pow(2,(n-69)/12);
const CHIP_CHORDS=[[60,64,67],[57,60,64],[53,57,60],[55,59,62]];
const CHIP_MELODY=[72,0,76,79,77,76,74,0, 72,0,69,72,76,0,74,72, 69,0,72,77,76,74,72,0, 71,0,74,79,77,76,74,71];
const SPACE_CHORDS=[[48,55,59,64],[45,52,55,60],[41,48,52,57],[43,50,53,59]];
const HOME_CHORDS=[[53,57,60],[52,55,59],[50,53,57],[48,52,55]];
const HOME_MELODY=[77,0,76,74,72,0,74,0, 76,0,74,72,71,0,67,0, 74,0,72,71,69,0,71,72, 72,0,0,74,72,0,0,0];
// 상점마다 (피드백 2026-11-26 "건물마다 어울리는 bgm"): the builder's workshop bounces on wooden plucks, the tailor's
// boutique sways in three with a music box, the library is a slow, quiet piano
const BUILD_CH=[[55,59,62],[60,64,67],[57,60,64],[62,65,69]],BUILD_MEL=[79,0,76,74,76,0,79,81, 79,0,76,72,74,0,0,0, 76,0,74,72,74,76,79,0, 81,79,76,74,72,0,0,0];
const TAILOR_CH=[[65,69,72],[62,65,69],[67,70,74],[60,64,67]],TAILOR_MEL=[84,0,0,81,0,79, 77,0,0,79,0,81, 82,0,0,81,0,77, 76,0,0,0,0,0];
const LIB_CH=[[57,60,64,67],[53,57,60,64],[50,53,57,60],[52,55,59,64]];
// 피드백 2026-11-26 "브금 볼륨 맞춰줘": each track's level evens out how loud it plays (measured from its notes' gains
// over a 128-step loop, a square wave aimed a little lower), so every room sits at the same loudness under the effects
const TRACKS:Record<Track,{bpm:number;level:number;step:(b:GainNode,i:number,len:number)=>void}>={
  arcade:{bpm:132,level:0.29,step:(b,i,len)=>{const ch=CHIP_CHORDS[Math.floor(i/8)%4],m=CHIP_MELODY[i%CHIP_MELODY.length];
    if(m)tone(b,{f:NOTE(m),dur:len*0.9,type:'square',gain:0.05});tone(b,{f:NOTE(ch[i%3]+12),dur:len*0.5,type:'square',gain:0.018});
    if(i%2===0)tone(b,{f:NOTE(ch[0]-24),dur:len*1.6,type:'triangle',gain:0.09});if(i%2===1)noise(b,{f:7000,dur:0.03,gain:0.03,kind:'highpass'})}},
  space:{bpm:76,level:0.33,step:(b,i,len)=>{const ch=SPACE_CHORDS[Math.floor(i/16)%4];
    if(i%16===0)ch.forEach((n,k)=>tone(b,{f:NOTE(n),dur:len*17,type:'sine',gain:0.035,attack:len*4,vibrato:k===3?4:undefined}));
    if(i%16===0)tone(b,{f:NOTE(ch[0]-12),dur:len*16,type:'triangle',gain:0.06,attack:len*2});
    if(i%2===0){const n=ch[(i/2)%4]+24;tone(b,{f:NOTE(n),dur:len*3,type:'sine',gain:0.03});tone(b,{f:NOTE(n)*2.01,dur:len*1.5,type:'sine',gain:0.008,at:0.01});tone(b,{f:NOTE(n),dur:len*2,type:'sine',gain:0.012,at:len*1.5})}
    if(Math.random()<0.06)tone(b,{f:NOTE(96+[0,4,7,11][(Math.random()*4)|0]),dur:1.6,type:'sine',gain:0.012})}},
  builder:{bpm:108,level:0.46,step:(b,i,len)=>{const ch=BUILD_CH[Math.floor(i/8)%4],m=BUILD_MEL[i%BUILD_MEL.length];
    if(m){tone(b,{f:NOTE(m),dur:len*0.7,type:'triangle',gain:0.07});tone(b,{f:NOTE(m)*2,dur:len*0.25,type:'sine',gain:0.015})}
    if(i%2===0)tone(b,{f:NOTE(ch[0]-24),dur:len*0.9,type:'triangle',gain:0.08});
    if(i%2===1)tone(b,{f:NOTE(ch[(i>>1)%3]),dur:len*0.4,type:'triangle',gain:0.03});
    if(i%4===2)noise(b,{f:2400,dur:0.04,gain:0.03,q:4})}},
  tailor:{bpm:126,level:0.47,step:(b,i,len)=>{const bar=Math.floor(i/6)%4,ch=TAILOR_CH[bar],m=TAILOR_MEL[i%TAILOR_MEL.length],beat=i%6;
    if(m){tone(b,{f:NOTE(m),dur:len*2.6,type:'sine',gain:0.05,vibrato:5});tone(b,{f:NOTE(m)*4,dur:len*0.6,type:'sine',gain:0.006})}
    if(beat===0)tone(b,{f:NOTE(ch[0]-12),dur:len*2,type:'triangle',gain:0.08});
    if(beat===2||beat===4)ch.forEach((n,k)=>tone(b,{f:NOTE(n),dur:len*1.2,type:'triangle',gain:0.016,at:k*0.01}))}},
  library:{bpm:66,level:0.37,step:(b,i,len)=>{const ch=LIB_CH[Math.floor(i/8)%4];
    if(i%8===0)tone(b,{f:NOTE(ch[0]-12),dur:len*8,type:'sine',gain:0.06,attack:0.02});
    const n=ch[[0,2,1,3,2,1,3,2][i%8]]+12;tone(b,{f:NOTE(n),dur:len*3,type:'sine',gain:0.04,attack:0.01});tone(b,{f:NOTE(n)*2,dur:len*1,type:'sine',gain:0.006});
    if(i%16===12)tone(b,{f:NOTE(ch[3]+24),dur:len*4,type:'sine',gain:0.015})}},
  // 일출 (dawn): a slow flute over bright major-seventh pads; 일몰 (dusk): warm plucked chords and a low hum
  dawn:{bpm:70,level:0.6,step:(b,i,len)=>{const ch=[[60,64,67,71],[65,69,72,76],[62,65,69,72],[67,71,74,77]][Math.floor(i/8)%4];
    if(i%8===0)ch.forEach((n,k)=>tone(b,{f:NOTE(n),dur:len*8.5,type:'sine',gain:0.022,attack:len*2,at:k*0.04}));
    const mel=[76,0,79,0,81,79,76,0, 74,0,76,79,0,0,0,0][i%16];if(mel)tone(b,{f:NOTE(mel+12),dur:len*1.8,type:'sine',gain:0.035,vibrato:5,attack:0.06});
    if(Math.random()<0.12)tone(b,{f:NOTE(ch[(Math.random()*4)|0]+24),dur:len,type:'sine',gain:0.01})}},
  dusk:{bpm:76,level:0.52,step:(b,i,len)=>{const ch=[[57,60,64],[53,57,60],[55,59,62],[52,55,59]][Math.floor(i/8)%4];
    if(i%8===0)tone(b,{f:NOTE(ch[0]-12),dur:len*8,type:'triangle',gain:0.05,attack:0.3});
    const n=ch[[0,1,2,1,0,2,1,2][i%8]]+12;tone(b,{f:NOTE(n),dur:len*1.4,type:'triangle',gain:0.035});
    if(i%16===10)tone(b,{f:NOTE(ch[2]+24),dur:len*3,type:'sine',gain:0.02,vibrato:4})}},
  home:{bpm:84,level:0.36,step:(b,i,len)=>{const ch=HOME_CHORDS[Math.floor(i/8)%4],m=HOME_MELODY[i%HOME_MELODY.length];
    if(m){tone(b,{f:NOTE(m),dur:len*2.2,type:'sine',gain:0.05});tone(b,{f:NOTE(m)*3,dur:len*0.8,type:'sine',gain:0.008})}
    if(i%4===0)ch.forEach((n,k)=>tone(b,{f:NOTE(n),dur:len*4.2,type:'triangle',gain:0.02,at:k*0.03,attack:0.05}));
    if(i%8===0)tone(b,{f:NOTE(ch[0]-12),dur:len*7,type:'triangle',gain:0.07,attack:0.04});
    if(i%4===2)noise(b,{f:5200,dur:0.02,gain:0.008,kind:'highpass'})}},
};
// the music slider moves the playing track at once; a track asked for while the music was at 0 starts when it comes up
let wanted:Track|null=null;
function musicLevel(){if(chipBus&&ctx&&chipTrack)chipBus.gain.setTargetAtTime(settings.music*TRACKS[chipTrack].level,ctx.currentTime,0.15);
  if(!settings.music&&chipTrack){const w=wanted;roomMusic(null);wanted=w}else if(settings.music&&wanted&&!chipTrack)roomMusic(wanted)}
export function roomMusic(track:Track|null){wanted=track;
  if(track!==chipTrack||!track||!ready()||!settings.music){if(chipTimer){clearInterval(chipTimer);chipTimer=null}
    if(chipBus&&ctx){chipBus.gain.setTargetAtTime(0,ctx.currentTime,0.3);const b=chipBus;setTimeout(()=>b.disconnect(),1200)}chipBus=null;chipTrack=null}
  if(!track||!ready()||!settings.music||chipTimer)return;
  const c=ctx!,T=TRACKS[track];chipTrack=track;chipBus=c.createGain();chipBus.gain.value=0;chipBus.connect(c.destination);chipBus.gain.setTargetAtTime(settings.music*T.level,c.currentTime,0.6);
  const len=60/T.bpm/2;chipStep=0;
  chipTimer=setInterval(()=>{if(!ready()||!chipBus){roomMusic(null);return}T.step(chipBus,chipStep++,len)},len*1000);
}
export const playingMusic=()=>chipTrack;
export function musicOff(track:Track){if(chipTrack===track)roomMusic(null)}
export function arcadeMusic(on:boolean){if(on)roomMusic('arcade');else musicOff('arcade')}
// 거장의 집 목소리 (피드백 2026-11-26): recorded lines play at the voices slider, and not at all with the sound off
export const voiceVolume=()=>settings.on?settings.voice:0;
