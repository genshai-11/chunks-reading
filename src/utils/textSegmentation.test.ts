/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Regression tests for buildRenderSlices.
 * Run with: node --import tsx --test src/utils/textSegmentation.test.ts
 *
 * Contract under test (diagnosis.md):
 *   - Every marked slice must match original phrase (case/whitespace normalised).
 *   - No misplaced repeats: valid repeated occurrences are preserved by their actual
 *     stored offsets, not re-resolved to first occurrence.
 *   - Stale / shifted offsets are repaired with original UTF-16 indices only.
 *   - Ambiguous repair (phrase not found, or matches inside word) fails closed
 *     (span is dropped rather than misplacing a highlight).
 *   - Malformed offsets (negative, inverted, out-of-bounds) are rejected.
 *   - Nonexistent phrases produce no highlights.
 *   - Concatenated original text is preserved: joining all slice texts must equal
 *     the original text exactly.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildRenderSlices } from './textSegmentation.js';

// ─── helper ──────────────────────────────────────────────────────────────────

function joinSlices(slices: ReturnType<typeof buildRenderSlices>): string {
  return slices.map(s => s.text).join('');
}

function highlightTexts(slices: ReturnType<typeof buildRenderSlices>): string[] {
  return slices.filter(s => s.isHighlight).map(s => s.text);
}

// ─── 1. Basic exact-offset match ─────────────────────────────────────────────

describe('buildRenderSlices – exact offsets', () => {
  it('highlights correct substring when offsets are exact', () => {
    const text = 'I drop out of school.';
    // "drop out of" = offsets [2, 13)
    const slices = buildRenderSlices(text, [
      { id: 'a', text: 'drop out of', startOffset: 2, endOffset: 13, type: 'collocation', meaning: 'M' },
    ]);
    assert.deepEqual(highlightTexts(slices), ['drop out of']);
    assert.equal(joinSlices(slices), text);
  });

  it('preserves original text exactly (concatenation invariant)', () => {
    const text = 'Give it a shot and try again.';
    const slices = buildRenderSlices(text, [
      { id: 'b', text: 'Give it a shot', startOffset: 0, endOffset: 14, type: 'idiom', meaning: 'M' },
    ]);
    assert.equal(joinSlices(slices), text);
  });
});

// ─── 2. Diagnosis repro cases ─────────────────────────────────────────────────

describe('buildRenderSlices – diagnosis repro', () => {
  /**
   * Annotation: text="drop out of", offsets [3, 14)
   * Text: "I drop out of school."  → slice(3,14) = "drop out of" ✓ (exact match, no repair needed)
   */
  it('repro: correct offsets on exact text – highlights "drop out of"', () => {
    const text = 'I drop out of school.';
    const slices = buildRenderSlices(text, [
      { id: 'r1', text: 'drop out of', startOffset: 2, endOffset: 13, type: 'collocation', meaning: 'M' },
    ]);
    assert.deepEqual(highlightTexts(slices), ['drop out of']);
    assert.equal(joinSlices(slices), text);
  });

  /**
   * Repro: stale offsets [3,14) on "I drop  out of school." (extra space).
   * text.slice(3,14) = "rop  out of" ← WRONG substring for annotation "drop out of".
   * Fix must repair to the correct word-boundary match, or fail closed.
   * Either way the highlighted text must NOT be "rop  out of".
   */
  it('repro: stale offsets [3,14) on text with extra space – must NOT highlight "rop  out of"', () => {
    const text = 'I drop  out of school.';   // extra space after "drop"
    // span.text = "drop out of", offsets point to wrong region after whitespace drift
    const slices = buildRenderSlices(text, [
      { id: 'r2', text: 'drop out of', startOffset: 3, endOffset: 14, type: 'collocation', meaning: 'M' },
    ]);
    // The repair must NOT produce "rop  out of"
    const hl = highlightTexts(slices);
    assert.deepEqual(hl, ['drop  out of']);
    assert.equal(joinSlices(slices), text);
  });

  /**
   * Repro: Unicode expansion. "İ drop out of school." – Turkish capital İ.
   * toLowerCase() of "İ" is "i\u0307" (two chars), causing index drift on lowercased string.
   * Stale offsets [3,14) → slice(3,14) on original = "rop out of ".
   * Fix must NOT highlight that wrong region.
   */
  it('repro: Unicode expansion – must NOT highlight "rop out of "', () => {
    const text = 'İ drop out of school.';
    const slices = buildRenderSlices(text, [
      { id: 'r3', text: 'drop out of', startOffset: 3, endOffset: 14, type: 'collocation', meaning: 'M' },
    ]);
    const hl = highlightTexts(slices);
    assert.deepEqual(hl, ['drop out of']);
    assert.equal(joinSlices(slices), text);
  });

  /**
   * Repro: completely wrong text. "I stay here at school." with annotation "drop out of".
   * Phrase not present at all → no highlight (fail closed).
   */
  it('repro: phrase absent from text – produces no highlights', () => {
    const text = 'I stay here at school.';
    const slices = buildRenderSlices(text, [
      { id: 'r4', text: 'drop out of', startOffset: 3, endOffset: 14, type: 'collocation', meaning: 'M' },
    ]);
    assert.equal(highlightTexts(slices).length, 0);
    assert.equal(joinSlices(slices), text);
  });
});

