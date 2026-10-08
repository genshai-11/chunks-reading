import { useCallback, useEffect, useRef, useState } from 'react';
import type { CalculatedTimeline, ClassroomRoom } from '../types';
import { getSyncedRoomTimeline } from '../services/roomClock';
import { getAudioOption, type SoundKind } from '../utils/teacherAudio';
export type { SoundKind } from '../utils/teacherAudio';

export function useTeacherReadingAudio(room: ClassroomRoom | null, timeline: CalculatedTimeline) {
  const [sounds, setSounds] = useState<Record<SoundKind, boolean>>({ start:false, tick:false, finish:false });
  const [soundOptions, setSoundOptions] = useState<Record<SoundKind, string>>({ start:'classic', tick:'classic', finish:'classic' });
  const context = useRef<AudioContext | null>(null);
  const oscillators = useRef(new Map<OscillatorNode, SoundKind>());
  const mounted = useRef(true);
  const auditionGeneration = useRef(0);
  const previous = useRef<{ roomId:string; start:number|null; status:string; phase:string; second:number }|null>(null);
  const stop = useCallback((kind?: SoundKind) => {
    auditionGeneration.current++;
    for (const [oscillator, activeKind] of oscillators.current) {
      if (kind && activeKind !== kind) continue;
      try { oscillator.stop(); } catch { /* Already ended. */ }
      oscillators.current.delete(oscillator);
    }
  }, []);
  const unlock = useCallback(() => {
    try {
      if (!context.current || context.current.state === 'closed') context.current = new AudioContext();
      if (context.current.state === 'suspended') void context.current.resume().catch(() => {});
    } catch { /* Unsupported audio never blocks room commands. */ }
  }, []);
  const play = useCallback((kind:SoundKind, optionId:string) => {
    const ctx=context.current;
    if (!mounted.current || !ctx || ctx.state !== 'running') return;
    for (const note of getAudioOption(kind,optionId).notes) {
      const oscillator=ctx.createOscillator(), gain=ctx.createGain();
      const at=ctx.currentTime+note.atMs/1000, end=at+note.durationMs/1000;
      oscillator.type=note.wave; oscillator.frequency.value=note.frequency;
      gain.gain.setValueAtTime(.001,at); gain.gain.linearRampToValueAtTime(note.gain,at+.01);
      gain.gain.exponentialRampToValueAtTime(.001,end);
      oscillator.connect(gain);gain.connect(ctx.destination);oscillators.current.set(oscillator,kind);
      oscillator.onended=()=>{oscillators.current.delete(oscillator);oscillator.disconnect();gain.disconnect();};
      oscillator.start(at);oscillator.stop(end+.01);
    }
  }, []);
  const toggleSound = useCallback((kind:SoundKind, enabled:boolean) => {
    if (enabled) unlock(); else stop(kind);
    setSounds(value=>({...value,[kind]:enabled}));
  }, [unlock,stop]);
  const selectSound = useCallback((kind:SoundKind, id:string) => {
    stop(kind);setSoundOptions(value=>({...value,[kind]:getAudioOption(kind,id).id}));
  }, [stop]);
  const previewSound = useCallback(async (kind:SoundKind) => {
    stop();unlock();
    const generation=auditionGeneration.current;
    try { if(context.current?.state==='suspended')await context.current.resume();if(generation===auditionGeneration.current)play(kind,soundOptions[kind]); }
    catch { /* Browser playback policy may block audition. */ }
  }, [stop,unlock,play,soundOptions]);
  useEffect(() => {
    const gesture=()=>{if(sounds.start||sounds.tick||sounds.finish)unlock();};
    document.addEventListener('pointerdown',gesture);document.addEventListener('keydown',gesture);
    return()=>{document.removeEventListener('pointerdown',gesture);document.removeEventListener('keydown',gesture);};
  }, [sounds,unlock]);
  useEffect(() => {
    mounted.current=true;
    return()=>{mounted.current=false;stop();if(context.current&&context.current.state!=='closed')void context.current.close().catch(()=>{});};
  }, [stop]);
  useEffect(() => {
    if(!room){previous.current=null;stop();return;}
    // Derive from the new room snapshot, not a potentially stale previous-frame timeline.
    const current=getSyncedRoomTimeline(room);
    const next={roomId:room.id,start:room.serverStartTime,status:room.playbackStatus,phase:current.phase,second:Math.floor(current.elapsedMs/1000)};
    const prev=previous.current;previous.current=next;
    if(room.playbackStatus!=='playing'||room.status==='ended'||current.phase==='paused'){stop();return;}
    if(!prev||prev.roomId!==room.id)return; // Restoration must not replay missed events.
    const cue=(kind:SoundKind)=>{if(sounds[kind])play(kind,soundOptions[kind]);};
    const newTurn=prev.status!=='paused'&&(prev.status!=='playing'||prev.start!==next.start);
    if(newTurn&&current.elapsedMs<500)cue('start');
    else if(current.phase==='blank_finished'&&prev.phase!=='blank_finished')cue('finish');
    else if(['hold','erase'].includes(current.phase)&&next.second>prev.second&&prev.status==='playing')cue('tick');
  }, [room,timeline.phase,timeline.elapsedMs,sounds,soundOptions,play,stop]);
  return {sounds,soundOptions,toggleSound,selectSound,previewSound,unlock};
}
