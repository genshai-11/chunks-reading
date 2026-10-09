import type { EraseSchedule, Granularity, TimingMode } from '../types';
import { calculateAutoReadingMs, getWordsPerSecond, getWordOffsets } from '../utils/readingTiming';
import { CirclePlay, Timer, Flag, Volume2 } from 'lucide-react';
import { AUDIO_OPTIONS, type SoundKind } from '../utils/teacherAudio';
interface Props {
  mode: TimingMode; onMode: (mode: TimingMode) => void;
  rate: number; onRate: (rate: number) => void;
  schedule: EraseSchedule; onSchedule: (schedule: EraseSchedule) => void;
  text: string;
  profiles: Record<Granularity, { holdMs: number; eraseMs: number }>;
  onProfile: (granularity: Granularity, field: 'holdMs' | 'eraseMs', value: number) => void;
  sounds: Record<SoundKind, boolean>; onSound: (kind: SoundKind, enabled: boolean) => void;
  soundOptions: Record<SoundKind, string>; onSelectSound: (kind: SoundKind, id: string) => void; onPreviewSound: (kind: SoundKind) => void;
}
export function TeacherReadingSettings({ mode, onMode, rate, onRate, schedule, onSchedule, text, profiles, onProfile, sounds, onSound, soundOptions, onSelectSound, onPreviewSound }: Props) {
  return <section aria-label="Reading and erase timing" className="space-y-3 text-xs font-mono">
    <label className="flex flex-wrap items-center justify-between gap-2 font-bold">Timing
      <select aria-label="Timing mode" value={mode} onChange={e => onMode(e.target.value as TimingMode)} className="neo-input py-1 text-xs">
        <option value="fixed">Custom</option><option value="auto">Auto</option>
      </select>
    </label>
    {mode === 'auto' ? <div data-testid="auto-timing-settings" className="space-y-2">
      <label className="flex items-center justify-between gap-2">Words per second
        <input aria-label="Words per second" type="number" min={1} max={50} step={1} value={rate} onChange={e => onRate(Number(e.target.value))} className="neo-input w-20 py-1 text-xs" />
      </label>
      <p className="text-neutral-500">{getWordOffsets(text).length} words ÷ {getWordsPerSecond(rate)} = {(calculateAutoReadingMs(text, getWordsPerSecond(rate)) / 1000).toFixed(2)}s read · 1s erase tail</p>
    </div> : <div data-testid="custom-timing-settings" className="grid grid-cols-[auto_1fr_1fr] items-center gap-2">
      <span /><span>Hold (s)</span><span>Erase (s)</span>
      {(['sentence', 'paragraph'] as const).map(granularity => <div key={granularity} className="contents">
        <span>{granularity === 'sentence' ? 'Sentence' : 'Paragraph'}</span>
        {(['holdMs', 'eraseMs'] as const).map(field => <input key={field} type="number" min={field === 'holdMs' ? .5 : .3} max={120} step={.1}
          aria-label={`${granularity === 'sentence' ? 'Sentence' : 'Paragraph'} ${field === 'holdMs' ? 'Hold' : 'Erase'} (seconds)`}
          value={profiles[granularity][field] / 1000} onChange={e => onProfile(granularity, field, Math.round(Number(e.target.value) * 1000))} className="neo-input w-full min-w-0 py-1 text-xs" />)}
      </div>)}
    </div>}
    <label className="flex flex-wrap items-center justify-between gap-2">Erase Mechanism
      <select aria-label="Erase mechanism" value={schedule} onChange={e => onSchedule(e.target.value as EraseSchedule)} className="neo-input py-1 text-xs max-w-full">
        <option value="after_reading">Erase after reading</option><option value="word_groups">Erase while reading</option>
      </select>
    </label>
    <p className="text-[10px] text-neutral-500">Requires Apply. When erasing while reading, Erase is the cursor delay; does not erase unread words.</p>
    <fieldset className="space-y-2" data-testid="teacher-audio-settings">
      <legend className="flex items-center gap-1.5 font-bold mb-2"><Volume2 size={16} />Audio</legend>
      {(['start','tick','finish'] as const).map(kind => {
        const label=kind === 'start' ? 'Start' : kind === 'tick' ? 'Countdown' : 'Finish';
        const Icon=kind === 'start' ? CirclePlay : kind === 'tick' ? Timer : Flag;
        return <div key={kind} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2">
          <label className="flex items-center gap-1.5">
            <input type="checkbox" checked={sounds[kind]} onChange={e => onSound(kind,e.target.checked)} aria-label={`${label} sound`} />
            <Icon size={15} /><span className="capitalize">{label}</span>
          </label>
          <select aria-label={`Select ${label} sound`} value={soundOptions[kind]} onChange={e => onSelectSound(kind,e.target.value)}
            className="neo-input w-full min-w-0 py-1 text-xs">
            {AUDIO_OPTIONS[kind].map(option => <option key={option.id} value={option.id}>{option.label}</option>)}
          </select>
          <button type="button" onClick={() => onPreviewSound(kind)} aria-label={`Preview ${label} sound`} title={`Preview ${label} sound`}
            className="neo-btn-sm p-1 bg-white"><Volume2 size={15} /></button>
        </div>;
      })}
    </fieldset>
    <p className="text-[10px] text-neutral-500">Audio changes apply immediately · teacher device only.</p>
  </section>;
}
