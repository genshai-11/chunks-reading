/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ClassroomRoom, CalculatedTimeline, TimingPolicy } from '../types';

/**
 * Calculates effective timing values based on policy.
 */
export function getEffectiveDurations(
  policy: TimingPolicy,
  holdDurationMs: number,
  eraseDurationMs: number,
  totalWindowMs: number
): { effectiveHoldMs: number; effectiveEraseMs: number; totalDurationMs: number } {
  const safeHold = Math.max(500, holdDurationMs || 3000);
  const safeErase = Math.max(300, eraseDurationMs || 1000);

  if (policy === 'erase_within_window') {
    const safeWindow = Math.max(safeErase + 200, totalWindowMs || 3000);
    const effectiveHold = safeWindow - safeErase;
    return {
      effectiveHoldMs: effectiveHold,
      effectiveEraseMs: safeErase,
      totalDurationMs: safeWindow,
    };
  }

  // 'hold_then_erase'
  return {
    effectiveHoldMs: safeHold,
    effectiveEraseMs: safeErase,
    totalDurationMs: safeHold + safeErase,
  };
}

/**
 * Authoritatively compute the current playback phase, remaining milliseconds, and erase progress (0 to 1).
 * Works purely from server timestamps and elapsed times, so late joiners and background tabs sync instantly.
 */
export function calculateRoomTimeline(
  room: ClassroomRoom,
  currentClientTime: number = Date.now()
): CalculatedTimeline {
  const { timingPolicy, holdDurationMs, eraseDurationMs, totalWindowMs, playbackStatus, serverStartTime, pausedElapsedMs } = room;

  const { effectiveHoldMs, effectiveEraseMs, totalDurationMs } = getEffectiveDurations(
    timingPolicy,
    holdDurationMs,
    eraseDurationMs,
    totalWindowMs
  );

  if (playbackStatus === 'idle') {
    return {
      phase: 'idle',
      progress: 0,
      remainingMs: totalDurationMs,
      totalDurationMs,
      effectiveHoldMs,
      effectiveEraseMs,
      elapsedMs: 0,
    };
  }

  if (playbackStatus === 'manual_show') {
    return {
      phase: 'manual_show',
      progress: 0,
      remainingMs: Infinity,
      totalDurationMs,
      effectiveHoldMs,
      effectiveEraseMs,
      elapsedMs: 0,
    };
  }

  if (playbackStatus === 'ended') {
    return {
      phase: 'ended',
      progress: 1,
      remainingMs: 0,
      totalDurationMs,
      effectiveHoldMs,
      effectiveEraseMs,
      elapsedMs: totalDurationMs,
    };
  }

  // Calculate elapsed milliseconds
  let elapsedMs = 0;
  if (playbackStatus === 'paused') {
    elapsedMs = pausedElapsedMs || 0;
  } else if (playbackStatus === 'playing') {
    if (serverStartTime) {
      elapsedMs = Math.max(0, currentClientTime - serverStartTime);
    } else {
      elapsedMs = pausedElapsedMs || 0;
    }
  }

  // Determine phase based on elapsed
  if (elapsedMs < effectiveHoldMs) {
    // Hold phase (reading text is fully visible)
    const holdProgress = Math.min(1, elapsedMs / effectiveHoldMs);
    return {
      phase: playbackStatus === 'paused' ? 'paused' : 'hold',
      progress: holdProgress,
      remainingMs: Math.max(0, totalDurationMs - elapsedMs),
      totalDurationMs,
      effectiveHoldMs,
      effectiveEraseMs,
      elapsedMs,
    };
  }

  if (elapsedMs < totalDurationMs) {
    // Erase phase (erasing or dissolving across the erase duration)
    const eraseProgress = Math.min(1, Math.max(0, (elapsedMs - effectiveHoldMs) / effectiveEraseMs));
    return {
      phase: playbackStatus === 'paused' ? 'paused' : 'erase',
      progress: eraseProgress,
      remainingMs: Math.max(0, totalDurationMs - elapsedMs),
      totalDurationMs,
      effectiveHoldMs,
      effectiveEraseMs,
      elapsedMs,
    };
  }

  // Beyond total duration: blank paper after erasing finishes!
  return {
    phase: 'blank_finished',
    progress: 1,
    remainingMs: 0,
    totalDurationMs,
    effectiveHoldMs,
    effectiveEraseMs,
    elapsedMs,
  };
}
