import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculateAutoReadingMs, getCompletedWordCount, getErasedWordCount, getErasedTextOffset, validateWordsPerSecond, validateReadingDuration, getWordEraseTimeline } from './readingTiming';
import { calculateRoomTimeline } from './timingEngine';
import type { ClassroomRoom } from '../types';

const text = 'one two three four five six seven eight nine ten';
const room: ClassroomRoom = {
  id: 'test', teacherId: 't', teacherName: 'T', resourceId: 'r', resourceTitle: 'R', status: 'active',
  granularity: 'sentence', highlightEnabled: true, timingPolicy: 'hold_then_erase', holdDurationMs: 3000,
  eraseDurationMs: 1000, totalWindowMs: 3000, playbackStatus: 'playing', serverStartTime: 10000,
  pausedElapsedMs: 0, revision: 1, timingMode: 'auto', wordsPerSecond: 4, eraseSchedule: 'word_groups',
  currentUnit: { index: 0, totalUnits: 1, granularity: 'sentence', text, annotations: [] },
};
test('Auto is exactly word count / rate for sentence and paragraph', () => {
  assert.equal(calculateAutoReadingMs(text, 4), 2500);
  for (const granularity of ['sentence', 'paragraph'] as const) {
    const timeline = calculateRoomTimeline({ ...room, granularity }, 10999);
    assert.equal(timeline.totalDurationMs, 3500); // 2500ms reading + 1000ms erase lag
    assert.equal(timeline.remainingMs, 2501);
  }
  assert.equal(calculateAutoReadingMs('word', 4), 250);
});
test('completed groups at 1s and 2s, partial last group at 2.5s', () => {
  for (const [elapsed, count] of [[0,0],[999,0],[1000,4],[1999,4],[2000,8],[2499,8],[2500,10]]) {
    assert.equal(getCompletedWordCount(text, elapsed, 4), count);
  }
  assert.equal(text.slice(getErasedTextOffset(text, 2000, 4)), 'five six seven eight nine ten');
  for (const [elapsed, erased] of [[999,0],[1000,0],[1250,1],[1999,3],[2000,4],[2250,5],[2999,7],[3000,8],[3499,9],[3500,10]]) {
    assert.equal(getErasedWordCount(text, elapsed, 4), erased);
  }
});
test('pause, resume and late join derive the same group from absolute elapsed', () => {
  const paused = calculateRoomTimeline({ ...room, playbackStatus: 'paused', pausedElapsedMs: 1500 }, 99999);
  const late = calculateRoomTimeline(room, 11500);
  assert.equal(paused.elapsedMs, late.elapsedMs);
  assert.equal(getCompletedWordCount(text, paused.elapsedMs, 4), 4);
  const resumed = calculateRoomTimeline({ ...room, serverStartTime: 98500 }, 100000);
  assert.equal(resumed.elapsedMs, 1500);
});
test('custom sequential timing uses Hold + Erase, not the hidden Auto rate', () => {
  const fixed = { ...room, timingMode: 'fixed' as const, holdDurationMs: 4000 };
  assert.equal(calculateRoomTimeline(fixed, 11000).totalDurationMs, 5000);
  assert.equal(calculateRoomTimeline(fixed, 15000).phase, 'blank_finished');
  assert.equal(calculateRoomTimeline({ ...fixed, wordsPerSecond: 1 }, 11000).totalDurationMs, 5000);
  assert.equal(getWordEraseTimeline(fixed, { ...calculateRoomTimeline(fixed), elapsedMs: 999 }, text, 0).progress, 0);
});
test('legacy hold and erase behavior remains; auto after-reading uses full calculated reading time', () => {
  const legacy = { ...room, timingMode: undefined, eraseSchedule: undefined };
  assert.equal(calculateRoomTimeline(legacy, 12999).phase, 'hold');
  assert.equal(calculateRoomTimeline(legacy, 13000).phase, 'erase');
  const auto = { ...room, eraseSchedule: 'after_reading' as const };
  assert.equal(calculateRoomTimeline(auto, 12499).phase, 'hold');
  assert.equal(calculateRoomTimeline(auto, 12500).phase, 'erase');
  assert.equal(calculateRoomTimeline(auto, 13500).phase, 'blank_finished');
});
test('manual, idle and ended never receive word erasure; hide takes precedence over review', () => {
  assert.equal(calculateRoomTimeline({ ...room, playbackStatus: 'manual_show' }, 99999).remainingMs, Infinity);
  assert.equal(calculateRoomTimeline({ ...room, playbackStatus: 'idle', isFullReview: true }, 99999).phase, 'idle');
  assert.equal(calculateRoomTimeline({ ...room, playbackStatus: 'ended', isFullReview: true }, 99999).phase, 'ended');
});
test('custom duration validation rejects malformed values before room writes', () => {
  for (const value of [0, -1, NaN, Infinity, .5, 120001]) assert.throws(() => validateReadingDuration(value));
  assert.equal(validateReadingDuration(3500), 3500);
});
test('word effects advance only after reading, and paused progress is seekable', () => {
  const timeline = calculateRoomTimeline(room, 11125);
  assert.equal(getWordEraseTimeline(room, timeline, text, 0).progress, .5);
  assert.equal(getWordEraseTimeline(room, timeline, text, 1).progress, 0);
  const paused = { ...timeline, phase: 'paused' as const };
  assert.equal(getWordEraseTimeline(room, paused, text, 0).progress, .5);
  const custom = { ...room, timingMode: 'fixed' as const, holdDurationMs: 20000, eraseDurationMs: 300 };
  assert.equal(getWordEraseTimeline(custom, { ...timeline, elapsedMs: 1999 }, text, 0).progress, 0);
  assert.equal(getWordEraseTimeline(custom, { ...timeline, elapsedMs: 2150 }, text, 0).progress, .5);
  assert.equal(getWordEraseTimeline(custom, { ...timeline, elapsedMs: 20300 }, text, 9).progress, 1);
});
test('raw invalid rates and sanitized rates produce the same completed group count', () => {
  for (const rate of [0, NaN, Infinity]) assert.equal(getCompletedWordCount(text, 1000, rate), getCompletedWordCount(text, 1000, 4));
});
test('invalid rates are rejected, whitespace and emoji retain UTF-16 word coordinates', () => {
  for (const rate of [0,-1,NaN,Infinity,1.5,51]) assert.throws(() => validateWordsPerSecond(rate));
  assert.equal(getErasedTextOffset('😀  two\nthree four  five', 2000, 4), 20);
});
