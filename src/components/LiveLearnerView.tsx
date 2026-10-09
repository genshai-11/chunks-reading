/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DustDirectionControl } from './DustDirectionControl';
import { ERASE_EFFECT_OPTIONS, DEFAULT_DUST_ANGLE } from '../utils/eraseEffects';
import { ReadingUnitText } from './ReadingUnitText';
import { ReadingCountdown } from './ReadingCountdown';
import React, { useState, useEffect, useRef } from 'react';
import { ClassroomRoom, CalculatedTimeline, ApprovedSpan, RoomParticipant, EraseEffect, EraseSchedule } from '../types';
import { getSyncedRoomTimeline } from '../services/roomClock';
import { getSequentialTiming } from '../utils/readingTiming';
import { useRoomClock } from './useRoomClock';

import {
  Smartphone,
  Monitor,
  Copy,
  Check,
  ExternalLink,
  Users,
  Clock,
  Sparkles,
  Play,
  RotateCcw,
  StopCircle,
  X,
  Sliders,
  Timer
} from 'lucide-react';

interface LiveLearnerViewProps {
  room: ClassroomRoom;
  participants: RoomParticipant[];
  onClose?: () => void;
  stagedEraseEffect?: EraseEffect;
  stagedDustAngle?: number;
  onSelectDustAngle?: (angle: number) => void;
  onSelectEraseEffect?: (effect: EraseEffect) => void;
  stagedHoldMs?: number;
  stagedEraseMs?: number;
  stagedEraseSchedule?: EraseSchedule;
  onSelectEraseSchedule?: (schedule: EraseSchedule) => void;
}
export const LiveLearnerView: React.FC<LiveLearnerViewProps> = ({
  room,
  participants,
  onClose,
  stagedEraseEffect,
  stagedDustAngle = DEFAULT_DUST_ANGLE,
  onSelectDustAngle,
  onSelectEraseEffect,
  stagedHoldMs = 3000,
  stagedEraseMs = 1000,
  stagedEraseSchedule = 'after_reading',
  onSelectEraseSchedule,
}) => {
  const [viewMode, setViewMode] = useState<'mobile' | 'desktop'>('desktop');
  const [copiedLink, setCopiedLink] = useState(false);
  const [activeTooltip, setActiveTooltip] = useState<ApprovedSpan | null>(null);

  // Local effect selection for previewing & testing
  const [activeEffect, setActiveEffect] = useState<EraseEffect>(
    stagedEraseEffect || room.eraseEffect || 'vaporize'
  );

  // Sync when prop changes
  useEffect(() => {
    if (stagedEraseEffect) {
      setActiveEffect(stagedEraseEffect);
    }
  }, [stagedEraseEffect]);

  // Local erase schedule selection for previewing & testing
  const [activeSchedule, setActiveSchedule] = useState<EraseSchedule>(
    stagedEraseSchedule || room.eraseSchedule || 'after_reading'
  );

  useEffect(() => {
    if (stagedEraseSchedule) {
      setActiveSchedule(stagedEraseSchedule);
    }
  }, [stagedEraseSchedule]);

  // Simulation state
  const [isSimulating, setIsSimulating] = useState(false);
  const [simTimeline, setSimTimeline] = useState<CalculatedTimeline>({
    phase: 'idle',
    progress: 0,
    remainingMs: 0,
    totalDurationMs: stagedHoldMs + stagedEraseMs,
    effectiveHoldMs: stagedHoldMs,
    effectiveEraseMs: stagedEraseMs,
    elapsedMs: 0,
  });

  const simStartTimeRef = useRef<number>(0);

  // Simulation animation loop
  useEffect(() => {
    if (!isSimulating) return;

    simStartTimeRef.current = performance.now();
    let animId: number;

    const simLoop = (now: number) => {
      const unitText = room.currentUnit?.text || '';

      if (activeSchedule === 'word_groups') {
        const seqTiming = getSequentialTiming(
          {
            wordsPerSecond: room.wordsPerSecond,
            timingMode: room.timingMode,
            holdDurationMs: stagedHoldMs,
            eraseDurationMs: stagedEraseMs,
          },
          unitText
        );
        const totalSimDuration = seqTiming.totalMs + 1200; // includes 1.2s blank pause
        const elapsed = (now - simStartTimeRef.current) % totalSimDuration;

        if (elapsed < seqTiming.totalMs) {
          const progress = Math.min(1, elapsed / Math.max(1, seqTiming.totalMs));
          setSimTimeline({
            phase: elapsed < seqTiming.readingMs ? 'hold' : 'erase',
            progress,
            remainingMs: Math.max(0, seqTiming.totalMs - elapsed),
            totalDurationMs: seqTiming.totalMs,
            effectiveHoldMs: seqTiming.readingMs,
            effectiveEraseMs: seqTiming.lagMs,
            elapsedMs: elapsed,
          });
        } else {
          setSimTimeline({
            phase: 'blank_finished',
            progress: 1,
            remainingMs: 0,
            totalDurationMs: seqTiming.totalMs,
            effectiveHoldMs: seqTiming.readingMs,
            effectiveEraseMs: seqTiming.lagMs,
            elapsedMs: elapsed,
          });
        }
      } else {
        const totalSimDuration = stagedHoldMs + stagedEraseMs + 1200; // includes 1.2s blank pause
        const elapsed = (now - simStartTimeRef.current) % totalSimDuration;

        if (elapsed < stagedHoldMs) {
          // Hold phase
          setSimTimeline({
            phase: 'hold',
            progress: 0,
            remainingMs: stagedHoldMs - elapsed,
            totalDurationMs: stagedHoldMs + stagedEraseMs,
            effectiveHoldMs: stagedHoldMs,
            effectiveEraseMs: stagedEraseMs,
            elapsedMs: elapsed,
          });
        } else if (elapsed < stagedHoldMs + stagedEraseMs) {
          // Erase phase
          const eraseElapsed = elapsed - stagedHoldMs;
          const progress = Math.min(1, eraseElapsed / stagedEraseMs);
          setSimTimeline({
            phase: 'erase',
            progress,
            remainingMs: stagedEraseMs - eraseElapsed,
            totalDurationMs: stagedHoldMs + stagedEraseMs,
            effectiveHoldMs: stagedHoldMs,
            effectiveEraseMs: stagedEraseMs,
            elapsedMs: elapsed,
          });
        } else {
          // Finished blank phase
          setSimTimeline({
            phase: 'blank_finished',
            progress: 1,
            remainingMs: 0,
            totalDurationMs: stagedHoldMs + stagedEraseMs,
            effectiveHoldMs: stagedHoldMs,
            effectiveEraseMs: stagedEraseMs,
            elapsedMs: elapsed,
          });
        }
      }

      animId = requestAnimationFrame(simLoop);
    };

    animId = requestAnimationFrame(simLoop);
    return () => cancelAnimationFrame(animId);
  }, [isSimulating, stagedHoldMs, stagedEraseMs, activeSchedule, room.wordsPerSecond, room.timingMode, room.currentUnit?.text]);

  useRoomClock(room.id);
  // Live timeline synced with classroom room when NOT simulating
  const [liveTimeline, setLiveTimeline] = useState<CalculatedTimeline>({
    phase: 'idle',
    progress: 0,
    remainingMs: 0,
    totalDurationMs: 4000,
    effectiveHoldMs: room.holdDurationMs || 3000,
    effectiveEraseMs: room.eraseDurationMs || 1000,
    elapsedMs: 0,
  });

  useEffect(() => {
    if (isSimulating) return;

    let animId: number;
    const tick = () => {
      const calculated = getSyncedRoomTimeline(room);
      setLiveTimeline(calculated);
      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [room, isSimulating]);

  // Active timeline is simulation if simulating, otherwise live room timeline
  const activeTimeline = isSimulating ? simTimeline : liveTimeline;

  const currentUnit = room.currentUnit;
  const approvedSpans =
    room.highlightEnabled && currentUnit?.annotations ? currentUnit.annotations : [];


  const isTextVisible =
    activeTimeline.phase === 'hold' ||
    activeTimeline.phase === 'erase' ||
    activeTimeline.phase === 'paused' ||
    activeTimeline.phase === 'manual_show';

  const shareUrl = `${window.location.origin}/student?room=${room.id}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    });
  };

  const handleSelectEffect = (eff: EraseEffect) => {
    setActiveEffect(eff);
    if (onSelectEraseEffect) {
      onSelectEraseEffect(eff);
    }
  };

  const handleSelectSchedule = (sched: EraseSchedule) => {
    setActiveSchedule(sched);
    if (onSelectEraseSchedule) {
      onSelectEraseSchedule(sched);
    }
    if (isSimulating) {
      simStartTimeRef.current = performance.now();
    }
  };

  const handleToggleSimulation = () => {
    if (!isSimulating) {
      simStartTimeRef.current = performance.now();
      setIsSimulating(true);
    } else {
      setIsSimulating(false);
    }
  };

  const handleRestartSimulation = () => {
    simStartTimeRef.current = performance.now();
    setIsSimulating(true);
  };

  const isFullReview = activeTimeline.phase === 'manual_show' && Boolean(room.isFullReview || currentUnit?.isFullReview);
  const unitLabel = currentUnit?.granularity === 'paragraph' ? 'Paragraph' : 'Sentence';

  return (
    <div className="neo-box bg-white p-3.5 sm:p-4 border-2 border-black space-y-3">
      {/* Header bar of Live Learner View */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-black pb-2.5">
        <div className="flex items-center gap-2">
          <div
            className={`w-3 h-3 border border-black inline-block ${
              isSimulating ? 'bg-[#FFE500] animate-bounce' : 'bg-[#4ADE80] animate-pulse'
            }`}
          ></div>
          <div>
            <h3 className="text-xs sm:text-sm font-black uppercase tracking-tight text-black flex items-center gap-1.5">
              Live Learner View
              {isSimulating ? (
                <span className="neo-badge bg-[#FFE500] text-black text-[9px] py-0 px-1.5 font-mono font-bold">
                  🧪 Local simulation mode (Does not affect students)
                </span>
              ) : (
                <span className="neo-badge bg-[#4ADE80] text-black text-[9px] py-0 px-1 font-mono">
                  Real-time student view
                </span>
              )}
            </h3>
          </div>
        </div>

        {/* Viewport switch & tools */}
        <div className="flex items-center gap-1.5">
          <div className="inline-flex border border-black bg-[#FAF8F0] p-0.5 shadow-[1px_1px_0px_#000]">
            <button
              type="button"
              onClick={() => setViewMode('desktop')}
              className={`px-2 py-0.5 text-[10px] font-mono font-bold uppercase flex items-center gap-1 ${
                viewMode === 'desktop' ? 'bg-black text-white' : 'text-neutral-700 hover:text-black'
              }`}
              title="View Desktop / Laptop size"
            >
              <Monitor size={11} /> Desktop
            </button>
            <button
              type="button"
              onClick={() => setViewMode('mobile')}
              className={`px-2 py-0.5 text-[10px] font-mono font-bold uppercase flex items-center gap-1 ${
                viewMode === 'mobile' ? 'bg-black text-white' : 'text-neutral-700 hover:text-black'
              }`}
              title="View Mobile phone size"
            >
              <Smartphone size={11} /> Mobile
            </button>
          </div>

          <button
            type="button"
            onClick={handleCopyLink}
            className="neo-btn-sm px-2 py-0.5 bg-[#FFE500] text-black text-[11px] font-bold font-mono flex items-center gap-1"
            title="Copy student join link (no sign-in required)"
          >
            {copiedLink ? <Check size={11} className="text-green-700" /> : <Copy size={11} />}
            <span>{copiedLink ? 'Copied!' : 'Copy Link'}</span>
          </button>

          <a
            href={shareUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="neo-btn-sm px-2 py-0.5 bg-white text-black text-[11px] font-bold font-mono flex items-center gap-1 hover:bg-neutral-100"
            title="Open new tab to test as a student"
          >
            <ExternalLink size={11} />
            <span className="hidden sm:inline">Open new tab</span>
          </a>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1 hover:bg-neutral-200 border border-black"
              title="Close preview"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Teacher Simulation & Effect Control Toolbar */}
      <div className="p-2 bg-[#FFFDF0] border border-black flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-bold text-neutral-800 flex items-center gap-1">
              <Sliders size={12} />
              Erase Effect:
            </span>
            <div className="inline-flex flex-wrap border border-black bg-white p-0.5 shadow-[1px_1px_0px_#000]">
              {ERASE_EFFECT_OPTIONS.map(eff => (
                <button
                  key={eff.id}
                  type="button"
                  onClick={() => handleSelectEffect(eff.id)}
                  aria-pressed={activeEffect === eff.id}
                  className={`px-2 py-0.5 font-bold transition-all ${
                    activeEffect === eff.id ? eff.activeBg : 'text-neutral-700 hover:text-black'
                  }`}
                  title={`Select ${eff.label} effect and save settings`}
                >
                  {eff.label}
                </button>
              ))}
            </div>
          </div>

          {/* Module: Simulation Erase Schedule */}
          <div className="flex flex-wrap items-center gap-1.5" data-testid="sim-erase-schedule-control">
            <span className="font-bold text-neutral-800 flex items-center gap-1">
              <Timer size={12} />
              Erase Mechanism:
            </span>
            <div className="inline-flex border border-black bg-white p-0.5 shadow-[1px_1px_0px_#000]">
              <button
                type="button"
                onClick={() => handleSelectSchedule('after_reading')}
                aria-pressed={activeSchedule === 'after_reading'}
                className={`px-2 py-0.5 font-bold transition-all ${
                  activeSchedule === 'after_reading'
                    ? 'bg-[#FFE500] text-black shadow-[1px_1px_0px_#000]'
                    : 'text-neutral-700 hover:text-black'
                }`}
                title="Simulation: Read entire unit then erase"
              >
                Erase after reading
              </button>
              <button
                type="button"
                onClick={() => handleSelectSchedule('word_groups')}
                aria-pressed={activeSchedule === 'word_groups'}
                className={`px-2 py-0.5 font-bold transition-all ${
                  activeSchedule === 'word_groups'
                    ? 'bg-[#FFE500] text-black shadow-[1px_1px_0px_#000]'
                    : 'text-neutral-700 hover:text-black'
                }`}
                title="Simulation: Erase sequentially while reading"
              >
                Erase while reading
              </button>
            </div>
          </div>
        </div>

        {/* Local Simulation Loop Controls */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleToggleSimulation}
            className={`neo-btn-sm px-2.5 py-0.5 text-xs font-bold flex items-center gap-1 ${
              isSimulating
                ? 'bg-[#FF3838] text-white hover:bg-red-600'
                : 'bg-[#4ADE80] text-black hover:bg-green-400'
            }`}
            title="Test erase effect loop locally without broadcasting to students"
          >
            {isSimulating ? <StopCircle size={12} /> : <Play size={12} />}
            <span>{isSimulating ? 'Stop Simulation' : 'Start Simulation'}</span>
          </button>

          {isSimulating && (
            <button
              type="button"
              onClick={handleRestartSimulation}
              className="neo-btn-sm px-2 py-0.5 bg-white text-black text-xs font-bold flex items-center gap-1"
              title="Restart from beginning"
            >
              <RotateCcw size={11} />
              <span>Restart</span>
            </button>
          )}

          <span className="text-[10px] text-neutral-500 hidden md:inline">
            (Hold: {stagedHoldMs}ms, Erase: {stagedEraseMs}ms · {activeSchedule === 'word_groups' ? 'Erase while reading' : 'Erase after reading'})
          </span>
        </div>
      </div>

      {activeEffect === 'dust' && onSelectDustAngle && <DustDirectionControl angle={stagedDustAngle} onChange={onSelectDustAngle} />}

      {/* Screen Frame Simulation */}
      <div className={`mx-auto transition-all ${viewMode === 'mobile' ? 'max-w-[360px]' : 'w-full'}`}>
        <div className="neo-box-sm bg-neutral-900 p-2 sm:p-2.5 rounded-none border-2 border-black space-y-2">
          {/* Top simulated status bar */}
          <div className="flex items-center justify-between text-[10px] font-mono text-neutral-300 px-1">
            <div className="flex items-center gap-1.5">
              <span className="bg-[#FFE500] text-black px-1 font-bold">
                {isSimulating ? 'SIMULATION' : `ROOM: ${room.id}`}
              </span>
              <span className="truncate max-w-[150px]">
                {room.resourceTitle}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              {!isSimulating && (
                <span className="flex items-center gap-1 text-neutral-300">
                  <Users size={10} /> {participants.length}
                </span>
              )}
              {activeTimeline.phase === 'hold' && (
                <span className="text-[#4ADE80] font-bold">
                  READ ({Math.ceil((activeTimeline.effectiveHoldMs - activeTimeline.elapsedMs) / 1000)}s)
                </span>
              )}
              {activeTimeline.phase === 'erase' && (
                <span className="text-[#FF3838] font-bold">
                  ERASING ({Math.ceil(activeTimeline.remainingMs / 1000)}s)
                </span>
              )}
              {activeTimeline.phase === 'paused' && (
                <span className="text-[#FFE500] font-bold">PAUSED</span>
              )}
              {activeTimeline.phase === 'manual_show' && (
                <span className="text-[#00D2FF] font-bold">SHOW</span>
              )}
              {activeTimeline.phase === 'idle' && (
                <span className="text-neutral-400">IDLE</span>
              )}
              {activeTimeline.phase === 'blank_finished' && (
                <span className="text-neutral-400">DONE</span>
              )}
            </div>
          </div>

          {/* Reading Paper Canvas (Exact replica of learner screen) */}
          <div className="bg-paper-reading p-4 sm:p-6 min-h-[180px] sm:min-h-[240px] flex flex-col justify-between border border-black relative overflow-hidden select-none">
            <ReadingCountdown timeline={activeTimeline} />

            {/* Chunk counter tag */}
            <div className="flex items-center justify-between text-[9px] font-mono text-neutral-500 mb-2">
              <span>
                {isFullReview
                  ? 'Full Text Review'
                  : `${unitLabel} #${((currentUnit?.index ?? 0) + 1)} / ${currentUnit?.totalUnits || 1}`}
              </span>
              <span className="font-bold text-neutral-700">
                Effect: {isSimulating ? activeEffect : (room.eraseEffect || 'vaporize')} · {isSimulating ? (activeSchedule === 'word_groups' ? 'Erase while reading' : 'Erase after reading') : (room.eraseSchedule === 'word_groups' ? 'Erase while reading' : 'Erase after reading')}
              </span>
            </div>

            {/* Reading Content Center */}
            <div className="flex-1 flex items-center justify-center py-3 sm:py-6">
              {isFullReview && currentUnit?.text ? (
                <div className="w-full text-left space-y-3 px-1 max-h-[220px] overflow-y-auto">
                  <div className="text-[10px] font-mono font-bold text-neutral-600 bg-[#FFFDF0] p-1 border border-black/30">
                    📖 Full Text Mode (Learners can read entire passage)
                  </div>
                  <ReadingUnitText room={room} timeline={activeTimeline} onAnnotationClick={setActiveTooltip}
                    className="font-reading text-base leading-relaxed text-[#111111]" />                </div>
              ) : isTextVisible && currentUnit?.text ? (
                <ReadingUnitText room={isSimulating ? { ...room, eraseEffect: activeEffect, dustAngle: stagedDustAngle, eraseSchedule: activeSchedule } : room}
                  timeline={activeTimeline} onAnnotationClick={setActiveTooltip}
                  className={`w-full text-center max-w-xl font-reading ${viewMode === 'mobile' ? 'text-lg leading-relaxed' : 'text-xl sm:text-2xl leading-relaxed'} text-[#111111] font-normal`} />
              ) : (
                <div className="text-center py-4 space-y-1.5 text-neutral-400 font-mono">
                  <Clock size={16} className="mx-auto animate-pulse" />
                  <p className="text-xs font-bold text-neutral-600 uppercase">
                    {activeTimeline.phase === 'blank_finished' ? 'Text is currently hidden' : 'Waiting for teacher to start reading...'}
                  </p>
                  <p className="text-[10px]">
                    {isSimulating
                      ? 'Preparing next simulation cycle...'
                      : 'Learner screen is currently blank'}
                  </p>
                </div>
              )}
            </div>

            {/* Tooltip demonstration */}
            {activeTooltip && (
              <div className="neo-box-sm bg-[#FFFDF0] p-2 border border-black flex items-center justify-between gap-2 mt-2">
                <div className="text-[11px] font-reading">
                  <span className="font-bold mr-1.5">"{activeTooltip.text}"</span>
                  <span className="text-neutral-600 italic">({activeTooltip.meaning})</span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTooltip(null)}
                  className="p-0.5 text-neutral-500 hover:text-black"
                >
                  <X size={12} />
                </button>
              </div>
            )}

            <div className="text-[9px] font-mono text-neutral-400 pt-1 border-t border-black/10 flex justify-between">
              <span>
                {isSimulating ? '🧪 Test simulation mode' : `Real-time sync with room ${room.id}`}
              </span>
              <span>{approvedSpans.length} highlighted chunks</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
