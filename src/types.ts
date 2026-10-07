import type { TimingConfig, PlaybackStatus } from './domain/timing';
import type { PhraseAnnotation } from './domain/annotations';

export type { TimingPolicy, TimingConfig, PlaybackStatus, DerivedPhaseResult, EffectiveDurations } from './domain/timing';
export type { PhraseAnnotation, TextSpanSegment, PhraseType, ReviewStatus } from './domain/annotations';

export interface ArticleUnit {
  id: string;
  text: string;
  order: number;
  annotations: PhraseAnnotation[];
}

export interface Article {
  id: string;
  title: string;
  category: 'News' | 'TED Talks' | 'Inspiration' | 'Literature' | string;
  author: string;
  attribution?: string;
  sourceUrl?: string;
  sentences: ArticleUnit[];
  paragraphs: ArticleUnit[];
  annotations: PhraseAnnotation[];
}

export type UnitMode = 'sentence' | 'paragraph';
export type EraserEffectType = 'eraser' | 'dissolve' | 'none';

export interface StagedSettings {
  articleId: string;
  unitMode: UnitMode;
  unitIndex: number;
  highlightEnabled: boolean;
  timing: TimingConfig;
  guideEnabled: boolean;
  eraserEffect: EraserEffectType;
}

export interface RoomState {
  id: string;
  code: string;
  articleId: string;
  unitMode: UnitMode;
  unitIndex: number;
  highlightEnabled: boolean;
  timing: TimingConfig;
  guideEnabled: boolean;
  eraserEffect: EraserEffectType;
  status: PlaybackStatus;
  startedAt?: number;
  pausedElapsedMs?: number;
  revision: number;
  // Staged settings in teacher workbench before "Apply to room"
  staged: StagedSettings;
}

export interface Participant {
  id: string;
  name: string;
  joinedAt: number;
  isOnline: boolean;
}
