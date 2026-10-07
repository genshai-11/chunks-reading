export type TimingPolicy = 'hold_then_erase' | 'erase_within_window';

export interface HoldThenEraseConfig {
  policy: 'hold_then_erase';
  holdMs: number;
  eraseMs: number;
}

export interface EraseWithinWindowConfig {
  policy: 'erase_within_window';
  totalMs: number;
  eraseMs: number;
}

export type TimingConfig = HoldThenEraseConfig | EraseWithinWindowConfig;

export interface EffectiveDurations {
  holdMs: number;
  eraseMs: number;
  totalMs: number;
}

export function getEffectiveDurations(config: TimingConfig): EffectiveDurations {
  if (config.policy === 'hold_then_erase') {
    const holdMs = Math.max(0, config.holdMs);
    const eraseMs = Math.max(0, config.eraseMs);
    return {
      holdMs,
      eraseMs,
      totalMs: holdMs + eraseMs,
    };
  } else {
    const totalMs = Math.max(0, config.totalMs);
    const eraseMs = Math.max(0, Math.min(totalMs, config.eraseMs));
    const holdMs = Math.max(0, totalMs - eraseMs);
    return {
      holdMs,
      eraseMs,
      totalMs,
    };
  }
}

export type PlaybackStatus = 'idle' | 'waiting' | 'reading' | 'paused' | 'manual_show' | 'ended';

export interface ReadingPlaybackState {
  status: PlaybackStatus;
  startedAt?: number;
  pausedElapsedMs?: number;
  timing: TimingConfig;
}

export type DerivedPhase = 'waiting' | 'hold' | 'erasing' | 'blank' | 'manual_show';

export interface DerivedPhaseResult {
  phase: DerivedPhase;
  isTextVisible: boolean;
  maskProgress: number; // 0 = no erase, 1 = fully erased
  elapsedMs: number;
  effectiveDurations: EffectiveDurations;
}

export function computeReadingPhase(
  state: ReadingPlaybackState,
  clientNow: number,
  clockOffsetMs: number = 0
): DerivedPhaseResult {
  const durations = getEffectiveDurations(state.timing);

  if (state.status === 'manual_show') {
    return {
      phase: 'manual_show',
      isTextVisible: true,
      maskProgress: 0,
      elapsedMs: 0,
      effectiveDurations: durations,
    };
  }

  if (state.status === 'idle' || state.status === 'waiting' || state.status === 'ended') {
    return {
      phase: 'waiting',
      isTextVisible: false,
      maskProgress: 0,
      elapsedMs: 0,
      effectiveDurations: durations,
    };
  }

  // Calculate elapsed time
  let elapsedMs = 0;
  if (state.status === 'paused') {
    elapsedMs = state.pausedElapsedMs ?? 0;
  } else if (state.status === 'reading') {
    const serverNow = clientNow + clockOffsetMs;
    const start = state.startedAt ?? serverNow;
    elapsedMs = Math.max(0, serverNow - start);
  }

  // Determine phase by elapsed time against boundaries
  if (elapsedMs < durations.holdMs) {
    return {
      phase: 'hold',
      isTextVisible: true,
      maskProgress: 0,
      elapsedMs,
      effectiveDurations: durations,
    };
  }

  if (elapsedMs < durations.totalMs) {
    const eraseElapsed = elapsedMs - durations.holdMs;
    const progress = durations.eraseMs > 0 ? Math.min(1, Math.max(0, eraseElapsed / durations.eraseMs)) : 1;
    return {
      phase: 'erasing',
      isTextVisible: true,
      maskProgress: progress,
      elapsedMs,
      effectiveDurations: durations,
    };
  }

  // Past totalMs -> expired / blank
  return {
    phase: 'blank',
    isTextVisible: false,
    maskProgress: 1,
    elapsedMs,
    effectiveDurations: durations,
  };
}
