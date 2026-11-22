// Every look value of the 3D prototype in one place (colours, light, blur, glow), so feedback like
// "brighter", "less blur", "warmer shadows" is a one-line change here.
export const LOOK={
  // sky gradient behind the transparent canvas, and the fog the far ground fades into
  sky:{top:'#78cff2',mid:'#bde8f6',bottom:'#eef8e2'},
  // 2026-11-16 "뿌옇다": the fog starts past the garden (the phone camera sits ~27 away) and only fades the far edge
  fog:{color:'#cfeef0',near:42,far:95},
  // a warm haze in the top-left corner, like sun through the trees (DOM overlay, screen blend)
  sunGlow:{color:'#fff4c8',opacity:0.5,size:'55vmax'},

  sun:{color:'#fff1d4',intensity:2.5,position:[-9,17,6] as [number,number,number]},
  hemi:{sky:'#d6efff',ground:'#7aa84c',intensity:1.0},
  shadow:{mapSize:2048,radius:6},

  // the shared soft material (materials.ts): light falls off in soft bands, shadows lean blue, edges catch light
  shade:{
    ramp:[0.4,0.58,0.82,1],// light bands from shadow to full sun, blended (not hard toon steps)
    shadowTint:'#5d86c8',shadowTintAmount:0.45,
    rimColor:'#fffbe8',rimStrength:0.2,rimPower:3,
  },

  // camera framing by screen shape (width ÷ height). A phone held upright is the main screen: it sees less across, so the
  // camera pulls back and widens; a phone on its side sees plenty across, so it comes closer. Values in between are blended.
  // fov: vertical degrees · dist: camera to the player · turn: radians the camera swings west round the player, so the
  // farm (east of the house) runs up the tall screen instead of off its side · pitch: radians down from overhead (a tall
  // screen looks down more, so the ground fills it instead of sky) · blur: tilt-shift · lead: world units the camera looks
  // ahead of the player, so on a tall screen the player stands low and the garden fills the space above · maxDist: how far a pinch can pull out
  camera:{
    frames:[
      {aspect:0.46,fov:52,dist:27,turn:1.05,pitch:0.4,blur:0.04,lead:3.5},// phone upright (390×844)
      {aspect:1.33,fov:46,dist:23.5,turn:0,pitch:0.54,blur:0.08,lead:0},// desktop (1400×1050)
      {aspect:2.16,fov:42,dist:19,turn:0,pitch:0.6,blur:0.07,lead:0},// phone on its side (844×390)
    ],
    minDist:9,maxDist:40,
    // drag and wheel feel (OrbitControls): lower damping glides longer after letting go
    damping:0.07,rotateSpeed:0.8,zoomSpeed:0.9,
    // keyboard: Q/E turn (radians a second), +/- zoom (share of the distance a second)
    keyTurn:1.7,keyZoom:0.9,
    // a landmark just opened: a lower, closer side view (pitch from straight down, share of the usual distance)
    landmarkPitch:1.0,landmarkDist:0.85,
    // first person (feedback 11-17): the camera at the player's eyes. eye = height over the ground, back = how far
    // behind the eye it sits (a drag turns the view round the eye), pitch = the angle from straight down on entering
    // (a little under level), follow = how fast the eye keeps up with the walk, fov = a wider view than the garden one
    // talking with 보리 when it came over: the camera comes low and close on the two of them (pitch from straight
    // down, distance from the point between them, lift = how high over the ground it looks)
    // turn: how far round from straight behind the player the camera swings, so both faces show (radians)
    talk:{pitch:1.18,dist:6.5,lift:0.9,turn:0.55},
    // 유저 워크플로우 2장: talking face to face, the camera at my eyes (eye, a little behind: back) on the other's face (face)
    eyeTalk:{eye:1.3,face:1.12,back:0.55,fov:54},
    // the village tour (ui/Tour.tsx): after a moment the camera comes down in front of the friend being introduced
    tour:{pitch:1.3,dist:5.2,lift:0.55,turn:{tori:0,moa:0,luon:0} as Record<string,number>,pitchOf:{} as Record<string,number>},
    // fishing with 나루: higher, looking down on the float past the player
    fish:{pitch:0.82,dist:8.5},
    fp:{eye:1.35,back:0.12,pitch:1.42,follow:14,fov:68,maxPitch:1.95},
  },
  // walking (Scene3D Player): speeds up and slows down instead of starting and stopping at once, and turns smoothly;
  // keyStep: how far ahead a held arrow / WASD key keeps the walk target
  // 보리 coming over on a stop-loss day (Proto3D boriCame): where it stops next to the player, in world units
  // reach: tapped from farther than this, the player first walks up to stand this far from 보리 (stand)
  boriCome:{side:1.6,front:1.2,reach:2.6,stand:1.8},
  // how fast a standing analyst (or 보리) turns to face the player or its task (per second, eased)
  analystTurn:5,
  walk:{speed:4,accel:10,turn:12,brake:0.7,keyStep:0.8},
  // 유저 워크플로우 2장: a tap on someone further than reach walks me up to stand this far in front of them
  villager:{reach:2.8,stand:2.1},

  // the grade reveal reaching the tree (Scene3D Burst): sparks for a hit, autumn leaves for a miss
  burst:{hit:'#fff3a8',miss:'#d39a3a'},
  // time of day (core/daylight.ts): the sky at dusk and at night (mixed over the weather's sky), the low sun, the night fog,
  // how bright the light gets at its darkest, how much the windows glow at night
  daylight:{dusk:{top:'#5a6aa0',mid:'#e7a07a',bottom:'#f6cf98'},night:{top:'#0b1226',mid:'#18264a',bottom:'#2c3b66'},lowSun:'#ffad6b',nightFog:'#22304e',
    floor:0.28,windows:2.2},
  // the wider map (World3D.tsx, places.ts): water and its banks, bridge wood, path stones, the league square's paving,
  // how many trees in the forest ring
  map:{water:'#2c86d6',bank:'#c9b98f',plank:'#a77d58',plank2:'#946c4b',rail:'#6c5b53',stone:'#d9c79c',paving:'#e3d8c4',forest:90},
  // inside the house (Interior3D.tsx): surfaces, books by how the judgment came out, the window's sky, the camera
  interior:{floor:'#b48a62',floorLine:'#8a6448',wall:'#efe6d2',wall2:'#e6dac2',trim:'#8a6448',wood:'#a77d58',woodDark:'#6f5040',cork:'#c9a26e',rug:'#7b8f5e',
    sky:'#cfe9f2',outside:'#3b3128',under:'#4a3c30',bookHit:'#4b6638',bookMiss:'#5c5447',bookWait:'#d8ccae',camDist:10.5,camPitch:0.92},
  // the observer's stage (Showroom3D.tsx, ui/MyPage.tsx): the dome dark above and warm below, the spotlight and rim light,
  // the floor and pedestal, how big the observer stands there
  // 다른 정원들 (Sky3D.tsx): the night sky around the planets, the planets' ground and ponds
  space:{top:'#0d1426',bottom:'#3b4a74',land:'#7d9a52',pond:'#6d9cb8'},
  stage:{top:'#141b16',bottom:'#3b3128',spot:'#ffe7b0',rim:'#9fc6ff',floor:'#2b2620',wood:'#6f5040',top2:'#d9ccb0',scale:1.55,spotPower:55,camTall:14,camWide:8.4},
  // the player's observer in the garden (Explorer3D.tsx)
  explorer:{scale:1.05},
  // W6 tilting the phone moves the camera this many world units sideways and up at most (core/tilt.ts)
  tilt:{amount:0.9},
  // W1 a holding being born (Scene3D BirthDust): the crack in the ground and the soil it throws up
  // pitch/dist: how much lower (pitch ×, up to maxPitch radians from overhead) and closer (dist ×) the camera comes while
  // the trees rise; pull: how far it pulls out halfway through its look round
  // W2 the root cut-away (Roots3D.tsx): the open box round the tree (width: half across, back: behind the trunk,
  // front: toward the camera, depth), soil bands top→deep, root, spot (bankruptcy risk) and stone (debt) colours, and
  // the camera: pitch radians from overhead (lower = more from the side), dist from the cut
  // W3 the time capsule (Capsule3D.tsx): glass, the light leaking out once the grade has arrived, a marker not yet due,
  // the memo glowing inside; size of the capsule; where the marker stands from its tree (beside the trunk, front right)
  capsule:{hole:'#2b2016',soil:'#7a5a40',glass:'#e6f4ff',glow:'#ffe39a',idle:'#bfe2ff',memo:'#fff2c6',size:2.1,spot:{dx:1.3,dz:0.95},
    near:0.48,pitch:0.98/* while a capsule goes in or comes out the camera comes this much closer (× framing distance) and this low (radians from overhead) */},
  roots:{width:1.45,back:0.9,front:2.1,depth:2.3,soil:['#5b3f2b','#7a5637','#a07c55'],root:'#efd3a6',rot:'#201814',stone:'#8a8681',
    camPitch:1.0,camDist:13.5,camDrop:-0.9},
  birth:{dust:'#a5815f',crack:'#4a3526',pitch:1.75,maxPitch:0.98,dist:0.72,pull:0.22,tagScale:0.82},

  // holding trees are the stars of the garden: drawn larger than the scenery around them
  holdingTreeScale:1.5,

  ground:{base:'#7db650',light:'#9fca60',dark:'#5b9645',warm:'#bccf62',patchScale:0.22},
  tufts:{count:220,light:'#a6cc62',mid:'#8bbd54',dark:'#64a046'},

  // R2 market weather (app/core/weather.ts). Each kind overrides the sky, fog, light and post values above and adds
  // its own clouds, rain and wind. wind: tree sway in radians · rain: falling streaks · clouds: puffs overhead
  weather:{
    clear:{sky:{top:'#7cc9e6',mid:'#c3e4ec',bottom:'#f2eedc'},fog:'#d7e8e2',sun:{color:'#fff1d4',intensity:2.5},hemi:1.0,glow:0.18,saturation:0.06,
      clouds:{count:4,color:'#ffffff'},rain:0,wind:0.02,flash:false,motes:'#fff6c4'},
    cloudy:{sky:{top:'#9fb6c6',mid:'#c9d6dc',bottom:'#e4e8df'},fog:'#d2dad9',sun:{color:'#eef2f6',intensity:1.1},hemi:1.15,glow:0.04,saturation:-0.08,
      clouds:{count:11,color:'#e9edf0'},rain:0,wind:0.035,flash:false,motes:''},
    storm:{sky:{top:'#4d5d72',mid:'#7b8a99',bottom:'#a9b2b0'},fog:'#8f9ca3',sun:{color:'#c9d6ea',intensity:0.55},hemi:0.85,glow:0,saturation:-0.3,
      clouds:{count:14,color:'#7d8794'},rain:900,wind:0.09,flash:true,motes:''},
    heat:{sky:{top:'#f2c48a',mid:'#fbe2b4',bottom:'#fff3d9'},fog:'#f7e3c0',sun:{color:'#fff0c8',intensity:3.4},hemi:1.15,glow:0.4,saturation:0.04,
      clouds:{count:0,color:'#ffffff'},rain:0,wind:0.008,flash:false,motes:'#ffd9a0'},
  },

  post:{
    bloom:{threshold:0.9,smoothing:0.2,intensity:0.35,radius:0.6},
    tiltShift:{taper:0.55},// blur strength is per screen shape (camera.frames)
    vignette:{offset:0.3,darkness:0.38},
    // D2 (direction A, field notebook): a faint paper grain over the world so it sits in the same book as the UI
    grain:{opacity:0},// paper look dropped app-wide (2026-11-14); kept as a knob
  },
  // 집 (House3D.tsx, PM 설계 2026-11-19): the three seats at the desk (position, where the eyes rest), the field of view
  // (wider on a tall phone so the sheet, 보리 and the door stay in one shot), how fast the camera moves, 보리's size
  house:{
    cam:{seat:{pos:[0,1.18,0.55],look:[0,0.92,-1.5]},paper:{pos:[0,1.2,0.2],look:[-0.1,0.8,-0.9]},case:{pos:[0,1.5,0.0],look:[0,0.74,-0.7]}} as Record<'seat'|'paper'|'case',{pos:[number,number,number];look:[number,number,number]}>,
    // 9-5: the vertical view widens on a tall screen until hfov degrees fit across (both desk ends show), up to fovMax
    fov:50,hfov:50,fovMax:92,camEase:3.2,
    bori:{y:0.42,scale:0.62},
    // 선생님 (피드백 2026-11-21): the orange bear in pink glasses, in the drawing's units (desk at 1.4) scaled to the room's desk
    teacher:{y:0.13,scale:0.42,fur:'#f7b567',light:'#ffd9a0',ear:'#f2a08a',muzzle:'#fff1c4',dark:'#3b2618',pink:'#f48fb8',scarf:'#3fb5a3'},
    // 9-3 보리's paws on the far end of the desk: shoulder points (the arm runs from there), the paw size, how fast they ease
    paws:{shoulderR:[0.21,0.98,-1.3],shoulderL:[-0.21,0.98,-1.3],arm:0.055,reach:0.5,size:[0.07,0.042,0.085],ease:5,fur:'#f7b567',pad:'#ffd9a0'} as {shoulderR:[number,number,number];shoulderL:[number,number,number];arm:number;reach:number;size:[number,number,number];ease:number;fur:string;pad:string},
    color:{floor:'#b48a62',wall:'#efe6d2',wall2:'#e6dac2',trim:'#8a6448',sky:'#bfe3f2',outside:'#9fd18a',door:'#7a5a44',brass:'#c9a24a',rug:'#7b8f5e',pot:'#b4684a',leaf:'#4f9a45',leaf2:'#6db24f',
      desk:'#a77d58',deskEdge:'#6f5040',paper:'#fbf7ec',ink:'#9c9180',stamp:'#b8372b',lock:'#5c5447',file:'#8a6a3f',string:'#d9c7a0'},
  },
};
