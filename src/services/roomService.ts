/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  doc,
  getDoc,
  getDocs,
  query,
  where,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  collection,
  serverTimestamp,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, auth } from '../firebase';
import {
  ClassroomRoom,
  CurrentUnitPayload,
  Granularity,
  TimingPolicy,
  RoomParticipant,
  ReadingResource,
  ApprovedSpan,
  EraseEffect,
} from '../types';

const ROOMS_COLLECTION = 'rooms';

export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = 'CH-';
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Creates a new active classroom room.
 */
export async function createClassroomRoom(
  resource: ReadingResource,
  teacherName: string,
  granularity: Granularity = 'sentence',
  highlightEnabled: boolean = true,
  timingPolicy: TimingPolicy = 'hold_then_erase',
  holdDurationMs: number = 3000,
  eraseDurationMs: number = 1000,
  totalWindowMs: number = 3000,
  eraseEffect: EraseEffect = 'dissolve'
): Promise<ClassroomRoom> {
  const teacherUid = auth.currentUser?.uid;
  if (!teacherUid) throw new Error('Teacher must be signed in to open a classroom');

  const roomId = generateRoomCode();
  const units = granularity === 'sentence' ? resource.sentences : resource.paragraphs;
  const initialText = units[0] || '';

  // Extract only approved annotations for unit 0
  const approvedAnnotations: ApprovedSpan[] = (resource.annotations || [])
    .filter(a => a.status === 'approved' && a.unitIndex === 0 && a.unitType === granularity)
    .map(a => ({
      id: a.id || `ann-${Date.now()}`,
      text: a.text || '',
      startOffset: a.startOffset || 0,
      endOffset: a.endOffset || 0,
      type: a.type || 'collocation',
      meaning: a.meaning || '',
    }));

  const initialUnit: CurrentUnitPayload = {
    index: 0,
    totalUnits: units.length,
    granularity,
    text: initialText,
    annotations: approvedAnnotations,
  };

  const roomData: ClassroomRoom = {
    id: roomId,
    teacherId: teacherUid,
    teacherName: teacherName || 'Teacher',
    resourceId: resource.id,
    resourceTitle: resource.title,
    status: 'active',
    granularity,
    highlightEnabled,
    timingPolicy,
    eraseEffect,
    holdDurationMs,
    eraseDurationMs,
    totalWindowMs,
    playbackStatus: 'idle', // Starts idle/blank waiting
    currentUnit: initialUnit,
    serverStartTime: null,
    pausedElapsedMs: 0,
    revision: 1,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(doc(db, ROOMS_COLLECTION, roomId), roomData);
    return roomData;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `${ROOMS_COLLECTION}/${roomId}`);
  }
}

/**
 * Fetch a room once.
 */
export async function getRoom(roomId: string): Promise<ClassroomRoom | null> {
  try {
    const snap = await getDoc(doc(db, ROOMS_COLLECTION, roomId));
    if (!snap.exists()) return null;
    return snap.data() as ClassroomRoom;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `${ROOMS_COLLECTION}/${roomId}`);
  }
}

/**
 * Finds the currently active room for a signed-in teacher, sorted descending by createdAt.
 */
export async function findActiveTeacherRoom(teacherUid: string): Promise<ClassroomRoom | null> {
  if (!teacherUid) return null;
  try {
    const q = query(
      collection(db, ROOMS_COLLECTION),
      where('teacherId', '==', teacherUid),
      where('status', '==', 'active')
    );
    const snap = await getDocs(q);
    if (snap.empty) return null;

    const rooms = snap.docs.map(d => d.data() as ClassroomRoom);
    // Sort client-side by createdAt descending to avoid composite index requirement
    rooms.sort((a, b) => {
      const aTime = a.createdAt?.toMillis?.() || (typeof a.createdAt === 'number' ? a.createdAt : 0);
      const bTime = b.createdAt?.toMillis?.() || (typeof b.createdAt === 'number' ? b.createdAt : 0);
      return bTime - aTime;
    });

    return rooms[0] || null;
  } catch (err) {
    console.warn('findActiveTeacherRoom query error:', err);
    return null;
  }
}

