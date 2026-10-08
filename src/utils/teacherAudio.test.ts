import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AUDIO_OPTIONS, getAudioOption } from './teacherAudio';
for(const kind of ['start','tick','finish'] as const){
 test(`${kind} has five distinct bounded built-in audio choices`,()=>{
  const options=AUDIO_OPTIONS[kind];assert.equal(options.length,5);
  assert.equal(new Set(options.map(option=>option.id)).size,5);
  assert.equal(new Set(options.map(option=>JSON.stringify(option.notes))).size,5);
  for(const option of options){assert.ok(option.label);assert.ok(option.notes.length);
   for(const note of option.notes){
    assert.ok(note.frequency>=20&&note.frequency<=20000);
    assert.ok(note.atMs>=0&&note.durationMs>10&&note.atMs+note.durationMs<=1000);
    assert.ok(note.gain>0&&note.gain<=.06);
    assert.ok(['sine','triangle','square','sawtooth'].includes(note.wave));
   }
  }
 });
}
test('unknown option falls back to the original cue frequency',()=>{
 for(const [kind,frequency] of [['start',660],['tick',880],['finish',440]] as const){
  const option=getAudioOption(kind,'missing');assert.equal(option.id,'classic');assert.equal(option.notes[0].frequency,frequency);
 }
});
