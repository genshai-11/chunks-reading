import { useId } from 'react';
import { normalizeDustAngle } from '../utils/eraseEffects';

const directions = [[90, '↓ Top to bottom'], [-90, '↑ Bottom to top'], [45, '↘ Down-right'], [135, '↙ Down-left'], [-45, '↗ Up-right'], [-135, '↖ Up-left'], [0, '→ Right'], [180, '← Left']] as const;

export function DustDirectionControl({ angle, onChange }: { angle: number; onChange: (angle: number) => void }) {
  const id = useId();
  const value = normalizeDustAngle(angle);
  return <div className="space-y-2 border-t border-black/20 pt-2 text-xs font-mono">
    <label htmlFor={`${id}-direction`} className="block font-bold">Dust & sweep direction</label>
    <select id={`${id}-direction`} className="neo-input w-full text-xs" value={directions.some(([a]) => a === value) ? value : 'custom'} onChange={e => { if (e.target.value !== 'custom') onChange(Number(e.target.value)); }}>
      {directions.map(([a, label]) => <option key={a} value={a}>{label}</option>)}
      <option value="custom">Custom angle</option>
    </select>
    <label htmlFor={`${id}-angle`} className="block">Sweep angle: {value}° (90° = down)</label>
    <input id={`${id}-angle`} className="w-full accent-black" type="range" min={-180} max={180} step={1} value={value} onChange={e => onChange(Number(e.target.value))} />
    <p className="text-[10px] text-neutral-600">Apply settings or advance unit to sync with students.</p>
  </div>;
}
