import {test} from 'node:test';import assert from 'node:assert/strict';import type {ClassroomRoom} from '../types';
test('clock calibrates with read-only room batchGet; cache, retry and uncalibrated freeze',async()=>{
 const originalFetch=globalThis.fetch,descriptor=Object.getOwnPropertyDescriptor(globalThis,'performance')!;
 let mono=0,count=0,fail=false;const requests:RequestInit[]=[];
 Object.defineProperty(globalThis,'performance',{configurable:true,value:{now:()=>mono}});
 globalThis.fetch=async(input,init)=>{
  count++;requests.push(init!);assert.ok(String(input).includes('/documents:batchGet?key='));assert.equal(init?.method,'POST');
  const body=JSON.parse(String(init?.body));assert.equal(body.documents.length,1);assert.ok(body.documents[0].includes('/documents/rooms/CH-CLOCK'));
  assert.equal(Object.keys(body).join(','),'documents');mono+=40;
  return new Response(JSON.stringify([{readTime:new Date(100000).toISOString()}]),{status:fail?403:200,headers:{'Content-Type':'application/json'}});
 };
 try{
  const {syncRoomClock,hasRoomClock,roomClockNow,getSyncedRoomTimeline}=await import('../services/roomClock');
  await Promise.all([syncRoomClock('CH-CLOCK'),syncRoomClock('CH-CLOCK')]);assert.equal(count,1);assert.equal(hasRoomClock('CH-CLOCK'),true);assert.equal(roomClockNow('CH-CLOCK'),100020);
  mono+=500;assert.equal(roomClockNow('CH-CLOCK'),100520);await syncRoomClock('CH-CLOCK');assert.equal(count,1);
  fail=true;await assert.rejects(syncRoomClock('CH-CLOCK-FAIL'));assert.equal(hasRoomClock('CH-CLOCK-FAIL'),false);
  const room={id:'CH-CLOCK-FAIL',playbackStatus:'playing',serverStartTime:1,status:'active',timingMode:'auto',eraseSchedule:'word_groups',wordsPerSecond:4,currentUnit:{text:'one two three four'}} as ClassroomRoom;
  assert.equal(getSyncedRoomTimeline(room).elapsedMs,0);assert.equal(getSyncedRoomTimeline(room).phase,'paused');
  fail=false;await syncRoomClock('CH-CLOCK-FAIL');assert.equal(hasRoomClock('CH-CLOCK-FAIL'),true);
  assert.ok(requests.every(request=>request.method==='POST'&&JSON.parse(String(request.body)).writes===undefined));
 }finally{globalThis.fetch=originalFetch;Object.defineProperty(globalThis,'performance',descriptor);}
});
