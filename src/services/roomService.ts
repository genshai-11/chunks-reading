/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { normalizeDustAngle, DEFAULT_DUST_ANGLE } from '../utils/eraseEffects';
import { getUnitApprovedSpans } from '../utils/unitAnnotations';
import { validateWordsPerSecond, validateReadingDuration, DEFAULT_WORDS_PER_SECOND } from '../utils/readingTiming';
import { mergeShortUnits } from '../utils/textSegmentation';
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
import { syncRoomClock, roomClockNow } from './roomClock';
import {
  ClassroomRoom,
  CurrentUnitPayload,
  Granularity,
  TimingPolicy,
  RoomParticipant,
  ReadingResource,
  EraseEffect,
  TimingMode,
  EraseSchedule,
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

export interface RoomConfigOptions {
  sentenceHoldMs?: number;
  sentenceEraseMs?: number;
  paragraphHoldMs?: number;
  paragraphEraseMs?: number;
  isFullReview?: boolean;
  dynamicPacingEnabled?: boolean;
  readingWpm?: number;
  autoMergeShortUnits?: boolean;
  minWordsPerUnit?: number;
  customUnitsList?: string[];
  timingMode?: TimingMode;
  wordsPerSecond?: number;
  eraseSchedule?: EraseSchedule;
}

function validateCustomDurations(hold: number, erase: number, options?: RoomConfigOptions): void {
  const durations = [hold, erase, options?.sentenceHoldMs, options?.sentenceEraseMs, options?.paragraphHoldMs, options?.paragraphEraseMs].filter((value): value is number => value !== undefined);
  durations.forEach(validateReadingDuration);
}

function validateReadingOptions(options?: RoomConfigOptions): void {
  if (options?.wordsPerSecond !== undefined) validateWordsPerSecond(options.wordsPerSecond);
  if (options?.timingMode !== undefined && !['fixed', 'auto'].includes(options.timingMode)) throw new Error('Invalid timing mode');
  if (options?.eraseSchedule !== undefined && !['after_reading', 'word_groups'].includes(options.eraseSchedule)) throw new Error('Invalid erase schedule');
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
  eraseEffect: EraseEffect = 'dissolve',
  dustAngle: number = DEFAULT_DUST_ANGLE,
  options?: RoomConfigOptions
): Promise<ClassroomRoom> {
  const teacherUid = auth.currentUser?.uid;
  if (!teacherUid) throw new Error('Teacher must be signed in to open a classroom');

  validateReadingOptions(options);
  const roomId = generateRoomCode();
  const rawUnits = granularity === 'sentence' ? resource.sentences : resource.paragraphs;
  const units = options?.customUnitsList && options.customUnitsList.length > 0 ? options.customUnitsList : rawUnits;
  validateCustomDurations(holdDurationMs, eraseDurationMs, options);
  const initialText = units[0] || '';

  const approvedAnnotations = getUnitApprovedSpans(resource, initialText, 0, granularity);

  const initialUnit: CurrentUnitPayload = {
    index: 0,
    totalUnits: units.length,
    granularity,
    text: initialText,
    annotations: approvedAnnotations,
    isFullReview: false,
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
    dustAngle: normalizeDustAngle(dustAngle),
    holdDurationMs,
    eraseDurationMs,
    totalWindowMs,
    sentenceHoldMs: options?.sentenceHoldMs ?? (granularity === 'sentence' ? holdDurationMs : 3500),
    sentenceEraseMs: options?.sentenceEraseMs ?? (granularity === 'sentence' ? eraseDurationMs : 1000),
    paragraphHoldMs: options?.paragraphHoldMs ?? (granularity === 'paragraph' ? holdDurationMs : 12000),
    paragraphEraseMs: options?.paragraphEraseMs ?? (granularity === 'paragraph' ? eraseDurationMs : 2500),
    isFullReview: false,
    timingMode: options?.timingMode ?? 'fixed',
    wordsPerSecond: options?.wordsPerSecond ?? DEFAULT_WORDS_PER_SECOND,
    eraseSchedule: options?.eraseSchedule ?? 'after_reading',
    dynamicPacingEnabled: options?.dynamicPacingEnabled ?? false,
    readingWpm: options?.readingWpm ?? 160,
    autoMergeShortUnits: options?.autoMergeShortUnits ?? false,
    minWordsPerUnit: options?.minWordsPerUnit ?? 5,
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
  eraseEffect: EraseEffect = 'dissolve',
  dustAngle: number = DEFAULT_DUST_ANGLE,
  options?: RoomConfigOptions
): Promise<void> {
  const rawUnits = granularity === 'sentence' ? resource.sentences : resource.paragraphs;
  const units = options?.customUnitsList && options.customUnitsList.length > 0 ? options.customUnitsList : rawUnits;
  validateReadingOptions(options);
  validateCustomDurations(holdDurationMs, eraseDurationMs, options);
  const safeIndex = Math.max(0, Math.min(unitIndex, units.length - 1));
  const unitText = units[safeIndex] || '';

  const approvedAnnotations = getUnitApprovedSpans(resource, unitText, safeIndex, granularity);

  const currentUnit: CurrentUnitPayload = {
    index: safeIndex,
    totalUnits: units.length,
    granularity,
    text: unitText,
    annotations: approvedAnnotations,
    isFullReview: false,
  };

  try {
    const ref = doc(db, ROOMS_COLLECTION, roomId);
    const updatePayload: Record<string, any> = {
      resourceId: resource.id,
      resourceTitle: resource.title,
      granularity,
      highlightEnabled,
      timingPolicy,
      eraseEffect,
      dustAngle: normalizeDustAngle(dustAngle),
      holdDurationMs,
      eraseDurationMs,
      totalWindowMs,
      currentUnit,
      playbackStatus: 'idle', // Staged changes return learners to blank waiting
      serverStartTime: null,
      pausedElapsedMs: 0,
      isFullReview: false,
      revision: currentRevision + 1,
      updatedAt: serverTimestamp(),
    };

    if (options?.timingMode !== undefined) updatePayload.timingMode = options.timingMode;
    if (options?.wordsPerSecond !== undefined) updatePayload.wordsPerSecond = options.wordsPerSecond;
    if (options?.eraseSchedule !== undefined) updatePayload.eraseSchedule = options.eraseSchedule;
    if (options?.sentenceHoldMs !== undefined) updatePayload.sentenceHoldMs = options.sentenceHoldMs;
    if (options?.sentenceEraseMs !== undefined) updatePayload.sentenceEraseMs = options.sentenceEraseMs;
    if (options?.paragraphHoldMs !== undefined) updatePayload.paragraphHoldMs = options.paragraphHoldMs;
    if (options?.paragraphEraseMs !== undefined) updatePayload.paragraphEraseMs = options.paragraphEraseMs;
    if (options?.dynamicPacingEnabled !== undefined) updatePayload.dynamicPacingEnabled = options.dynamicPacingEnabled;
    if (options?.readingWpm !== undefined) updatePayload.readingWpm = options.readingWpm;
    if (options?.autoMergeShortUnits !== undefined) updatePayload.autoMergeShortUnits = options.autoMergeShortUnits;
    if (options?.minWordsPerUnit !== undefined) updatePayload.minWordsPerUnit = options.minWordsPerUnit;

    await updateDoc(ref, updatePayload);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `${ROOMS_COLLECTION}/${roomId}`);
  }
}

/** Select another unit with applied settings. Explicit kind selection uses its saved profile, never private timing/highlight drafts. */
export async function selectAppliedUnitCommand(roomId: string, currentRevision: number, resource: ReadingResource, unitIndex: number, targetGranularity?: Granularity): Promise<void> {
  const room = await getRoom(roomId);
  if (!room || room.status === 'ended') throw new Error('Classroom is not active');
  if (room.teacherId !== auth.currentUser?.uid || room.resourceId !== resource.id) throw new Error('Resource does not belong to the applied room');
  const granularity = targetGranularity ?? room.granularity;
  const rawUnits = granularity === 'sentence' ? resource.sentences : resource.paragraphs;
  const hold = granularity === room.granularity ? room.holdDurationMs : (granularity === 'paragraph' ? room.paragraphHoldMs : room.sentenceHoldMs) ?? room.holdDurationMs;
  const erase = granularity === room.granularity ? room.eraseDurationMs : (granularity === 'paragraph' ? room.paragraphEraseMs : room.sentenceEraseMs) ?? room.eraseDurationMs;
  const units = room.autoMergeShortUnits ? mergeShortUnits(rawUnits, { minWords: room.minWordsPerUnit }) : rawUnits;
  await applyToRoomCommand(roomId, Math.max(currentRevision, room.revision), resource, unitIndex, granularity,
    room.highlightEnabled, room.timingPolicy, hold, erase, room.totalWindowMs,
    room.eraseEffect, room.dustAngle, {
      ...(room.timingMode ? { timingMode: room.timingMode } : {}),
      ...(room.wordsPerSecond !== undefined ? { wordsPerSecond: room.wordsPerSecond } : {}),
      ...(room.eraseSchedule ? { eraseSchedule: room.eraseSchedule } : {}),
      customUnitsList: units,
    });
}

/**
 * Toggle Full Text Review mode: displays the entire reading text indefinitely until teacher hides or exits.
 */
export async function setFullReviewCommand(
  roomId: string,
  currentRevision: number,
  resource: ReadingResource,
  isReview: boolean
): Promise<void> {
  try {
    const ref = doc(db, ROOMS_COLLECTION, roomId);

    if (isReview) {
      const allApproved = getUnitApprovedSpans(resource, resource.canonicalText, 0, 'paragraph');

      const fullUnit: CurrentUnitPayload = {
        index: 0,
        totalUnits: 1,
        granularity: 'paragraph',
        text: resource.canonicalText,
        annotations: allApproved,
        isFullReview: true,
      };

      await updateDoc(ref, {
        isFullReview: true,
        playbackStatus: 'manual_show',
        currentUnit: fullUnit,
        serverStartTime: null,
        pausedElapsedMs: 0,
        revision: currentRevision + 1,
        updatedAt: serverTimestamp(),
      });
    } else {
      // Exit full review back to idle
      await updateDoc(ref, {
        isFullReview: false,
        playbackStatus: 'idle',
        serverStartTime: null,
        pausedElapsedMs: 0,
        revision: currentRevision + 1,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `${ROOMS_COLLECTION}/${roomId}`);
  }
}

/**
 * Start or replay timed reading sequence.
 */
export async function playTurnCommand(roomId: string, currentRevision: number): Promise<void> {
  await syncRoomClock(roomId);
  try {
    const ref = doc(db, ROOMS_COLLECTION, roomId);
    await updateDoc(ref, {
      playbackStatus: 'playing',
      isFullReview: false,
      serverStartTime: roomClockNow(roomId),
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
  await syncRoomClock(roomId);
  try {
    const ref = doc(db, ROOMS_COLLECTION, roomId);
    await updateDoc(ref, {
      playbackStatus: 'playing',
      serverStartTime: roomClockNow(roomId) - (pausedElapsedMs || 0),
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
      isFullReview: false,
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
      isFullReview: false,
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
