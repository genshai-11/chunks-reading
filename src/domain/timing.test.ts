import { describe, it, expect } from 'vitest';
import { computeReadingPhase, type TimingConfig, type ReadingPlaybackState } from './timing';

describe('computeReadingPhase', () => {
  describe('Hold then erase policy (default: hold 3000ms, erase 1000ms, total 4000ms)', () => {
    const timing: TimingConfig = {
      policy: 'hold_then_erase',
      holdMs: 3000,
      eraseMs: 1000,
    };

    it('derives hold phase at 0ms and 2999ms with 0% mask progress', () => {
      const state: ReadingPlaybackState = {
        status: 'reading',
        startedAt: 10000,
        timing,
      };

      // Exactly at start
      const at0 = computeReadingPhase(state, 10000);
      expect(at0.phase).toBe('hold');
      expect(at0.isTextVisible).toBe(true);
      expect(at0.maskProgress).toBe(0);

      // Just before hold boundary
      const at2999 = computeReadingPhase(state, 12999);
      expect(at2999.phase).toBe('hold');
      expect(at2999.isTextVisible).toBe(true);
      expect(at2999.maskProgress).toBe(0);
    });

    it('derives erasing phase at 3000ms through 3999ms with linear mask progress', () => {
      const state: ReadingPlaybackState = {
        status: 'reading',
        startedAt: 10000,
        timing,
      };

      // Erase starts exactly at 3000ms
      const at3000 = computeReadingPhase(state, 13000);
      expect(at3000.phase).toBe('erasing');
      expect(at3000.isTextVisible).toBe(true);
      expect(at3000.maskProgress).toBe(0);

      // Mid-erase at 3500ms -> 50%
      const at3500 = computeReadingPhase(state, 13500);
      expect(at3500.phase).toBe('erasing');
      expect(at3500.isTextVisible).toBe(true);
      expect(at3500.maskProgress).toBeCloseTo(0.5, 2);

      // Just before finish at 3999ms
      const at3999 = computeReadingPhase(state, 13999);
      expect(at3999.phase).toBe('erasing');
      expect(at3999.isTextVisible).toBe(true);
      expect(at3999.maskProgress).toBeCloseTo(0.999, 2);
    });

    it('derives blank phase at >= 4000ms with text hidden', () => {
      const state: ReadingPlaybackState = {
        status: 'reading',
        startedAt: 10000,
        timing,
      };

      const at4000 = computeReadingPhase(state, 14000);
      expect(at4000.phase).toBe('blank');
      expect(at4000.isTextVisible).toBe(false);
      expect(at4000.maskProgress).toBe(1);

      const at5000 = computeReadingPhase(state, 15000);
      expect(at5000.phase).toBe('blank');
      expect(at5000.isTextVisible).toBe(false);
      expect(at5000.maskProgress).toBe(1);
    });
  });

  describe('Erase within window policy (total 3000ms, erase 1000ms -> 2000ms hold)', () => {
    const timing: TimingConfig = {
      policy: 'erase_within_window',
      totalMs: 3000,
      eraseMs: 1000,
    };

    it('derives hold phase through 1999ms', () => {
      const state: ReadingPlaybackState = {
        status: 'reading',
        startedAt: 10000,
        timing,
      };

      const at1999 = computeReadingPhase(state, 11999);
      expect(at1999.phase).toBe('hold');
      expect(at1999.isTextVisible).toBe(true);
      expect(at1999.maskProgress).toBe(0);
    });

    it('derives erasing phase at 2000ms through 2999ms', () => {
      const state: ReadingPlaybackState = {
        status: 'reading',
        startedAt: 10000,
        timing,
      };

      const at2000 = computeReadingPhase(state, 12000);
      expect(at2000.phase).toBe('erasing');
      expect(at2000.maskProgress).toBe(0);

      const at2500 = computeReadingPhase(state, 12500);
      expect(at2500.phase).toBe('erasing');
      expect(at2500.maskProgress).toBeCloseTo(0.5, 2);
    });

    it('derives blank phase at >= 3000ms with text hidden', () => {
      const state: ReadingPlaybackState = {
        status: 'reading',
        startedAt: 10000,
        timing,
      };

      const at3000 = computeReadingPhase(state, 13000);
      expect(at3000.phase).toBe('blank');
      expect(at3000.isTextVisible).toBe(false);
      expect(at3000.maskProgress).toBe(1);
    });
  });

  describe('Pause / Resume continuity', () => {
    const timing: TimingConfig = {
      policy: 'hold_then_erase',
      holdMs: 3000,
      eraseMs: 1000,
    };

    it('freezes phase and maskProgress when paused', () => {
      // Paused 500ms into erase phase (elapsed = 3500ms)
      const pausedState: ReadingPlaybackState = {
        status: 'paused',
        pausedElapsedMs: 3500,
        timing,
      };

      // Even if clientNow is hours later, frozen progress holds
      const result = computeReadingPhase(pausedState, 9999999);
      expect(result.phase).toBe('erasing');
      expect(result.isTextVisible).toBe(true);
      expect(result.maskProgress).toBeCloseTo(0.5, 2);
      expect(result.elapsedMs).toBe(3500);
    });

    it('resumes correctly with preserved elapsed time', () => {
      // Resumed at timestamp 20000, but had previously elapsed 3500ms
      // Effective startedAt should be 20000 - 3500 = 16500
      const resumedState: ReadingPlaybackState = {
        status: 'reading',
        startedAt: 16500,
        timing,
      };

      // 200ms after resume (clientNow = 20200, elapsed = 3700ms)
      const result = computeReadingPhase(resumedState, 20200);
      expect(result.phase).toBe('erasing');
      expect(result.elapsedMs).toBe(3700);
      expect(result.maskProgress).toBeCloseTo(0.7, 2);
    });
  });

  describe('Manual Show / Hide state', () => {
    const timing: TimingConfig = {
      policy: 'hold_then_erase',
      holdMs: 3000,
      eraseMs: 1000,
    };

    it('stays visible indefinitely when in manual show mode without automatic expiry', () => {
      const showState: ReadingPlaybackState = {
        status: 'manual_show',
        timing,
      };

      // Even 100 seconds later, manual_show has no expiry
      const result = computeReadingPhase(showState, 100000);
      expect(result.phase).toBe('manual_show');
      expect(result.isTextVisible).toBe(true);
      expect(result.maskProgress).toBe(0);
    });

    it('renders blank when status is idle or waiting', () => {
      const idleState: ReadingPlaybackState = {
        status: 'idle',
        timing,
      };

      const result = computeReadingPhase(idleState, 50000);
      expect(result.phase).toBe('waiting');
      expect(result.isTextVisible).toBe(false);
      expect(result.maskProgress).toBe(0);
    });
  });
});
