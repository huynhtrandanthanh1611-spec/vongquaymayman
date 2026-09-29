import assert from 'node:assert/strict';
import {stageLayout,wheelEase} from '../dist/wheel-motion.mjs';
for(const [w,h] of [[319,340],[390,700],[667,290],[1024,620],[1366,768],[1920,1080],[2560,1440]]){
 const g=stageLayout(w,h),d=g.diameter;
 assert.equal(g.cx,w/2);
 assert(g.cx-d/2-9>=0&&g.cx+d/2+9<=w,'The entire outer rim fits horizontally.');
 assert(g.cy-d*.535>0,'The pointer stays within the viewport.');
 assert(g.cy+d/2+9<h-g.footer,'The external spin button has its own space.');
}
let previous=0;
for(let i=0;i<=1000;i++){const angle=wheelEase(i/1000);assert(angle>=previous);previous=angle;}
assert.equal(wheelEase(0),0);assert(wheelEase(.09)>0);assert.equal(wheelEase(1),1);
console.log('PASS: centered responsive wheel, complete rim/pointer visible, external button clearance and smooth immediate spin.');