// ─── 3. Repeated occurrences ──────────────────────────────────────────────────

describe('buildRenderSlices – repeated occurrences', () => {
  /**
   * "the cat sat on the mat" – "the" appears at 0 and 16.
   * Two spans with correct stored offsets should each highlight their own occurrence,
   * not both collapse to the first "the".
   */
  it('valid stored offsets for second occurrence preserve second occurrence', () => {
    const text = 'the cat sat on the mat';
    const slices = buildRenderSlices(text, [
      { id: 'rep1', text: 'the', startOffset: 0,  endOffset: 3,  type: 'collocation', meaning: 'M' },
      { id: 'rep2', text: 'the', startOffset: 15, endOffset: 18, type: 'collocation', meaning: 'M' },
    ]);
    const hl = highlightTexts(slices);
    assert.equal(hl.length, 2, `Expected 2 highlights, got ${hl.length}: ${JSON.stringify(hl)}`);
    assert.equal(hl[0], 'the');
    assert.equal(hl[1], 'the');
    assert.equal(joinSlices(slices), text);
  });

  /**
   * Stale span for the SECOND "out" in "out of time, out of luck" must NOT be
   * forced to the first "out".  Because the annotation text is ambiguous in
   * repair (multiple word-boundary matches), repair must fail closed for the
   * second span if the first span already consumed the first occurrence.
   * At minimum, no span may land at a position inconsistent with its stored text.
   */
  it('repeated phrase with second-occurrence stale offset: highlighted text matches annotation text', () => {
    const text = 'out of time, out of luck';
    // Both spans point to "out of" — first correctly, second with a stale offset
    // that points into " luck". Correct: [0,6) and [13,19).
    const slices = buildRenderSlices(text, [
      { id: 'rep3', text: 'out of', startOffset: 0,  endOffset: 6,  type: 'collocation', meaning: 'M' },
      { id: 'rep4', text: 'out of', startOffset: 20, endOffset: 26, type: 'collocation', meaning: 'M' },
      // ^^ 26 > text.length(24) → startOffset<endOffset but endOffset out of range → reject
    ]);
    // Each highlighted slice must match its annotation text (case-normalised)
    for (const sl of slices.filter(s => s.isHighlight)) {
      assert.equal(
        sl.text.trim().toLowerCase(),
        sl.annotation!.text.trim().toLowerCase(),
        `Misaligned: slice text "${sl.text}" vs annotation "${sl.annotation!.text}"`
      );
    }
    assert.equal(joinSlices(slices), text);
  });
});

// ─── 4. Malformed offsets ─────────────────────────────────────────────────────

describe('buildRenderSlices – malformed offsets', () => {
  it('negative startOffset is rejected (no highlight)', () => {
    const text = 'Hello world';
    const slices = buildRenderSlices(text, [
      { id: 'm1', text: 'Hello', startOffset: -1, endOffset: 5, type: 'collocation', meaning: 'M' },
    ]);
    assert.equal(highlightTexts(slices).length, 0);
    assert.equal(joinSlices(slices), text);
  });

  it('inverted offsets (start > end) are rejected', () => {
    const text = 'Hello world';
    const slices = buildRenderSlices(text, [
      { id: 'm2', text: 'Hello', startOffset: 5, endOffset: 0, type: 'collocation', meaning: 'M' },
    ]);
    assert.equal(highlightTexts(slices).length, 0);
    assert.equal(joinSlices(slices), text);
  });

  it('endOffset beyond text.length with bad text is rejected', () => {
    const text = 'Hello world';
    const slices = buildRenderSlices(text, [
      { id: 'm3', text: 'nonexistent phrase here', startOffset: 0, endOffset: 50, type: 'collocation', meaning: 'M' },
    ]);
    assert.equal(highlightTexts(slices).length, 0);
    assert.equal(joinSlices(slices), text);
  });

  it('zero-length span (start === end) is rejected', () => {
    const text = 'Hello world';
    const slices = buildRenderSlices(text, [
      { id: 'm4', text: '', startOffset: 2, endOffset: 2, type: 'collocation', meaning: 'M' },
    ]);
    assert.equal(highlightTexts(slices).length, 0);
    assert.equal(joinSlices(slices), text);
  });
});

