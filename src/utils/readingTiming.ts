import type { ClassroomRoom, CalculatedTimeline } from '../types';

export const DEFAULT_WORDS_PER_SECOND = 4;
export interface WordOffset { start: number; end: number }
export function getWordOffsets(text: string): WordOffset[] {
  return Array.from(text.matchAll(/\S+/gu), match => ({ start: match.index!, end: match.index! + match[0].length }));
}
export function validateWordsPerSecond(rate: number): number {
  if (!Number.isInteger(rate) || rate < 1 || rate > 50) throw new Error('Tốc độ phải là số nguyên từ 1 đến 50 từ/giây.');
  return rate;
}
export function getWordsPerSecond(rate?: number): number {
  return Number.isInteger(rate) && rate! >= 1 && rate! <= 50 ? rate! : DEFAULT_WORDS_PER_SECOND;
}
export function calculateAutoReadingMs(text: string, rate = DEFAULT_WORDS_PER_SECOND): number {
  return Math.max(1, Math.ceil(getWordOffsets(text).length * 1000 / validateWordsPerSecond(rate)));
}
/** Groups are hidden only AFTER their reading interval has completed. */
export function getCompletedWordCount(text: string, elapsedMs: number, rate = DEFAULT_WORDS_PER_SECOND): number {
  const count = getWordOffsets(text).length;
  const safeRate = getWordsPerSecond(rate);
  const elapsed = Number.isFinite(elapsedMs) ? Math.max(0, elapsedMs) : 0;
  if (elapsed >= count * 1000 / safeRate) return count;
  return Math.min(count, Math.floor(elapsed / 1000) * safeRate);
}
/** Read group 0 for the first second, then remove its words over the following second. */
export function getErasedWordCount(text: string, elapsedMs: number, rate = DEFAULT_WORDS_PER_SECOND): number {
  const elapsed = Number.isFinite(elapsedMs) ? Math.max(0, elapsedMs - 1000) : 0;
  return Math.min(getWordOffsets(text).length, Math.floor(elapsed * getWordsPerSecond(rate) / 1000));
}
export function getErasedTextOffset(text: string, elapsedMs: number, rate = DEFAULT_WORDS_PER_SECOND): number {
  const words = getWordOffsets(text);
  const completed = getErasedWordCount(text, elapsedMs, rate);
  if (!completed) return 0;
  return completed >= words.length ? text.length : words[completed].start;
}
export function validateReadingDuration(value: number): number {
  if (!Number.isInteger(value) || value <= 0 || value > 120000) throw new Error('Thời gian phải lớn hơn 0 và không quá 120 giây.');
  return value;
}
export function getSequentialTiming(room: Pick<ClassroomRoom, 'wordsPerSecond' | 'timingMode' | 'holdDurationMs' | 'eraseDurationMs'>, text: string) {
  const count = getWordOffsets(text).length;
  const readingMs = room.timingMode === 'auto' ? calculateAutoReadingMs(text, getWordsPerSecond(room.wordsPerSecond)) : Math.max(500, room.holdDurationMs || 3000);
  const lagMs = room.timingMode === 'auto' ? 1000 : Math.max(300, room.eraseDurationMs || 1000);
  return { readingMs, lagMs, wordMs: readingMs / Math.max(1, count), totalMs: readingMs + lagMs };
}
export function getWordEraseTimeline(room: ClassroomRoom, timeline: CalculatedTimeline, text: string, wordIndex: number, timing = getSequentialTiming(room, text)): CalculatedTimeline {
  const { wordMs, lagMs } = timing;
  // Never start erasing an unread word, even when custom Erase is shorter than one word.
  const start = Math.max(lagMs + wordIndex * wordMs, (wordIndex + 1) * wordMs);
  const duration = Math.min(wordMs, lagMs);
  const elapsed = Math.max(0, timeline.elapsedMs - start);
  const progress = Math.min(1, elapsed / duration);
  return { ...timeline, phase: timeline.phase === 'paused' ? 'paused' : progress >= 1 ? 'blank_finished' : elapsed > 0 ? 'erase' : 'hold',
    progress, elapsedMs: elapsed, effectiveHoldMs: 0, effectiveEraseMs: duration, totalDurationMs: duration, remainingMs: Math.max(0, duration - elapsed) };
}
export function getWordGroupDuration(room: ClassroomRoom): number {
  return getSequentialTiming(room, room.currentUnit?.text || '').totalMs;
}
