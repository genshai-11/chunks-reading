/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ClassroomRoom, CalculatedTimeline, TimingPolicy } from '../types';
import { calculateAutoReadingMs, getWordsPerSecond, getSequentialTiming } from './readingTiming';

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

export interface DynamicPacingOptions {
  text: string;
  baseHoldMs: number;
  granularity?: 'sentence' | 'paragraph';
  readingWpm?: number;
  minHoldMs?: number;
  maxHoldMs?: number;
}

/**
 * Calculates adaptive hold time based on word count and reading WPM.
 * Automatically gives more time for longer sentences/paragraphs and prevents
 * excessive lingering for very short chunks.
 */
export function calculateDynamicHoldDuration(options: DynamicPacingOptions): {
  holdDurationMs: number;
  wordCount: number;
  isAdjusted: boolean;
  adjustedDiffMs: number;
} {
  const {
    text,
    baseHoldMs,
    granularity = 'sentence',
    readingWpm = 160,
    minHoldMs = granularity === 'sentence' ? 1500 : 5000,
    maxHoldMs = granularity === 'sentence' ? 20000 : 60000,
  } = options;

  if (!text || !text.trim()) {
    return {
      holdDurationMs: baseHoldMs,
      wordCount: 0,
      isAdjusted: false,
      adjustedDiffMs: 0,
    };
  }

  const words = text.trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  // Benchmark typical word counts
  const benchmarkWords = granularity === 'sentence' ? 12 : 45;
  // Milliseconds per word at the selected WPM
  const msPerWord = Math.round(60000 / Math.max(80, Math.min(300, readingWpm)));

  // Word count delta from benchmark
  const diffWords = wordCount - benchmarkWords;
  // Apply proportional scaling with damping factor (0.7) to keep pacing smooth
  const diffMs = Math.round(diffWords * msPerWord * 0.7);

  const rawHold = baseHoldMs + diffMs;
  const clampedHold = Math.max(minHoldMs, Math.min(maxHoldMs, rawHold));
  // Round to nearest 250ms for clean presentation numbers
  const roundedHold = Math.round(clampedHold / 250) * 250;

  return {
    holdDurationMs: roundedHold,
    wordCount,
    isAdjusted: roundedHold !== baseHoldMs,
    adjustedDiffMs: roundedHold - baseHoldMs,
  };
}

/**
 * Derive playback phase from the room's start timestamp and stored paused elapsed time.
 * Live callers supply calibrated server time; private rehearsal supplies monotonic elapsed time.
 * The default wall clock remains for backward-compatible pure callers, not a live sync guarantee.
 */
export function calculateRoomTimeline(
  room: ClassroomRoom,
  currentClientTime: number = Date.now()
): CalculatedTimeline {
  const { timingPolicy, holdDurationMs, eraseDurationMs, totalWindowMs, playbackStatus, serverStartTime, pausedElapsedMs, isFullReview } = room;

  let durations = getEffectiveDurations(timingPolicy, holdDurationMs, eraseDurationMs, totalWindowMs);
  if (room.timingMode === 'auto') {
    const readingMs = calculateAutoReadingMs(room.currentUnit?.text || '', getWordsPerSecond(room.wordsPerSecond));
    durations = { effectiveHoldMs: readingMs, effectiveEraseMs: 1000, totalDurationMs: readingMs + 1000 };
  }
  const sequential = room.eraseSchedule === 'word_groups';
  if (sequential) {
    const sequentialTiming = getSequentialTiming(room, room.currentUnit?.text || '');
    const total = sequentialTiming.totalMs;
    const intro = Math.min(total, Math.max(sequentialTiming.lagMs, sequentialTiming.wordMs));
    durations = { effectiveHoldMs: intro, effectiveEraseMs: total - intro, totalDurationMs: total };
  }
  const { effectiveHoldMs, effectiveEraseMs, totalDurationMs } = durations;

  // Hide/End always take precedence over full review.
  if (playbackStatus === 'idle' || playbackStatus === 'ended' || room.status === 'ended') {
    const ended = playbackStatus === 'ended' || room.status === 'ended';
    return { phase: ended ? 'ended' : 'idle', progress: ended ? 1 : 0,
      remainingMs: ended ? 0 : totalDurationMs, totalDurationMs, effectiveHoldMs, effectiveEraseMs,
      elapsedMs: ended ? totalDurationMs : 0 };
  }

  // Full Text Review mode has no countdown: text remains shown until teacher changes state
  if (isFullReview || playbackStatus === 'manual_show') {
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

  // Calculate elapsed milliseconds
  let elapsedMs = 0;
  if (playbackStatus === 'paused') {
    elapsedMs = pausedElapsedMs || 0;
  } else if (playbackStatus === 'playing') {
    if (serverStartTime !== null) {
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
