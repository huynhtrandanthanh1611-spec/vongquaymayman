export const clamp01=t=>Math.max(0,Math.min(1,t));
// Accelerate immediately, then coast smoothly to a precise stop.
export function wheelEase(progress){const q=clamp01(progress);return 1-(1-q)**4*(1+4*q);}
export function stageLayout(width,height){
 const footer=height<400?54:70,space=Math.max(1,height-footer);
 const diameter=Math.max(1,Math.floor(Math.min(width-36,(space-32)/1.08)));
 return{width,height,diameter,cx:width/2,cy:space/2,radius:diameter/2+2,footer};
}
