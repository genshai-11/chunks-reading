import { describe, it, expect } from 'vitest';
import { RoomAuthorityService, type RoomCommand } from '../src/services/roomService';
import { SAMPLE_ARTICLES } from '../src/data/sampleArticles';
import type { RoomState } from '../src/types';

describe('20-Learner Classroom Simulation & Multi-Device Sync', () => {
  const initialRoom: RoomState = {
    id: 'room-sim-1',
    code: 'CLASS-20',
    articleId: 'giving-it-a-shot',
    unitMode: 'sentence',
    unitIndex: 0,
    highlightEnabled: true,
    timing: {
      policy: 'hold_then_erase',
      holdMs: 3000,
      eraseMs: 1000,
    },
    guideEnabled: true,
    eraserEffect: 'eraser',
    status: 'waiting',
    revision: 1,
    staged: {
      articleId: 'giving-it-a-shot',
      unitMode: 'sentence',
      unitIndex: 0,
      highlightEnabled: true,
      timing: {
        policy: 'hold_then_erase',
        holdMs: 3000,
        eraseMs: 1000,
      },
      guideEnabled: true,
      eraserEffect: 'eraser',
    },
  };

  it('synchronizes 20 simulated learners across varied clock offsets within 250ms margin', () => {
    const service = new RoomAuthorityService(initialRoom, SAMPLE_ARTICLES);
    const teacherStartTime = 50000;

    // Teacher issues PLAY command
    service.executeCommand({
      commandId: 'cmd-start',
      type: 'PLAY',
      expectedRevision: 1,
      issuedAt: teacherStartTime,
    });

    // Simulate 20 learner devices with random clock offsets between -80ms and +80ms
    const NUM_LEARNERS = 20;
    const learners = Array.from({ length: NUM_LEARNERS }, (_, i) => ({
      learnerId: `learner-${i + 1}`,
      clockOffsetMs: (i % 2 === 0 ? 1 : -1) * (i * 4), // ranging from -76ms to +76ms
    }));

    // Query all 20 learners at elapsed = 2000ms (during 3000ms hold phase)
    const queryTime = teacherStartTime + 2000;
    const holdPhases = learners.map((l) => {
      const clientTime = queryTime - l.clockOffsetMs;
      return service.deriveLearnerPhase(clientTime, l.clockOffsetMs);
    });

    // All 20 learners must report phase = 'hold' and isTextVisible = true
    expect(holdPhases.every((p) => p.phase === 'hold')).toBe(true);
    expect(holdPhases.every((p) => p.isTextVisible === true)).toBe(true);

    // Query all 20 learners at elapsed = 3500ms (50% into 1000ms erase phase)
    const eraseQueryTime = teacherStartTime + 3500;
    const erasePhases = learners.map((l) => {
      const clientTime = eraseQueryTime - l.clockOffsetMs;
      return service.deriveLearnerPhase(clientTime, l.clockOffsetMs);
    });

    // All 20 learners must report phase = 'erasing'
    expect(erasePhases.every((p) => p.phase === 'erasing')).toBe(true);
    expect(erasePhases.every((p) => p.maskProgress >= 0.4 && p.maskProgress <= 0.6)).toBe(true);

    // Maximum progress difference across all 20 learners must be within <= 250ms equivalent progress (0.25)
    const minProgress = Math.min(...erasePhases.map((p) => p.maskProgress));
    const maxProgress = Math.max(...erasePhases.map((p) => p.maskProgress));
    expect(maxProgress - minProgress).toBeLessThanOrEqual(0.25);
  });

  it('preserves frozen progress across all 20 learners when teacher pauses', () => {
    const service = new RoomAuthorityService(initialRoom, SAMPLE_ARTICLES);
    const teacherStartTime = 10000;

    service.executeCommand({
      commandId: 'cmd-play',
      type: 'PLAY',
      expectedRevision: 1,
      issuedAt: teacherStartTime,
    });

    // Teacher pauses at elapsed = 1800ms
    service.executeCommand({
      commandId: 'cmd-pause',
      type: 'PAUSE',
      expectedRevision: 2,
      issuedAt: teacherStartTime + 1800,
    });

    // 20 learners check state 10 seconds later
    const NUM_LEARNERS = 20;
    for (let i = 0; i < NUM_LEARNERS; i++) {
      const phase = service.deriveLearnerPhase(teacherStartTime + 11800);
      expect(phase.phase).toBe('hold');
      expect(phase.elapsedMs).toBe(1800);
    }
  });

  it('ensures all 20 learners see blank paper after turn expiry', () => {
    const service = new RoomAuthorityService(initialRoom, SAMPLE_ARTICLES);
    const teacherStartTime = 10000;

    service.executeCommand({
      commandId: 'cmd-play',
      type: 'PLAY',
      expectedRevision: 1,
      issuedAt: teacherStartTime,
    });

    // Query at elapsed = 4500ms (hold 3000ms + erase 1000ms = 4000ms total)
    const checkTime = teacherStartTime + 4500;
    for (let i = 0; i < 20; i++) {
      const phase = service.deriveLearnerPhase(checkTime);
      expect(phase.phase).toBe('blank');
      expect(phase.isTextVisible).toBe(false);
    }
  });
});
