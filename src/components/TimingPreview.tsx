/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { TimingPolicy } from '../types';
import { getEffectiveDurations } from '../utils/timingEngine';
import { Play, RotateCcw } from 'lucide-react';

interface TimingPreviewProps {
  policy: TimingPolicy;
  holdDurationMs: number;
  eraseDurationMs: number;
  totalWindowMs: number;
}

export const TimingPreview: React.FC<TimingPreviewProps> = ({
  policy,
  holdDurationMs,
  eraseDurationMs,
  totalWindowMs,
}) => {
  const { effectiveHoldMs, effectiveEraseMs, totalDurationMs } = getEffectiveDurations(
    policy,
    holdDurationMs,
    eraseDurationMs,
    totalWindowMs
  );

  const [previewRunning, setPreviewRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    let animId: number;
    let startTime: number;

    if (previewRunning) {
      startTime = performance.now();
      const step = (now: number) => {
        const cur = now - startTime;
        if (cur >= totalDurationMs) {
          setElapsed(totalDurationMs);
          setPreviewRunning(false);
        } else {
          setElapsed(cur);
          animId = requestAnimationFrame(step);
        }
      };
      animId = requestAnimationFrame(step);
    } else {
      setElapsed(0);
    }

    return () => cancelAnimationFrame(animId);
  }, [previewRunning, totalDurationMs]);

  const holdWidthPercent = Math.round((effectiveHoldMs / totalDurationMs) * 100);
  const eraseWidthPercent = 100 - holdWidthPercent;
  const progressPercent = Math.min(100, Math.round((elapsed / totalDurationMs) * 100));

  let currentPhaseLabel = 'Ready to test';
  if (previewRunning) {
    if (elapsed < effectiveHoldMs) {
      currentPhaseLabel = `HOLDING TEXT (${Math.ceil((effectiveHoldMs - elapsed) / 1000)}s)`;
    } else {
      currentPhaseLabel = `ERASING TEXT (${Math.ceil((totalDurationMs - elapsed) / 1000)}s)`;
    }
  } else if (elapsed >= totalDurationMs) {
    currentPhaseLabel = 'BLANK PAPER (Finished)';
  }

  return (
    <div className="neo-box-sm p-4 bg-[#FFFDF0]">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-mono font-bold uppercase tracking-wider text-black flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 bg-[#FFE500] border border-black inline-block"></span>
          Timeline Preview
        </span>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold px-1.5 py-0.5 bg-black text-white">
            {currentPhaseLabel}
          </span>
          <button
            type="button"
            onClick={() => setPreviewRunning(!previewRunning)}
            className="neo-btn-sm px-2 py-0.5 bg-[#FFE500] text-black text-xs"
            title="Test preview animation"
          >
            {previewRunning ? <RotateCcw size={12} className="mr-1" /> : <Play size={12} className="mr-1" />}
            {previewRunning ? 'Reset' : 'Preview'}
          </button>
        </div>
      </div>

      {/* Visual Timeline Bar */}
      <div className="relative w-full h-8 border-2 border-black bg-white overflow-hidden flex">
        {/* Hold section */}
        <div
          style={{ width: `${holdWidthPercent}%` }}
          className="h-full bg-[#4ADE80] border-r-2 border-black flex items-center justify-center relative overflow-hidden"
        >
          <span className="text-[10px] font-mono font-extrabold uppercase text-black tracking-tight z-10">
            HOLD: {(effectiveHoldMs / 1000).toFixed(1)}s ({holdWidthPercent}%)
          </span>
        </div>

        {/* Erase section */}
        <div
          style={{ width: `${eraseWidthPercent}%` }}
          className="h-full bg-[#FF3838] flex items-center justify-center relative overflow-hidden text-white"
        >
          <span className="text-[10px] font-mono font-extrabold uppercase text-white tracking-tight z-10">
            ERASE: {(effectiveEraseMs / 1000).toFixed(1)}s ({eraseWidthPercent}%)
          </span>
        </div>

        {/* Dynamic Playhead */}
        {previewRunning && (
          <div
            style={{ left: `${progressPercent}%` }}
            className="absolute top-0 bottom-0 w-1 bg-black z-20 transition-none shadow-[0_0_4px_#000]"
          >
            <div className="w-2.5 h-2.5 bg-black -translate-x-[3px] -translate-y-1"></div>
          </div>
        )}
      </div>

      {/* Numerical summary */}
      <div className="grid grid-cols-3 gap-2 mt-2 text-center text-xs font-mono">
        <div className="p-1 border border-black bg-white">
          <div className="text-[10px] text-neutral-500 uppercase">Hold Text</div>
          <div className="font-bold text-black">{effectiveHoldMs} ms</div>
        </div>
        <div className="p-1 border border-black bg-white">
          <div className="text-[10px] text-neutral-500 uppercase">Erase Duration</div>
          <div className="font-bold text-black">{effectiveEraseMs} ms</div>
        </div>
        <div className="p-1 border border-black bg-[#FFE500]">
          <div className="text-[10px] text-neutral-700 uppercase">Total Window</div>
          <div className="font-bold text-black">{totalDurationMs} ms</div>
        </div>
      </div>
    </div>
  );
};
