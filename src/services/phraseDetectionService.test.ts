import { describe, it, expect } from 'vitest';
import { 
  detectCandidatePhrases, 
  splitTextIntoUnits, 
  COMMON_EXPRESSION_DICTIONARY 
} from './phraseDetectionService';

describe('phraseDetectionService', () => {
  it('detects PRD fixture candidates as pending review with exact UTF-16 offsets', () => {
    const text = 'Long story short, we decided to give it a shot.';
    const candidates = detectCandidatePhrases(text);

    expect(candidates).toHaveLength(2);

    const first = candidates[0];
    expect(first.exactText).toBe('Long story short');
    expect(first.start).toBe(0);
    expect(first.end).toBe(16);
    expect(first.reviewStatus).toBe('pending'); // Must start as pending!

    const second = candidates[1];
    expect(second.exactText).toBe('give it a shot');
    expect(second.start).toBe(32);
    expect(second.end).toBe(46);
    expect(second.reviewStatus).toBe('pending');
  });

  it('splits text into sentences and paragraphs while preserving original text', () => {
    const sample = 'First sentence here. Second sentence follows. \n\nSecond paragraph begins here.';
    const units = splitTextIntoUnits(sample);

    expect(units.sentences.length).toBeGreaterThanOrEqual(2);
    expect(units.paragraphs.length).toBe(2);
  });
});
