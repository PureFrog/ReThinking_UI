// Every look value of the 3D prototype in one place (colours, light, blur, glow), so feedback like
// "brighter", "less blur", "warmer shadows" is a one-line change here.
export const LOOK={
  // sky gradient behind the transparent canvas, and the fog the far ground fades into
  sky:{top:'#78cff2',mid:'#bde8f6',bottom:'#eef8e2'},
  fog:{color:'#cfeef0',near:20,far:46},
  // a warm haze in the top-left corner, like sun through the trees (DOM overlay, screen blend)
  sunGlow:{color:'#fff4c8',opacity:0.5,size:'70vmax'},

  sun:{color:'#fff1d4',intensity:2.5,position:[-9,17,6] as [number,number,number]},
  hemi:{sky:'#d6efff',ground:'#7aa84c',intensity:1.0},
  shadow:{mapSize:2048,radius:6},

  // the shared soft material (materials.ts): light falls off in soft bands, shadows lean blue, edges catch light
  shade:{
    ramp:[0.4,0.58,0.82,1],// light bands from shadow to full sun, blended (not hard toon steps)
    shadowTint:'#5d86c8',shadowTintAmount:0.45,
    rimColor:'#fffbe8',rimStrength:0.2,rimPower:3,
  },

  // holding trees are the stars of the garden: drawn larger than the scenery around them
  holdingTreeScale:1.5,

  ground:{base:'#7db650',light:'#9fca60',dark:'#5b9645',warm:'#bccf62',patchScale:0.22},
  tufts:{count:120,light:'#a6cc62',mid:'#8bbd54',dark:'#64a046'},

  // R2 market weather (app/core/weather.ts). Each kind overrides the sky, fog, light and post values above and adds
  // its own clouds, rain and wind. wind: tree sway in radians · rain: falling streaks · clouds: puffs overhead
  weather:{
    clear:{sky:{top:'#78cff2',mid:'#bde8f6',bottom:'#eef8e2'},fog:'#cfeef0',sun:{color:'#fff1d4',intensity:2.5},hemi:1.0,glow:0.45,saturation:-0.04,
      clouds:{count:4,color:'#ffffff'},rain:0,wind:0.02,flash:false,motes:'#fff6c4'},
    cloudy:{sky:{top:'#9fb6c6',mid:'#c9d6dc',bottom:'#e4e8df'},fog:'#d2dad9',sun:{color:'#eef2f6',intensity:1.1},hemi:1.15,glow:0.08,saturation:-0.18,
      clouds:{count:11,color:'#e9edf0'},rain:0,wind:0.035,flash:false,motes:''},
    storm:{sky:{top:'#4d5d72',mid:'#7b8a99',bottom:'#a9b2b0'},fog:'#8f9ca3',sun:{color:'#c9d6ea',intensity:0.55},hemi:0.85,glow:0,saturation:-0.3,
      clouds:{count:14,color:'#7d8794'},rain:900,wind:0.09,flash:true,motes:''},
    heat:{sky:{top:'#f2c48a',mid:'#fbe2b4',bottom:'#fff3d9'},fog:'#f7e3c0',sun:{color:'#fff0c8',intensity:3.4},hemi:1.15,glow:0.85,saturation:-0.02,
      clouds:{count:0,color:'#ffffff'},rain:0,wind:0.008,flash:false,motes:'#ffd9a0'},
  },

  post:{
    bloom:{threshold:0.82,smoothing:0.25,intensity:0.75,radius:0.8},
    tiltShift:{blur:0.17,taper:0.55},
    vignette:{offset:0.3,darkness:0.38},
  },
};
