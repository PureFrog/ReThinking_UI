// The one material every 3D piece wears (a Blender .glb gets it too when swapped in, so the look stays the same).
// MeshToonMaterial with a linearly filtered ramp gives soft light bands; a small shader patch adds
// a blue lean in the shade and a light rim on the edges. Values come from look.ts.
import * as THREE from 'three';
import {LOOK} from './look';

let ramp:THREE.DataTexture|null=null;
function rampTexture(){
  if(ramp)return ramp;
  const v=LOOK.shade.ramp,data=new Uint8Array(v.length*4);
  v.forEach((x,i)=>{const b=Math.round(x*255);data.set([b,b,b,255],i*4)});
  ramp=new THREE.DataTexture(data,v.length,1,THREE.RGBAFormat);
  ramp.magFilter=ramp.minFilter=THREE.LinearFilter;ramp.generateMipmaps=false;ramp.needsUpdate=true;
  return ramp;
}

const shared={
  uShadowTint:{value:new THREE.Color(LOOK.shade.shadowTint)},
  uShadowTintAmount:{value:LOOK.shade.shadowTintAmount},
  uRimColor:{value:new THREE.Color(LOOK.shade.rimColor)},
  uRimStrength:{value:LOOK.shade.rimStrength},
  uRimPower:{value:LOOK.shade.rimPower},
};

function patch(m:THREE.MeshToonMaterial){
  m.onBeforeCompile=shader=>{
    Object.assign(shader.uniforms,shared);
    shader.fragmentShader=shader.fragmentShader
      .replace('#include <common>',`#include <common>
uniform vec3 uShadowTint;uniform float uShadowTintAmount;uniform vec3 uRimColor;uniform float uRimStrength;uniform float uRimPower;`)
      .replace('#include <opaque_fragment>',`{
  // how lit this pixel is compared with its own base colour: 1 in full sun, lower in shade
  float lit=clamp(dot(outgoingLight,vec3(0.333))/max(dot(diffuseColor.rgb,vec3(0.333)),1e-3),0.,1.);
  outgoingLight=mix(outgoingLight*mix(vec3(1.),uShadowTint*1.6,uShadowTintAmount),outgoingLight,lit);
  float rim=pow(1.-clamp(dot(normalize(normal),normalize(vViewPosition)),0.,1.),uRimPower);
  outgoingLight+=uRimColor*rim*uRimStrength*(0.35+0.65*lit);
}
#include <opaque_fragment>`);
  };
  m.customProgramCacheKey=()=>'soft-v1';
  m.userData.soft=true;
  return m;
}

const cache=new Map<string,THREE.MeshToonMaterial>();
/** The shared soft material in this colour (one instance per colour). */
export function soft(color:string,opts:{vertexColors?:boolean;side?:THREE.Side}={}){
  const key=`${color}|${opts.vertexColors?1:0}|${opts.side??0}`;
  let m=cache.get(key);
  if(!m){m=patch(new THREE.MeshToonMaterial({color,gradientMap:rampTexture(),vertexColors:!!opts.vertexColors,side:opts.side??THREE.FrontSide}));cache.set(key,m)}
  return m;
}
