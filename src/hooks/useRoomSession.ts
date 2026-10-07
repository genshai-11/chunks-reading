import { useState, useCallback, useRef, useEffect } from 'react';
import type { RoomState, Article, StagedSettings } from '../types';
import { 
  RoomAuthorityService, 
  type RoomCommand, 
  type LearnerRoomSnapshot 
} from '../services/roomService';

export function useRoomSession(initialRoom: RoomState, articles: Article[]) {
  const serviceRef = useRef<RoomAuthorityService>(new RoomAuthorityService(initialRoom, articles));
  const [roomState, setRoomState] = useState<RoomState>(initialRoom);
  const [learnerSnapshot, setLearnerSnapshot] = useState<LearnerRoomSnapshot>(() => 
    serviceRef.current.getLearnerSnapshot()
  );

  const syncState = useCallback(() => {
    const updatedRoom = serviceRef.current.getRoomState();
    const updatedSnapshot = serviceRef.current.getLearnerSnapshot();
    setRoomState(updatedRoom);
    setLearnerSnapshot(updatedSnapshot);
  }, []);

  const dispatchCommand = useCallback((type: RoomCommand['type'], payload?: { staged?: StagedSettings }) => {
    const commandId = `cmd-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const currentRev = serviceRef.current.getRoomState().revision;

    if (type === 'APPLY_STAGED' && payload?.staged) {
      serviceRef.current.getRoomState().staged = payload.staged;
    }

    const result = serviceRef.current.executeCommand({
      commandId,
      type,
      expectedRevision: currentRev,
      issuedAt: Date.now(),
    });

    if (result.success) {
      syncState();
      return { success: true };
    } else {
      console.error('Command failed:', result.error);
      syncState(); // resync on conflict
      return { success: false, error: result.error };
    }
  }, [syncState]);

  const updateStaged = useCallback((partial: Partial<StagedSettings>) => {
    const current = serviceRef.current.getRoomState();
    current.staged = { ...current.staged, ...partial };
    syncState();
  }, [syncState]);

  return {
    roomState,
    learnerSnapshot,
    dispatchCommand,
    updateStaged,
  };
}
