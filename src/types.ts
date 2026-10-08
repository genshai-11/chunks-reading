/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type ResourceStatus = 'draft' | 'published' | 'archived';

export type SourceType = 'paste' | 'txt' | 'url' | 'seeded';

export type PhraseType = 'idiom' | 'phrasal_verb' | 'collocation' | 'fixed_expression';

export type AnnotationStatus = 'pending' | 'approved' | 'rejected';

export type Granularity = 'sentence' | 'paragraph';

export type TimingPolicy = 'hold_then_erase' | 'erase_within_window';

export type EraseEffect = 'vaporize' | 'dissolve' | 'wipe' | 'fade' | 'eraser' | 'dust' | 'sparkle';

export type PlaybackStatus = 'idle' | 'playing' | 'paused' | 'manual_show' | 'ended';

export interface PhraseAnnotation {
  id: string;
  unitIndex?: number;
  unitType?: Granularity;
  text: string;
  startOffset: number; // UTF-16 offset in canonical text or unit text
  endOffset: number;
  type: PhraseType;
  meaning: string;
  status: AnnotationStatus;
  source: 'deterministic' | 'ai' | 'manual';
}

export interface ReadingResource {
  id: string;
  ownerId: string;
  title: string;
  category: string;
  topic: string;
  level: string; // e.g. "B1 Intermediate", "B2 Upper-Intermediate", "C1 Advanced"
  sourceType: SourceType;
  sourceUrl?: string;
  provenance?: string;
  rightsBasis?: string;
  status: ResourceStatus;
  canonicalText: string;
  sentences: string[];
  paragraphs: string[];
  annotations: PhraseAnnotation[];
  publishedVersionId?: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface ApprovedSpan {
  id: string;
  text: string;
  startOffset: number;
  endOffset: number;
  type: PhraseType;
  meaning: string;
}

export interface CurrentUnitPayload {
  index: number;
  totalUnits: number;
  granularity: Granularity;
  text: string;
  annotations: ApprovedSpan[];
  isFullReview?: boolean;
}

export interface ClassroomRoom {
  id: string; // 6-digit room code or doc ID
  teacherId: string;
  teacherName: string;
  resourceId: string;
  resourceTitle: string;
  status: 'active' | 'ended';
  granularity: Granularity;
  highlightEnabled: boolean;
  timingPolicy: TimingPolicy;
  eraseEffect?: EraseEffect;
  dustAngle?: number; // -180..180 degrees; 90 = down, default -45
  holdDurationMs: number;
  eraseDurationMs: number;
  totalWindowMs: number;
  // Separate timing profiles for sentence vs paragraph
  sentenceHoldMs?: number;
  sentenceEraseMs?: number;
  paragraphHoldMs?: number;
  paragraphEraseMs?: number;
  // Full text review mode (show entire text without auto-hide timer)
  isFullReview?: boolean;
  // Dynamic pacing and auto-merge settings
  dynamicPacingEnabled?: boolean;
  readingWpm?: number;
  autoMergeShortUnits?: boolean;
  minWordsPerUnit?: number;
  playbackStatus: PlaybackStatus;
  currentUnit: CurrentUnitPayload | null;
  serverStartTime: number | null; // epoch ms
  pausedElapsedMs: number;
  revision: number;
  createdAt?: any;
  updatedAt?: any;
}

export interface RoomParticipant {
  participantId: string;
  name: string;
  joinedAt: number;
  lastSeen: number;
  isRemoved?: boolean;
}

export type TimelinePhase =
  | 'idle'
  | 'hold'
  | 'erase'
  | 'blank_finished'
  | 'paused'
  | 'manual_show'
  | 'ended';

export interface CalculatedTimeline {
  phase: TimelinePhase;
  progress: number; // 0.0 to 1.0 (for erase phase or overall)
  remainingMs: number;
  totalDurationMs: number;
  effectiveHoldMs: number;
  effectiveEraseMs: number;
  elapsedMs: number;
}
