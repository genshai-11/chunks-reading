/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DustDirectionControl } from './DustDirectionControl';
import { ERASE_EFFECT_OPTIONS, DEFAULT_DUST_ANGLE } from '../utils/eraseEffects';
import { EraseTextEffect } from './EraseTextEffect';
import React, { useState, useEffect, useRef } from 'react';
import { ClassroomRoom, CalculatedTimeline, ApprovedSpan, RoomParticipant, EraseEffect } from '../types';
import { calculateRoomTimeline } from '../utils/timingEngine';
import { buildRenderSlices } from '../utils/textSegmentation';
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
  Sliders
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
    const totalSimDuration = stagedHoldMs + stagedEraseMs + 1200; // includes 1.2s blank pause

    const simLoop = (now: number) => {
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

      animId = requestAnimationFrame(simLoop);
    };

    animId = requestAnimationFrame(simLoop);
    return () => cancelAnimationFrame(animId);
  }, [isSimulating, stagedHoldMs, stagedEraseMs]);

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
      const calculated = calculateRoomTimeline(room, Date.now());
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
  const slices = currentUnit ? buildRenderSlices(currentUnit.text, approvedSpans) : [];

  const isTextVisible =
    activeTimeline.phase === 'hold' ||
    activeTimeline.phase === 'erase' ||
    activeTimeline.phase === 'paused' ||
    activeTimeline.phase === 'manual_show';

  // Progress Bar percent
  let progressPercent = 0;
  if (!room.isFullReview) {
    if (activeTimeline.phase === 'hold') {
      progressPercent = Math.min(100, (activeTimeline.elapsedMs / activeTimeline.effectiveHoldMs) * 100);
    } else if (activeTimeline.phase === 'erase') {
      progressPercent = Math.min(100, activeTimeline.progress * 100);
    }
  }

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

  const isFullReview = Boolean(room.isFullReview || currentUnit?.isFullReview);
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
                  🧪 Chế độ mô phỏng cục bộ (Không ảnh hưởng học sinh)
                </span>
              ) : (
                <span className="neo-badge bg-[#4ADE80] text-black text-[9px] py-0 px-1 font-mono">
                  Màn hình học sinh thời gian thực
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
              title="Xem cỡ Desktop / Laptop"
            >
              <Monitor size={11} /> Desktop
            </button>
            <button
              type="button"
              onClick={() => setViewMode('mobile')}
              className={`px-2 py-0.5 text-[10px] font-mono font-bold uppercase flex items-center gap-1 ${
                viewMode === 'mobile' ? 'bg-black text-white' : 'text-neutral-700 hover:text-black'
              }`}
              title="Xem cỡ điện thoại di động"
            >
              <Smartphone size={11} /> Mobile
            </button>
          </div>

          <button
            type="button"
            onClick={handleCopyLink}
            className="neo-btn-sm px-2 py-0.5 bg-[#FFE500] text-black text-[11px] font-bold font-mono flex items-center gap-1"
            title="Copy link tham gia cho học sinh (không cần đăng nhập)"
          >
            {copiedLink ? <Check size={11} className="text-green-700" /> : <Copy size={11} />}
            <span>{copiedLink ? 'Đã copy!' : 'Copy Link'}</span>
          </button>

          <a
            href={shareUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="neo-btn-sm px-2 py-0.5 bg-white text-black text-[11px] font-bold font-mono flex items-center gap-1 hover:bg-neutral-100"
            title="Mở tab mới thử nghiệm như một học sinh"
          >
            <ExternalLink size={11} />
            <span className="hidden sm:inline">Mở tab mới</span>
          </a>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1 hover:bg-neutral-200 border border-black"
              title="Đóng bản xem trước"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Teacher Simulation & Effect Control Toolbar */}
      <div className="p-2 bg-[#FFFDF0] border border-black flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-bold text-neutral-800 flex items-center gap-1">
            <Sliders size={12} />
            Hiệu ứng xóa:
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
                title={`Chọn hiệu ứng ${eff.label} và lưu cấu hình`}
              >
                {eff.label}
              </button>
            ))}
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
            title="Chạy thử hiệu ứng xóa lặp lại cục bộ mà không phát tới học sinh"
          >
            {isSimulating ? <StopCircle size={12} /> : <Play size={12} />}
            <span>{isSimulating ? 'Dừng mô phỏng' : 'Chạy thử mô phỏng'}</span>
          </button>

          {isSimulating && (
            <button
              type="button"
              onClick={handleRestartSimulation}
              className="neo-btn-sm px-2 py-0.5 bg-white text-black text-xs font-bold flex items-center gap-1"
              title="Chạy lại từ đầu"
            >
              <RotateCcw size={11} />
              <span>Chạy lại</span>
            </button>
          )}

          <span className="text-[10px] text-neutral-500 hidden md:inline">
            (Giữ: {stagedHoldMs}ms, Xóa: {stagedEraseMs}ms)
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
                {isSimulating ? 'MÔ PHỎNG' : `ROOM: ${room.id}`}
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
            {/* Progress bar line */}
            {(activeTimeline.phase === 'hold' || activeTimeline.phase === 'erase') && (
              <div className="w-full h-1 bg-black/10 absolute top-0 left-0">
                <div
                  style={{ width: `${progressPercent}%` }}
                  className={`h-full transition-all duration-75 ${
                    activeTimeline.phase === 'erase' ? 'bg-[#FF3838]' : 'bg-[#4ADE80]'
                  }`}
                ></div>
              </div>
            )}

            {/* Chunk counter tag */}
            <div className="flex items-center justify-between text-[9px] font-mono text-neutral-500 mb-2">
              <span>
                {isFullReview
                  ? 'Full Text Review'
                  : `${unitLabel} #${((currentUnit?.index ?? 0) + 1)} / ${currentUnit?.totalUnits || 1}`}
              </span>
              <span className="font-bold text-neutral-700">Effect: {isSimulating ? activeEffect : (room.eraseEffect || 'vaporize')}</span>
            </div>

            {/* Reading Content Center */}
            <div className="flex-1 flex items-center justify-center py-3 sm:py-6">
              {isFullReview && currentUnit?.text ? (
                <div className="w-full text-left space-y-3 px-1 max-h-[220px] overflow-y-auto">
                  <div className="text-[10px] font-mono font-bold text-neutral-600 bg-[#FFFDF0] p-1 border border-black/30">
                    📖 Full Text Mode (Learners can read entire passage)
                  </div>
                  <div className="font-reading text-base leading-relaxed text-[#111111] space-y-2">
                    {currentUnit.text.split(/\n\s*\n/).map((p, pIdx) => (
                      <p key={pIdx}>
                        {buildRenderSlices(p, approvedSpans).map((slice, sIdx) =>
                          slice.isHighlight && slice.annotation ? (
                            <mark
                              key={sIdx}
                              onClick={() => setActiveTooltip(slice.annotation!)}
                              className="bg-[#FFE500] text-black font-semibold px-1 py-0.5 border-b-2 border-black inline-block cursor-pointer shadow-[1px_1px_0px_#000]"
                              title="Tap to view definition"
                            >
                              {slice.text}
                            </mark>
                          ) : (
                            <span key={sIdx}>{slice.text}</span>
                          )
                        )}
                      </p>
                    ))}
                  </div>
                </div>
              ) : isTextVisible && currentUnit?.text ? (
                <EraseTextEffect
                  effect={isSimulating ? activeEffect : (room.eraseEffect || 'vaporize')}
                  timeline={activeTimeline}
                  dustAngle={isSimulating ? stagedDustAngle : room.dustAngle}
                  contentKey={JSON.stringify([currentUnit.text, approvedSpans])}
                  className="w-full text-center max-w-xl"
                >
                  <p className={`font-reading ${viewMode === 'mobile' ? 'text-lg leading-relaxed' : 'text-xl sm:text-2xl leading-relaxed'} text-[#111111] font-normal`}>
                    {slices.map((slice, idx) =>
                      slice.isHighlight && slice.annotation ? (
                        <mark
                          key={idx}
                          onClick={() => setActiveTooltip(slice.annotation!)}
                          className="bg-[#FFE500] text-black font-semibold px-1 py-0.5 border-b-2 border-black inline-block cursor-pointer shadow-[1px_1px_0px_#000] hover:scale-105 transition-transform"
                          title="Tap to view definition"
                        >
                          {slice.text}
                        </mark>
                      ) : (
                        <span key={idx}>{slice.text}</span>
                      )
                    )}
                  </p>
                </EraseTextEffect>
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
                {isSimulating ? '🧪 Chế độ mô phỏng thử nghiệm' : `Đồng bộ tức thời với phòng ${room.id}`}
              </span>
              <span>{approvedSpans.length} cụm từ highlight</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
