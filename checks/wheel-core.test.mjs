import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {indexAtPointer,targetRotation,remainingItems,randomIndex,cleanLines} from '../dist/wheel-core.mjs';

// The rendered sectors start at twelve o'clock. Test the landing geometry
// across wheel sizes and accumulated clockwise rotations.
let landings=0;
for(const count of [1,2,3,5,8,12,23,50,100,250,1000,10000]){
  for(let i=0;i<count;i++)for(const current of [-22.5,0,57.8,359.99,8250.37]){
    assert.equal(indexAtPointer(targetRotation(current,i,count),count),i);
    landings++;
  }
}

const items=Array.from({length:60},(_,i)=>({id:String(i),text:`Nội dung ${i+1}`}));
const history=[];
while(remainingItems(items,history).length){
  const options=remainingItems(items,history);
  const index=randomIndex(options.length,webcrypto);
  const landed=indexAtPointer(targetRotation(1263.42,index,options.length),options.length);
  history.push(options[landed]);
}
assert.equal(new Set(history.map(x=>x.id)).size,60);
assert.equal(remainingItems(items,history).length,0);
assert.equal(remainingItems(items,[]).length,60);
assert.equal(remainingItems([{id:'a',text:'Nguyễn An'},{id:'b',text:'  NGUYỄN   AN  '}],[]).length,1);
assert.equal(remainingItems([{id:'b',text:'NGUYỄN AN'}],[{id:'a',text:'Nguyễn An'}]).length,0);
assert.deepEqual(cleanLines(' An\r\n\n Bình \n'),['An','Bình']);
assert.equal(indexAtPointer(0,0),-1);
assert.throws(()=>randomIndex(0,webcrypto));
let calls=0;
const rejectionSource={getRandomValues(out){out[0]=calls++===0?0xffffffff:7;return out;}};
assert.equal(randomIndex(3,rejectionSource),1);
assert.equal(calls,2);
console.log(`PASS: ${landings} exact pointer landings; 60 unique draws; final, empty, restart, duplicate and random-rejection cases.`);
