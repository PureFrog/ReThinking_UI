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
  },
  // walking (Scene3D Player): speeds up and slows down instead of starting and stopping at once, and turns smoothly;
  // keyStep: how far ahead a held arrow / WASD key keeps the walk target
  walk:{speed:3.2,accel:10,turn:12,brake:0.7,keyStep:0.8},

  // the grade reveal reaching the tree (Scene3D Burst): sparks for a hit, autumn leaves for a miss
  burst:{hit:'#fff3a8',miss:'#d39a3a'},
  // time of day (core/daylight.ts): the sky at dusk and at night (mixed over the weather's sky), the low sun, the night fog,
  // how bright the light gets at its darkest, how much the windows glow at night
  daylight:{dusk:{top:'#5a6aa0',mid:'#e7a07a',bottom:'#f6cf98'},night:{top:'#0b1226',mid:'#18264a',bottom:'#2c3b66'},lowSun:'#ffad6b',nightFog:'#22304e',
    floor:0.28,windows:2.2},
  // the wider map (World3D.tsx, places.ts): water and its banks, bridge wood, path stones, the league square's paving,
  // how many trees in the forest ring
  map:{water:'#2c86d6',bank:'#c9b98f',plank:'#a77d58',plank2:'#946c4b',rail:'#6c5b53',stone:'#d9c79c',paving:'#e3d8c4',forest:64},
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
  tufts:{count:120,light:'#a6cc62',mid:'#8bbd54',dark:'#64a046'},

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
};
