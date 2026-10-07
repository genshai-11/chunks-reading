export interface IdiomAnnotation {
  id: string;
  phrase: string;
  meaning: string;
  type: 'idiom' | 'collocation' | 'vocab';
}

export interface ArticleUnit {
  id: string;
  text: string;
  order: number;
  highlightPhrases?: string[];
}

export interface Article {
  id: string;
  title: string;
  category: 'News' | 'TED Talks' | 'Inspiration' | 'Literature';
  author: string;
  sentences: ArticleUnit[];
  paragraphs: ArticleUnit[];
  annotations: IdiomAnnotation[];
}

export type UnitMode = 'sentence' | 'paragraph';
export type TimingMode = 'fixed' | 'dynamic';
export type ReaderEffect = 'guide' | 'eraser' | 'none';

export interface RoomState {
  id: string;
  code: string;
  articleId: string;
  unitMode: UnitMode;
  unitIndex: number;
  highlightEnabled: boolean;
  timingMode: TimingMode;
  holdDurationSec: number;
  eraseDurationSec: number;
  effect: ReaderEffect;
  status: 'idle' | 'reading' | 'paused' | 'ended';
  startedAt?: number;
  pausedElapsedMs?: number;
  revision: number;
}
