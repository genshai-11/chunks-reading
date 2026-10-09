export type SoundKind = 'start' | 'tick' | 'finish';
export interface AudioNote { frequency: number; atMs: number; durationMs: number; wave: OscillatorType; gain: number }
export interface AudioOption { id: string; label: string; notes: readonly AudioNote[] }
const note = (frequency: number, atMs = 0, durationMs = 90, wave: OscillatorType = 'sine', gain = .04): AudioNote => ({ frequency, atMs, durationMs, wave, gain });
/** Built-in synthesized cues: local-only, no remote assets or learner configuration. */
export const AUDIO_OPTIONS: Record<SoundKind, readonly AudioOption[]> = {
  start: [
    { id:'classic', label:'Beep', notes:[note(660)] },
    { id:'chime', label:'Chime Up', notes:[note(784),note(1047,100,140)] },
    { id:'bell', label:'Bell', notes:[note(880,0,220),note(1320,0,180,'sine',.02)] },
    { id:'digital', label:'Digital', notes:[note(330,0,60,'triangle'),note(660,70,60,'triangle'),note(990,140,90,'triangle')] },
    { id:'soft', label:'Soft', notes:[note(440,0,160,'sine',.018)] },
  ],
  tick: [
    { id:'classic', label:'Beep', notes:[note(880)] },
    { id:'chime', label:'Ping', notes:[note(1245,0,70)] },
    { id:'bell', label:'Small Bell', notes:[note(1568,0,80,'triangle',.025),note(2352,0,50,'sine',.012)] },
    { id:'digital', label:'Digital Click', notes:[note(440,0,40,'square',.018)] },
    { id:'soft', label:'Soft Tick', notes:[note(660,0,60,'sine',.015)] },
  ],
  finish: [
    { id:'classic', label:'Beep', notes:[note(440)] },
    { id:'chime', label:'Chime Down', notes:[note(660,0,80),note(523,90,80),note(392,180,160)] },
    { id:'bell', label:'End Bell', notes:[note(523,0,350),note(784,0,300,'sine',.02)] },
    { id:'digital', label:'Digital', notes:[note(880,0,70,'triangle'),note(660,80,70,'triangle'),note(440,160,180,'triangle')] },
    { id:'soft', label:'Soft', notes:[note(330,0,240,'sine',.018)] },
  ],
};
export function getAudioOption(kind: SoundKind, id: string): AudioOption {
  return AUDIO_OPTIONS[kind].find(option => option.id === id) || AUDIO_OPTIONS[kind][0];
}
