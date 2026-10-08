import {useEffect,useState} from 'react';
import {hasRoomClock,syncRoomClock} from '../services/roomClock';
export function useRoomClock(roomId?:string){
 const [failed,setFailed]=useState(false);
 useEffect(()=>{
  if(!roomId)return;let alive=true;setFailed(false);
  const sync=()=>{void syncRoomClock(roomId).then(()=>{if(alive)setFailed(false);}).catch(()=>{if(alive)setFailed(true);});};
  sync();const interval=setInterval(sync,60000);
  return()=>{alive=false;clearInterval(interval);};
 },[roomId]);
 return {failed,ready:!!roomId&&hasRoomClock(roomId)};
}
