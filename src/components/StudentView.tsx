/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { EraseTextEffect } from './EraseTextEffect';
import React, { useState, useEffect } from 'react';
import {
  ClassroomRoom,
  CalculatedTimeline,
  RoomParticipant,
  ApprovedSpan
} from '../types';
import {
  getRoom,
  subscribeToRoom,
  subscribeToParticipants,
  registerParticipant,
  sendParticipantHeartbeat,
} from '../services/roomService';
import { calculateRoomTimeline } from '../utils/timingEngine';
import { buildRenderSlices } from '../utils/textSegmentation';
import {
  BookOpen,
  Users,
  WifiOff,
  Clock,
  Sparkles,
  AlertTriangle,
  X,
  Volume2,
  ArrowRight
} from 'lucide-react';

interface StudentViewProps {
  initialRoomCode?: string;
  onSwitchToTeacher?: () => void;
}

export const StudentView: React.FC<StudentViewProps> = ({
  initialRoomCode = '',
  onSwitchToTeacher,
}) => {
  const [roomIdInput, setRoomIdInput] = useState(initialRoomCode || '');
  const [learnerName, setLearnerName] = useState(() => {
    return localStorage.getItem('chunks_learner_name') || '';
  });
  const [participantId] = useState(() => {
    let id = localStorage.getItem('chunks_participant_id');
    if (!id) {
      id = `p_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      localStorage.setItem('chunks_participant_id', id);
    }
    return id;
  });

  const [activeRoomId, setActiveRoomId] = useState<string | null>(
    initialRoomCode ? initialRoomCode.trim().toUpperCase() : null
  );
  const [room, setRoom] = useState<ClassroomRoom | null>(null);
  const [participants, setParticipants] = useState<RoomParticipant[]>([]);
  const [isJoined, setIsJoined] = useState(false);
  const [joinError, setJoinError] = useState('');
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [isRemovedByTeacher, setIsRemovedByTeacher] = useState(false);

  // Inspected phrase definition on mobile tap
  const [activeTooltip, setActiveTooltip] = useState<ApprovedSpan | null>(null);

  // Authoritative room erase effect (configured solely by Teacher)
  const effectiveEraseEffect = room?.eraseEffect || 'vaporize';

  // Authoritative timeline
  const [timeline, setTimeline] = useState<CalculatedTimeline>({
    phase: 'idle',
    progress: 0,
    remainingMs: 0,
    totalDurationMs: 4000,
    effectiveHoldMs: 3000,
    effectiveEraseMs: 1000,
    elapsedMs: 0,
  });

  // 1-click share link state
  const [copiedShareLink, setCopiedShareLink] = useState(false);

  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Auto-join if room code is in URL and learner name exists
  useEffect(() => {
    if (initialRoomCode && !isJoined) {
      const code = initialRoomCode.trim().toUpperCase();
      const name = learnerName.trim() || `Learner_${participantId.slice(-4)}`;
      setRoomIdInput(code);
      setLearnerName(name);

      getRoom(code)
        .then(existingRoom => {
          if (!existingRoom || existingRoom.status === 'ended') {
            setJoinError('Phòng học không tồn tại hoặc đã kết thúc');
            return;
          }
          localStorage.setItem('chunks_learner_name', name);
          return registerParticipant(code, participantId, name).then(() => {
            setRoom(existingRoom);
            setActiveRoomId(code);
            setIsJoined(true);
          });
        })
        .catch(err => {
          setJoinError(err?.message || 'Could not join room.');
        });
    }
  }, [initialRoomCode]);

  // Join Room Form Submission (Zero login required!)
  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setJoinError('');

    const cleanCode = roomIdInput.trim().toUpperCase();
    const cleanName = learnerName.trim() || `Learner_${participantId.slice(-4)}`;

    if (!cleanCode) {
      setJoinError('Please enter a room code.');
      return;
    }

    try {
      const existingRoom = await getRoom(cleanCode);
      if (!existingRoom || existingRoom.status === 'ended') {
        setJoinError('Phòng học không tồn tại hoặc đã kết thúc');
        return;
      }

      localStorage.setItem('chunks_learner_name', cleanName);
      setLearnerName(cleanName);
      // Direct Firestore write without requiring anonymous auth
      await registerParticipant(cleanCode, participantId, cleanName);
      setRoom(existingRoom);
      setActiveRoomId(cleanCode);
      setIsJoined(true);
    } catch (err: any) {
      setJoinError(err?.message || 'Could not connect. Please check room code.');
    }
  };

  // Subscribe to room doc
  useEffect(() => {
    if (!activeRoomId || !isJoined) return;

    let unsubscribeRoom: (() => void) | undefined;
    let unsubscribeParticipants: (() => void) | undefined;

    try {
      unsubscribeRoom = subscribeToRoom(
        activeRoomId,
        updatedRoom => {
          setIsReconnecting(false);
          if (!updatedRoom) {
            setJoinError('Classroom session has ended.');
            setRoom(null);
            return;
          }
          setRoom(updatedRoom);
        },
        () => {
          setIsReconnecting(true);
        }
      );

      unsubscribeParticipants = subscribeToParticipants(
        activeRoomId,
        list => {
          setParticipants(list);
          const self = list.find(p => p.participantId === participantId);
          if (self && self.isRemoved) {
            setIsRemovedByTeacher(true);
          }
        },
        () => {
          // Non-blocking
        }
      );
    } catch {
      setIsReconnecting(true);
    }

    return () => {
      if (unsubscribeRoom) unsubscribeRoom();
      if (unsubscribeParticipants) unsubscribeParticipants();
    };
  }, [activeRoomId, isJoined, participantId]);

  // Heartbeat every 15s
  useEffect(() => {
    if (!activeRoomId || !isJoined || isRemovedByTeacher) return;

    const interval = setInterval(() => {
      sendParticipantHeartbeat(activeRoomId, participantId);
    }, 15000);

    return () => clearInterval(interval);
  }, [activeRoomId, isJoined, participantId, isRemovedByTeacher]);

  // High-frequency timeline ticker
  useEffect(() => {
    if (!room) return;

    let animId: number;
    const tick = () => {
      const now = Date.now();
      const calculated = calculateRoomTimeline(room, now);
      setTimeline(calculated);
      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [room]);

  // Removed by teacher state
  if (isRemovedByTeacher) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4">
        <div className="neo-box max-w-sm w-full p-6 text-center bg-white">
          <div className="w-12 h-12 bg-[#FF3838] border-2 border-black text-white flex items-center justify-center mx-auto mb-3 font-bold text-xl">
            !
          </div>
          <h2 className="text-lg font-black uppercase text-black mb-1">Session Left</h2>
          <p className="text-xs font-mono text-neutral-600 mb-4">
            You were disconnected from this session.
          </p>
          <button
            onClick={() => {
              setIsJoined(false);
              setIsRemovedByTeacher(false);
              setActiveRoomId(null);
            }}
            className="neo-btn px-4 py-2 bg-[#FFE500] text-black text-xs font-bold uppercase"
          >
            Back to Join
          </button>
        </div>
      </div>
    );
  }

  // Initial Join Screen (Clean, minimal, mobile-first)
  if (!isJoined || !activeRoomId) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4 py-6">
        <div className="neo-box max-w-sm w-full bg-white p-6 relative">
          <div className="text-center mb-5">
            <span className="neo-badge bg-[#FFE500] text-black mb-2">
              Learner Desk
            </span>
            <h1 className="text-2xl font-black uppercase tracking-tight text-black mt-1">
              Join Classroom
            </h1>
            <p className="text-xs font-mono text-neutral-500 mt-1">
              Enter room code to start reading
            </p>
          </div>

          {joinError && (
            <div className="p-2.5 mb-4 bg-red-50 border border-black text-red-800 text-xs font-mono flex items-center gap-1.5">
              <AlertTriangle size={14} /> {joinError}
            </div>
          )}

          <form onSubmit={handleJoin} className="space-y-3">
            <div>
              <label className="block text-[11px] font-mono font-bold uppercase mb-1">
                Room Code
              </label>
              <input
                type="text"
                placeholder="e.g. CH-8924"
                value={roomIdInput}
                onChange={e => setRoomIdInput(e.target.value.toUpperCase())}
                className="neo-input w-full text-center font-mono font-bold tracking-widest text-base py-2.5"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono font-bold uppercase mb-1">
                Your Nickname
              </label>
              <input
                type="text"
                placeholder="e.g. Alex"
                value={learnerName}
                onChange={e => setLearnerName(e.target.value)}
                className="neo-input w-full text-sm py-2"
              />
            </div>

            <button
              type="submit"
              className="neo-btn w-full py-3 bg-[#FF3838] text-white text-sm font-black uppercase tracking-wider mt-1"
            >
              Enter Classroom <ArrowRight size={14} className="ml-1 inline" />
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Active Classroom Screen
  const currentUnit = room?.currentUnit;
  const isRoomEnded = room?.status === 'ended';

  const approvedSpans =
    room?.highlightEnabled && currentUnit?.annotations ? currentUnit.annotations : [];
  const slices = currentUnit ? buildRenderSlices(currentUnit.text, approvedSpans) : [];

  const isTextVisible =
    timeline.phase === 'hold' ||
    timeline.phase === 'erase' ||
    timeline.phase === 'paused' ||
    timeline.phase === 'manual_show';

  // Progress Bar Percent for Erase / Hold
  let progressPercent = 0;
  if (timeline.phase === 'hold') {
    progressPercent = Math.min(100, (timeline.elapsedMs / timeline.effectiveHoldMs) * 100);
  } else if (timeline.phase === 'erase') {
    progressPercent = Math.min(100, timeline.progress * 100);
  }

  // 1-click share link handler
  const handleCopyShareLink = () => {
    if (!activeRoomId) return;
    const url = `${window.location.origin}/?room=${activeRoomId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedShareLink(true);
      setTimeout(() => setCopiedShareLink(false), 2000);
    });
  };

  // Progress calculations
  const currentUnitIndex = currentUnit ? currentUnit.index : 0;
  const totalUnits = currentUnit ? currentUnit.totalUnits : 0;
  const unitProgressPct = totalUnits > 0 ? Math.round(((currentUnitIndex + 1) / totalUnits) * 100) : 0;

  return (
    <div className="w-full max-w-3xl mx-auto px-2 sm:px-4 py-2 sm:py-5 space-y-2 sm:space-y-3">
      {/* Sleek Minimal Mobile-Friendly Top Bar */}
      <div className="neo-box-sm bg-white p-2 sm:p-2.5 flex items-center justify-between gap-1.5 sm:gap-2">
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
          <span className="neo-badge bg-[#FFE500] text-black text-[10px] sm:text-[11px] font-mono shrink-0">
            {activeRoomId}
          </span>
          <span className="text-[11px] sm:text-xs font-mono font-bold text-neutral-800 truncate">
            {room?.teacherName ? `GV: ${room.teacherName}` : 'Live Room'}
          </span>
        </div>

        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleCopyShareLink}
            className="neo-btn-sm px-1.5 sm:px-2 py-0.5 bg-white text-black text-[10px] sm:text-[11px] font-mono font-bold flex items-center gap-1 shrink-0"
            title="Share Room Link"
          >
            {copiedShareLink ? <Sparkles size={11} className="text-green-600" /> : <ArrowRight size={11} />}
            <span className="hidden xs:inline">{copiedShareLink ? 'Đã chép!' : 'Chia sẻ'}</span>
          </button>

          <div className="flex items-center gap-1 text-[10px] sm:text-[11px] font-mono px-1.5 sm:px-2 py-0.5 bg-neutral-100 border border-black shrink-0">
            <Users size={11} />
            <span>{participants.length}</span>
          </div>

          <span className="text-[10px] sm:text-[11px] font-mono px-1.5 sm:px-2 py-0.5 bg-[#4ADE80] border border-black text-black font-bold truncate max-w-[80px] sm:max-w-none shrink-0">
            {learnerName}
          </span>
        </div>
      </div>

      {/* Reconnecting / Ended Alert */}
      {isReconnecting && (
        <div className="p-2 bg-[#FFE500] border border-black text-black font-mono text-xs font-bold flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <WifiOff size={14} /> Reconnecting...
          </span>
        </div>
      )}

      {isRoomEnded && (
        <div className="neo-box bg-[#FF3838] text-white p-4 text-center">
          <h3 className="text-sm font-black uppercase">Session Ended by Teacher</h3>
        </div>
      )}

      {/* Book-like Reading Paper Canvas (Optimized for Phone & Desktop) */}
      <div className="neo-box bg-paper-reading min-h-[260px] sm:min-h-[400px] p-3 sm:p-6 md:p-8 flex flex-col justify-between relative overflow-hidden">
        {/* Paper Top Bar: Resource Title & Sentence Progress & Live Phase */}
        <div className="border-b border-black/10 pb-2 mb-3">
          <div className="flex flex-wrap items-center justify-between gap-1.5 pb-1.5">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-[11px] font-mono uppercase text-neutral-500 font-bold truncate max-w-[120px] xs:max-w-[180px] sm:max-w-md">
                {room?.resourceTitle || 'English Reading'}
              </span>
              <span className="neo-badge bg-[#FFE500] text-black text-[10px] font-mono font-bold shrink-0">
                Câu {currentUnit ? currentUnit.index + 1 : 0} / {currentUnit ? currentUnit.totalUnits : 0} ({unitProgressPct}%)
              </span>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {timeline.phase === 'hold' && (
                <span className="neo-badge bg-[#4ADE80] text-black text-[10px]">
                  Đọc ({Math.ceil((timeline.effectiveHoldMs - timeline.elapsedMs) / 1000)}s)
                </span>
              )}
              {timeline.phase === 'erase' && (
                <span className="neo-badge bg-[#FF3838] text-white text-[10px]">
                  Xóa ({Math.ceil(timeline.remainingMs / 1000)}s)
                </span>
              )}
              {timeline.phase === 'paused' && (
                <span className="neo-badge bg-[#FFE500] text-black text-[10px]">
                  Tạm dừng
                </span>
              )}
              {timeline.phase === 'manual_show' && (
                <span className="neo-badge bg-[#00D2FF] text-black text-[10px]">
                  Thảo luận
                </span>
              )}
              {timeline.phase === 'blank_finished' && (
                <span className="neo-badge bg-neutral-200 text-neutral-700 text-[10px]">
                  Hoàn thành
                </span>
              )}
              {timeline.phase === 'idle' && (
                <span className="neo-badge bg-neutral-200 text-neutral-700 text-[10px]">
                  Chờ phát
                </span>
              )}
            </div>
          </div>

          {/* Sleek mini progress bar for whole reading piece */}
          <div className="w-full h-1 bg-black/10 overflow-hidden">
            <div
              style={{ width: `${unitProgressPct}%` }}
              className="h-full bg-black transition-all duration-300"
            ></div>
          </div>
        </div>

        {/* Minimal Timer Countdown Bar (During reading & erase) */}
        {(timeline.phase === 'hold' || timeline.phase === 'erase') && (
          <div className="w-full h-1 bg-neutral-200 border-b border-black/20 -mt-2 mb-3 overflow-hidden">
            <div
              style={{ width: `${progressPercent}%` }}
              className={`h-full transition-all duration-75 ${
                timeline.phase === 'erase' ? 'bg-[#FF3838]' : 'bg-[#4ADE80]'
              }`}
            ></div>
          </div>
        )}

        {/* Reading Text Center Canvas */}
        <div className="flex-1 flex items-center justify-center py-4 sm:py-8">
          {isTextVisible && currentUnit?.text ? (
            <EraseTextEffect
                  effect={effectiveEraseEffect}
                  timeline={timeline}
                  dustAngle={room?.dustAngle}
                  contentKey={JSON.stringify([currentUnit.text, approvedSpans])}
                  className="w-full text-center max-w-2xl select-none px-1"
                >
              <p className="font-reading text-xl sm:text-2xl md:text-3xl font-medium leading-relaxed sm:leading-loose text-[#111111] tracking-wide">
                {slices.map((slice, idx) =>
                  slice.isHighlight && slice.annotation ? (
                    <mark
                      key={idx}
                      onClick={() => setActiveTooltip(slice.annotation!)}
                      className="bg-[#FFE500] text-black font-semibold px-1 py-0.5 border-b-2 border-black inline-block cursor-pointer shadow-[1px_1px_0px_#000] active:scale-95 transition-transform"
                      title="Chạm để xem nghĩa"
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
            /* Blank Paper Waiting State */
            <div className="text-center py-6 space-y-2">
              <Clock size={20} className="mx-auto text-neutral-400 animate-pulse" />
              <div className="text-xs sm:text-sm font-mono font-bold text-neutral-800 uppercase tracking-wide">
                {timeline.phase === 'blank_finished'
                  ? 'Đoạn đọc đã ẩn'
                  : 'Giáo viên đang chuẩn bị đoạn tiếp theo...'}
              </div>
              <p className="text-[10px] sm:text-[11px] font-mono text-neutral-400">
                Chữ sẽ xuất hiện theo nhịp điều khiển của giáo viên
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Tooltip / Bottom Sheet for Tapped Phrase */}
      {activeTooltip && (
        <div className="neo-box-sm bg-[#FFFDF0] p-3.5 border-2 border-black flex items-start justify-between gap-3 animate-in fade-in">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-reading font-bold text-base text-black">
                "{activeTooltip.text}"
              </span>
              <span className="text-[10px] font-mono uppercase px-1.5 py-0.2 bg-[#FFE500] border border-black">
                {activeTooltip.type.replace('_', ' ')}
              </span>
            </div>
            <p className="text-xs font-reading text-neutral-700 italic">
              {activeTooltip.meaning}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setActiveTooltip(null)}
            className="p-1 text-neutral-500 hover:text-black"
          >
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
};
