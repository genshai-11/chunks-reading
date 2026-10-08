/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ReadingUnitText } from './ReadingUnitText';
import { ReadingCountdown } from './ReadingCountdown';
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
import { getSyncedRoomTimeline } from '../services/roomClock';
import { useRoomClock } from './useRoomClock';

import {
  BookOpen,
  Users,
  WifiOff,
  Clock,
  Sparkles,
  AlertTriangle,
  X,
  ArrowRight,
  GraduationCap,
  Check,
  Share2
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

  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [room, setRoom] = useState<ClassroomRoom | null>(null);
  const [roomPreview, setRoomPreview] = useState<ClassroomRoom | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [participants, setParticipants] = useState<RoomParticipant[]>([]);
  const [isJoined, setIsJoined] = useState(false);
  const [joinError, setJoinError] = useState('');
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [isRemovedByTeacher, setIsRemovedByTeacher] = useState(false);

  // Inspected phrase definition on mobile tap
  const [activeTooltip, setActiveTooltip] = useState<ApprovedSpan | null>(null);

  // Authoritative room erase effect (configured solely by Teacher)


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

  // 1. Fetch Room Preview when initialRoomCode is provided (Waiting for student to enter name & click join)
  useEffect(() => {
    if (initialRoomCode && !isJoined) {
      const code = initialRoomCode.trim().toUpperCase();
      setRoomIdInput(code);
      setIsLoadingPreview(true);
      setJoinError('');

      getRoom(code)
        .then(existingRoom => {
          setIsLoadingPreview(false);
          if (!existingRoom || existingRoom.status === 'ended') {
            setJoinError('Classroom does not exist or has already ended.');
            setRoomPreview(null);
          } else {
            setRoomPreview(existingRoom);
          }
        })
        .catch(err => {
          setIsLoadingPreview(false);
          setJoinError(err?.message || 'Could not verify classroom code.');
        });
    }
  }, [initialRoomCode, isJoined]);

  // Join Room Form Submission (Explicit Student Action: Enter Name & Click Join)
  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setJoinError('');

    const cleanCode = roomIdInput.trim().toUpperCase();
    const cleanName = learnerName.trim();

    if (!cleanCode) {
      setJoinError('Please enter a classroom code.');
      return;
    }

    if (!cleanName) {
      setJoinError('Please enter your name or nickname to join.');
      return;
    }

    setIsJoining(true);

    try {
      const existingRoom = await getRoom(cleanCode);
      if (!existingRoom || existingRoom.status === 'ended') {
        setJoinError('Classroom does not exist or has already ended.');
        setIsJoining(false);
        return;
      }

      localStorage.setItem('chunks_learner_name', cleanName);
      setLearnerName(cleanName);

      // Direct participant registration
      await registerParticipant(cleanCode, participantId, cleanName);
      setRoom(existingRoom);
      setActiveRoomId(cleanCode);
      setIsJoined(true);
      setIsJoining(false);
    } catch (err: any) {
      setIsJoining(false);
      setJoinError(err?.message || 'Could not connect. Please verify the classroom code.');
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

  const clockStatus = useRoomClock(room?.id);

  // High-frequency timeline ticker
  useEffect(() => {
    if (!room) return;

    let animId: number;
    const tick = () => {
      const calculated = getSyncedRoomTimeline(room);
      setTimeline(calculated);
      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [room]);

  useEffect(() => {
    if (['idle', 'ended', 'blank_finished'].includes(timeline.phase) || room?.eraseSchedule === 'word_groups') setActiveTooltip(null);
  }, [timeline.phase, timeline.elapsedMs, room?.eraseSchedule]);

  // Removed by teacher state
  if (isRemovedByTeacher) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4">
        <div className="neo-box max-w-sm w-full p-6 text-center bg-white">
          <div className="w-12 h-12 bg-[#FF3838] border-2 border-black text-white flex items-center justify-center mx-auto mb-3 font-bold text-xl">
            !
          </div>
          <h2 className="text-lg font-black uppercase text-black mb-1">Session Disconnected</h2>
          <p className="text-xs font-mono text-neutral-600 mb-4">
            You were disconnected from this classroom session.
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

  // Initial Join Screen (Student waits, types name, and clicks Join)
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
              Enter your name to connect to your live reading session
            </p>
          </div>

          {/* Classroom Preview Card if code recognized */}
          {roomPreview && (
            <div className="mb-4 p-3 bg-[#FFFDF0] border-2 border-black text-left space-y-1 shadow-[2px_2px_0px_#000]">
              <div className="flex items-center justify-between text-[10px] font-mono uppercase font-bold text-neutral-500">
                <span>Classroom Found</span>
                <span className="bg-[#4ADE80] text-black px-1.5 py-0.2 border border-black">Active</span>
              </div>
              <div className="font-bold text-sm text-black truncate">
                {roomPreview.resourceTitle || 'English Reading Lesson'}
              </div>

            </div>
          )}

          {isLoadingPreview && (
            <div className="mb-4 p-2 bg-neutral-100 border border-black text-xs font-mono text-center flex items-center justify-center gap-2">
              <span className="w-3 h-3 border border-black bg-[#FFE500] animate-spin inline-block"></span>
              <span>Looking up classroom...</span>
            </div>
          )}

          {joinError && (
            <div className="p-2.5 mb-4 bg-red-50 border border-black text-red-800 text-xs font-mono flex items-center gap-1.5">
              <AlertTriangle size={14} className="shrink-0" /> <span>{joinError}</span>
            </div>
          )}

          <form onSubmit={handleJoin} className="space-y-3.5">
            <div>
              <label className="block text-[11px] font-mono font-bold uppercase mb-1">
                Classroom Code
              </label>
              <input
                type="text"
                placeholder="e.g. CH-8924"
                value={roomIdInput}
                onChange={e => {
                  setRoomIdInput(e.target.value.toUpperCase());
                  setJoinError('');
                }}
                className="neo-input w-full text-center font-mono font-black tracking-widest text-base py-2.5"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono font-bold uppercase mb-1">
                Your Name / Nickname <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Sarah Miller"
                value={learnerName}
                onChange={e => {
                  setLearnerName(e.target.value);
                  setJoinError('');
                }}
                className="neo-input w-full text-sm py-2 font-medium"
                autoFocus={Boolean(initialRoomCode)}
                required
              />
            </div>

            <button
              type="submit"
              disabled={isJoining}
              className="neo-btn w-full py-3 bg-[#FF3838] text-white text-sm font-black uppercase tracking-wider mt-1 flex items-center justify-center gap-2 hover:bg-red-600 disabled:opacity-50"
            >
              {isJoining ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  <span>Connecting...</span>
                </>
              ) : (
                <>
                  <span>Join Classroom</span>
                  <ArrowRight size={15} />
                </>
              )}
            </button>
          </form>

          {onSwitchToTeacher && (
            <div className="mt-4 pt-3 border-t border-black/10 text-center">
              <button
                type="button"
                onClick={onSwitchToTeacher}
                className="text-[11px] font-mono text-neutral-500 hover:text-black underline"
              >
                Switch to Teacher Dashboard
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Active Classroom Screen
  const currentUnit = room?.currentUnit;
  const isRoomEnded = room?.status === 'ended';
  const isFullReview = timeline.phase === 'manual_show' && Boolean(room?.isFullReview || currentUnit?.isFullReview);

  const approvedSpans =
    room?.highlightEnabled && currentUnit?.annotations ? currentUnit.annotations : [];


  const isTextVisible =
    isFullReview ||
    timeline.phase === 'hold' ||
    timeline.phase === 'erase' ||
    timeline.phase === 'paused' ||
    timeline.phase === 'manual_show';

  // 1-click share link handler (Dedicated student endpoint)
  const handleCopyShareLink = () => {
    if (!activeRoomId) return;
    const url = `${window.location.origin}/student?room=${activeRoomId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedShareLink(true);
      setTimeout(() => setCopiedShareLink(false), 2000);
    });
  };

  // Progress calculations
  const currentUnitIndex = currentUnit ? currentUnit.index : 0;
  const totalUnits = currentUnit ? currentUnit.totalUnits : 0;
  const unitProgressPct = totalUnits > 0 ? Math.round(((currentUnitIndex + 1) / totalUnits) * 100) : 0;
  const unitLabel = currentUnit?.granularity === 'paragraph' ? 'Paragraph' : 'Sentence';

  return (
    <div className="w-full max-w-3xl mx-auto px-2 sm:px-4 py-2 sm:py-5 space-y-2 sm:space-y-3">
      {/* Sleek Minimal Mobile-Friendly Top Bar */}
      <div className="neo-box-sm bg-white p-2 sm:p-2.5 flex items-center justify-between gap-1.5 sm:gap-2">
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
          <span className="neo-badge bg-[#FFE500] text-black text-[10px] sm:text-[11px] font-mono shrink-0">
            {activeRoomId}
          </span>
          <span className="text-[11px] sm:text-xs font-mono font-bold text-neutral-800 truncate">
            Live Classroom
          </span>
        </div>

        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleCopyShareLink}
            className="neo-btn-sm px-1.5 sm:px-2 py-0.5 bg-white text-black text-[10px] sm:text-[11px] font-mono font-bold flex items-center gap-1 shrink-0"
            title="Copy Student Join Link"
          >
            {copiedShareLink ? <Check size={11} className="text-green-600" /> : <Share2 size={11} />}
            <span className="hidden xs:inline">{copiedShareLink ? 'Copied!' : 'Share Link'}</span>
          </button>

          <div className="flex items-center gap-1 text-[10px] sm:text-[11px] font-mono px-1.5 sm:px-2 py-0.5 bg-neutral-100 border border-black shrink-0">
            <Users size={11} />
            <span>{participants.length}</span>
          </div>

          <span className="text-[10px] sm:text-[11px] font-mono px-1.5 sm:px-2 py-0.5 bg-[#4ADE80] border border-black text-black font-bold truncate max-w-[90px] sm:max-w-none shrink-0">
            {learnerName}
          </span>
        </div>
      </div>

      {/* Reconnecting / Ended Alert */}
      {isReconnecting && (
        <div className="p-2 bg-[#FFE500] border border-black text-black font-mono text-xs font-bold flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <WifiOff size={14} /> Reconnecting to classroom...
          </span>
        </div>
      )}

      {isRoomEnded && (
        <div className="neo-box bg-[#FF3838] text-white p-4 text-center">
          <h3 className="text-sm font-black uppercase">Session Concluded by Instructor</h3>
          <p className="text-xs font-mono mt-1 opacity-90">Thank you for participating!</p>
        </div>
      )}

      {/* Book-like Reading Paper Canvas (Optimized for Phone & Desktop) */}
      <div className="neo-box bg-paper-reading min-h-[260px] sm:min-h-[400px] p-3 sm:p-6 md:p-8 flex flex-col justify-between relative overflow-hidden">
        {/* Paper Top Bar: Resource Title & Unit Progress & Live Phase */}
        <div className="border-b border-black/10 pb-2 mb-3">
          <div className="flex flex-wrap items-center justify-between gap-1.5 pb-1.5">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-[11px] font-mono uppercase text-neutral-500 font-bold truncate max-w-[120px] xs:max-w-[180px] sm:max-w-md">
                {room?.resourceTitle || 'English Reading'}
              </span>
              {isFullReview ? (
                <span className="neo-badge bg-[#00D2FF] text-black text-[10px] font-mono font-bold shrink-0">
                  Full Text Review
                </span>
              ) : (
                <span className="neo-badge bg-[#FFE500] text-black text-[10px] font-mono font-bold shrink-0">
                  {unitLabel} {currentUnit ? currentUnit.index + 1 : 0} of {currentUnit ? currentUnit.totalUnits : 0} ({unitProgressPct}%)
                </span>
              )}
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {isFullReview ? (
                <span className="neo-badge bg-[#00D2FF] text-black text-[10px] font-bold">
                  Review & Discussion Mode
                </span>
              ) : (
                <>
                  {timeline.phase === 'hold' && (
                    <span className="neo-badge bg-[#4ADE80] text-black text-[10px]">
                      Reading ({Math.ceil((timeline.effectiveHoldMs - timeline.elapsedMs) / 1000)}s)
                    </span>
                  )}
                  {timeline.phase === 'erase' && (
                    <span className="neo-badge bg-[#FF3838] text-white text-[10px]">
                      Erasing ({Math.ceil(timeline.remainingMs / 1000)}s)
                    </span>
                  )}
                  {timeline.phase === 'paused' && (
                    <span className="neo-badge bg-[#FFE500] text-black text-[10px]">
                      Paused
                    </span>
                  )}
                  {timeline.phase === 'manual_show' && (
                    <span className="neo-badge bg-[#00D2FF] text-black text-[10px]">
                      Discussion
                    </span>
                  )}
                  {timeline.phase === 'blank_finished' && (
                    <span className="neo-badge bg-neutral-200 text-neutral-700 text-[10px]">
                      Completed
                    </span>
                  )}
                  {timeline.phase === 'idle' && (
                    <span className="neo-badge bg-neutral-200 text-neutral-700 text-[10px]">
                      Waiting for Teacher
                    </span>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Mini progress bar for entire reading piece */}
          {!isFullReview && (
            <div className="w-full h-1 bg-black/10 overflow-hidden">
              <div
                style={{ width: `${unitProgressPct}%` }}
                className="h-full bg-black transition-all duration-300"
              ></div>
            </div>
          )}
        </div>

        {clockStatus.failed && <p role="status" className="text-xs text-center text-red-700">Clock sync unavailable. Check your connection.</p>}
        {!isFullReview && <ReadingCountdown timeline={timeline} />}

        {/* Reading Text Center Canvas */}
        <div className="flex-1 flex items-center justify-center py-4 sm:py-8">
          {isFullReview && currentUnit?.text ? (
            /* Full Text Review Mode: Complete passage rendered without timers */
            <div className="w-full max-w-2xl text-left space-y-4 px-2 select-text">
              <div className="bg-[#FFFDF0] border border-black p-2.5 text-xs font-mono font-bold flex items-center justify-between shadow-[1px_1px_0px_#000]">
                <span className="flex items-center gap-1.5 text-black">
                  <BookOpen size={14} className="text-[#00D2FF]" />
                  Full Reading Passage (No Timer)
                </span>
                <span className="text-[10px] bg-[#FFE500] px-1.5 py-0.5 border border-black uppercase">
                  Scroll & Read
                </span>
              </div>

              <ReadingUnitText room={room!} timeline={timeline} onAnnotationClick={setActiveTooltip}
                className="font-reading text-lg sm:text-xl leading-relaxed text-[#111111] max-h-[60vh] overflow-y-auto pr-1" />
            </div>
          ) : isTextVisible && currentUnit?.text ? (
            /* Paced Reading Mode with Erase Text Effect */
            <ReadingUnitText room={room!} timeline={timeline} onAnnotationClick={setActiveTooltip}
              className="w-full text-center max-w-2xl select-none px-1 font-reading text-xl sm:text-2xl md:text-3xl font-medium leading-relaxed sm:leading-loose text-[#111111] tracking-wide" />
          ) : (
            /* Blank Paper Waiting State */
            <div className="text-center py-6 space-y-2">
              <Clock size={20} className="mx-auto text-neutral-400 animate-pulse" />
              <div className="text-xs sm:text-sm font-mono font-bold text-neutral-800 uppercase tracking-wide">
                {timeline.phase === 'blank_finished'
                  ? 'Text is currently hidden'
                  : 'Teacher is preparing the next reading chunk...'}
              </div>
              <p className="text-[10px] sm:text-[11px] font-mono text-neutral-400">
                Text appears in sync with instructor pacing
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
