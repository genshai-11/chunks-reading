import React, { useState, useEffect } from 'react';
import { AlertCircle, Radio } from 'lucide-react';
import type { LearnerRoomSnapshot } from '../services/roomService';
import { computeReadingPhase } from '../domain/timing';
import { sliceTextWithApprovedAnnotations } from '../domain/annotations';

interface StudentViewProps {
  snapshot: LearnerRoomSnapshot;
  articleTitle?: string;
}

export const StudentView: React.FC<StudentViewProps> = ({ snapshot, articleTitle = 'Classroom Reading' }) => {
  const [clientNow, setClientNow] = useState(Date.now());

  // High-frequency tick for smooth phase & mask derivation
  useEffect(() => {
    const timer = setInterval(() => setClientNow(Date.now()), 25);
    return () => clearInterval(timer);
  }, []);

  // Authoritative phase derived from server timestamps and client offset
  const derivedPhase = computeReadingPhase(
    {
      status: snapshot.status,
      startedAt: snapshot.startedAt,
      pausedElapsedMs: snapshot.pausedElapsedMs,
      timing: snapshot.timing,
    },
    clientNow
  );

  // Slice current unit text with approved annotations ONLY
  const segments = sliceTextWithApprovedAnnotations(
    snapshot.currentUnitText || '',
    snapshot.annotations || []
  );

  return (
    <div className="w-full min-h-[calc(100vh-140px)] flex flex-col justify-between px-4 sm:px-8 py-6 max-w-5xl mx-auto">
      {/* Discreet Ambient Status Bar (Outside Reading Field) */}
      <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border)] text-xs text-[var(--color-muted)] font-mono">
        <div className="flex items-center space-x-2">
          <Radio className="w-3.5 h-3.5 text-[var(--color-accent)] animate-pulse" />
          <span>Room: <strong className="text-[var(--color-ink)]">{snapshot.code}</strong></span>
          <span className="text-gray-300">•</span>
          <span>
            {snapshot.unitMode === 'sentence' ? 'Sentence' : 'Paragraph'} {snapshot.unitIndex + 1} of {snapshot.totalUnits}
          </span>
        </div>

        <div className="flex items-center space-x-2">
          {snapshot.status === 'paused' && (
            <span className="inline-flex items-center space-x-1 text-amber-800 bg-amber-100 px-2 py-0.5 rounded-[var(--radius-sm)] border border-amber-200">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Teacher paused</span>
            </span>
          )}
          {derivedPhase.phase === 'hold' && (
            <span className="text-[var(--color-muted)]">Reading...</span>
          )}
          {derivedPhase.phase === 'erasing' && (
            <span className="text-[var(--color-accent)]">Finishing unit...</span>
          )}
          {derivedPhase.phase === 'blank' && (
            <span className="text-[var(--color-muted)]">Unit finished</span>
          )}
          {snapshot.status === 'manual_show' && (
            <span className="text-blue-800 bg-blue-50 px-2 py-0.5 rounded-[var(--radius-sm)] border border-blue-200">
              Teacher explanation
            </span>
          )}
          {snapshot.status === 'waiting' && (
            <span className="text-[var(--color-muted)]">Waiting for teacher...</span>
          )}
        </div>
      </div>

      {/* Primary Reading Canvas — Viewport-filling, quiet, paper-textured */}
      <main className="my-auto py-16 px-6 sm:px-14 rounded-[var(--radius-md)] paper-canvas border border-[var(--color-border)] shadow-xs relative flex items-center justify-center min-h-[380px] overflow-hidden">
        {derivedPhase.isTextVisible ? (
          <div className="w-full text-center relative max-w-3xl">
            {/* Literata Reading Text */}
            <div
              className={`font-serif text-2xl sm:text-4xl text-[var(--color-ink)] leading-[1.7] relative inline-block text-balance transition-all ${
                snapshot.guideEnabled && snapshot.status === 'reading' ? 'reading-guide' : ''
              }`}
            >
              {segments.map((seg, idx) =>
                seg.isHighlight ? (
                  <mark key={idx} className="phrase-highlight">
                    {seg.text}
                  </mark>
                ) : (
                  <span key={idx}>{seg.text}</span>
                )
              )}

              {/* Opaque line eraser mask */}
              {snapshot.eraserEffect === 'eraser' && derivedPhase.phase === 'erasing' && (
                <div
                  className="absolute inset-0 bg-[var(--color-paper)] pointer-events-none transition-all"
                  style={{
                    left: 0,
                    width: `${derivedPhase.maskProgress * 100}%`,
                    borderRight: '3px solid var(--color-accent)',
                  }}
                />
              )}

              {/* Soft dissolve mask */}
              {snapshot.eraserEffect === 'dissolve' && derivedPhase.phase === 'erasing' && (
                <div
                  className="absolute inset-0 bg-[var(--color-paper)] pointer-events-none transition-opacity"
                  style={{
                    opacity: derivedPhase.maskProgress,
                  }}
                />
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-12 space-y-2">
            <div className="font-serif text-lg text-[var(--color-muted)] italic">
              {snapshot.status === 'ended' 
                ? 'Session ended by teacher.' 
                : 'Eyes on the teacher. Waiting for the next unit...'}
            </div>
          </div>
        )}
      </main>

      {/* Discrete Bottom Attribution (No Leakage of Future Text or Unapproved Annotations) */}
      <div className="pt-3 border-t border-[var(--color-border)] flex items-center justify-between text-xs text-[var(--color-muted)]">
        <div>
          <span className="font-serif font-semibold text-[var(--color-ink)]">{articleTitle}</span>
        </div>
        <div className="text-[11px] font-mono">
          CHUNKS Interactive Reading
        </div>
      </div>
    </div>
  );
};