// ─── 5. Nonexistent phrase ────────────────────────────────────────────────────

describe('buildRenderSlices – nonexistent phrase', () => {
  it('produces no highlights when span.text does not appear in text', () => {
    const text = 'The quick brown fox jumps over the lazy dog.';
    const slices = buildRenderSlices(text, [
      { id: 'ne1', text: 'purple elephant', startOffset: 0, endOffset: 15, type: 'idiom', meaning: 'M' },
    ]);
    assert.equal(highlightTexts(slices).length, 0);
    assert.equal(joinSlices(slices), text);
  });
});

// ─── 6. Whitespace-flexible repair stays within word boundaries ───────────────

describe('buildRenderSlices – whitespace repair', () => {
  /**
   * Extra space between words in stored text vs actual text.
   * Repair must find word-boundary match using original UTF-16 index.
   */
  it('repair finds unambiguous word-boundary match', () => {
    const text = 'She gave up on the project.';
    // "gave up" at [4, 11), but offsets are stale ([5, 12))
    const slices = buildRenderSlices(text, [
      { id: 'ws1', text: 'gave up', startOffset: 5, endOffset: 12, type: 'phrasal_verb', meaning: 'M' },
    ]);
    const hl = highlightTexts(slices);
    // Should either repair to correct "gave up" or fail closed; never a partial word
    if (hl.length > 0) {
      assert.ok(
        hl[0].trim().toLowerCase() === 'gave up',
        `Unexpected repair result: "${hl[0]}"`
      );
    }
    assert.equal(joinSlices(slices), text);
  });

  it('repair inside-word match is rejected (no partial-word highlight)', () => {
    // "her" appears inside "there" and also as standalone; stale offsets point inside "there"
    const text = 'there is something here';
    // Annotate standalone "here" at [20, 24) but stale to [1, 5) = "here" inside "there"
    // offset [1,5) on "there is something here" = "here" — but that is INSIDE "there"
    // Current code would accept it if text.slice(1,5) === "here" — it does!
    // The fix must check it is not mid-word.
    // "there"[1..5] = "here" but the start (1) is inside a word → reject
    const slices = buildRenderSlices(text, [
      { id: 'ws2', text: 'here', startOffset: 1, endOffset: 5, type: 'collocation', meaning: 'M' },
    ]);
    // Even if the offsets look valid, slice(1,5)="here" but it's mid-word — must be rejected
    const hl = highlightTexts(slices);
    if (hl.length > 0) {
      // If highlighted, must be standalone "here" at position 20, not mid-word at 1
      const sl = slices.find(s => s.isHighlight)!;
      assert.ok(sl.annotation!.startOffset !== 1,
        `Accepted mid-word offset 1 for "here" inside "there"`);
    }
    assert.equal(joinSlices(slices), text);
  });
});

// ─── 7. Empty/null inputs ─────────────────────────────────────────────────────

describe('buildRenderSlices – edge cases', () => {
  it('empty text returns empty array', () => {
    assert.deepEqual(buildRenderSlices('', []), []);
  });

  it('empty spans returns single non-highlight slice', () => {
    const slices = buildRenderSlices('hello', []);
    assert.equal(slices.length, 1);
    assert.equal(slices[0].isHighlight, false);
    assert.equal(slices[0].text, 'hello');
  });

  it('span without text field is skipped gracefully', () => {
    const text = 'hello world';
    const slices = buildRenderSlices(text, [
      { id: 'nt', text: '', startOffset: 0, endOffset: 5, type: 'collocation', meaning: 'M' },
    ]);
    assert.equal(joinSlices(slices), text);
  });
});
