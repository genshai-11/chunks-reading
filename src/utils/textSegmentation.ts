/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ApprovedSpan } from '../types';

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

/**
 * Slices a chunk of text into normal parts and highlight parts according to exact approved offsets.
 * Automatically reconciles and self-heals any shifted offsets to match the actual target phrase.
 * Guarantees NO regex injection, no unescaped HTML, and respects punctuation.
 */
export function buildRenderSlices(text: string, approvedSpans: ApprovedSpan[]): RenderSlice[] {
  if (!text) return [];
  if (!approvedSpans || approvedSpans.length === 0) {
    return [{ text, isHighlight: false }];
  }

  const lowerText = text.toLowerCase();

  // Self-heal and reconcile spans against the actual text if offsets are shifted
  const reconciledSpans: ApprovedSpan[] = approvedSpans.map(span => {
    if (!span.text) return span;
    // Check if the current offsets already exactly match span.text
    if (
      span.startOffset >= 0 &&
      span.endOffset <= text.length &&
      span.startOffset < span.endOffset &&
      text.slice(span.startOffset, span.endOffset).toLowerCase() === span.text.toLowerCase()
    ) {
      return span;
    }

    // Offset is shifted or inaccurate! Find the real occurrence of span.text in text:
    const target = span.text.toLowerCase().trim();
    if (!target) return span;

    let realIdx = -1;

    // 1. Try word-boundary match first
    let searchFrom = 0;
    while (searchFrom < lowerText.length) {
      const found = lowerText.indexOf(target, searchFrom);
      if (found === -1) break;
      const isWordStart = found === 0 || !/[a-z0-9]/i.test(lowerText[found - 1]);
      const isWordEnd =
        found + target.length >= lowerText.length || !/[a-z0-9]/i.test(lowerText[found + target.length]);
      if (isWordStart && isWordEnd) {
        realIdx = found;
        break;
      }
      searchFrom = found + 1;
    }

    // 2. Fallback to general substring match
    if (realIdx === -1) {
      realIdx = lowerText.indexOf(target);
    }

    if (realIdx !== -1) {
      return {
        ...span,
        startOffset: realIdx,
        endOffset: realIdx + target.length,
      };
    }

    return span;
  });

  // Filter and sort spans by startOffset
  const validSpans = reconciledSpans
    .filter(span => span.startOffset >= 0 && span.endOffset <= text.length && span.startOffset < span.endOffset)
    .sort((a, b) => a.startOffset - b.startOffset);

  // Remove overlapping collisions (first span wins)
  const nonOverlapping: ApprovedSpan[] = [];
  let lastEnd = 0;
  for (const span of validSpans) {
    if (span.startOffset >= lastEnd) {
      nonOverlapping.push(span);
      lastEnd = span.endOffset;
    }
  }

  const slices: RenderSlice[] = [];
  let currentIndex = 0;

  for (const span of nonOverlapping) {
    if (span.startOffset > currentIndex) {
      slices.push({
        text: text.slice(currentIndex, span.startOffset),
        isHighlight: false,
      });
    }

    slices.push({
      text: text.slice(span.startOffset, span.endOffset),
      isHighlight: true,
      annotation: span,
    });

    currentIndex = span.endOffset;
  }

  if (currentIndex < text.length) {
    slices.push({
      text: text.slice(currentIndex),
      isHighlight: false,
    });
  }

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

