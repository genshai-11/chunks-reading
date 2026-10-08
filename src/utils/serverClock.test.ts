import {test} from 'node:test';import assert from 'node:assert/strict';
import {createServerClockSample,getServerClockNow} from './serverClock';
import {calculateRoomTimeline} from './timingEngine';import {getWordEraseTimeline} from './readingTiming';
import type {ClassroomRoom} from '../types';
test('different client clock origins produce identical elapsed and first-second erasure',()=>{
 const teacher=createServerClockSample(new Date(100090).toISOString(),100,120);
 const learner=createServerClockSample(new Date(100180).toISOString(),5000,5040);
 const room={playbackStatus:'playing',serverStartTime:100000,status:'active',timingMode:'auto',wordsPerSecond:4,eraseSchedule:'word_groups',currentUnit:{text:'one two three four five six seven eight'}} as ClassroomRoom;
 const a=calculateRoomTimeline(room,getServerClockNow(teacher,520)),b=calculateRoomTimeline(room,getServerClockNow(learner,5340));
 assert.deepEqual(a,b);assert.equal(a.elapsedMs,500);assert.equal(getWordEraseTimeline(room,b,room.currentUnit!.text,0).progress,0);
 for(const elapsed of [999,1000,1250,2000,3000]){
  assert.deepEqual(calculateRoomTimeline(room,getServerClockNow(teacher,20+elapsed)),calculateRoomTimeline(room,getServerClockNow(learner,4840+elapsed)));
 }
});
test('sequential Auto labels the first second as reading, then erasing',()=>{
 const room={playbackStatus:'playing',serverStartTime:0,status:'active',timingMode:'auto',eraseSchedule:'word_groups',wordsPerSecond:4,currentUnit:{text:'one two three four five six seven eight'}} as ClassroomRoom;
 for(const ms of [0,100,999])assert.equal(calculateRoomTimeline(room,ms).phase,'hold');
 assert.equal(calculateRoomTimeline(room,1000).phase,'erase');
});
test('invalid or excessively slow clock samples fail closed',()=>{
 assert.throws(()=>createServerClockSample('invalid',0,20));assert.throws(()=>createServerClockSample(new Date().toISOString(),0,5000));
 assert.throws(()=>createServerClockSample(new Date().toISOString(),0,1001));
 assert.throws(()=>createServerClockSample(new Date().toISOString(),30,20));
});
