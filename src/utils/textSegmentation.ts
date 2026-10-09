/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ApprovedSpan } from '../types';

/**
 * Cleanly split English text into sentences while protecting common abbreviations.
 */
export function segmentSentences(text: string): string[] {
  if (!text || !text.trim()) return [];

  // Protect common honorifics and abbreviations temporarily
  const abbreviations = ['Mr\\.', 'Mrs\\.', 'Ms\\.', 'Dr\\.', 'Prof\\.', 'Sr\\.', 'Jr\\.', 'vs\\.', 'e\\.g\\.', 'i\\.e\\.', 'etc\\.'];
  let masked = text;
  abbreviations.forEach((abbr, idx) => {
    const reg = new RegExp(`\\b${abbr}`, 'gi');
    masked = masked.replace(reg, `__ABBR_${idx}__`);
  });

  // Match sentence terminations (. ? !) followed by whitespace or end-of-string
  const rawSentences = masked
    .replace(/([.?!])\s+(?=[A-Z0-9"'])/g, '$1\n--SENTENCE_SPLIT--\n')
    .split('\n--SENTENCE_SPLIT--\n')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  // Restore abbreviations
  return rawSentences.map(s => {
    let restored = s;
    abbreviations.forEach((abbr, idx) => {
      const cleanAbbr = abbr.replace(/\\/g, '');
      restored = restored.replace(new RegExp(`__ABBR_${idx}__`, 'g'), cleanAbbr);
    });
    return restored;
  });
}

/**
 * Split text into paragraphs based on newline boundaries.
 */
export function segmentParagraphs(text: string): string[] {
  if (!text || !text.trim()) return [];
  return text
    .split(/\n\s*\n/)
    .map(p => p.trim())
    .filter(p => p.length > 0);
}

export interface RenderSlice {
  text: string;
  isHighlight: boolean;
  annotation?: ApprovedSpan;
}

function normalizePhrase(value: string): string {
  return value.trim().replace(/\s+/gu, ' ').toLowerCase();
}
function atWordBoundaries(text: string, start: number, end: number): boolean {
  const word = /[\p{L}\p{N}\p{M}'’]/u;
  const before = Array.from(text.slice(Math.max(0, start - 2), start)).at(-1) || '';
  const after = Array.from(text.slice(end, end + 2))[0] || '';
  return !word.test(before) && !word.test(after);
}
/** Literal, whitespace-flexible matches with indices on ORIGINAL UTF-16 text. */
export function findPhraseMatches(text: string, phrase: string): { start: number; end: number }[] {
  if (!phrase.trim()) return [];
  const pattern = phrase.trim().split(/\s+/u).map(word => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('\\s+');
  const matches = Array.from(text.matchAll(new RegExp(pattern, 'giu')));
  return matches.filter(match => atWordBoundaries(text, match.index!, match.index! + match[0].length))
    .map(match => ({ start: match.index!, end: match.index! + match[0].length }));
}

/** Fail closed for unresolved/ambiguous phrases; preserve valid repeated occurrences. */
export function buildRenderSlices(text: string, approvedSpans: ApprovedSpan[]): RenderSlice[] {
  if (!text) return [];
  const accepted: ApprovedSpan[] = [];
  const pending: ApprovedSpan[] = [];
  const overlaps = (span: ApprovedSpan) => accepted.some(other => span.startOffset < other.endOffset && span.endOffset > other.startOffset);
  for (const span of [...(approvedSpans || [])].sort((a, b) => a.startOffset - b.startOffset)) {
    if (!span.text?.trim() || !Number.isInteger(span.startOffset) || !Number.isInteger(span.endOffset)
      || span.startOffset < 0 || span.startOffset >= span.endOffset) continue;
    const exact = span.endOffset <= text.length
      && normalizePhrase(text.slice(span.startOffset, span.endOffset)) === normalizePhrase(span.text)
      && atWordBoundaries(text, span.startOffset, span.endOffset);
    if (exact) {
      if (!overlaps(span)) accepted.push(span);
    } else pending.push(span);
  }
  for (const span of pending) {
    const matches = findPhraseMatches(text, span.text);
    if (matches.length !== 1) continue;
    const repaired = { ...span, startOffset: matches[0].start, endOffset: matches[0].end };
    if (!overlaps(repaired)) accepted.push(repaired);
  }
  const slices: RenderSlice[] = [];
  let cursor = 0;
  for (const span of accepted.sort((a, b) => a.startOffset - b.startOffset)) {
    if (span.startOffset > cursor) slices.push({ text: text.slice(cursor, span.startOffset), isHighlight: false });
    slices.push({ text: text.slice(span.startOffset, span.endOffset), isHighlight: true, annotation: span });
    cursor = span.endOffset;
  }
  if (cursor < text.length) slices.push({ text: text.slice(cursor), isHighlight: false });
  return slices;
}

export interface MergeUnitsOptions {
  minWords?: number; // Minimum words per reading chunk (default 5)
  minChars?: number; // Minimum characters per chunk (default 25)
}

/**
 * Intelligently merges consecutive units (sentences or paragraphs) that are too short
 * so learners don't get awkward 1-2 word fragments (e.g. "Stay hungry." + "Stay foolish.").
 */
export function mergeShortUnits(units: string[], options: MergeUnitsOptions = {}): string[] {
  if (!units || units.length <= 1) return units || [];
  const minWords = options.minWords ?? 5;
  const minChars = options.minChars ?? 25;

  const result: string[] = [];
  let buffer = '';

  for (let i = 0; i < units.length; i++) {
    const current = (units[i] || '').trim();
    if (!current) continue;

    if (!buffer) {
      buffer = current;
    } else {
      buffer = `${buffer} ${current}`;
    }

    const wordCount = buffer.split(/\s+/).filter(Boolean).length;
    const isLast = i === units.length - 1;

    // Check if buffer now meets the min criteria
    if (wordCount >= minWords && buffer.length >= minChars) {
      result.push(buffer);
      buffer = '';
    } else if (isLast) {
      // If we are at the very end and buffer is still short:
      // If we already have accumulated previous chunks, merge buffer into the last chunk
      // so learners aren't left with an isolated 2-word fragment.
      if (result.length > 0) {
        result[result.length - 1] = `${result[result.length - 1]} ${buffer}`;
      } else {
        result.push(buffer);
      }
      buffer = '';
    }
  }

  return result.length > 0 ? result : units;
}
