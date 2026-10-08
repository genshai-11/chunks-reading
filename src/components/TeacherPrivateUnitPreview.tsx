import {memo,useEffect,useMemo,useState} from 'react';
import {ChevronLeft,ChevronRight,Play,Pause,SkipForward,CornerDownLeft} from 'lucide-react';
import type {ClassroomRoom,ReadingResource,CalculatedTimeline} from '../types';
import {mergeShortUnits} from '../utils/textSegmentation';
import {getUnitApprovedSpans} from '../utils/unitAnnotations';
import {calculateRoomTimeline} from '../utils/timingEngine';
import {ReadingUnitText} from './ReadingUnitText';
import {ReadingCountdown} from './ReadingCountdown';
/** Private browsing and rehearsal. Never imports or calls room commands. */
export const TeacherPrivateUnitPreview = memo(function TeacherPrivateUnitPreview({room,resource,currentIndex}:{room:ClassroomRoom;resource:ReadingResource;currentIndex?:number}){
 const [browseIndex,setBrowseIndex]=useState<number|null>(null),[started,setStarted]=useState<number|null>(null);
 const [timeline,setTimeline]=useState<CalculatedTimeline|null>(null);
 const units=useMemo(()=>{const raw=room.granularity==='paragraph'?resource.paragraphs:resource.sentences;return room.autoMergeShortUnits?mergeShortUnits(raw,{minWords:room.minWordsPerUnit}):raw;},[resource,room.granularity,room.autoMergeShortUnits,room.minWordsPerUnit]);
 const liveIndex=currentIndex??room.currentUnit?.index??0;
 const index=Math.max(0,Math.min(browseIndex??liveIndex+1,units.length-1));
 const text=units[index]??'';
 const annotations=useMemo(()=>getUnitApprovedSpans(resource,text,index,room.granularity),[resource,text,index,room.granularity]);
 const localRoom:ClassroomRoom=useMemo(()=>({...room,id:`${room.id}:private`,isFullReview:false,playbackStatus:started===null?'manual_show':'playing',serverStartTime:0,pausedElapsedMs:0,
  currentUnit:{index,totalUnits:units.length,granularity:room.granularity,text,annotations,isFullReview:false}}),[room,started,index,text,annotations,units.length]);
 useEffect(()=>{setBrowseIndex(null);setStarted(null);setTimeline(null);},[room.id,resource.id,room.granularity]);
 useEffect(()=>{
  if(started===null)return;let frame:number|undefined;
  const tick=()=>{
   const value=calculateRoomTimeline(localRoom,performance.now()-started);setTimeline(value);
   if(value.phase==='blank_finished'){
    if(index+1<units.length){setTimeline(null);setBrowseIndex(index+1);setStarted(performance.now());}
    else setStarted(null);
    return;
   }
   frame=requestAnimationFrame(tick);
  };tick();return()=>{if(frame!==undefined)cancelAnimationFrame(frame);};
 },[started,index,localRoom,units.length]);
 const navigate=(delta:number)=>{document.activeElement?.closest<HTMLElement>('[data-testid="private-unit-preview"]')?.focus();setStarted(null);setTimeline(null);setBrowseIndex(Math.max(0,Math.min(index+delta,units.length-1)));};
 const shownTimeline=started!==null&&timeline?timeline:calculateRoomTimeline({...localRoom,playbackStatus:'manual_show'},0);
 return <details data-testid="private-unit-preview" tabIndex={-1} onPointerDown={e=>{if(!(e.target as HTMLElement).closest('button,summary'))e.currentTarget.focus();}} onKeyDown={e=>{
  if(e.repeat)return;
  if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();e.stopPropagation();navigate(e.key==='ArrowLeft'?-1:1);}
  if(e.key.toLowerCase()==='r'){e.preventDefault();e.stopPropagation();setBrowseIndex(index);setTimeline(null);setStarted(performance.now());}
 }} onToggle={e=>{if(!e.currentTarget.open)setStarted(null);}} className="rounded-lg border-2 border-black bg-[#FFFDF0] text-left text-xs">
  <summary className="cursor-pointer px-3 py-2 font-bold">Xem trước {room.granularity==='paragraph'?'đoạn':'câu'} tiếp theo <span className="ml-2 font-normal text-neutral-500">Riêng teacher</span></summary>
  <div className="space-y-2 border-t border-black/20 p-3">
   {browseIndex===null && liveIndex>=units.length-1 && <p className="text-neutral-500">Đã đến đơn vị cuối. Dùng nút trước để xem lại.</p>}
   <div className="flex flex-wrap items-center justify-between gap-2"><span>{room.granularity==='paragraph'?'Đoạn':'Câu'} {index+1}/{units.length} · không chiếu learner</span>
    <div className="flex gap-1">
     <button type="button" disabled={index===0} onClick={()=>navigate(-1)} aria-label="Preview trước riêng teacher" className="neo-btn-sm p-1"><ChevronLeft size={16}/></button>
     <button type="button" disabled={!text} onClick={()=>{setBrowseIndex(index);setTimeline(null);setStarted(started===null?performance.now():null);}} aria-label={started===null?'Đọc thử tự chuyển riêng teacher':'Dừng đọc thử riêng teacher'} className="neo-btn-sm p-1 bg-[#FFE500]">{started===null?<Play size={16}/>:<Pause size={16}/>}</button>
     <button type="button" disabled={index>=units.length-1} onClick={()=>navigate(1)} aria-label="Preview tiếp riêng teacher" className="neo-btn-sm p-1"><ChevronRight size={16}/></button>
     <button type="button" onClick={()=>{setStarted(null);setTimeline(null);setBrowseIndex(Math.max(0,Math.min(liveIndex,units.length-1)));}} aria-label="Về đơn vị hiện tại của lớp" title="Về câu/đoạn đang chiếu — chỉ preview teacher" className="neo-btn-sm p-1"><CornerDownLeft size={16}/></button>
     <button type="button" onClick={()=>{setStarted(null);setTimeline(null);setBrowseIndex(null);}} aria-label="Theo đơn vị tiếp theo của lớp" title="Theo đơn vị tiếp theo của lớp" className="neo-btn-sm p-1"><SkipForward size={16}/></button>
    </div>
   </div>
   <ReadingCountdown timeline={shownTimeline}/>
   <div className="max-h-40 overflow-y-auto bg-paper-reading p-2 text-center"><ReadingUnitText room={localRoom} timeline={shownTimeline} className="font-reading text-lg leading-relaxed"/></div>
  </div>
 </details>;
});
