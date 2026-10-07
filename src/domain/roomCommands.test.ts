import { describe, it, expect } from 'vitest';
import { 
  applyStagedToRoom, 
  executePlayCommand, 
  executePauseCommand, 
  executeResumeCommand, 
  executeShowCommand, 
  executeHideCommand 
} from './roomCommands';
import type { RoomState, StagedSettings } from '../types';

describe('Room Commands Domain Logic', () => {
  const initialRoom: RoomState = {
    id: 'room-1',
    code: 'CHUNK-101',
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
      unitMode: 'paragraph',
      unitIndex: 1,
      highlightEnabled: false,
      timing: {
        policy: 'erase_within_window',
        totalMs: 3000,
        eraseMs: 1000,
      },
      guideEnabled: false,
      eraserEffect: 'dissolve',
    },
  };

  it('applyStagedToRoom atomically applies staged configuration and resets room to waiting without auto-play', () => {
    const updated = applyStagedToRoom(initialRoom);

    // Staged values installed
    expect(updated.unitMode).toBe('paragraph');
    expect(updated.unitIndex).toBe(1);
    expect(updated.highlightEnabled).toBe(false);
    expect(updated.timing.policy).toBe('erase_within_window');
    expect(updated.guideEnabled).toBe(false);
    expect(updated.eraserEffect).toBe('dissolve');

    // Cleared to waiting blank
    expect(updated.status).toBe('waiting');
    expect(updated.startedAt).toBeUndefined();
    expect(updated.pausedElapsedMs).toBeUndefined();

    // Increments revision
    expect(updated.revision).toBe(2);
  });

  it('executePlayCommand starts a new timed sequence at current timestamp', () => {
    const now = 10000;
    const updated = executePlayCommand(initialRoom, now);

    expect(updated.status).toBe('reading');
    expect(updated.startedAt).toBe(now);
    expect(updated.pausedElapsedMs).toBeUndefined();
    expect(updated.revision).toBe(2);
  });

  it('executePauseCommand freezes current elapsed time in pausedElapsedMs', () => {
    // Room was playing since timestamp 10000
    const playingRoom: RoomState = {
      ...initialRoom,
      status: 'reading',
      startedAt: 10000,
      revision: 2,
    };

    // Paused at 12500 -> elapsed = 2500ms
    const paused = executePauseCommand(playingRoom, 12500);

    expect(paused.status).toBe('paused');
    expect(paused.pausedElapsedMs).toBe(2500);
    expect(paused.revision).toBe(3);
  });

  it('executeResumeCommand restores reading state without resetting elapsed time', () => {
    const pausedRoom: RoomState = {
      ...initialRoom,
      status: 'paused',
      pausedElapsedMs: 2500,
      revision: 3,
    };

    // Resumed at timestamp 20000 -> effective startedAt = 20000 - 2500 = 17500
    const resumed = executeResumeCommand(pausedRoom, 20000);

    expect(resumed.status).toBe('reading');
    expect(resumed.startedAt).toBe(17500);
    expect(resumed.pausedElapsedMs).toBeUndefined();
    expect(resumed.revision).toBe(4);
  });

  it('executeShowCommand installs manual_show state without expiry', () => {
    const shown = executeShowCommand(initialRoom);

    expect(shown.status).toBe('manual_show');
    expect(shown.revision).toBe(2);
  });

  it('executeHideCommand clears visible unit to waiting state', () => {
    const shownRoom: RoomState = {
      ...initialRoom,
      status: 'manual_show',
      revision: 2,
    };

    const hidden = executeHideCommand(shownRoom);

    expect(hidden.status).toBe('waiting');
    expect(hidden.revision).toBe(3);
  });
});
