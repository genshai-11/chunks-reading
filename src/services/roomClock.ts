import { auth } from '../firebase';
import config from '../../firebase-applet-config.json';
import type { ClassroomRoom } from '../types';
import { calculateRoomTimeline } from '../utils/timingEngine';
import { createServerClockSample, getServerClockNow, type ServerClockSample } from '../utils/serverClock';
const clocks=new Map<string,ServerClockSample>();
const pending=new Map<string,Promise<void>>();
export const hasRoomClock=(roomId:string)=>clocks.has(roomId);
export function roomClockNow(roomId:string):number {
 const sample=clocks.get(roomId);
 if(!sample)throw new Error('Chưa đồng bộ thời gian. Vui lòng thử lại.');
 return Math.round(getServerClockNow(sample,performance.now()));
}
/** Read only the already-accessible room. Firestore batchGet readTime is server time, not document updatedAt. */
export async function syncRoomClock(roomId:string):Promise<void> {
 const cached=clocks.get(roomId);
 if(cached&&performance.now()-cached.responseMonoMs<60000)return;
 const existing=pending.get(roomId);if(existing)return existing;
 const task=(async()=>{
  if(!/^[A-Za-z0-9_-]{1,128}$/.test(roomId))throw new Error('Invalid room');
  const token=await auth.currentUser?.getIdToken();
  const database=`projects/${config.projectId}/databases/${config.firestoreDatabaseId || '(default)'}`;
  const controller=new AbortController(), timeout=setTimeout(()=>controller.abort(),5000);
  try{
   const sent=performance.now();
   const response=await fetch(`https://firestore.googleapis.com/v1/${database}/documents:batchGet?key=${encodeURIComponent(config.apiKey)}`,{
    method:'POST',cache:'no-store',signal:controller.signal,
    headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},
    body:JSON.stringify({documents:[`${database}/documents/rooms/${roomId}`]}),
   });
   if(!response.ok)throw new Error('Clock read failed');
   const payload=await response.json(), received=performance.now();
   const records=Array.isArray(payload)?payload:[payload];
   const readTime=records.find(record=>typeof record?.readTime==='string')?.readTime;
   clocks.set(roomId,createServerClockSample(readTime,sent,received));
  }finally{clearTimeout(timeout);}
 })().catch(()=>{throw new Error('Không đồng bộ được giờ server. Kiểm tra kết nối rồi thử lại.');});pending.set(roomId,task);
 try{await task;}catch{throw new Error('Không đồng bộ được giờ server. Kiểm tra kết nối rồi thử lại.');}
 finally{pending.delete(roomId);}
}
export function getSyncedRoomTimeline(room:ClassroomRoom){
 // Do not erase against an uncalibrated wall clock; keep the current unit frozen while connecting.
 if(room.playbackStatus==='playing'&&!hasRoomClock(room.id))return calculateRoomTimeline({...room,playbackStatus:'paused',pausedElapsedMs:0},0);
 return calculateRoomTimeline(room,hasRoomClock(room.id)?roomClockNow(room.id):0);
}