/**
 * Subscribe to realtime room updates.
 */
export function subscribeToRoom(
  roomId: string,
  onUpdate: (room: ClassroomRoom | null) => void,
  onError?: (err: Error) => void
): () => void {
  const roomRef = doc(db, ROOMS_COLLECTION, roomId);
  return onSnapshot(
    roomRef,
    snapshot => {
      if (snapshot.exists()) {
        onUpdate(snapshot.data() as ClassroomRoom);
      } else {
        onUpdate(null);
      }
    },
    error => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.GET, `${ROOMS_COLLECTION}/${roomId}`);
    }
  );
}

/**
 * Atomically apply staged unit/settings to room.
 * Resets state to idle/waiting, increments revision, and sets approved currentUnit.
 */
export async function applyToRoomCommand(
  roomId: string,
  currentRevision: number,
  resource: ReadingResource,
  unitIndex: number,
  granularity: Granularity,
  highlightEnabled: boolean,
  timingPolicy: TimingPolicy,
  holdDurationMs: number,
  eraseDurationMs: number,
  totalWindowMs: number,
  eraseEffect: EraseEffect = 'dissolve'
): Promise<void> {
  const units = granularity === 'sentence' ? resource.sentences : resource.paragraphs;
  const safeIndex = Math.max(0, Math.min(unitIndex, units.length - 1));
  const unitText = units[safeIndex] || '';

  const approvedAnnotations: ApprovedSpan[] = (resource.annotations || [])
    .filter(a => a.status === 'approved' && a.unitIndex === safeIndex && a.unitType === granularity)
    .map(a => ({
      id: a.id || `ann-${Date.now()}`,
      text: a.text || '',
      startOffset: a.startOffset || 0,
      endOffset: a.endOffset || 0,
      type: a.type || 'collocation',
      meaning: a.meaning || '',
    }));

  const currentUnit: CurrentUnitPayload = {
    index: safeIndex,
    totalUnits: units.length,
    granularity,
    text: unitText,
    annotations: approvedAnnotations,
  };

  try {
    const ref = doc(db, ROOMS_COLLECTION, roomId);
    await updateDoc(ref, {
      resourceId: resource.id,
      resourceTitle: resource.title,
      granularity,
      highlightEnabled,
      timingPolicy,
      eraseEffect,
      holdDurationMs,
      eraseDurationMs,
      totalWindowMs,
      currentUnit,
      playbackStatus: 'idle', // Staged changes return learners to blank waiting
      serverStartTime: null,
      pausedElapsedMs: 0,
      revision: currentRevision + 1,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `${ROOMS_COLLECTION}/${roomId}`);
  }
}

/**
 * Start or replay timed reading sequence.
 */
export async function playTurnCommand(roomId: string, currentRevision: number): Promise<void> {
  try {
    const ref = doc(db, ROOMS_COLLECTION, roomId);
    await updateDoc(ref, {
      playbackStatus: 'playing',
      serverStartTime: Date.now(),
      pausedElapsedMs: 0,
      revision: currentRevision + 1,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `${ROOMS_COLLECTION}/${roomId}`);
  }
}

/**
 * Pause timed playback, capturing elapsed progress.
 */
export async function pauseTurnCommand(
  roomId: string,
  currentRevision: number,
  elapsedMs: number
): Promise<void> {
  try {
    const ref = doc(db, ROOMS_COLLECTION, roomId);
    await updateDoc(ref, {
      playbackStatus: 'paused',
      pausedElapsedMs: Math.max(0, elapsedMs),
      revision: currentRevision + 1,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `${ROOMS_COLLECTION}/${roomId}`);
  }
}

/**
 * Resume timed playback without restarting the clock.
 */
export async function resumeTurnCommand(
  roomId: string,
  currentRevision: number,
  pausedElapsedMs: number
): Promise<void> {
  try {
    const ref = doc(db, ROOMS_COLLECTION, roomId);
    await updateDoc(ref, {
      playbackStatus: 'playing',
      serverStartTime: Date.now() - (pausedElapsedMs || 0),
      revision: currentRevision + 1,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `${ROOMS_COLLECTION}/${roomId}`);
  }
}

/**
 * Manual Show: reveals current chunk indefinitely until Hide.
 */
export async function showTurnCommand(roomId: string, currentRevision: number): Promise<void> {
  try {
    const ref = doc(db, ROOMS_COLLECTION, roomId);
    await updateDoc(ref, {
      playbackStatus: 'manual_show',
      serverStartTime: null,
      pausedElapsedMs: 0,
      revision: currentRevision + 1,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `${ROOMS_COLLECTION}/${roomId}`);
  }
}

/**
 * Hide: clears display back to blank waiting paper.
 */
export async function hideTurnCommand(roomId: string, currentRevision: number): Promise<void> {
  try {
    const ref = doc(db, ROOMS_COLLECTION, roomId);
    await updateDoc(ref, {
      playbackStatus: 'idle',
      serverStartTime: null,
      pausedElapsedMs: 0,
      revision: currentRevision + 1,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `${ROOMS_COLLECTION}/${roomId}`);
  }
}

/**
 * End room.
 */
export async function endRoomCommand(roomId: string, currentRevision: number): Promise<void> {
  try {
    const ref = doc(db, ROOMS_COLLECTION, roomId);
    await updateDoc(ref, {
      status: 'ended',
      playbackStatus: 'ended',
      revision: currentRevision + 1,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `${ROOMS_COLLECTION}/${roomId}`);
  }
}

// ----------------- Participants Subcollection -----------------

/**
 * Register learner participant inside room.
 */
export async function registerParticipant(
  roomId: string,
  participantId: string,
  name: string
): Promise<void> {
  const cleanName = (name || 'Learner').trim().slice(0, 80);
  try {
    const ref = doc(db, `${ROOMS_COLLECTION}/${roomId}/participants`, participantId);
    await setDoc(ref, {
      participantId,
      name: cleanName,
      joinedAt: Date.now(),
      lastSeen: Date.now(),
      isRemoved: false,
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `${ROOMS_COLLECTION}/${roomId}/participants/${participantId}`);
  }
}

/**
 * Send heartbeat to keep participant active.
 */
export async function sendParticipantHeartbeat(
  roomId: string,
  participantId: string
): Promise<void> {
  try {
    const ref = doc(db, `${ROOMS_COLLECTION}/${roomId}/participants`, participantId);
    await updateDoc(ref, {
      lastSeen: Date.now(),
    });
  } catch (err) {
    // Suppress silent heartbeat errors if participant was evicted or left
  }
}

/**
 * Teacher removes participant.
 */
export async function removeParticipant(
  roomId: string,
  participantId: string
): Promise<void> {
  try {
    const ref = doc(db, `${ROOMS_COLLECTION}/${roomId}/participants`, participantId);
    await updateDoc(ref, {
      isRemoved: true,
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `${ROOMS_COLLECTION}/${roomId}/participants/${participantId}`);
  }
}

/**
 * Subscribe to online participants in room.
 */
export function subscribeToParticipants(
  roomId: string,
  onUpdate: (participants: RoomParticipant[]) => void,
  onError?: (err: Error) => void
): () => void {
  const colRef = collection(db, `${ROOMS_COLLECTION}/${roomId}/participants`);
  return onSnapshot(
    colRef,
    snapshot => {
      const now = Date.now();
      const list: RoomParticipant[] = [];
      snapshot.forEach(docSnap => {
        const data = docSnap.data() as RoomParticipant;
        // Consider online if seen within last 45 seconds and not marked removed
        const isOnline = !data.isRemoved && now - (data.lastSeen || 0) < 45000;
        if (isOnline) {
          list.push(data);
        }
      });
      onUpdate(list);
    },
    error => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.LIST, `${ROOMS_COLLECTION}/${roomId}/participants`);
    }
  );
}
