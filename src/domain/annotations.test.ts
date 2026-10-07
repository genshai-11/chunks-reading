import { describe, it, expect } from 'vitest';
import { 
  sliceTextWithApprovedAnnotations, 
  validateAndResolveSpans,
  type TextSpanSegment,
  type PhraseAnnotation 
} from './annotations';

describe('sliceTextWithApprovedAnnotations', () => {
  it('correctly slices the PRD fixture text with exact approved phrases and normal punctuation', () => {
    const text = 'Long story short, we decided to give it a shot.';
    
    // Approved annotations only
    const annotations: PhraseAnnotation[] = [
      {
        id: 'ann-1',
        start: 0,
        end: 16,
        exactText: 'Long story short',
        type: 'idiom',
        reviewStatus: 'approved',
      },
      {
        id: 'ann-2',
        start: 32,
        end: 46,
        exactText: 'give it a shot',
        type: 'idiom',
        reviewStatus: 'approved',
      },
    ];

    const segments: TextSpanSegment[] = sliceTextWithApprovedAnnotations(text, annotations);

    // Expected segments:
    // 1: "Long story short" (highlighted)
    // 2: ", we decided to " (normal text with comma)
    // 3: "give it a shot" (highlighted)
    // 4: "." (normal text period)
    expect(segments).toEqual([
      {
        text: 'Long story short',
        isHighlight: true,
        annotationId: 'ann-1',
        type: 'idiom',
      },
      {
        text: ', we decided to ',
        isHighlight: false,
      },
      {
        text: 'give it a shot',
        isHighlight: true,
        annotationId: 'ann-2',
        type: 'idiom',
      },
      {
        text: '.',
        isHighlight: false,
      },
    ]);
  });

  it('ignores annotations that are pending or rejected', () => {
    const text = 'Long story short, we decided to give it a shot.';
    const annotations: PhraseAnnotation[] = [
      {
        id: 'ann-1',
        start: 0,
        end: 16,
        exactText: 'Long story short',
        type: 'idiom',
        reviewStatus: 'approved',
      },
      {
        id: 'ann-2',
        start: 32,
        end: 46,
        exactText: 'give it a shot',
        type: 'idiom',
        reviewStatus: 'pending', // Pending should NOT be highlighted to learners
      },
    ];

    const segments = sliceTextWithApprovedAnnotations(text, annotations);
    expect(segments).toEqual([
      {
        text: 'Long story short',
        isHighlight: true,
        annotationId: 'ann-1',
        type: 'idiom',
      },
      {
        text: ', we decided to give it a shot.',
        isHighlight: false,
      },
    ]);
  });

  it('handles repeated phrase occurrences accurately using distinct offsets', () => {
    const text = 'Never say never again.';
    const annotations: PhraseAnnotation[] = [
      {
        id: 'ann-rep-1',
        start: 0,
        end: 5,
        exactText: 'Never',
        type: 'vocab',
        reviewStatus: 'approved',
      },
      {
        id: 'ann-rep-2',
        start: 10,
        end: 15,
        exactText: 'never',
        type: 'vocab',
        reviewStatus: 'approved',
      },
    ];

    const segments = sliceTextWithApprovedAnnotations(text, annotations);
    expect(segments).toEqual([
      {
        text: 'Never',
        isHighlight: true,
        annotationId: 'ann-rep-1',
        type: 'vocab',
      },
      {
        text: ' say ',
        isHighlight: false,
      },
      {
        text: 'never',
        isHighlight: true,
        annotationId: 'ann-rep-2',
        type: 'vocab',
      },
      {
        text: ' again.',
        isHighlight: false,
      },
    ]);
  });
});

describe('validateAndResolveSpans', () => {
  it('detects and flags overlapping spans without merging into entire sentence', () => {
    const text = 'He decided to give it a shot anyway.';
    const rawCandidates: PhraseAnnotation[] = [
      {
        id: 'c1',
        start: 14,
        end: 28, // 'give it a shot'
        exactText: 'give it a shot',
        type: 'idiom',
        reviewStatus: 'pending',
      },
      {
        id: 'c2',
        start: 19,
        end: 23, // 'it a' (overlapping inside)
        exactText: 'it a',
        type: 'collocation',
        reviewStatus: 'pending',
      },
    ];

    const resolved = validateAndResolveSpans(text, rawCandidates);
    expect(resolved.hasConflicts).toBe(true);
    expect(resolved.conflictingIds).toContain('c2');
  });

  it('validates exact substring matches and detects offset drifts', () => {
    const text = 'Hello world';
    const badCandidate: PhraseAnnotation = {
      id: 'bad',
      start: 0,
      end: 5,
      exactText: 'Goodbye', // mismatch with text[0..5] which is 'Hello'
      type: 'idiom',
      reviewStatus: 'pending',
    };

    const resolved = validateAndResolveSpans(text, [badCandidate]);
    expect(resolved.invalidIds).toContain('bad');
  });
});
