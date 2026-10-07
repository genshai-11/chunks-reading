import React, { useState, useEffect } from 'react';
import { 
  Layers, Highlighter, Clock, Sparkles, Play, RotateCcw, 
  CheckCircle2, AlertTriangle, Wand2, ShieldCheck, ArrowRight
} from 'lucide-react';
import type { RoomState, StagedSettings, UnitMode, TimingPolicy, EraserEffectType, Article } from '../types';
import { getEffectiveDurations, computeReadingPhase } from '../domain/timing';

interface TeacherSetupProps {
  roomState: RoomState;
  onUpdateStaged: (partial: Partial<StagedSettings>) => void;
  onApplyToRoom: () => void;
  articles: Article[];
}

export const TeacherSetup: React.FC<TeacherSetupProps> = ({
  roomState,
  onUpdateStaged,
  onApplyToRoom,
  articles,
}) => {
  const staged = roomState.staged;
  const currentArticle = articles.find(a => a.id === staged.articleId) || articles[0];
  const units = staged.unitMode === 'sentence' ? currentArticle.sentences : currentArticle.paragraphs;
  const previewSampleText = units[staged.unitIndex]?.text || units[0]?.text || 'Long story short, we decided to give it a shot.';

  // Effective durations for staged settings
  const durations = getEffectiveDurations(staged.timing);

  // Private Dynamic Animation Preview State
  const [previewRunning, setPreviewRunning] = useState(false);
  const [previewStartTime, setPreviewStartTime] = useState<number | null>(null);
  const [previewNow, setPreviewNow] = useState<number>(Date.now());

  useEffect(() => {
    if (!previewRunning || !previewStartTime) return;
    const interval = setInterval(() => {
      const now = Date.now();
      setPreviewNow(now);
      const elapsed = now - previewStartTime;
      if (elapsed >= durations.totalMs) {
        setPreviewRunning(false);
      }
    }, 25);
    return () => clearInterval(interval);
  }, [previewRunning, previewStartTime, durations.totalMs]);

  const handleStartSamplePreview = () => {
    const now = Date.now();
    setPreviewStartTime(now);
    setPreviewNow(now);
    setPreviewRunning(true);
  };

  const handleResetSamplePreview = () => {
    setPreviewRunning(false);
    setPreviewStartTime(null);
  };

  const previewDerived = previewStartTime
    ? computeReadingPhase(
        {
          status: previewRunning ? 'reading' : 'waiting',
          startedAt: previewStartTime,
          timing: staged.timing,
        },
        previewNow
      )
    : {
        phase: 'waiting' as const,
        isTextVisible: true,
        maskProgress: 0,
        elapsedMs: 0,
        effectiveDurations: durations,
      };

  // Check if staged settings differ from current active room
  const hasUnappliedChanges = 
    roomState.articleId !== staged.articleId ||
    roomState.unitMode !== staged.unitMode ||
    roomState.unitIndex !== staged.unitIndex ||
    roomState.highlightEnabled !== staged.highlightEnabled ||
    roomState.guideEnabled !== staged.guideEnabled ||
    roomState.eraserEffect !== staged.eraserEffect ||
    JSON.stringify(roomState.timing) !== JSON.stringify(staged.timing);

  return (
    <div className="space-y-8">
      {/* Top Banner: Staged vs Active Notice */}
      <div className={`p-4 rounded-[var(--radius-md)] border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all ${
        hasUnappliedChanges 
          ? 'bg-[var(--color-accent-soft)] border-[var(--color-accent)] text-[var(--color-ink)]'
          : 'bg-[var(--color-card)] border-[var(--color-border)] text-[var(--color-muted)]'
      }`}>
        <div className="flex items-center space-x-3">
          {hasUnappliedChanges ? (
            <AlertTriangle className="w-5 h-5 text-[var(--color-accent)] shrink-0" />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-[var(--color-success)] shrink-0" />
          )}
          <div>
            <div className="text-sm font-semibold text-[var(--color-ink)]">
              {hasUnappliedChanges ? 'Changes staged in private workbench' : 'Room is synchronized with workbench'}
            </div>
            <div className="text-xs text-[var(--color-muted)]">
              {hasUnappliedChanges 
                ? 'Learners will only receive updated unit and timing once you click Apply to Room.'
                : 'Active learners are observing the applied unit settings.'}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onApplyToRoom}
          disabled={!hasUnappliedChanges}
          className={`touch-target px-4 py-2 rounded-[var(--radius-sm)] text-xs font-bold uppercase tracking-wider flex items-center space-x-2 transition-all ${
            hasUnappliedChanges
              ? 'bg-[var(--color-accent)] text-white hover:opacity-95 shadow-xs'
              : 'bg-[var(--color-surface-container)] text-[var(--color-muted)] cursor-not-allowed border border-[var(--color-border)]'
          }`}
        >
          <span>Apply to Room</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column: Configuration Controls */}
        <div className="space-y-6">
          {/* Article & Unit Mode */}
          <section className="bg-[var(--color-card)] rounded-[var(--radius-md)] p-6 border border-[var(--color-border)] shadow-xs space-y-5">
            <h3 className="font-serif text-lg font-bold text-[var(--color-ink)] flex items-center gap-2">
              <Layers className="w-5 h-5 text-[var(--color-accent)]" />
              1. Reading Unit & Content
            </h3>

            {/* Granularity Toggle */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
                Unit Granularity
              </label>
              <div className="grid grid-cols-2 gap-3">
                {(['sentence', 'paragraph'] as UnitMode[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => onUpdateStaged({ unitMode: mode, unitIndex: 0 })}
                    className={`touch-target py-2.5 px-4 text-xs font-semibold rounded-[var(--radius-sm)] border text-center transition-all ${
                      staged.unitMode === mode
                        ? 'bg-[var(--color-accent)] text-white border-[var(--color-accent)] shadow-xs'
                        : 'border-[var(--color-control-border)] text-[var(--color-ink)] hover:bg-[var(--color-paper)]'
                    }`}
                  >
                    {mode === 'sentence' ? 'Sentence by Sentence' : 'Paragraph by Paragraph'}
                  </button>
                ))}
              </div>
            </div>

            {/* Independent Highlight Toggle */}
            <div className="pt-2 border-t border-[var(--color-border)] flex items-center justify-between">
              <div>
                <label className="text-sm font-semibold text-[var(--color-ink)] flex items-center gap-1.5">
                  <Highlighter className="w-4 h-4 text-[var(--color-accent)]" />
                  Highlight Approved Phrases
                </label>
                <p className="text-xs text-[var(--color-muted)]">
                  Only verified exact phrase candidates receive the warm background
                </p>
              </div>
              <button
                type="button"
                onClick={() => onUpdateStaged({ highlightEnabled: !staged.highlightEnabled })}
                className={`touch-target relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  staged.highlightEnabled ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-control-border)]'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    staged.highlightEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </section>

          {/* Timing Policy & Durations */}
          <section className="bg-[var(--color-card)] rounded-[var(--radius-md)] p-6 border border-[var(--color-border)] shadow-xs space-y-5">
            <h3 className="font-serif text-lg font-bold text-[var(--color-ink)] flex items-center gap-2">
              <Clock className="w-5 h-5 text-[var(--color-accent)]" />
              2. Timing Policy & Durations
            </h3>

            {/* Policy Selector */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  onUpdateStaged({
                    timing: {
                      policy: 'hold_then_erase',
                      holdMs: 3000,
                      eraseMs: 1000,
                    },
                  });
                }}
                className={`touch-target p-3 rounded-[var(--radius-sm)] border text-left transition-all ${
                  staged.timing.policy === 'hold_then_erase'
                    ? 'border-[var(--color-accent)] bg-[var(--color-accent-soft)]'
                    : 'border-[var(--color-control-border)] hover:bg-[var(--color-paper)]'
                }`}
              >
                <div className="font-semibold text-xs text-[var(--color-ink)]">Hold Then Erase</div>
                <div className="text-[11px] text-[var(--color-muted)] mt-1">
                  Full text remains visible for the entire hold duration, then erases.
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  onUpdateStaged({
                    timing: {
                      policy: 'erase_within_window',
                      totalMs: 3000,
                      eraseMs: 1000,
                    },
                  });
                }}
                className={`touch-target p-3 rounded-[var(--radius-sm)] border text-left transition-all ${
                  staged.timing.policy === 'erase_within_window'
                    ? 'border-[var(--color-accent)] bg-[var(--color-accent-soft)]'
                    : 'border-[var(--color-control-border)] hover:bg-[var(--color-paper)]'
                }`}
              >
                <div className="font-semibold text-xs text-[var(--color-ink)]">Erase Within Window</div>
                <div className="text-[11px] text-[var(--color-muted)] mt-1">
                  Fixed total window. Erase completes right at the window boundary.
                </div>
              </button>
            </div>

            {/* Duration Input Fields */}
            {staged.timing.policy === 'hold_then_erase' ? (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[var(--color-muted)] mb-1">
                    Hold Duration (sec)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    max="60"
                    value={staged.timing.holdMs / 1000}
                    onChange={(e) => {
                      const val = Math.max(1, parseFloat(e.target.value) || 1);
                      onUpdateStaged({
                        timing: {
                          policy: 'hold_then_erase',
                          holdMs: Math.round(val * 1000),
                          eraseMs: (staged.timing as any).eraseMs || 1000,
                        },
                      });
                    }}
                    className="touch-target w-full px-3 py-2 border border-[var(--color-control-border)] rounded-[var(--radius-sm)] text-sm bg-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--color-muted)] mb-1">
                    Erase Duration (sec)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    max="10"
                    value={staged.timing.eraseMs / 1000}
                    onChange={(e) => {
                      const val = Math.max(0.5, parseFloat(e.target.value) || 0.5);
                      onUpdateStaged({
                        timing: {
                          policy: 'hold_then_erase',
                          holdMs: (staged.timing as any).holdMs || 3000,
                          eraseMs: Math.round(val * 1000),
                        },
                      });
                    }}
                    className="touch-target w-full px-3 py-2 border border-[var(--color-control-border)] rounded-[var(--radius-sm)] text-sm bg-white font-mono"
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[var(--color-muted)] mb-1">
                    Total Window (sec)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="1.5"
                    max="60"
                    value={staged.timing.totalMs / 1000}
                    onChange={(e) => {
                      const val = Math.max(1.5, parseFloat(e.target.value) || 1.5);
                      const erase = (staged.timing as any).eraseMs || 1000;
                      onUpdateStaged({
                        timing: {
                          policy: 'erase_within_window',
                          totalMs: Math.round(val * 1000),
                          eraseMs: Math.min(erase, Math.round(val * 1000)),
                        },
                      });
                    }}
                    className="touch-target w-full px-3 py-2 border border-[var(--color-control-border)] rounded-[var(--radius-sm)] text-sm bg-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--color-muted)] mb-1">
                    Final Erase (sec)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    max="10"
                    value={staged.timing.eraseMs / 1000}
                    onChange={(e) => {
                      const val = Math.max(0.5, parseFloat(e.target.value) || 0.5);
                      const total = (staged.timing as any).totalMs || 3000;
                      onUpdateStaged({
                        timing: {
                          policy: 'erase_within_window',
                          totalMs: total,
                          eraseMs: Math.min(total, Math.round(val * 1000)),
                        },
                      });
                    }}
                    className="touch-target w-full px-3 py-2 border border-[var(--color-control-border)] rounded-[var(--radius-sm)] text-sm bg-white font-mono"
                  />
                </div>
              </div>
            )}

            {/* Effective Breakdown Badges */}
            <div className="p-3 bg-[var(--color-surface-container)] rounded-[var(--radius-sm)] border border-[var(--color-border)] flex items-center justify-between text-xs font-mono">
              <div>
                <span className="text-[var(--color-muted)]">Effective Hold: </span>
                <strong className="text-[var(--color-ink)]">{(durations.holdMs / 1000).toFixed(1)}s</strong>
              </div>
              <div>
                <span className="text-[var(--color-muted)]">Erase: </span>
                <strong className="text-[var(--color-ink)]">{(durations.eraseMs / 1000).toFixed(1)}s</strong>
              </div>
              <div>
                <span className="text-[var(--color-muted)]">Total: </span>
                <strong className="text-[var(--color-accent)]">{(durations.totalMs / 1000).toFixed(1)}s</strong>
              </div>
            </div>
          </section>

          {/* Reading Guide & Eraser Effects */}
          <section className="bg-[var(--color-card)] rounded-[var(--radius-md)] p-6 border border-[var(--color-border)] shadow-xs space-y-5">
            <h3 className="font-serif text-lg font-bold text-[var(--color-ink)] flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[var(--color-accent)]" />
              3. Visual Effects
            </h3>

            {/* Independent Guide Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-[var(--color-ink)]">Moving Reading Guide Cue</div>
                <div className="text-xs text-[var(--color-muted)]">Subtle red underlining pacing the eye across lines</div>
              </div>
              <button
                type="button"
                onClick={() => onUpdateStaged({ guideEnabled: !staged.guideEnabled })}
                className={`touch-target relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  staged.guideEnabled ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-control-border)]'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    staged.guideEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Eraser Effect Selector */}
            <div className="space-y-2 pt-2 border-t border-[var(--color-border)]">
              <label className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
                Eraser Style
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'eraser', label: 'Opaque Eraser' },
                  { id: 'dissolve', label: 'Soft Dissolve' },
                  { id: 'none', label: 'Instant Blank' },
                ].map((eff) => (
                  <button
                    key={eff.id}
                    type="button"
                    onClick={() => onUpdateStaged({ eraserEffect: eff.id as EraserEffectType })}
                    className={`touch-target py-2 px-3 text-xs font-semibold rounded-[var(--radius-sm)] border text-center transition-all ${
                      staged.eraserEffect === eff.id
                        ? 'bg-[var(--color-accent)] text-white border-[var(--color-accent)] shadow-xs'
                        : 'border-[var(--color-control-border)] text-[var(--color-ink)] hover:bg-[var(--color-paper)]'
                    }`}
                  >
                    {eff.label}
                  </button>
                ))}
              </div>
            </div>
          </section>
        </div>

        {/* Right Column: Private Live Animation Preview */}
        <div className="space-y-6">
          <section className="bg-[var(--color-card)] rounded-[var(--radius-md)] p-6 border border-[var(--color-border)] shadow-xs flex flex-col justify-between h-full space-y-6">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border)]">
                <div className="flex items-center space-x-2">
                  <Wand2 className="w-5 h-5 text-[var(--color-accent)]" />
                  <h3 className="font-serif text-lg font-bold text-[var(--color-ink)]">Private Dynamic Preview</h3>
                </div>
                <div className="text-xs font-mono px-2.5 py-1 rounded-[var(--radius-sm)] bg-[var(--color-surface-container)] text-[var(--color-muted)]">
                  Isolated from Classroom
                </div>
              </div>
              <p className="text-xs text-[var(--color-muted)] mt-2">
                Simulate how learners will experience this exact timing and effect configuration before presentation.
              </p>
            </div>

            {/* Preview Reading Canvas */}
            <div className="paper-canvas p-8 rounded-[var(--radius-md)] border border-[var(--color-border)] relative min-h-[260px] flex items-center justify-center overflow-hidden">
              {/* Phase status indicator */}
              <div className="absolute top-3 left-3 text-[11px] font-mono px-2 py-0.5 rounded-[var(--radius-sm)] bg-white/80 border border-[var(--color-border)] text-[var(--color-muted)]">
                Phase: <strong className="text-[var(--color-ink)] capitalize">{previewDerived.phase}</strong>
                {previewDerived.phase === 'erasing' && ` (${Math.round(previewDerived.maskProgress * 100)}%)`}
              </div>

              {previewDerived.isTextVisible ? (
                <div className="relative inline-block max-w-xl text-center">
                  <div
                    className={`font-serif text-2xl text-[var(--color-ink)] leading-relaxed relative ${
                      staged.guideEnabled && previewRunning ? 'reading-guide' : ''
                    }`}
                  >
                    {staged.highlightEnabled ? (
                      <span>
                        <mark className="phrase-highlight">Long story short</mark>
                        , we decided to <mark className="phrase-highlight">give it a shot</mark>.
                      </span>
                    ) : (
                      previewSampleText
                    )}

                    {/* Opaque line eraser mask */}
                    {staged.eraserEffect === 'eraser' && previewDerived.phase === 'erasing' && (
                      <div
                        className="absolute inset-0 bg-[var(--color-paper)] pointer-events-none transition-all"
                        style={{
                          left: 0,
                          width: `${previewDerived.maskProgress * 100}%`,
                          borderRight: '3px solid var(--color-accent)',
                        }}
                      />
                    )}

                    {/* Soft dissolve effect */}
                    {staged.eraserEffect === 'dissolve' && previewDerived.phase === 'erasing' && (
                      <div
                        className="absolute inset-0 bg-[var(--color-paper)] pointer-events-none transition-opacity"
                        style={{
                          opacity: previewDerived.maskProgress,
                        }}
                      />
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center text-[var(--color-muted)] text-sm font-serif">
                  — Text cleared (Blank waiting paper) —
                </div>
              )}
            </div>

            {/* Animation Preview Controls */}
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={handleStartSamplePreview}
                  disabled={previewRunning}
                  className={`touch-target px-4 py-2 rounded-[var(--radius-sm)] text-xs font-semibold flex items-center space-x-1.5 transition-all ${
                    previewRunning
                      ? 'bg-[var(--color-surface-container)] text-[var(--color-muted)] cursor-not-allowed'
                      : 'bg-[var(--color-accent)] text-white hover:opacity-95 shadow-xs'
                  }`}
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>{previewRunning ? 'Playing...' : 'Play Test Run'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleResetSamplePreview}
                  className="touch-target px-3 py-2 rounded-[var(--radius-sm)] border border-[var(--color-control-border)] text-xs font-medium text-[var(--color-ink)] hover:bg-[var(--color-paper)] flex items-center space-x-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset</span>
                </button>
              </div>

              <div className="text-xs font-mono text-[var(--color-muted)]">
                Elapsed: {((previewDerived.elapsedMs || 0) / 1000).toFixed(1)}s / {(durations.totalMs / 1000).toFixed(1)}s
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
