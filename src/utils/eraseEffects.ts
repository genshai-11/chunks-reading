import type { CalculatedTimeline, EraseEffect } from '../types';

export const ERASE_EFFECT_OPTIONS: { id: EraseEffect; label: string; activeBg: string }[] = [
  { id: 'eraser', label: '🧽 Eraser', activeBg: 'bg-[#FFE500] text-black' },
  { id: 'dust', label: '💨 Dust Particles', activeBg: 'bg-[#FFE500] text-black' },
  { id: 'sparkle', label: '✨ Light Sweep', activeBg: 'bg-[#FFE500] text-black' },
  { id: 'vaporize', label: 'Vaporize', activeBg: 'bg-[#FF3838] text-white' },
  { id: 'dissolve', label: 'Dissolve', activeBg: 'bg-[#FFE500] text-black' },
  { id: 'fade', label: 'Fade', activeBg: 'bg-[#00D2FF] text-black' },
  { id: 'wipe', label: 'Wipe', activeBg: 'bg-black text-white' },
];
export const DEFAULT_DUST_ANGLE = -45;
export const clamp = (n: number) => Math.max(0, Math.min(1, n));
export const normalizeDustAngle = (angle: number = DEFAULT_DUST_ANGLE) =>
  Number.isFinite(angle) ? Math.max(-180, Math.min(180, angle)) : DEFAULT_DUST_ANGLE;
export const seededRandom = (n: number) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

// Paused hold.progress is NOT erase.progress. Reconstruct from authoritative elapsed time.
export function getEraseProgress(timeline: CalculatedTimeline): number {
  if (timeline.phase === 'blank_finished' || timeline.phase === 'ended') return 1;
  if (timeline.phase === 'erase' || timeline.phase === 'paused') {
    return clamp((timeline.elapsedMs - timeline.effectiveHoldMs) / Math.max(1, timeline.effectiveEraseMs));
  }
  return 0;
}
export function dustVector(angle: number) {
  const radians = normalizeDustAngle(angle) * Math.PI / 180;
  return { dx: Math.cos(radians), dy: Math.sin(radians) };
}
export function remainingPolygon(width: number, height: number, dx: number, dy: number, cut: number): [number, number][] {
  const corners: [number, number][] = [[0, 0], [width, 0], [width, height], [0, height]];
  const result: [number, number][] = [];
  corners.forEach((a, i) => {
    const z = corners[(i + 1) % corners.length];
    const da = a[0] * dx + a[1] * dy - cut, dz = z[0] * dx + z[1] * dy - cut;
    if (da >= 0) result.push(a);
    if ((da >= 0) !== (dz >= 0)) {
      const t = da / (da - dz);
      result.push([a[0] + (z[0] - a[0]) * t, a[1] + (z[1] - a[1]) * t]);
    }
  });
  return result;
}
