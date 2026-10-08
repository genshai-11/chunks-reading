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
  return <section aria-label="Thời gian đọc và xóa" className="space-y-3 text-xs font-mono">
    <label className="flex flex-wrap items-center justify-between gap-2 font-bold">Thời gian
      <select aria-label="Chế độ thời gian" value={mode} onChange={e => onMode(e.target.value as TimingMode)} className="neo-input py-1 text-xs">
        <option value="fixed">Tự cấu hình</option><option value="auto">Auto</option>
      </select>
    </label>
    {mode === 'auto' ? <div data-testid="auto-timing-settings" className="space-y-2">
      <label className="flex items-center justify-between gap-2">Từ mỗi giây
        <input aria-label="Từ mỗi giây" type="number" min={1} max={50} step={1} value={rate} onChange={e => onRate(Number(e.target.value))} className="neo-input w-20 py-1 text-xs" />
      </label>
      <p className="text-neutral-500">{getWordOffsets(text).length} từ ÷ {getWordsPerSecond(rate)} = {(calculateAutoReadingMs(text, getWordsPerSecond(rate)) / 1000).toFixed(2)}s đọc · 1s đuôi xóa</p>
    </div> : <div data-testid="custom-timing-settings" className="grid grid-cols-[auto_1fr_1fr] items-center gap-2">
      <span /><span>Hold (s)</span><span>Erase (s)</span>
      {(['sentence', 'paragraph'] as const).map(granularity => <div key={granularity} className="contents">
        <span>{granularity === 'sentence' ? 'Câu' : 'Đoạn'}</span>
        {(['holdMs', 'eraseMs'] as const).map(field => <input key={field} type="number" min={field === 'holdMs' ? .5 : .3} max={120} step={.1}
          aria-label={`${granularity === 'sentence' ? 'Câu' : 'Đoạn'} ${field === 'holdMs' ? 'Hold' : 'Erase'} (giây)`}
          value={profiles[granularity][field] / 1000} onChange={e => onProfile(granularity, field, Math.round(Number(e.target.value) * 1000))} className="neo-input w-full min-w-0 py-1 text-xs" />)}
      </div>)}
    </div>}
    <label className="flex flex-wrap items-center justify-between gap-2">Cơ chế xóa
      <select aria-label="Cơ chế xóa" value={schedule} onChange={e => onSchedule(e.target.value as EraseSchedule)} className="neo-input py-1 text-xs max-w-full">
        <option value="after_reading">Đọc hết rồi xóa</option><option value="word_groups">Xóa lần lượt khi đọc</option>
      </select>
    </label>
    <p className="text-[10px] text-neutral-500">Cần Apply. Khi xóa lúc đọc, Erase là độ trễ của con trỏ xóa; không xóa từ chưa đọc.</p>
    <fieldset className="space-y-2" data-testid="teacher-audio-settings">
      <legend className="flex items-center gap-1.5 font-bold mb-2"><Volume2 size={16} />Âm thanh</legend>
      {(['start','tick','finish'] as const).map(kind => {
        const label=kind === 'start' ? 'bắt đầu' : kind === 'tick' ? 'đếm ngược' : 'kết thúc';
        const Icon=kind === 'start' ? CirclePlay : kind === 'tick' ? Timer : Flag;
        return <div key={kind} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2">
          <label className="flex items-center gap-1.5">
            <input type="checkbox" checked={sounds[kind]} onChange={e => onSound(kind,e.target.checked)} aria-label={`Âm ${label}`} />
            <Icon size={15} /><span className="capitalize">{label}</span>
          </label>
          <select aria-label={`Chọn âm ${label}`} value={soundOptions[kind]} onChange={e => onSelectSound(kind,e.target.value)}
            className="neo-input w-full min-w-0 py-1 text-xs">
            {AUDIO_OPTIONS[kind].map(option => <option key={option.id} value={option.id}>{option.label}</option>)}
          </select>
          <button type="button" onClick={() => onPreviewSound(kind)} aria-label={`Nghe thử âm ${label}`} title={`Nghe thử âm ${label}`}
            className="neo-btn-sm p-1 bg-white"><Volume2 size={15} /></button>
        </div>;
      })}
    </fieldset>
    <p className="text-[10px] text-neutral-500">Âm thanh đổi ngay · chỉ máy teacher.</p>
  </section>;
}
