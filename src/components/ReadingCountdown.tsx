import type { CalculatedTimeline } from '../types';

export function ReadingCountdown({ timeline }: { timeline: CalculatedTimeline }) {
  if (!['hold', 'erase', 'paused', 'blank_finished'].includes(timeline.phase) || !Number.isFinite(timeline.remainingMs)) return null;
  const remaining = Math.max(0, timeline.remainingMs);
  const percent = Math.max(0, Math.min(100, remaining / Math.max(1, timeline.totalDurationMs) * 100));
  return <div className="space-y-1" data-testid="reading-countdown">
    <div className="flex justify-between text-xs font-mono"><span>{timeline.phase === 'paused' ? 'Tạm dừng' : 'Thời gian còn lại'}</span>
      <span data-testid="reading-seconds">{(remaining / 1000).toFixed(1)}s</span></div>
    <div role="progressbar" aria-label="Thời gian đọc còn lại" aria-valuemin={0} aria-valuemax={100}
      aria-valuenow={Math.round(percent)} aria-valuetext={`${(remaining / 1000).toFixed(1)} giây`}
      className="h-2 bg-neutral-200 overflow-hidden rounded-sm">
      <div className="h-full bg-[#FF3838]" style={{ width: `${percent}%` }} />
    </div>
  </div>;
}
