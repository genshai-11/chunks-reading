import { useId } from 'react';
import { normalizeDustAngle } from '../utils/eraseEffects';

const directions = [[90, '↓ Trên xuống'], [-90, '↑ Dưới lên'], [45, '↘ Chéo xuống phải'], [135, '↙ Chéo xuống trái'], [-45, '↗ Chéo lên phải'], [-135, '↖ Chéo lên trái'], [0, '→ Sang phải'], [180, '← Sang trái']] as const;

export function DustDirectionControl({ angle, onChange }: { angle: number; onChange: (angle: number) => void }) {
  const id = useId();
  const value = normalizeDustAngle(angle);
  return <div className="space-y-2 border-t border-black/20 pt-2 text-xs font-mono">
    <label htmlFor={`${id}-direction`} className="block font-bold">Hướng bụi bay & quét chữ</label>
    <select id={`${id}-direction`} className="neo-input w-full text-xs" value={directions.some(([a]) => a === value) ? value : 'custom'} onChange={e => { if (e.target.value !== 'custom') onChange(Number(e.target.value)); }}>
      {directions.map(([a, label]) => <option key={a} value={a}>{label}</option>)}
      <option value="custom">Góc tùy chỉnh</option>
    </select>
    <label htmlFor={`${id}-angle`} className="block">Góc bay: {value}° (90° = xuống)</label>
    <input id={`${id}-angle`} className="w-full accent-black" type="range" min={-180} max={180} step={1} value={value} onChange={e => onChange(Number(e.target.value))} />
    <p className="text-[10px] text-neutral-600">Áp dụng cấu hình / chuyển câu để đồng bộ xuống học sinh.</p>
  </div>;
}
