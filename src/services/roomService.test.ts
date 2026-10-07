import { describe, it, expect, beforeEach } from 'vitest';
import { 
  RoomAuthorityService, 
  type RoomCommand, 
  estimateClockOffset 
} from './roomService';
import { SAMPLE_ARTICLES } from '../data/sampleArticles';
import type { RoomState } from '../types';

describe('RoomAuthorityService', () => {
  let service: RoomAuthorityService;
  let initialRoom: RoomState;

  beforeEach(() => {
    initialRoom = {
      id: 'room-abc',
      code: 'TEST-99',
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
    service = new RoomAuthorityService(initialRoom, SAMPLE_ARTICLES);
  });

  it('increments revision on valid command and enforces expected revision checking (rejects conflicts with 409)', () => {
    const playCommand: RoomCommand = {
      commandId: 'cmd-1',
      type: 'PLAY',
      expectedRevision: 1,
      issuedAt: 10000,
    };

    const res1 = service.executeCommand(playCommand);
    expect(res1.success).toBe(true);
    expect(service.getRoomState().revision).toBe(2);
    expect(service.getRoomState().status).toBe('reading');

    // Duplicate or stale command with expectedRevision 1 should fail with conflict
    const staleCommand: RoomCommand = {
      commandId: 'cmd-2',
      type: 'PAUSE',
      expectedRevision: 1, // Stale! Expected is now 2
      issuedAt: 12000,
    };

    const res2 = service.executeCommand(staleCommand);
    expect(res2.success).toBe(false);
    expect(res2.statusCode).toBe(409);
    expect(res2.error).toContain('Revision conflict');
  });

  it('provides idempotency for repeated commandId without double-executing', () => {
    const playCommand: RoomCommand = {
      commandId: 'cmd-unique-1',
      type: 'PLAY',
      expectedRevision: 1,
      issuedAt: 10000,
    };

    const res1 = service.executeCommand(playCommand);
    expect(res1.success).toBe(true);
    expect(service.getRoomState().revision).toBe(2);

    // Resend exact same commandId (network retry)
    const res2 = service.executeCommand(playCommand);
    expect(res2.success).toBe(true);
    // Revision should NOT increment again
    expect(service.getRoomState().revision).toBe(2);
  });

  it('delivers learner snapshot containing strictly current unit and approved annotations, NOT entire article', () => {
    const snapshot = service.getLearnerSnapshot();

    expect(snapshot.roomId).toBe('room-abc');
    expect(snapshot.currentUnitText).toBe('Long story short, we decided to give it a shot.');
    expect(snapshot.annotations).toHaveLength(2);
    expect(snapshot.annotations.map(a => a.exactText)).toEqual(['Long story short', 'give it a shot']);
    
    // Ensure full article or other sentences are NOT exposed on learner snapshot
    expect((snapshot as any).sentences).toBeUndefined();
    expect((snapshot as any).paragraphs).toBeUndefined();
    expect((snapshot as any).rawArticle).toBeUndefined();
  });

  it('derives correct phase progress for a late joiner without restarting 3s countdown', () => {
    // Teacher plays at t = 10000
    service.executeCommand({
      commandId: 'cmd-play',
      type: 'PLAY',
      expectedRevision: 1,
      issuedAt: 10000,
    });

    // Learner joins 3500ms later (during erasing phase, hold was 3000ms)
    const joinerNow = 13500;
    const phase = service.deriveLearnerPhase(joinerNow);

    expect(phase.phase).toBe('erasing');
    expect(phase.isTextVisible).toBe(true);
    expect(phase.maskProgress).toBeCloseTo(0.5, 2); // 500ms into 1000ms erase
  });

  it('renders blank paper when turn has expired even if offline', () => {
    service.executeCommand({
      commandId: 'cmd-play',
      type: 'PLAY',
      expectedRevision: 1,
      issuedAt: 10000,
    });

    // Learner checks phase at 15000ms (5000ms elapsed, total was 4000ms)
    const offlineCheckTime = 15000;
    const phase = service.deriveLearnerPhase(offlineCheckTime);

    expect(phase.phase).toBe('blank');
    expect(phase.isTextVisible).toBe(false);
  });
});

describe('estimateClockOffset', () => {
  it('estimates clock offset using round-trip calculation', () => {
    // Client sends at 1000, server receives at 1050, client receives response at 1100
    // Round-trip = 100ms, latency = 50ms. Server time at client receive = 1050 + 50 = 1100.
    // Offset = serverTime - (clientSend + clientReceive) / 2 = 1050 - 1050 = 0.
    const offset = estimateClockOffset(1050, 1000, 1100);
    expect(offset).toBe(0);

    // If server clock is 200ms ahead:
    // clientSend = 1000, serverReceive = 1250, clientReceive = 1100
    // offset = 1250 - 1050 = 200.
    const offsetAhead = estimateClockOffset(1250, 1000, 1100);
    expect(offsetAhead).toBe(200);
  });
});
