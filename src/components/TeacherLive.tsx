import React, { useState, useEffect } from 'react';
import { 
  Play, Pause, RotateCcw, Eye, EyeOff, SkipBack, SkipForward, 
  Users, Radio, BookOpen, Clock, AlertCircle, CheckCircle2, ArrowRight
} from 'lucide-react';
import type { RoomState, Article, StagedSettings, ArticleUnit } from '../types';
import { computeReadingPhase, getEffectiveDurations } from '../domain/timing';
import { sliceTextWithApprovedAnnotations } from '../domain/annotations';

interface TeacherLiveProps {
  roomState: RoomState;
  articles: Article[];
  currentArticle: Article;
  onSelectArticle: (articleId: string) => void;
  onUpdateStaged: (partial: Partial<StagedSettings>) => void;
  onApplyToRoom: () => void;
  onPlay: () => void;
  onPause: () => void;
  onResume: () => void;
  onShow: () => void;
  onHide: () => void;
  onEndRoom: () => void;
}

export const TeacherLive: React.FC<TeacherLiveProps> = ({
  roomState,
  articles,
  currentArticle,
  onSelectArticle,
  onUpdateStaged,
  onApplyToRoom,
  onPlay,
  onPause,
  onResume,
  onShow,
  onHide,
  onEndRoom,
}) => {
  const staged = roomState.staged;
  const activeUnits = roomState.unitMode === 'sentence' ? currentArticle.sentences : currentArticle.paragraphs;
  const stagedUnits = staged.unitMode === 'sentence' ? currentArticle.sentences : currentArticle.paragraphs;

  const currentActiveUnit = activeUnits[roomState.unitIndex] || activeUnits[0];
  const stagedUnit = stagedUnits[staged.unitIndex] || stagedUnits[0];

  // Tick for rendering current live phase in teacher preview
  const [clientNow, setClientNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setClientNow(Date.now()), 50);
    return () => clearInterval(timer);
  }, []);

  const derivedPhase = computeReadingPhase(
    {
      status: roomState.status,
      startedAt: roomState.startedAt,
      pausedElapsedMs: roomState.pausedElapsedMs,
      timing: roomState.timing,
    },
    clientNow
  );

  const durations = getEffectiveDurations(roomState.timing);

  // Private unit navigation
  const handleSelectUnitPrivately = (newIndex: number) => {
    if (newIndex >= 0 && newIndex < stagedUnits.length) {
      onUpdateStaged({ unitIndex: newIndex });
    }
  };

  const hasUnappliedUnit = staged.unitIndex !== roomState.unitIndex || staged.articleId !== roomState.articleId;

  // Render highlighted text for the unit
  const segments = sliceTextWithApprovedAnnotations(
    currentActiveUnit ? currentActiveUnit.text : '',
    roomState.highlightEnabled ? currentActiveUnit?.annotations || [] : []
  );

  return (
    <div className="space-y-6">
      {/* Top Status & Live Action Bar */}
      <div className="bg-[var(--color-card)] p-5 rounded-[var(--radius-md)] border border-[var(--color-border)] shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-[var(--radius-sm)] bg-[var(--color-surface-container)] border border-[var(--color-border)] text-xs font-mono">
            <Radio className="w-3.5 h-3.5 text-[var(--color-accent)] animate-pulse" />
            <span className="text-[var(--color-muted)]">Room:</span>
            <strong className="text-[var(--color-ink)]">{roomState.code}</strong>
          </div>

          <div className="flex items-center space-x-2 text-xs">
            <span className="text-[var(--color-muted)]">Status:</span>
            <span className={`px-2 py-0.5 rounded-[var(--radius-sm)] font-semibold uppercase tracking-wider text-[11px] ${
              roomState.status === 'reading' 
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                : roomState.status === 'paused'
                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                : roomState.status === 'manual_show'
                ? 'bg-blue-100 text-blue-800 border border-blue-300'
                : 'bg-[var(--color-surface-container)] text-[var(--color-muted)] border border-[var(--color-border)]'
            }`}>
              {roomState.status}
            </span>
          </div>

          <div className="flex items-center space-x-1.5 text-xs text-[var(--color-muted)]">
            <Users className="w-3.5 h-3.5" />
            <span>Learners Connected: <strong className="text-[var(--color-ink)] font-mono">1</strong></span>
          </div>
        </div>

        {/* Playback Primary Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {roomState.status === 'reading' ? (
            <button
              type="button"
              onClick={onPause}
              className="touch-target px-4 py-2 rounded-[var(--radius-sm)] bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold uppercase tracking-wider flex items-center space-x-1.5 shadow-xs"
            >
              <Pause className="w-4 h-4" />
              <span>Pause</span>
            </button>
          ) : roomState.status === 'paused' ? (
            <button
              type="button"
              onClick={onResume}
              className="touch-target px-4 py-2 rounded-[var(--radius-sm)] bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold uppercase tracking-wider flex items-center space-x-1.5 shadow-xs"
            >
              <Play className="w-4 h-4" />
              <span>Resume</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onPlay}
              className="touch-target px-4 py-2 rounded-[var(--radius-sm)] bg-[var(--color-accent)] hover:opacity-95 text-white text-xs font-bold uppercase tracking-wider flex items-center space-x-1.5 shadow-xs"
            >
              <Play className="w-4 h-4" />
              <span>{derivedPhase.phase === 'blank' ? 'Replay' : 'Play Turn'}</span>
            </button>
          )}

          {/* Show / Hide Manual Toggle */}
          {roomState.status === 'manual_show' ? (
            <button
              type="button"
              onClick={onHide}
              className="touch-target px-3.5 py-2 rounded-[var(--radius-sm)] border border-[var(--color-control-border)] text-xs font-semibold text-[var(--color-ink)] hover:bg-[var(--color-paper)] flex items-center space-x-1.5"
            >
              <EyeOff className="w-3.5 h-3.5" />
              <span>Hide (Clear)</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onShow}
              className="touch-target px-3.5 py-2 rounded-[var(--radius-sm)] border border-[var(--color-control-border)] text-xs font-semibold text-[var(--color-ink)] hover:bg-[var(--color-paper)] flex items-center space-x-1.5"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Show (Manual)</span>
            </button>
          )}

          {/* End Room */}
          <button
            type="button"
            onClick={onEndRoom}
            className="touch-target px-3 py-2 rounded-[var(--radius-sm)] text-xs font-semibold text-[var(--color-error)] hover:bg-[var(--color-accent-soft)] transition-all"
          >
            End Room
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Private Unit Selection & Staging */}
        <div className="space-y-6">
          <div className="bg-[var(--color-card)] p-5 rounded-[var(--radius-md)] border border-[var(--color-border)] shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-base font-bold text-[var(--color-ink)] flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[var(--color-accent)]" />
                Select Resource
              </h3>
              <span className="text-xs text-[var(--color-muted)] font-mono">{articles.length} available</span>
            </div>

            <div className="space-y-2">
              {articles.map((art) => (
                <button
                  key={art.id}
                  type="button"
                  onClick={() => {
                    onSelectArticle(art.id);
                    onUpdateStaged({ articleId: art.id, unitIndex: 0 });
                  }}
                  className={`w-full text-left p-3 rounded-[var(--radius-sm)] border text-xs transition-all ${
                    art.id === staged.articleId
                      ? 'border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-[var(--color-ink)] font-semibold'
                      : 'border-[var(--color-border)] hover:bg-[var(--color-paper)] text-[var(--color-muted)]'
                  }`}
                >
                  <div className="font-serif text-sm font-bold text-[var(--color-ink)] line-clamp-1">{art.title}</div>
                  <div className="text-[11px] text-[var(--color-muted)] mt-0.5">{art.author} • {art.category}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Private Unit Stepper */}
          <div className="bg-[var(--color-card)] p-5 rounded-[var(--radius-md)] border border-[var(--color-border)] shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted)]">
                Private Unit Staging
              </h4>
              <span className="text-xs font-mono text-[var(--color-ink)]">
                Unit {staged.unitIndex + 1} of {stagedUnits.length}
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => handleSelectUnitPrivately(staged.unitIndex - 1)}
                disabled={staged.unitIndex <= 0}
                className="touch-target p-2 rounded-[var(--radius-sm)] border border-[var(--color-control-border)] disabled:opacity-40 hover:bg-[var(--color-paper)]"
                title="Previous Unit"
              >
                <SkipBack className="w-4 h-4 text-[var(--color-ink)]" />
              </button>

              <div className="flex-1 text-center font-mono text-xs px-2 py-1.5 bg-[var(--color-surface-container)] rounded-[var(--radius-sm)] border border-[var(--color-border)]">
                {staged.unitMode === 'sentence' ? 'Sentence' : 'Paragraph'} #{staged.unitIndex + 1}
              </div>

              <button
                type="button"
                onClick={() => handleSelectUnitPrivately(staged.unitIndex + 1)}
                disabled={staged.unitIndex >= stagedUnits.length - 1}
                className="touch-target p-2 rounded-[var(--radius-sm)] border border-[var(--color-control-border)] disabled:opacity-40 hover:bg-[var(--color-paper)]"
                title="Next Unit"
              >
                <SkipForward className="w-4 h-4 text-[var(--color-ink)]" />
              </button>
            </div>

            {/* Apply Unit Button */}
            {hasUnappliedUnit && (
              <button
                type="button"
                onClick={onApplyToRoom}
                className="touch-target w-full py-2.5 px-4 rounded-[var(--radius-sm)] bg-[var(--color-accent)] text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center space-x-2 shadow-xs"
              >
                <span>Apply Staged Unit to Room</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Center Column: Full Source Article View (Teacher Reference Only) */}
        <div className="lg:col-span-1 bg-[var(--color-card)] p-5 rounded-[var(--radius-md)] border border-[var(--color-border)] shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[var(--color-border)]">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted)]">
              Teacher Full Source
            </h4>
            <span className="text-[11px] text-[var(--color-muted)]">Private reference</span>
          </div>

          <div className="space-y-3 max-h-[460px] overflow-y-auto pr-2 text-sm leading-relaxed font-serif text-[var(--color-ink)]">
            {stagedUnits.map((u, idx) => (
              <div
                key={u.id}
                onClick={() => handleSelectUnitPrivately(idx)}
                className={`p-2.5 rounded-[var(--radius-sm)] cursor-pointer transition-all ${
                  idx === staged.unitIndex
                    ? 'bg-[var(--color-accent-soft)] border-l-4 border-[var(--color-accent)] font-medium'
                    : idx === roomState.unitIndex
                    ? 'bg-[var(--color-surface-container)] border-l-4 border-[var(--color-control-border)]'
                    : 'hover:bg-[var(--color-paper)]'
                }`}
              >
                <span className="text-xs font-mono text-[var(--color-muted)] mr-2">[{idx + 1}]</span>
                {u.text}
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Live Learner Preview */}
        <div className="lg:col-span-1 bg-[var(--color-card)] p-5 rounded-[var(--radius-md)] border border-[var(--color-border)] shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-[var(--color-border)]">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted)]">
                Live Learner View
              </h4>
              <div className="text-[11px] font-mono px-2 py-0.5 rounded-[var(--radius-sm)] bg-[var(--color-surface-container)] text-[var(--color-ink)]">
                Phase: <strong className="capitalize">{derivedPhase.phase}</strong>
              </div>
            </div>

            {/* Reading Box Canvas */}
            <div className="mt-4 paper-canvas p-6 rounded-[var(--radius-md)] border border-[var(--color-border)] min-h-[220px] flex items-center justify-center text-center relative overflow-hidden">
              {derivedPhase.isTextVisible ? (
                <div className="relative inline-block max-w-sm">
                  <p
                    className={`font-serif text-lg leading-relaxed text-[var(--color-ink)] relative ${
                      roomState.guideEnabled && roomState.status === 'reading' ? 'reading-guide' : ''
                    }`}
                  >
                    {segments.map((seg, sIdx) =>
                      seg.isHighlight ? (
                        <mark key={sIdx} className="phrase-highlight">
                          {seg.text}
                        </mark>
                      ) : (
                        <span key={sIdx}>{seg.text}</span>
                      )
                    )}
                  </p>

                  {/* Eraser effect mask */}
                  {roomState.eraserEffect === 'eraser' && derivedPhase.phase === 'erasing' && (
                    <div
                      className="absolute inset-0 bg-[var(--color-paper)] pointer-events-none"
                      style={{
                        left: 0,
                        width: `${derivedPhase.maskProgress * 100}%`,
                        borderRight: '3px solid var(--color-accent)',
                      }}
                    />
                  )}

                  {/* Dissolve effect */}
                  {roomState.eraserEffect === 'dissolve' && derivedPhase.phase === 'erasing' && (
                    <div
                      className="absolute inset-0 bg-[var(--color-paper)] pointer-events-none"
                      style={{
                        opacity: derivedPhase.maskProgress,
                      }}
                    />
                  )}
                </div>
              ) : (
                <div className="text-xs font-serif text-[var(--color-muted)]">
                  — Blank waiting paper —
                </div>
              )}
            </div>
          </div>

          {/* Timing details */}
          <div className="text-xs font-mono text-[var(--color-muted)] p-2.5 bg-[var(--color-surface-container)] rounded-[var(--radius-sm)] border border-[var(--color-border)] flex items-center justify-between">
            <span>Elapsed: {((derivedPhase.elapsedMs || 0) / 1000).toFixed(1)}s</span>
            <span>Policy: {roomState.timing.policy === 'hold_then_erase' ? 'Hold Then Erase' : 'Within Window'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
