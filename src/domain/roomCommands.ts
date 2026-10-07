import type { RoomState, StagedSettings } from '../types';

export function applyStagedToRoom(room: RoomState): RoomState {
  const staged = room.staged;
  return {
    ...room,
    articleId: staged.articleId,
    unitMode: staged.unitMode,
    unitIndex: staged.unitIndex,
    highlightEnabled: staged.highlightEnabled,
    timing: { ...staged.timing },
    guideEnabled: staged.guideEnabled,
    eraserEffect: staged.eraserEffect,
    status: 'waiting',
    startedAt: undefined,
    pausedElapsedMs: undefined,
    revision: room.revision + 1,
  };
}

export function executePlayCommand(room: RoomState, now: number): RoomState {
  return {
    ...room,
    status: 'reading',
    startedAt: now,
    pausedElapsedMs: undefined,
    revision: room.revision + 1,
  };
}

export function executePauseCommand(room: RoomState, now: number): RoomState {
  let elapsed = 0;
  if (room.status === 'reading' && room.startedAt) {
    elapsed = Math.max(0, now - room.startedAt);
  } else if (room.status === 'paused') {
    elapsed = room.pausedElapsedMs ?? 0;
  }

  return {
    ...room,
    status: 'paused',
    pausedElapsedMs: elapsed,
    revision: room.revision + 1,
  };
}

export function executeResumeCommand(room: RoomState, now: number): RoomState {
  const elapsed = room.pausedElapsedMs ?? 0;
  return {
    ...room,
    status: 'reading',
    startedAt: now - elapsed,
    pausedElapsedMs: undefined,
    revision: room.revision + 1,
  };
}

export function executeShowCommand(room: RoomState): RoomState {
  return {
    ...room,
    status: 'manual_show',
    startedAt: undefined,
    pausedElapsedMs: undefined,
    revision: room.revision + 1,
  };
}

export function executeHideCommand(room: RoomState): RoomState {
  return {
    ...room,
    status: 'waiting',
    startedAt: undefined,
    pausedElapsedMs: undefined,
    revision: room.revision + 1,
  };
}

export function updateStagedSettings(room: RoomState, partial: Partial<StagedSettings>): RoomState {
  return {
    ...room,
    staged: {
      ...room.staged,
      ...partial,
    },
  };
}
