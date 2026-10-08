/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import {
  ReadingResource,
  ClassroomRoom,
  Granularity,
  TimingPolicy,
  RoomParticipant,
  PhraseAnnotation,
  EraseEffect,
} from '../types';
import {
  fetchTeacherResources,
  seedTeacherLibraryIfEmpty,
  deleteResource,
  publishResource,
  resetAndSyncFullResources,
} from '../services/resourceService';
import {
  createClassroomRoom,
  findActiveTeacherRoom,
  subscribeToRoom,
  subscribeToParticipants,
  applyToRoomCommand,
  playTurnCommand,
  pauseTurnCommand,
  resumeTurnCommand,
  showTurnCommand,
  hideTurnCommand,
  endRoomCommand,
  removeParticipant,
  setFullReviewCommand,
} from '../services/roomService';
import { calculateRoomTimeline, calculateDynamicHoldDuration } from '../utils/timingEngine';
import { buildRenderSlices, segmentSentences, segmentParagraphs, mergeShortUnits } from '../utils/textSegmentation';
import { ResourceEditorModal } from './ResourceEditorModal';
import { PhraseReviewModal } from './PhraseReviewModal';
import { TimingPreview } from './TimingPreview';
import { PhraseEditorStudio } from './PhraseEditorStudio';
import { LiveLearnerView } from './LiveLearnerView';
import { DustDirectionControl } from './DustDirectionControl';
import { ERASE_EFFECT_OPTIONS, DEFAULT_DUST_ANGLE } from '../utils/eraseEffects';
import {
  BookOpen,
  Plus,
  Play,
  Pause,
  RotateCcw,
  Eye,
  EyeOff,
  Radio,
  Users,
  Copy,
  Check,
  Search,
  Filter,
  CheckCircle,
  Clock,
  Sparkles,
  Trash2,
  Edit,
  Share2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Zap,
  UserX,
  Layers,
  Sliders,
  AlertCircle,
  Highlighter,
  RefreshCw,
  X,
  ExternalLink,
  Monitor,
  LayoutGrid
} from 'lucide-react';

const ERASE_EFFECT_NAMES: Record<EraseEffect, string> = {
  vaporize: 'Tan biến',
  dissolve: 'Hòa tan',
  fade: 'Mờ dần',
  wipe: 'Gạt cuộn',
  eraser: 'Gôm lau',
  dust: 'Bụi chữ bay',
  sparkle: 'Làn sáng cuốn chữ',
};

interface TeacherDashboardProps {
  user: User;
  onOpenLearnerView: (roomCode?: string) => void;
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({
  user,
  onOpenLearnerView,
}) => {
  // Library state
  const [resources, setResources] = useState<ReadingResource[]>([]);
  const [loadingResources, setLoadingResources] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [statusTab, setStatusTab] = useState<'all' | 'published' | 'draft'>('all');

  // Modals & Studio state
  const [editingResource, setEditingResource] = useState<ReadingResource | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [reviewingResource, setReviewingResource] = useState<ReadingResource | null>(null);
  const [studioResource, setStudioResource] = useState<ReadingResource | null>(null);
  const [showStudioModal, setShowStudioModal] = useState(false);
  const [showLibraryDrawer, setShowLibraryDrawer] = useState(false);
  const [dashboardNotice, setDashboardNotice] = useState<{ type: 'error' | 'success' | 'info'; text: string } | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [activeMainTab, setActiveMainTab] = useState<'live' | 'library' | 'studio'>('live');
  const [selectedQuickSwitchId, setSelectedQuickSwitchId] = useState<string>('');
  const [selectedSetupResourceId, setSelectedSetupResourceId] = useState<string>('');

  // Active Live Room state
  const [activeRoom, setActiveRoom] = useState<ClassroomRoom | null>(null);
  const [participants, setParticipants] = useState<RoomParticipant[]>([]);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showLiveLearnerView, setShowLiveLearnerView] = useState(true);
  const [activePresentedResource, setActivePresentedResource] = useState<ReadingResource | null>(null);

  // Staged Controls for Active Room
  const [stagedUnitIndex, setStagedUnitIndex] = useState(0);
  const [stagedGranularity, setStagedGranularity] = useState<Granularity>('sentence');
  const [stagedHighlight, setStagedHighlight] = useState(true);
  const [stagedPolicy, setStagedPolicy] = useState<TimingPolicy>('hold_then_erase');
  const [stagedHoldMs, setStagedHoldMs] = useState(3500);
  const [stagedEraseMs, setStagedEraseMs] = useState(1000);
  const [stagedWindowMs, setStagedWindowMs] = useState(3000);
  const [stagedEraseEffect, setStagedEraseEffect] = useState<EraseEffect>('eraser');
  const [stagedDustAngle, setStagedDustAngle] = useState(DEFAULT_DUST_ANGLE);
  const [isApplying, setIsApplying] = useState(false);

  // Separate Timing Profiles for Sentence vs Paragraph (Requirement 6)
  const [stagedSentenceHoldMs, setStagedSentenceHoldMs] = useState(3500);
  const [stagedSentenceEraseMs, setStagedSentenceEraseMs] = useState(1000);
  const [stagedParagraphHoldMs, setStagedParagraphHoldMs] = useState(12000);
  const [stagedParagraphEraseMs, setStagedParagraphEraseMs] = useState(2500);
  const [timingProfileTab, setTimingProfileTab] = useState<Granularity>('sentence');

  // Dynamic Pacing & Length Calibration (Requirement 7)
  const [dynamicPacingEnabled, setDynamicPacingEnabled] = useState(true);
  const [readingWpm, setReadingWpm] = useState(160);
  const [autoMergeShortUnits, setAutoMergeShortUnits] = useState(false);
  const [minWordsPerUnit, setMinWordsPerUnit] = useState(5);

  // Settings Panel Tab Switcher (Requirement 4)
  const [settingsTab, setSettingsTab] = useState<'timings' | 'switch_lesson' | 'participants' | 'all'>('timings');

  // Slide Remote HUD, Auto-Advance & Collapsible panels state
  const [autoAdvance, setAutoAdvance] = useState(false);
  const [showTimingSettings, setShowTimingSettings] = useState(false);
  const [showEraseEffectPicker, setShowEraseEffectPicker] = useState(false);
  const [showTimelinePreview, setShowTimelinePreview] = useState(false);

  // Synchronized refs for slide presenter clickers & keyboard hotkeys
  const activeRoomRef = React.useRef(activeRoom);
  activeRoomRef.current = activeRoom;
  const activePresentedResourceRef = React.useRef(activePresentedResource);
  activePresentedResourceRef.current = activePresentedResource;
  const stagedUnitIndexRef = React.useRef(stagedUnitIndex);
  stagedUnitIndexRef.current = stagedUnitIndex;
  const currentUnitsListRef = React.useRef<string[]>([]);
  const stagedSettingsRef = React.useRef({
    stagedGranularity,
    stagedHighlight,
    stagedPolicy,
    stagedHoldMs,
    stagedEraseMs,
    stagedWindowMs,
    stagedEraseEffect,
    stagedDustAngle,
    stagedSentenceHoldMs,
    stagedSentenceEraseMs,
    stagedParagraphHoldMs,
    stagedParagraphEraseMs,
    dynamicPacingEnabled,
    readingWpm,
    autoMergeShortUnits,
    minWordsPerUnit,
  });
  stagedSettingsRef.current = {
    stagedGranularity,
    stagedHighlight,
    stagedPolicy,
    stagedHoldMs,
    stagedEraseMs,
    stagedWindowMs,
    stagedEraseEffect,
    stagedDustAngle,
    stagedSentenceHoldMs,
    stagedSentenceEraseMs,
    stagedParagraphHoldMs,
    stagedParagraphEraseMs,
    dynamicPacingEnabled,
    readingWpm,
    autoMergeShortUnits,
    minWordsPerUnit,
  };

  const lastBackPressTimeRef = React.useRef<number>(0);
  const autoAdvanceTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoAdvanceTriggeredUnitRef = React.useRef<number | null>(null);

  // Active Room Live Progress calculation
  const [roomProgress, setRoomProgress] = useState({
    phase: 'idle',
    elapsedMs: 0,
    progress: 0,
  });

  // Load teacher resources on mount and auto-seed if empty
  const loadResources = async () => {
    setLoadingResources(true);
    try {
      await seedTeacherLibraryIfEmpty(user.uid);
      const data = await fetchTeacherResources(user.uid);
      setResources(data);
      if (!studioResource && data.length > 0) {
        setStudioResource(data[0]);
      }

      // Auto-restore any active live classroom room
      const existingRoom = await findActiveTeacherRoom(user.uid);
      if (existingRoom) {
        setActiveRoom(existingRoom);
        if (existingRoom.currentUnit) {
          setStagedUnitIndex(existingRoom.currentUnit.index);
        }
        setStagedGranularity(existingRoom.granularity);
        setStagedHighlight(existingRoom.highlightEnabled);
        setStagedPolicy(existingRoom.timingPolicy);
        setStagedHoldMs(existingRoom.holdDurationMs);
        setStagedEraseMs(existingRoom.eraseDurationMs);
        setStagedWindowMs(existingRoom.totalWindowMs);
        setStagedDustAngle(existingRoom.dustAngle ?? DEFAULT_DUST_ANGLE);
        if (existingRoom.eraseEffect) {
          setStagedEraseEffect(existingRoom.eraseEffect);
        }
        if (existingRoom.sentenceHoldMs) setStagedSentenceHoldMs(existingRoom.sentenceHoldMs);
        if (existingRoom.sentenceEraseMs) setStagedSentenceEraseMs(existingRoom.sentenceEraseMs);
        if (existingRoom.paragraphHoldMs) setStagedParagraphHoldMs(existingRoom.paragraphHoldMs);
        if (existingRoom.paragraphEraseMs) setStagedParagraphEraseMs(existingRoom.paragraphEraseMs);
        if (existingRoom.dynamicPacingEnabled !== undefined) setDynamicPacingEnabled(existingRoom.dynamicPacingEnabled);
        if (existingRoom.readingWpm) setReadingWpm(existingRoom.readingWpm);
        if (existingRoom.autoMergeShortUnits !== undefined) setAutoMergeShortUnits(existingRoom.autoMergeShortUnits);
        if (existingRoom.minWordsPerUnit) setMinWordsPerUnit(existingRoom.minWordsPerUnit);

        const matchedResource = data.find(r => r.id === existingRoom.resourceId);
        if (matchedResource) {
          setActivePresentedResource(matchedResource);
        }
      }
    } catch (err: any) {
      console.error('Error loading resources:', err);
      setDashboardNotice({ type: 'error', text: `Lỗi tải tài nguyên: ${err?.message || 'Không thể kết nối'}` });
    } finally {
      setLoadingResources(false);
    }
  };

  useEffect(() => {
    loadResources();
  }, [user.uid]);

  // Keep active presented resource in sync with active room
  useEffect(() => {
    if (activeRoom && resources.length > 0 && !activePresentedResource) {
      const matched = resources.find(r => r.id === activeRoom.resourceId);
      if (matched) {
        setActivePresentedResource(matched);
      }
    }
  }, [activeRoom, resources, activePresentedResource]);

  useEffect(() => {
    if (activePresentedResource?.id) {
      setSelectedQuickSwitchId(activePresentedResource.id);
    }
  }, [activePresentedResource?.id]);

  // Subscribe to active room changes
  useEffect(() => {
    if (!activeRoom?.id) return;

    const unsubRoom = subscribeToRoom(activeRoom.id, updated => {
      if (updated) {
        setActiveRoom(updated);
      }
    });

    const unsubParticipants = subscribeToParticipants(
      activeRoom.id,
      list => {
        setParticipants(list);
      },
      err => {
        console.warn('Participant subscription note:', err);
      }
    );

    return () => {
      unsubRoom();
      unsubParticipants();
    };
  }, [activeRoom?.id]);

  // Live timeline progress loop for teacher control bar
  useEffect(() => {
    if (!activeRoom) return;

    let animId: number;
    const loop = () => {
      const calculated = calculateRoomTimeline(activeRoom, Date.now());
      setRoomProgress({
        phase: calculated.phase,
        elapsedMs: calculated.elapsedMs,
        progress: calculated.progress,
      });
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [activeRoom]);

  // Start new classroom room or re-use existing active room (Room Reuse)
  const handleOpenClassroom = async (res: ReadingResource) => {
    setDashboardNotice(null);
    try {
      // Auto publish if draft so learners have access
      if (res.status !== 'published') {
        await publishResource(res.id);
        res.status = 'published';
      }

      // Ensure res.sentences and res.paragraphs exist
      if (!res.sentences || res.sentences.length === 0) {
        res.sentences = segmentSentences(res.canonicalText);
      }
      if (!res.paragraphs || res.paragraphs.length === 0) {
        res.paragraphs = segmentParagraphs(res.canonicalText);
      }

      // 1. ROOM REUSE: Re-use active room if active, avoid creating duplicate room documents
      if (activeRoom && activeRoom.status === 'active') {
        await applyToRoomCommand(
          activeRoom.id,
          activeRoom.revision || 0,
          res,
          0,
          stagedGranularity,
          stagedHighlight,
          stagedPolicy,
          stagedHoldMs,
          stagedEraseMs,
          stagedWindowMs,
          stagedEraseEffect,
          stagedDustAngle
        );
        setActivePresentedResource(res);
        setStagedUnitIndex(0);
        setSelectedQuickSwitchId(res.id);
        setActiveRoom(prev =>
          prev
            ? {
                ...prev,
                resourceId: res.id,
                resourceTitle: res.title,
                currentUnit: {
                  index: 0,
                  totalUnits: stagedGranularity === 'sentence' ? res.sentences.length : res.paragraphs.length,
                  granularity: stagedGranularity,
                  text: (stagedGranularity === 'sentence' ? res.sentences[0] : res.paragraphs[0]) || '',
                  annotations: [],
                },
              }
            : prev
        );
        setShowLibraryDrawer(false);
        setActiveMainTab('live');
        setDashboardNotice({
          type: 'success',
          text: `Đã chuyển sang bài đọc mới: "${res.title}" trong phòng hiện tại!`,
        });
        return;
      }

      const newRoom = await createClassroomRoom(
        res,
        user.displayName || 'Teacher',
        stagedGranularity,
        stagedHighlight,
        stagedPolicy,
        stagedHoldMs,
        stagedEraseMs,
        stagedWindowMs,
        stagedEraseEffect,
        stagedDustAngle
      );
      setActivePresentedResource(res);
      setActiveRoom(newRoom);
      setStagedUnitIndex(0);
      setSelectedQuickSwitchId(res.id);
      setShowLibraryDrawer(false);
      setActiveMainTab('live');
      setDashboardNotice({
        type: 'success',
        text: `Phòng học ${newRoom.id} đã mở! Học sinh có thể truy cập bằng link hoặc mã ${newRoom.id}.`,
      });
    } catch (err: any) {
      console.error('Could not create or reuse classroom:', err);
      setDashboardNotice({ type: 'error', text: err?.message || 'Lỗi không xác định khi mở phòng' });
    }
  };

  // Sync full speeches (Steve Jobs + 5 TED Talks)
  const handleSyncFullResources = async () => {
    setIsSyncing(true);
    setDashboardNotice(null);
    try {
      const data = await resetAndSyncFullResources(user.uid);
      setResources(data);
      if (data.length > 0) setStudioResource(data[0]);
      setDashboardNotice({
        type: 'success',
        text: 'Đã tải và đồng bộ thành công trọn vẹn 5 bài TED Talk & bài phát biểu Steve Jobs (hơn 30–50 câu mỗi bài)!',
      });
    } catch (err: any) {
      setDashboardNotice({ type: 'error', text: `Lỗi đồng bộ bài đọc: ${err.message}` });
    } finally {
      setIsSyncing(false);
    }
  };

  // Publish resource handler
  const handlePublish = async (resId: string) => {
    try {
      await publishResource(resId);
      await loadResources();
      setDashboardNotice({ type: 'success', text: 'Đã xuất bản bài đọc thành công!' });
    } catch (err: any) {
      setDashboardNotice({ type: 'error', text: `Xuất bản thất bại: ${err.message}` });
    }
  };

  // Delete resource handler
  const handleDelete = async (resId: string) => {
    try {
      await deleteResource(resId);
      await loadResources();
      setDashboardNotice({ type: 'info', text: 'Đã xóa bài đọc khỏi thư viện.' });
    } catch (err: any) {
      setDashboardNotice({ type: 'error', text: `Xóa thất bại: ${err.message}` });
    }
  };

  // Apply staged settings to live room
  const handleApplyToRoom = async () => {
    if (!activeRoom || !activePresentedResource) return;
    setIsApplying(true);
    try {
      await applyToRoomCommand(
        activeRoom.id,
        activeRoom.revision,
        activePresentedResource,
        stagedUnitIndex,
        stagedGranularity,
        stagedHighlight,
        stagedPolicy,
        stagedHoldMs,
        stagedEraseMs,
        stagedWindowMs,
        stagedEraseEffect,
        stagedDustAngle,
        {
          sentenceHoldMs: stagedSentenceHoldMs,
          sentenceEraseMs: stagedSentenceEraseMs,
          paragraphHoldMs: stagedParagraphHoldMs,
          paragraphEraseMs: stagedParagraphEraseMs,
          dynamicPacingEnabled,
          readingWpm,
          autoMergeShortUnits,
          minWordsPerUnit,
          customUnitsList: currentUnitsList,
        }
      );
      setDashboardNotice({ type: 'success', text: `Đã lưu cài đặt và áp dụng đoạn #${stagedUnitIndex + 1} sang màn hình học sinh.` });
    } catch (err: any) {
      setDashboardNotice({ type: 'error', text: `Áp dụng thất bại: ${err.message}` });
    } finally {
      setIsApplying(false);
    }
  };

  // Playback commands
  const handlePlayTurn = async () => {
    if (!activeRoom) return;
    try {
      await playTurnCommand(activeRoom.id, activeRoom.revision);
    } catch (err: any) {
      setDashboardNotice({ type: 'error', text: `Lỗi phát: ${err.message}` });
    }
  };

  const handlePauseTurn = async () => {
    if (!activeRoom) return;
    try {
      await pauseTurnCommand(activeRoom.id, activeRoom.revision, roomProgress.elapsedMs);
    } catch (err: any) {
      setDashboardNotice({ type: 'error', text: `Lỗi tạm dừng: ${err.message}` });
    }
  };

  const handleResumeTurn = async () => {
    if (!activeRoom) return;
    try {
      await resumeTurnCommand(activeRoom.id, activeRoom.revision, activeRoom.pausedElapsedMs);
    } catch (err: any) {
      setDashboardNotice({ type: 'error', text: `Lỗi tiếp tục: ${err.message}` });
    }
  };

  const handleShowTurn = async () => {
    if (!activeRoom) return;
    try {
      await showTurnCommand(activeRoom.id, activeRoom.revision);
    } catch (err: any) {
      setDashboardNotice({ type: 'error', text: `Lỗi hiển thị: ${err.message}` });
    }
  };

  const handleHideTurn = async () => {
    if (!activeRoom) return;
    try {
      await hideTurnCommand(activeRoom.id, activeRoom.revision);
    } catch (err: any) {
      setDashboardNotice({ type: 'error', text: `Lỗi ẩn màn hình: ${err.message}` });
    }
  };

  const handleEndRoom = async () => {
    if (!activeRoom) return;
    try {
      await endRoomCommand(activeRoom.id, activeRoom.revision);
      setActiveRoom(null);
      setDashboardNotice({ type: 'info', text: 'Đã kết thúc buổi học trực tiếp.' });
    } catch (err: any) {
      setDashboardNotice({ type: 'error', text: `Lỗi kết thúc phòng: ${err.message}` });
    }
  };

  // Copy join link (Dedicated Student Endpoint)
  const handleCopyLink = () => {
    if (!activeRoom) return;
    const url = `${window.location.origin}/student?room=${activeRoom.id}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    });
  };

  // Filtered resources
  const existingCategories = Array.from(new Set(resources.map(r => r.category)));
  const filteredResources = resources.filter(r => {
    const matchesSearch =
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.canonicalText.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || r.category === selectedCategory;
    const matchesLevel = selectedLevel === 'all' || r.level === selectedLevel;
    const matchesStatus = statusTab === 'all' || r.status === statusTab;
    return matchesSearch && matchesCategory && matchesLevel && matchesStatus;
  });

  // Calculate staged unit text and slices for private teacher preview
  const rawUnitsList = activePresentedResource
    ? stagedGranularity === 'sentence'
      ? activePresentedResource.sentences
      : activePresentedResource.paragraphs
    : [];

  // Intelligently merge short units if setting enabled (Requirement 7)
  const currentUnitsList = React.useMemo(() => {
    if (!autoMergeShortUnits || rawUnitsList.length === 0) return rawUnitsList;
    return mergeShortUnits(rawUnitsList, { minWords: minWordsPerUnit });
  }, [rawUnitsList, autoMergeShortUnits, minWordsPerUnit]);

  currentUnitsListRef.current = currentUnitsList;
  const stagedText = currentUnitsList[stagedUnitIndex] || '';

  // Dynamic Pacing calculation for active unit (Requirement 7)
  const dynamicHoldInfo = React.useMemo(() => {
    if (!dynamicPacingEnabled || !stagedText) {
      return {
        holdDurationMs: stagedHoldMs,
        wordCount: stagedText ? stagedText.trim().split(/\s+/).filter(Boolean).length : 0,
        isAdjusted: false,
        adjustedDiffMs: 0,
      };
    }
    return calculateDynamicHoldDuration({
      text: stagedText,
      baseHoldMs: stagedHoldMs,
      granularity: stagedGranularity,
      readingWpm,
    });
  }, [stagedText, stagedHoldMs, stagedGranularity, dynamicPacingEnabled, readingWpm]);

  // Helper to retrieve calibrated hold duration for any index
  const getDynamicHoldForIndex = (index: number) => {
    const text = currentUnitsList[index] || '';
    if (!dynamicPacingEnabled || !text) return stagedHoldMs;
    return calculateDynamicHoldDuration({
      text,
      baseHoldMs: stagedHoldMs,
      granularity: stagedGranularity,
      readingWpm,
    }).holdDurationMs;
  };

  const stagedApprovedSpans = activePresentedResource
    ? activePresentedResource.annotations
        .filter(a => a.status === 'approved' && (stagedText.includes(a.text) || (a.unitIndex === stagedUnitIndex && a.unitType === stagedGranularity)))
        .map(a => ({
          id: a.id,
          text: a.text,
          startOffset: a.startOffset,
          endOffset: a.endOffset,
          type: a.type,
          meaning: a.meaning,
        }))
    : [];

  const stagedSlices = buildRenderSlices(stagedText, stagedHighlight ? stagedApprovedSpans : []);

  // Granularity switcher: sentence vs paragraph (Requirement 5 & 6)
  const handleSwitchGranularity = async (newGranularity: Granularity) => {
    if (newGranularity === stagedGranularity && !activeRoom?.isFullReview) return;
    setStagedGranularity(newGranularity);
    setStagedUnitIndex(0);

    const nextHoldMs = newGranularity === 'sentence' ? stagedSentenceHoldMs : stagedParagraphHoldMs;
    const nextEraseMs = newGranularity === 'sentence' ? stagedSentenceEraseMs : stagedParagraphEraseMs;
    setStagedHoldMs(nextHoldMs);
    setStagedEraseMs(nextEraseMs);

    if (activeRoom && activePresentedResource) {
      const raw = newGranularity === 'sentence'
        ? activePresentedResource.sentences
        : activePresentedResource.paragraphs;
      const targetUnits = autoMergeShortUnits ? mergeShortUnits(raw, { minWords: minWordsPerUnit }) : raw;

      try {
        await applyToRoomCommand(
          activeRoom.id,
          activeRoom.revision,
          activePresentedResource,
          0,
          newGranularity,
          stagedHighlight,
          stagedPolicy,
          nextHoldMs,
          nextEraseMs,
          stagedWindowMs,
          stagedEraseEffect,
          stagedDustAngle,
          {
            sentenceHoldMs: stagedSentenceHoldMs,
            sentenceEraseMs: stagedSentenceEraseMs,
            paragraphHoldMs: stagedParagraphHoldMs,
            paragraphEraseMs: stagedParagraphEraseMs,
            dynamicPacingEnabled,
            readingWpm,
            autoMergeShortUnits,
            minWordsPerUnit,
            customUnitsList: targetUnits,
          }
        );
        setDashboardNotice({
          type: 'success',
          text: `Đã chuyển sang chế độ ${newGranularity === 'sentence' ? 'Câu (Sentence)' : 'Đoạn (Paragraph)'} và áp dụng thời gian ${nextHoldMs / 1000}s.`,
        });
      } catch (err: any) {
        console.error('Error switching granularity:', err);
      }
    }
  };

  // Full Text Review Mode handlers (Requirement 6)
  const isFullReviewActive = Boolean(activeRoom?.isFullReview);

  const handleToggleFullReview = async () => {
    if (!activeRoom || !activePresentedResource) return;
    try {
      const nextReview = !isFullReviewActive;
      await setFullReviewCommand(
        activeRoom.id,
        activeRoom.revision,
        activePresentedResource,
        nextReview
      );
      setDashboardNotice({
        type: nextReview ? 'success' : 'info',
        text: nextReview
          ? 'Đã bật chế độ Xem lại toàn bộ bài đọc! Màn hình học sinh đang hiển thị toàn văn không giới hạn thời gian.'
          : 'Đã tắt chế độ Xem lại toàn bộ bài đọc. Trở về nhịp đọc từng câu/đoạn.',
      });
    } catch (err: any) {
      setDashboardNotice({ type: 'error', text: `Lỗi bật review toàn bộ: ${err.message}` });
    }
  };

  const handleExitFullReview = async () => {
    if (!activeRoom || !activePresentedResource) return;
    try {
      await setFullReviewCommand(
        activeRoom.id,
        activeRoom.revision,
        activePresentedResource,
        false
      );
      setDashboardNotice({ type: 'info', text: 'Đã thoát chế độ Review toàn bài.' });
    } catch (err: any) {
      console.error('Error exiting review:', err);
    }
  };

  // Step-only navigation (updates staged unit and room without auto-triggering play)
  const handlePreviousSentenceOnly = async () => {
    const currentRoom = activeRoomRef.current;
    const resource = activePresentedResourceRef.current;
    const currentIndex = stagedUnitIndexRef.current;
    const settings = stagedSettingsRef.current;

    if (!currentRoom || !resource) return;
    if (currentIndex <= 0) {
      setDashboardNotice({ type: 'info', text: 'Đang ở câu / đoạn đầu tiên!' });
      return;
    }
    const prevIdx = currentIndex - 1;
    setStagedUnitIndex(prevIdx);
    const holdMs = getDynamicHoldForIndex(prevIdx);

    try {
      await applyToRoomCommand(
        currentRoom.id,
        currentRoom.revision,
        resource,
        prevIdx,
        settings.stagedGranularity,
        settings.stagedHighlight,
        settings.stagedPolicy,
        holdMs,
        settings.stagedEraseMs,
        settings.stagedWindowMs,
        settings.stagedEraseEffect,
        settings.stagedDustAngle,
        {
          sentenceHoldMs: stagedSentenceHoldMs,
          sentenceEraseMs: stagedSentenceEraseMs,
          paragraphHoldMs: stagedParagraphHoldMs,
          paragraphEraseMs: stagedParagraphEraseMs,
          dynamicPacingEnabled,
          readingWpm,
          autoMergeShortUnits,
          minWordsPerUnit,
          customUnitsList: currentUnitsList,
        }
      );
    } catch (err: any) {
      console.error('Error going to previous unit:', err);
      setDashboardNotice({ type: 'error', text: `Lỗi lùi câu: ${err.message}` });
    }
  };

  const handleNextSentenceOnly = async () => {
    const currentRoom = activeRoomRef.current;
    const resource = activePresentedResourceRef.current;
    const units = currentUnitsListRef.current;
    const currentIndex = stagedUnitIndexRef.current;
    const settings = stagedSettingsRef.current;

    if (!currentRoom || !resource) return;
    if (currentIndex >= units.length - 1) {
      setDashboardNotice({ type: 'info', text: 'Đã đến câu / đoạn cuối cùng của bài đọc!' });
      return;
    }
    const nextIdx = currentIndex + 1;
    setStagedUnitIndex(nextIdx);
    const holdMs = getDynamicHoldForIndex(nextIdx);

    try {
      await applyToRoomCommand(
        currentRoom.id,
        currentRoom.revision,
        resource,
        nextIdx,
        settings.stagedGranularity,
        settings.stagedHighlight,
        settings.stagedPolicy,
        holdMs,
        settings.stagedEraseMs,
        settings.stagedWindowMs,
        settings.stagedEraseEffect,
        settings.stagedDustAngle,
        {
          sentenceHoldMs: stagedSentenceHoldMs,
          sentenceEraseMs: stagedSentenceEraseMs,
          paragraphHoldMs: stagedParagraphHoldMs,
          paragraphEraseMs: stagedParagraphEraseMs,
          dynamicPacingEnabled,
          readingWpm,
          autoMergeShortUnits,
          minWordsPerUnit,
          customUnitsList: currentUnitsList,
        }
      );
    } catch (err: any) {
      console.error('Error advancing to next unit:', err);
      setDashboardNotice({ type: 'error', text: `Lỗi chuyển câu tiếp: ${err.message}` });
    }
  };

  // Slide Remote Clicker & Hotkey Handlers
  const handleAdvanceAndPlay = async () => {
    const currentRoom = activeRoomRef.current;
    const resource = activePresentedResourceRef.current;
    const units = currentUnitsListRef.current;
    const currentIndex = stagedUnitIndexRef.current;
    const settings = stagedSettingsRef.current;

    if (!currentRoom || !resource) return;
    if (currentIndex >= units.length - 1) {
      setDashboardNotice({ type: 'info', text: 'Đã đến câu / đoạn cuối cùng của bài đọc!' });
      return;
    }
    const nextIdx = currentIndex + 1;
    setStagedUnitIndex(nextIdx);
    const holdMs = getDynamicHoldForIndex(nextIdx);

    try {
      await applyToRoomCommand(
        currentRoom.id,
        currentRoom.revision,
        resource,
        nextIdx,
        settings.stagedGranularity,
        settings.stagedHighlight,
        settings.stagedPolicy,
        holdMs,
        settings.stagedEraseMs,
        settings.stagedWindowMs,
        settings.stagedEraseEffect,
        settings.stagedDustAngle,
        {
          sentenceHoldMs: stagedSentenceHoldMs,
          sentenceEraseMs: stagedSentenceEraseMs,
          paragraphHoldMs: stagedParagraphHoldMs,
          paragraphEraseMs: stagedParagraphEraseMs,
          dynamicPacingEnabled,
          readingWpm,
          autoMergeShortUnits,
          minWordsPerUnit,
          customUnitsList: currentUnitsList,
        }
      );
      const latestRevision = activeRoomRef.current?.revision ?? currentRoom.revision;
      await playTurnCommand(currentRoom.id, Math.max(latestRevision, currentRoom.revision + 1));
    } catch (err: any) {
      console.error('Error advancing to next unit:', err);
      setDashboardNotice({ type: 'error', text: `Lỗi chuyển câu tiếp: ${err.message}` });
    }
  };

  const handlePreviousAndPlay = async () => {
    const currentRoom = activeRoomRef.current;
    const resource = activePresentedResourceRef.current;
    const currentIndex = stagedUnitIndexRef.current;
    const settings = stagedSettingsRef.current;

    if (!currentRoom || !resource) return;
    if (currentIndex <= 0) {
      setDashboardNotice({ type: 'info', text: 'Đang ở câu / đoạn đầu tiên!' });
      return;
    }
    const prevIdx = currentIndex - 1;
    setStagedUnitIndex(prevIdx);
    const holdMs = getDynamicHoldForIndex(prevIdx);

    try {
      await applyToRoomCommand(
        currentRoom.id,
        currentRoom.revision,
        resource,
        prevIdx,
        settings.stagedGranularity,
        settings.stagedHighlight,
        settings.stagedPolicy,
        holdMs,
        settings.stagedEraseMs,
        settings.stagedWindowMs,
        settings.stagedEraseEffect,
        settings.stagedDustAngle,
        {
          sentenceHoldMs: stagedSentenceHoldMs,
          sentenceEraseMs: stagedSentenceEraseMs,
          paragraphHoldMs: stagedParagraphHoldMs,
          paragraphEraseMs: stagedParagraphEraseMs,
          dynamicPacingEnabled,
          readingWpm,
          autoMergeShortUnits,
          minWordsPerUnit,
          customUnitsList: currentUnitsList,
        }
      );
      const latestRevision = activeRoomRef.current?.revision ?? currentRoom.revision;
      await playTurnCommand(currentRoom.id, Math.max(latestRevision, currentRoom.revision + 1));
    } catch (err: any) {
      console.error('Error going to previous unit:', err);
      setDashboardNotice({ type: 'error', text: `Lỗi lùi về câu trước: ${err.message}` });
    }
  };

  const handleReplayCurrent = async () => {
    const currentRoom = activeRoomRef.current;
    if (!currentRoom) return;
    try {
      await playTurnCommand(currentRoom.id, currentRoom.revision);
    } catch (err: any) {
      console.error('Error replaying current unit:', err);
      setDashboardNotice({ type: 'error', text: `Lỗi phát lại: ${err.message}` });
    }
  };

  const handleTogglePlayPause = async () => {
    const currentRoom = activeRoomRef.current;
    if (!currentRoom) return;
    if (currentRoom.playbackStatus === 'playing') {
      await handlePauseTurn();
    } else if (currentRoom.playbackStatus === 'paused') {
      await handleResumeTurn();
    } else {
      await handlePlayTurn();
    }
  };

  const handleToggleBlankOrShow = async () => {
    const currentRoom = activeRoomRef.current;
    if (!currentRoom) return;
    if (currentRoom.playbackStatus === 'idle') {
      await handleShowTurn();
    } else {
      await handleHideTurn();
    }
  };

  const handleBackKey = () => {
    const now = Date.now();
    if (now - lastBackPressTimeRef.current <= 1500 && stagedUnitIndexRef.current > 0) {
      lastBackPressTimeRef.current = 0;
      handlePreviousAndPlay();
    } else {
      lastBackPressTimeRef.current = now;
      handleReplayCurrent();
    }
  };

  // Presentation Remote & Hotkeys Listener (PageDown/Up, ArrowLeft/Right, Space, B/.)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Guard: ignore keydown when active element is input, textarea, or contentEditable
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }

      // Guard: ignore if modal or drawer is open
      if (isEditorOpen || reviewingResource || showStudioModal || showLibraryDrawer) {
        return;
      }

      if (!activeRoomRef.current || !activePresentedResourceRef.current) {
        return;
      }

      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        e.preventDefault();
        handleAdvanceAndPlay();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        handleBackKey();
      } else if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        handleTogglePlayPause();
      } else if (e.key === 'b' || e.key === 'B' || e.key === '.') {
        e.preventDefault();
        handleToggleBlankOrShow();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isEditorOpen, reviewingResource, showStudioModal, showLibraryDrawer]);

  // Auto-Advance Controller: when phase === 'blank_finished', after 1.5s comfortable pause, advance and play
  useEffect(() => {
    if (!autoAdvance) {
      if (autoAdvanceTimerRef.current) {
        clearTimeout(autoAdvanceTimerRef.current);
        autoAdvanceTimerRef.current = null;
      }
      return;
    }

    if (!activeRoom || activeRoom.playbackStatus !== 'playing') {
      return;
    }

    if (roomProgress.phase === 'blank_finished') {
      if (autoAdvanceTriggeredUnitRef.current === stagedUnitIndex) {
        return;
      }
      autoAdvanceTriggeredUnitRef.current = stagedUnitIndex;
      autoAdvanceTimerRef.current = setTimeout(() => {
        if (stagedUnitIndex < currentUnitsList.length - 1) {
          handleAdvanceAndPlay();
        } else {
          setAutoAdvance(false);
          setDashboardNotice({
            type: 'success',
            text: 'Đã hoàn thành tự động chuyển câu toàn bộ bài đọc!',
          });
        }
      }, 1500);
    } else {
      if (autoAdvanceTimerRef.current) {
        clearTimeout(autoAdvanceTimerRef.current);
        autoAdvanceTimerRef.current = null;
      }
    }

    return () => {
      if (autoAdvanceTimerRef.current) {
        clearTimeout(autoAdvanceTimerRef.current);
        autoAdvanceTimerRef.current = null;
      }
    };
  }, [
    autoAdvance,
    roomProgress.phase,
    activeRoom?.playbackStatus,
    stagedUnitIndex,
    currentUnitsList.length,
  ]);

  // Render Library Content (reusable for main view or slide-over drawer)
  const renderLibraryContent = (isDrawerMode: boolean) => (
    <div className={`space-y-4 ${isDrawerMode ? 'p-5' : ''}`}>
      <div className="flex flex-wrap items-center justify-between border-b border-black pb-2.5 gap-2">
        <div className="flex items-center gap-2">
          <Layers size={16} className="text-black" />
          <h2 className="text-sm font-black uppercase tracking-tight text-black">
            Thư viện bài đọc ({filteredResources.length})
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            disabled={isSyncing}
            onClick={handleSyncFullResources}
            className="neo-btn-sm px-2.5 py-1 bg-[#4ADE80] text-black text-[11px] font-bold flex items-center gap-1 hover:bg-green-400"
            title="Đồng bộ lại toàn bộ 5 bài TED Talk & bài phát biểu Steve Jobs (đầy đủ hơn 30-50 câu mỗi bài)"
          >
            <RefreshCw size={12} className={isSyncing ? 'animate-spin' : ''} />
            <span>{isSyncing ? 'Đang đồng bộ...' : 'Đồng bộ 5 TED & Steve Jobs'}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setEditingResource(null);
              setIsEditorOpen(true);
            }}
            className="neo-btn-sm px-2 py-1 bg-[#FFE500] text-black text-[11px] font-bold"
          >
            <Plus size={12} className="mr-0.5" /> Thêm bài
          </button>
          {isDrawerMode && (
            <button
              type="button"
              onClick={() => setShowLibraryDrawer(false)}
              className="p-1 hover:bg-neutral-200 border border-black text-black ml-1"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Status tabs: All / Published / Draft */}
      <div className="flex border border-black text-xs font-mono font-bold shadow-[1px_1px_0px_#000]">
        <button
          type="button"
          onClick={() => setStatusTab('all')}
          className={`flex-1 py-1 text-center ${statusTab === 'all' ? 'bg-black text-white' : 'bg-white text-black'}`}
        >
          Tất cả ({resources.length})
        </button>
        <button
          type="button"
          onClick={() => setStatusTab('published')}
          className={`flex-1 py-1 text-center border-l border-black ${statusTab === 'published' ? 'bg-[#4ADE80] text-black' : 'bg-white text-black'}`}
        >
          Published ({resources.filter(r => r.status === 'published').length})
        </button>
        <button
          type="button"
          onClick={() => setStatusTab('draft')}
          className={`flex-1 py-1 text-center border-l border-black ${statusTab === 'draft' ? 'bg-[#FFE500] text-black' : 'bg-white text-black'}`}
        >
          Draft ({resources.filter(r => r.status === 'draft').length})
        </button>
      </div>

      {/* Search & Category Filter */}
      <div className="space-y-2">
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-2.5 text-neutral-400" />
          <input
            type="text"
            placeholder="Tìm theo tiêu đề, chủ đề, nội dung..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="neo-input w-full text-xs pl-8"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className="neo-input text-xs py-1"
          >
            <option value="all">Tất cả chủ đề</option>
            {existingCategories.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <select
            value={selectedLevel}
            onChange={e => setSelectedLevel(e.target.value)}
            className="neo-input text-xs py-1"
          >
            <option value="all">Tất cả trình độ</option>
            <option value="B1 Intermediate">B1 Intermediate</option>
            <option value="B2 Upper-Intermediate">B2 Upper-Intermediate</option>
            <option value="C1 Advanced">C1 Advanced</option>
          </select>
        </div>
      </div>

      {/* Resources Cards Grid */}
      <div className={isDrawerMode ? "space-y-3 max-h-[60vh] overflow-y-auto pr-1" : "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"}>
        {loadingResources ? (
          <div className="col-span-full p-8 text-center text-xs font-mono text-neutral-500">
            <span className="w-3 h-3 bg-[#FF3838] border border-black inline-block animate-spin mr-2"></span>
            Đang tải danh sách bài đọc...
          </div>
        ) : filteredResources.length === 0 ? (
          <div className="col-span-full p-6 text-center text-xs font-mono text-neutral-500 bg-neutral-50 border border-dashed border-black">
            Không tìm thấy bài đọc nào phù hợp. Bấm "Đồng bộ 5 TED & Steve Jobs" để nạp tài liệu!
          </div>
        ) : (
          filteredResources.map(res => {
            const isPublished = res.status === 'published';
            const approvedCount = res.annotations.filter(a => a.status === 'approved').length;
            const totalPhrases = res.annotations.length;
            const sentenceCount = res.sentences?.length || 0;
            const paragraphCount = res.paragraphs?.length || 0;

            return (
              <div
                key={res.id}
                className={`neo-box-sm p-3.5 flex flex-col justify-between transition-all ${
                  activeRoom?.resourceId === res.id ? 'border-[#FF3838] bg-red-50/40 ring-2 ring-[#FF3838]' : 'bg-[#FFFDF0]'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-1 mb-1">
                        {activeRoom && activeRoom.status === 'active' && activeRoom.resourceId === res.id && (
                          <span className="neo-badge bg-[#FF3838] text-white text-[9px] py-0 px-1 font-bold">
                            ĐANG DẠY
                          </span>
                        )}
                        {isPublished ? (
                          <span className="neo-badge bg-[#4ADE80] text-black text-[9px] py-0 px-1">
                            Published
                          </span>
                        ) : (
                          <span className="neo-badge bg-[#FFE500] text-black text-[9px] py-0 px-1">
                            Draft
                          </span>
                        )}
                        <span className="text-[10px] font-mono text-neutral-700 bg-white px-1 border border-black">
                          {res.level}
                        </span>
                        <span className="text-[10px] font-mono text-neutral-500 bg-neutral-100 px-1 border border-black truncate max-w-[120px]">
                          {sentenceCount} câu • {paragraphCount} đoạn
                        </span>
                      </div>
                      <h4 className="font-bold text-sm text-black truncate font-reading" title={res.title}>
                        {res.title}
                      </h4>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingResource(res);
                          setIsEditorOpen(true);
                        }}
                        className="p-1 hover:bg-neutral-200 text-black border border-black"
                        title="Chỉnh sửa bài"
                      >
                        <Edit size={11} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(res.id)}
                        className="p-1 hover:bg-red-200 text-red-700 border border-black"
                        title="Xóa bài"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </div>

                  <p className="text-xs font-reading text-neutral-700 line-clamp-2 mb-3">
                    {res.canonicalText}
                  </p>
                </div>

                <div className="pt-2 border-t border-black/15 flex flex-wrap items-center justify-between gap-1.5 text-[11px] font-mono">
                  <button
                    type="button"
                    onClick={() => {
                      setStudioResource(res);
                      if (activeRoom) {
                        setShowStudioModal(true);
                      } else {
                        setActiveMainTab('studio');
                      }
                    }}
                    className="font-bold text-neutral-800 hover:text-[#FF3838] flex items-center gap-1"
                    title="Mở Studio duyệt & thêm cụm từ"
                  >
                    <Highlighter size={11} />
                    <span>{approvedCount}/{totalPhrases} Chunks</span>
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setReviewingResource(res);
                      }}
                      className="neo-btn-sm px-1.5 py-0.5 text-[10px] font-bold bg-white text-black hover:bg-neutral-100"
                      title="Xem danh sách cụm từ"
                    >
                      <Eye size={10} className="mr-0.5" /> Xem
                    </button>

                    {activeRoom && activeRoom.status === 'active' ? (
                      <button
                        type="button"
                        onClick={() => handleOpenClassroom(res)}
                        className="neo-btn-sm px-2 py-0.5 bg-[#4ADE80] text-black text-[10px] font-bold hover:bg-green-400"
                        title="Nạp bài này vào phòng học đang mở"
                      >
                        <RefreshCw size={10} className="mr-0.5 inline" />
                        <span>🔄 Nạp vào phòng</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleOpenClassroom(res)}
                        className="neo-btn-sm px-2 py-0.5 bg-[#FF3838] text-white text-[10px] font-bold hover:bg-red-600"
                        title="Mở phòng live với bài này ngay"
                      >
                        <Play size={10} className="mr-0.5" /> Live
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-4 py-4 space-y-4">
      {/* In-app Notice Banner (Replaces window.alert) */}
      {dashboardNotice && (
        <div
          className={`p-2.5 border border-black flex items-center justify-between text-xs font-mono font-bold shadow-[1px_1px_0px_#000] ${
            dashboardNotice.type === 'error'
              ? 'bg-red-100 text-red-900 border-red-900'
              : dashboardNotice.type === 'success'
              ? 'bg-green-100 text-green-900 border-green-900'
              : 'bg-blue-100 text-blue-900 border-blue-900'
          }`}
        >
          <span>{dashboardNotice.text}</span>
          <button
            type="button"
            onClick={() => setDashboardNotice(null)}
            className="p-1 hover:opacity-75"
          >
            <X size={13} />
          </button>
        </div>
      )}

      {/* Permanent Top Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between border-b-2 border-black pb-3 gap-2">
        <div className="flex border-2 border-black bg-white p-0.5 shadow-[2px_2px_0px_#000]">
          <button
            type="button"
            onClick={() => setActiveMainTab('live')}
            className={`px-3 py-1.5 text-xs font-mono font-bold uppercase flex items-center gap-1.5 transition-all ${
              activeMainTab === 'live'
                ? 'bg-[#FF3838] text-white shadow-[1px_1px_0px_#000]'
                : 'text-neutral-700 hover:text-black hover:bg-neutral-100'
            }`}
          >
            <Radio size={14} className={activeRoom && activeRoom.status === 'active' ? 'animate-pulse text-white' : ''} />
            <span>🔴 Lớp học Trực tiếp (Live)</span>
            {activeRoom && activeRoom.status === 'active' && (
              <span className="neo-badge bg-[#4ADE80] text-black text-[9px] py-0 px-1 font-mono font-bold ml-0.5">
                {activeRoom.id}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveMainTab('library')}
            className={`px-3 py-1.5 text-xs font-mono font-bold uppercase flex items-center gap-1.5 transition-all border-l-2 border-black ${
              activeMainTab === 'library'
                ? 'bg-[#FFE500] text-black shadow-[1px_1px_0px_#000]'
                : 'text-neutral-700 hover:text-black hover:bg-neutral-100'
            }`}
          >
            <Layers size={14} />
            <span>📚 Thư viện ({resources.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMainTab('studio')}
            className={`px-3 py-1.5 text-xs font-mono font-bold uppercase flex items-center gap-1.5 transition-all border-l-2 border-black ${
              activeMainTab === 'studio'
                ? 'bg-[#00D2FF] text-black shadow-[1px_1px_0px_#000]'
                : 'text-neutral-700 hover:text-black hover:bg-neutral-100'
            }`}
          >
            <Highlighter size={14} />
            <span>✨ Studio Cụm từ</span>
          </button>
        </div>

        {/* Quick Header Actions if Live Room Active */}
        {activeRoom && activeRoom.status === 'active' && (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleCopyLink}
              className="neo-btn-sm px-2.5 py-1 bg-white text-black text-xs font-bold"
              title="Sao chép link học sinh"
            >
              {copiedLink ? <Check size={12} className="mr-1 text-green-600" /> : <Copy size={12} />}
              <span>{copiedLink ? 'Đã chép link!' : 'Copy Link'}</span>
            </button>

            <button
              type="button"
              onClick={() => onOpenLearnerView(activeRoom.id)}
              className="neo-btn-sm px-2 py-1 bg-[#00D2FF] text-black text-xs font-bold"
              title="Xem giao diện học sinh toàn màn hình"
            >
              <ExternalLink size={12} className="mr-1" /> Màn hình HS
            </button>

            <button
              type="button"
              onClick={handleEndRoom}
              className="neo-btn-sm px-2.5 py-1 bg-[#FF3838] text-white text-xs font-bold hover:bg-red-600"
            >
              Kết thúc
            </button>
          </div>
        )}
      </div>

      {/* Main Tab Content */}
      {activeMainTab === 'live' ? (
        activeRoom && activeRoom.status === 'active' && activePresentedResource ? (
          /* TWO-COLUMN LIVE CLASSROOM WORKSPACE */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
            {/* Left / Center Column: lg:col-span-8 (~70% width) */}
            <div className="lg:col-span-8 space-y-4">
              {/* GỘP CHUNG MỘT KHỐI THỐNG NHẤT: Nội dung câu + Điều hướng + Trình chiếu Slide Remote */}
              <div className="neo-box bg-white p-4 sm:p-5 space-y-4">
                {/* Header: Số thứ tự câu + Thanh tiến độ mini + Sĩ số + Mã phòng + Trạng thái phát */}
                <div className="space-y-2 pb-3 border-b border-black">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="neo-badge bg-[#FFE500] text-black text-xs font-mono font-bold">
                        {isFullReviewActive
                          ? 'Review Toàn bài'
                          : `${stagedGranularity === 'paragraph' ? 'Đoạn' : 'Câu'} ${stagedUnitIndex + 1} / ${currentUnitsList.length}`}
                      </span>
                      <span className="font-mono text-xs font-bold text-neutral-800 truncate max-w-[200px] sm:max-w-xs">
                        {activePresentedResource.title}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      {/* Sĩ số online */}
                      <span className="neo-badge bg-[#4ADE80] text-black text-[10px] py-0.5 px-1.5 font-bold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-700 animate-pulse inline-block"></span>
                        👥 {participants.length}
                      </span>

                      {/* Mã phòng */}
                      <span className="neo-badge bg-white text-black text-[10px] py-0.5 px-1.5 font-mono font-bold">
                        🏷️ {activeRoom.id}
                      </span>

                      {/* Trạng thái phát */}
                      {(() => {
                        if (isFullReviewActive) {
                          return (
                            <span className="neo-badge bg-[#00D2FF] text-black text-[10px] py-0.5 px-1.5 font-bold">
                              📖 REVIEW TOÀN BÀI
                            </span>
                          );
                        }
                        const status = activeRoom.playbackStatus;
                        if (status === 'playing') {
                          return (
                            <span className="neo-badge bg-[#4ADE80] text-black text-[10px] py-0.5 px-1.5 font-bold animate-pulse">
                              ● ĐANG PHÁT
                            </span>
                          );
                        }
                        if (status === 'paused') {
                          return (
                            <span className="neo-badge bg-[#FFE500] text-black text-[10px] py-0.5 px-1.5 font-bold">
                              ❚❚ TẠM DỪNG
                            </span>
                          );
                        }
                        if (status === 'manual_show') {
                          return (
                            <span className="neo-badge bg-[#00D2FF] text-black text-[10px] py-0.5 px-1.5 font-bold">
                              💬 THẢO LUẬN
                            </span>
                          );
                        }
                        return (
                          <span className="neo-badge bg-neutral-200 text-neutral-700 text-[10px] py-0.5 px-1.5 font-bold">
                            ○ CHỜ PHÁT
                          </span>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Thanh tiến độ câu bài đọc mini */}
                  {!isFullReviewActive && (
                    <div className="w-full h-1.5 bg-neutral-200 border border-black overflow-hidden">
                      <div
                        style={{
                          width: `${currentUnitsList.length > 0 ? ((stagedUnitIndex + 1) / currentUnitsList.length) * 100 : 0}%`,
                        }}
                        className="h-full bg-[#FF3838] transition-all duration-300"
                      ></div>
                    </div>
                  )}
                </div>

                {/* Chế độ trình chiếu: Câu (Sentence) | Đoạn (Paragraph) | Toàn bài (Full Review) (Requirement 5 & 6) */}
                <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-[#FFFDF0] border-2 border-black shadow-[1px_1px_0px_#000]">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-mono font-bold uppercase text-neutral-700">Đơn vị đọc:</span>
                    <div className="inline-flex border border-black bg-white shadow-[1px_1px_0px_#000]">
                      <button
                        type="button"
                        onClick={() => handleSwitchGranularity('sentence')}
                        className={`px-2.5 py-1 text-xs font-mono font-black uppercase transition-all ${
                          stagedGranularity === 'sentence' && !isFullReviewActive
                            ? 'bg-[#FFE500] text-black shadow-[1px_1px_0px_#000]'
                            : 'text-neutral-700 hover:text-black hover:bg-neutral-50'
                        }`}
                        title="Trình chiếu theo từng câu ngắn"
                      >
                        📝 Câu (Sentence)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSwitchGranularity('paragraph')}
                        className={`px-2.5 py-1 text-xs font-mono font-black uppercase border-l border-black transition-all ${
                          stagedGranularity === 'paragraph' && !isFullReviewActive
                            ? 'bg-[#FFE500] text-black shadow-[1px_1px_0px_#000]'
                            : 'text-neutral-700 hover:text-black hover:bg-neutral-50'
                        }`}
                        title="Trình chiếu theo từng đoạn văn dài"
                      >
                        📄 Đoạn (Paragraph)
                      </button>
                    </div>
                  </div>

                  {/* Nút Xem lại toàn bộ bài đọc (Full Text Review Mode - Requirement 6) */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleToggleFullReview}
                      className={`neo-btn-sm px-2.5 py-1 text-xs font-mono font-black uppercase flex items-center gap-1.5 transition-all ${
                        isFullReviewActive
                          ? 'bg-[#00D2FF] text-black ring-2 ring-black font-black'
                          : 'bg-white text-black hover:bg-neutral-100'
                      }`}
                      title="Hiển thị toàn bộ bài đọc không giới hạn thời gian cho học sinh ôn tập và thảo luận"
                    >
                      <BookOpen size={13} />
                      <span>{isFullReviewActive ? 'Đang bật Review Toàn bài' : '📖 Xem lại toàn bộ bài đọc'}</span>
                    </button>

                    {isFullReviewActive && (
                      <button
                        type="button"
                        onClick={handleExitFullReview}
                        className="neo-btn-sm px-2 py-1 bg-[#FF3838] text-white text-xs font-mono font-bold uppercase hover:bg-red-600"
                        title="Thoát chế độ Review toàn bài để trở về từng câu/đoạn"
                      >
                        ✕ Thoát
                      </button>
                    )}
                  </div>
                </div>

                {/* Nội dung câu / đoạn / toàn bài hiện tại (Reading Text Display: Chữ to, rõ ràng) */}
                <div className="p-4 sm:p-6 bg-paper-reading border-2 border-black min-h-[140px] flex flex-col items-center justify-center text-center shadow-[2px_2px_0px_#000] relative">
                  {isFullReviewActive ? (
                    /* Full Text Review Mode Display */
                    <div className="w-full text-left space-y-3 py-2 max-h-[340px] overflow-y-auto pr-1 select-text">
                      <div className="bg-[#FFE500] border border-black p-2 text-xs font-mono font-bold flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <BookOpen size={14} /> Toàn bộ bài đọc (Chế độ Ôn tập & Thảo luận)
                        </span>
                        <span className="bg-white px-1.5 py-0.5 border border-black text-[10px] uppercase">
                          Không giới hạn thời gian
                        </span>
                      </div>
                      <div className="font-reading text-lg sm:text-xl leading-relaxed text-[#111111] space-y-4">
                        {activePresentedResource.canonicalText.split(/\n\s*\n/).map((para, pIdx) => {
                          const paraSlices = buildRenderSlices(
                            para,
                            stagedHighlight
                              ? activePresentedResource.annotations
                                  .filter(a => a.status === 'approved')
                                  .map(a => ({
                                    id: a.id,
                                    text: a.text,
                                    startOffset: a.startOffset,
                                    endOffset: a.endOffset,
                                    type: a.type,
                                    meaning: a.meaning,
                                  }))
                              : []
                          );
                          return (
                            <p key={pIdx}>
                              {paraSlices.map((slice, sIdx) =>
                                slice.isHighlight ? (
                                  <mark
                                    key={sIdx}
                                    className="bg-[#FFE500] text-black font-semibold px-1 py-0.5 border-b-2 border-black inline-block shadow-[1px_1px_0px_#000]"
                                    title={slice.annotation?.meaning}
                                  >
                                    {slice.text}
                                  </mark>
                                ) : (
                                  <span key={sIdx}>{slice.text}</span>
                                )
                              )}
                            </p>
                          );
                        })}
                      </div>
                    </div>
                  ) : stagedText ? (
                    <>
                      <p className="font-reading text-xl sm:text-2xl md:text-3xl font-medium leading-relaxed sm:leading-loose text-[#111111]">
                        {stagedSlices.map((slice, i) =>
                          slice.isHighlight ? (
                            <mark
                              key={i}
                              className="bg-[#FFE500] text-black font-semibold px-1 py-0.5 border-b-2 border-black inline-block shadow-[1px_1px_0px_#000]"
                              title={slice.annotation?.meaning}
                            >
                              {slice.text}
                            </mark>
                          ) : (
                            <span key={i}>{slice.text}</span>
                          )
                        )}
                      </p>

                      {/* Dynamic pacing calibration tag (Requirement 7) */}
                      <div className="mt-3 pt-2 border-t border-black/10 w-full flex flex-wrap items-center justify-between gap-1 text-[11px] font-mono text-neutral-600">
                        <div className="flex items-center gap-1.5">
                          <Clock size={12} className="text-black" />
                          <span>Thời gian giữ chữ: <b>{(dynamicHoldInfo.holdDurationMs / 1000).toFixed(1)}s</b></span>
                          {dynamicPacingEnabled && (
                            <span className="bg-[#FFFDF0] px-1 border border-black text-[10px] text-black font-bold">
                              ⚡ {dynamicHoldInfo.wordCount} từ {dynamicHoldInfo.isAdjusted ? `(${dynamicHoldInfo.adjustedDiffMs > 0 ? '+' : ''}${(dynamicHoldInfo.adjustedDiffMs / 1000).toFixed(1)}s tự điều chỉnh)` : '(chuẩn)'}
                            </span>
                          )}
                        </div>
                        {autoMergeShortUnits && (
                          <span className="text-[10px] text-neutral-500">
                            (Đã bật gộp câu ngắn &lt; {minWordsPerUnit} từ)
                          </span>
                        )}
                      </div>
                    </>
                  ) : (
                    <span className="text-neutral-400 font-mono text-sm italic">
                      Không có nội dung câu
                    </span>
                  )}
                </div>

                {/* Thanh Điều hướng & Slide Remote HUD nằm NGAY DƯỚI nội dung câu */}
                <div className="space-y-3 pt-1">
                  {/* Hàng 1: Nút ← Đơn vị trước | Đơn vị X / Y | Đơn vị tiếp → */}
                  <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-neutral-50 border border-black">
                    <button
                      type="button"
                      disabled={stagedUnitIndex <= 0 || isFullReviewActive}
                      onClick={handlePreviousSentenceOnly}
                      className="neo-btn-sm px-3 py-1 bg-white text-black text-xs font-bold disabled:opacity-40"
                    >
                      <ChevronLeft size={14} className="inline mr-1" /> {stagedGranularity === 'paragraph' ? 'Đoạn' : 'Câu'} trước
                    </button>

                    <span className="font-mono text-xs font-black uppercase text-black">
                      {isFullReviewActive
                        ? 'Review Toàn bài'
                        : `${stagedGranularity === 'paragraph' ? 'Đoạn' : 'Câu'} ${stagedUnitIndex + 1} / ${currentUnitsList.length}`}
                    </span>

                    <button
                      type="button"
                      disabled={stagedUnitIndex >= currentUnitsList.length - 1 || isFullReviewActive}
                      onClick={handleNextSentenceOnly}
                      className="neo-btn-sm px-3 py-1 bg-white text-black text-xs font-bold disabled:opacity-40"
                    >
                      {stagedGranularity === 'paragraph' ? 'Đoạn' : 'Câu'} tiếp <ChevronRight size={14} className="inline ml-1" />
                    </button>
                  </div>

                  {/* Hàng 2: Bộ nút Slide Remote Clicker */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {/* Nút 1: Lùi 2 lần */}
                    <button
                      type="button"
                      onClick={handlePreviousAndPlay}
                      disabled={stagedUnitIndex <= 0}
                      className="neo-btn-sm py-2 px-1.5 bg-white text-black text-xs font-bold flex flex-col items-center justify-center gap-1 hover:bg-neutral-100 disabled:opacity-40 shadow-[1px_1px_0px_#000]"
                      title="Lùi về câu trước và phát ngay (Hoặc bấm phím lùi 2 lần)"
                    >
                      <span className="font-black text-xs">⏮️ Lùi 2 lần</span>
                      <span className="text-[10px] text-neutral-600 font-normal leading-tight text-center">(Câu trước & Phát)</span>
                      <span className="neo-badge bg-neutral-100 text-neutral-700 text-[9px] py-0 px-1 border border-black/40">
                        [ ← / PgUp x2 ]
                      </span>
                    </button>

                    {/* Nút 2: Lùi 1 lần */}
                    <button
                      type="button"
                      onClick={handleReplayCurrent}
                      className="neo-btn-sm py-2 px-1.5 bg-[#FFE500] text-black text-xs font-bold flex flex-col items-center justify-center gap-1 hover:bg-yellow-300 shadow-[1px_1px_0px_#000]"
                      title="Phát lại câu này từ đầu"
                    >
                      <span className="font-black text-xs">🔄 Lùi 1 lần</span>
                      <span className="text-[10px] text-neutral-800 font-normal leading-tight text-center">(Phát lại câu này)</span>
                      <span className="neo-badge bg-white text-black text-[9px] py-0 px-1 border border-black/40">
                        [ ← / PgUp x1 ]
                      </span>
                    </button>

                    {/* Nút 3: Phát / Tạm dừng */}
                    <button
                      type="button"
                      onClick={handleTogglePlayPause}
                      className={`neo-btn-sm py-2 px-1.5 text-xs font-bold flex flex-col items-center justify-center gap-1 shadow-[1px_1px_0px_#000] ${
                        activeRoom.playbackStatus === 'playing'
                          ? 'bg-[#00D2FF] text-black hover:bg-cyan-300'
                          : 'bg-[#4ADE80] text-black hover:bg-green-400'
                      }`}
                      title="Phát hoặc Tạm dừng"
                    >
                      <span className="font-black text-xs">
                        {activeRoom.playbackStatus === 'playing' ? '⏸️ Tạm dừng' : '▶️ Phát'}
                      </span>
                      <span className="text-[10px] font-normal leading-tight text-center">
                        {activeRoom.playbackStatus === 'playing' ? '(Đang đếm giờ)' : '(Bắt đầu hiện)'}
                      </span>
                      <span className="neo-badge bg-white text-black text-[9px] py-0 px-1 border border-black/40">
                        [ Space ]
                      </span>
                    </button>

                    {/* Nút 4: Tiến 1 lần */}
                    <button
                      type="button"
                      onClick={handleAdvanceAndPlay}
                      disabled={stagedUnitIndex >= currentUnitsList.length - 1}
                      className="neo-btn-sm py-2 px-1.5 bg-[#FF3838] text-white text-xs font-bold flex flex-col items-center justify-center gap-1 hover:bg-red-600 disabled:opacity-40 shadow-[1px_1px_0px_#000]"
                      title="Tiến sang câu tiếp và phát ngay"
                    >
                      <span className="font-black text-xs">⏭️ Tiến 1 lần</span>
                      <span className="text-[10px] text-red-100 font-normal leading-tight text-center">(Câu tiếp & Phát)</span>
                      <span className="neo-badge bg-black text-white text-[9px] py-0 px-1 border border-black/40">
                        [ → / PgDn ]
                      </span>
                    </button>

                    {/* Nút 5: Ẩn/Hiện màn hình (Blank) */}
                    <button
                      type="button"
                      onClick={handleToggleBlankOrShow}
                      className="neo-btn-sm py-2 px-1.5 bg-neutral-100 text-black text-xs font-bold flex flex-col items-center justify-center gap-1 hover:bg-neutral-200 col-span-2 sm:col-span-1 shadow-[1px_1px_0px_#000]"
                      title="Ẩn / Hiện màn hình trống"
                    >
                      <span className="font-black text-xs">
                        {activeRoom.playbackStatus === 'idle' ? '👁️ Hiện thảo luận' : '⏹️ Ẩn màn hình'}
                      </span>
                      <span className="text-[10px] text-neutral-600 font-normal leading-tight text-center">
                        {activeRoom.playbackStatus === 'idle' ? '(Hiện tự do)' : '(Blank screen)'}
                      </span>
                      <span className="neo-badge bg-white text-black text-[9px] py-0 px-1 border border-black/40">
                        [ B / . ]
                      </span>
                    </button>
                  </div>

                  {/* Hàng 3: Công tắc Tự động chuyển câu + Phím tắt hướng dẫn nhanh */}
                  <div className="flex flex-wrap items-center justify-between p-2.5 bg-[#FFFDF0] border border-black text-xs font-mono gap-2">
                    <label className="flex items-center gap-2 cursor-pointer font-bold select-none">
                      <input
                        type="checkbox"
                        checked={autoAdvance}
                        onChange={e => setAutoAdvance(e.target.checked)}
                        className="w-4 h-4 accent-black cursor-pointer"
                      />
                      <span>⚡ Tự động chuyển câu (Auto-advance)</span>
                      {autoAdvance ? (
                        <span className="neo-badge bg-[#4ADE80] text-black text-[9px] py-0 px-1 font-bold animate-pulse">
                          BẬT (1.5s nghỉ)
                        </span>
                      ) : (
                        <span className="neo-badge bg-neutral-200 text-neutral-600 text-[9px] py-0 px-1 font-bold">
                          TẮT
                        </span>
                      )}
                    </label>

                    <span className="text-[10px] text-neutral-500 font-mono">
                      🎮 Bút trình chiếu USB Clicker & Phím tắt (Mũi tên, Space, B)
                    </span>
                  </div>
                </div>

                {/* Phía dưới khối chính: Toggle Live Learner View */}
                <div className="pt-2 border-t border-black/10 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setShowLiveLearnerView(!showLiveLearnerView)}
                    className="neo-btn-sm px-2.5 py-1 bg-neutral-100 text-black text-xs font-bold flex items-center gap-1.5 hover:bg-neutral-200"
                  >
                    <Monitor size={13} />
                    <span>{showLiveLearnerView ? 'Ẩn Live Learner View' : 'Mở Live Learner View (Góc nhìn học sinh)'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setStudioResource(activePresentedResource);
                      setShowStudioModal(true);
                    }}
                    className="text-xs font-mono text-neutral-700 hover:text-black font-bold underline"
                  >
                    Sửa Highlights bài này
                  </button>
                </div>
              </div>

              {/* Live Learner View mô phỏng màn hình học sinh khi được bật */}
              {showLiveLearnerView && (
                <LiveLearnerView
                  room={activeRoom}
                  participants={participants}
                  onClose={() => setShowLiveLearnerView(false)}
                  stagedEraseEffect={stagedEraseEffect}
                  stagedDustAngle={stagedDustAngle}
                  onSelectDustAngle={setStagedDustAngle}
                  onSelectEraseEffect={setStagedEraseEffect}
                  stagedHoldMs={stagedHoldMs}
                  stagedEraseMs={stagedEraseMs}
                />
              )}
            </div>

            {/* Right Column: lg:col-span-4 (~30% width) with Icon Tab Navigation (Requirement 4) */}
            <div className="lg:col-span-4 space-y-3">
              {/* Icon Navigation Bar (Requirement 4) */}
              <div className="bg-white border-2 border-black p-1 shadow-[2px_2px_0px_#000]">
                <div className="grid grid-cols-4 gap-1">
                  <button
                    type="button"
                    onClick={() => setSettingsTab('timings')}
                    className={`py-1.5 px-2 text-xs font-mono font-bold flex items-center justify-center gap-1.5 border transition-all ${
                      settingsTab === 'timings'
                        ? 'bg-[#FFE500] text-black border-black shadow-[1px_1px_0px_#000]'
                        : 'bg-white text-neutral-600 border-transparent hover:border-black/30 hover:text-black'
                    }`}
                    title="Cài đặt trình chiếu & Thời gian (Sentence vs Paragraph)"
                  >
                    <Sliders size={14} className="shrink-0" />
                    <span className="hidden sm:inline">Cài đặt</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSettingsTab('switch_lesson')}
                    className={`py-1.5 px-2 text-xs font-mono font-bold flex items-center justify-center gap-1.5 border transition-all ${
                      settingsTab === 'switch_lesson'
                        ? 'bg-[#4ADE80] text-black border-black shadow-[1px_1px_0px_#000]'
                        : 'bg-white text-neutral-600 border-transparent hover:border-black/30 hover:text-black'
                    }`}
                    title="Đổi bài học nhanh từ thư viện"
                  >
                    <BookOpen size={14} className="shrink-0" />
                    <span className="hidden sm:inline">Đổi bài</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSettingsTab('participants')}
                    className={`py-1.5 px-2 text-xs font-mono font-bold flex items-center justify-center gap-1.5 border transition-all relative ${
                      settingsTab === 'participants'
                        ? 'bg-[#00D2FF] text-black border-black shadow-[1px_1px_0px_#000]'
                        : 'bg-white text-neutral-600 border-transparent hover:border-black/30 hover:text-black'
                    }`}
                    title="Học sinh & Mã phòng"
                  >
                    <Users size={14} className="shrink-0" />
                    <span className="hidden sm:inline">Học sinh</span>
                    {participants.length > 0 && (
                      <span className="neo-badge bg-[#FF3838] text-white text-[9px] py-0 px-1 font-bold absolute -top-1 -right-1">
                        {participants.length}
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setSettingsTab('all')}
                    className={`py-1.5 px-2 text-xs font-mono font-bold flex items-center justify-center gap-1.5 border transition-all ${
                      settingsTab === 'all'
                        ? 'bg-black text-white border-black shadow-[1px_1px_0px_#000]'
                        : 'bg-white text-neutral-600 border-transparent hover:border-black/30 hover:text-black'
                    }`}
                    title="Xem tất cả thẻ dọc"
                  >
                    <LayoutGrid size={14} className="shrink-0" />
                    <span className="hidden sm:inline">Tất cả</span>
                  </button>
                </div>
              </div>

              {/* Card 1: Cài đặt trình chiếu (Timings & Advanced Engine - Requirements 4, 6, 7) */}
              {(settingsTab === 'timings' || settingsTab === 'all') && (
                <div className="neo-box-sm bg-white p-3.5 space-y-3">
                  <div className="flex items-center justify-between border-b border-black pb-2">
                    <div className="flex items-center gap-1.5 font-black text-xs uppercase text-black font-mono">
                      <Sliders size={14} className="text-black" />
                      <span>Cài đặt trình chiếu</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleApplyToRoom}
                      disabled={isApplying}
                      className="neo-btn-sm px-2.5 py-0.5 bg-[#FFE500] text-black text-[10px] font-bold"
                      title="Lưu cài đặt và đồng bộ với học sinh"
                    >
                      {isApplying ? 'Lưu...' : 'Lưu cài đặt'}
                    </button>
                  </div>

                  {/* Chế độ hiện tại: Câu vs Đoạn */}
                  <div className="flex items-center justify-between p-2 bg-[#FFFDF0] border border-black text-xs font-mono">
                    <span className="font-bold text-black uppercase text-[11px]">Đang chiếu:</span>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => handleSwitchGranularity('sentence')}
                        className={`px-2 py-0.5 font-bold uppercase text-[10px] border border-black transition-colors ${
                          stagedGranularity === 'sentence' ? 'bg-[#FFE500] shadow-[1px_1px_0px_#000]' : 'bg-white hover:bg-neutral-100'
                        }`}
                      >
                        📝 Câu
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSwitchGranularity('paragraph')}
                        className={`px-2 py-0.5 font-bold uppercase text-[10px] border border-black transition-colors ${
                          stagedGranularity === 'paragraph' ? 'bg-[#FFE500] shadow-[1px_1px_0px_#000]' : 'bg-white hover:bg-neutral-100'
                        }`}
                      >
                        📄 Đoạn
                      </button>
                    </div>
                  </div>

                  {/* Requirement 6: Cài đặt thời gian riêng biệt cho Câu & Đoạn */}
                  <div className="border border-black p-2.5 bg-white space-y-2.5">
                    <div className="flex items-center justify-between border-b border-black/20 pb-1.5">
                      <span className="text-[11px] font-mono font-black uppercase text-black flex items-center gap-1">
                        <Clock size={12} />
                        <span>Thời gian (Hold & Erase):</span>
                      </span>
                      <div className="flex border border-black text-[10px] font-mono font-bold">
                        <button
                          type="button"
                          onClick={() => setTimingProfileTab('sentence')}
                          className={`px-1.5 py-0.5 transition-colors ${
                            timingProfileTab === 'sentence' ? 'bg-[#FFE500] font-black' : 'bg-white text-neutral-600 hover:text-black'
                          }`}
                        >
                          Cài Câu
                        </button>
                        <button
                          type="button"
                          onClick={() => setTimingProfileTab('paragraph')}
                          className={`px-1.5 py-0.5 border-l border-black transition-colors ${
                            timingProfileTab === 'paragraph' ? 'bg-[#FFE500] font-black' : 'bg-white text-neutral-600 hover:text-black'
                          }`}
                        >
                          Cài Đoạn
                        </button>
                      </div>
                    </div>

                    {timingProfileTab === 'sentence' ? (
                      <div className="space-y-2">
                        <div className="text-[10px] font-mono text-neutral-600 flex items-center justify-between">
                          <span>Đang cài: <b>Thời gian Câu</b></span>
                          {stagedGranularity === 'sentence' ? (
                            <span className="neo-badge bg-[#4ADE80] text-black text-[9px] py-0 px-1 font-bold">
                              Đang áp dụng
                            </span>
                          ) : (
                            <span className="text-[9px] text-neutral-400">Sẽ áp dụng khi chọn Câu</span>
                          )}
                        </div>

                        {/* Giữ chữ câu */}
                        <div>
                          <div className="flex items-center justify-between text-[11px] font-mono font-bold uppercase mb-1">
                            <span>Giữ chữ câu (Hold):</span>
                            <span className="text-neutral-700 bg-[#FFFDF0] px-1 border border-black text-[10px]">
                              {(stagedSentenceHoldMs / 1000).toFixed(1)}s
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="range"
                              min={1000}
                              max={10000}
                              step={500}
                              value={stagedSentenceHoldMs}
                              onChange={e => {
                                const val = Number(e.target.value);
                                setStagedSentenceHoldMs(val);
                                if (stagedGranularity === 'sentence') setStagedHoldMs(val);
                              }}
                              className="w-full accent-black cursor-pointer"
                            />
                            <input
                              type="number"
                              min={1000}
                              max={10000}
                              step={500}
                              value={stagedSentenceHoldMs}
                              onChange={e => {
                                const val = Number(e.target.value);
                                setStagedSentenceHoldMs(val);
                                if (stagedGranularity === 'sentence') setStagedHoldMs(val);
                              }}
                              className="neo-input text-xs py-0.5 px-1 w-16 text-center font-mono font-bold"
                            />
                          </div>
                        </div>

                        {/* Xóa chữ câu */}
                        <div>
                          <div className="flex items-center justify-between text-[11px] font-mono font-bold uppercase mb-1">
                            <span>Xóa chữ câu (Erase):</span>
                            <span className="text-neutral-700 bg-[#FFFDF0] px-1 border border-black text-[10px]">
                              {(stagedSentenceEraseMs / 1000).toFixed(1)}s
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="range"
                              min={500}
                              max={5000}
                              step={250}
                              value={stagedSentenceEraseMs}
                              onChange={e => {
                                const val = Number(e.target.value);
                                setStagedSentenceEraseMs(val);
                                if (stagedGranularity === 'sentence') setStagedEraseMs(val);
                              }}
                              className="w-full accent-black cursor-pointer"
                            />
                            <input
                              type="number"
                              min={500}
                              max={5000}
                              step={250}
                              value={stagedSentenceEraseMs}
                              onChange={e => {
                                const val = Number(e.target.value);
                                setStagedSentenceEraseMs(val);
                                if (stagedGranularity === 'sentence') setStagedEraseMs(val);
                              }}
                              className="neo-input text-xs py-0.5 px-1 w-16 text-center font-mono font-bold"
                            />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="text-[10px] font-mono text-neutral-600 flex items-center justify-between">
                          <span>Đang cài: <b>Thời gian Đoạn</b></span>
                          {stagedGranularity === 'paragraph' ? (
                            <span className="neo-badge bg-[#4ADE80] text-black text-[9px] py-0 px-1 font-bold">
                              Đang áp dụng
                            </span>
                          ) : (
                            <span className="text-[9px] text-neutral-400">Sẽ áp dụng khi chọn Đoạn</span>
                          )}
                        </div>

                        {/* Giữ chữ đoạn */}
                        <div>
                          <div className="flex items-center justify-between text-[11px] font-mono font-bold uppercase mb-1">
                            <span>Giữ chữ đoạn (Hold):</span>
                            <span className="text-neutral-700 bg-[#FFFDF0] px-1 border border-black text-[10px]">
                              {(stagedParagraphHoldMs / 1000).toFixed(1)}s
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="range"
                              min={3000}
                              max={30000}
                              step={500}
                              value={stagedParagraphHoldMs}
                              onChange={e => {
                                const val = Number(e.target.value);
                                setStagedParagraphHoldMs(val);
                                if (stagedGranularity === 'paragraph') setStagedHoldMs(val);
                              }}
                              className="w-full accent-black cursor-pointer"
                            />
                            <input
                              type="number"
                              min={3000}
                              max={30000}
                              step={500}
                              value={stagedParagraphHoldMs}
                              onChange={e => {
                                const val = Number(e.target.value);
                                setStagedParagraphHoldMs(val);
                                if (stagedGranularity === 'paragraph') setStagedHoldMs(val);
                              }}
                              className="neo-input text-xs py-0.5 px-1 w-16 text-center font-mono font-bold"
                            />
                          </div>
                        </div>

                        {/* Xóa chữ đoạn */}
                        <div>
                          <div className="flex items-center justify-between text-[11px] font-mono font-bold uppercase mb-1">
                            <span>Xóa chữ đoạn (Erase):</span>
                            <span className="text-neutral-700 bg-[#FFFDF0] px-1 border border-black text-[10px]">
                              {(stagedParagraphEraseMs / 1000).toFixed(1)}s
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="range"
                              min={1000}
                              max={8000}
                              step={250}
                              value={stagedParagraphEraseMs}
                              onChange={e => {
                                const val = Number(e.target.value);
                                setStagedParagraphEraseMs(val);
                                if (stagedGranularity === 'paragraph') setStagedEraseMs(val);
                              }}
                              className="w-full accent-black cursor-pointer"
                            />
                            <input
                              type="number"
                              min={1000}
                              max={8000}
                              step={250}
                              value={stagedParagraphEraseMs}
                              onChange={e => {
                                const val = Number(e.target.value);
                                setStagedParagraphEraseMs(val);
                                if (stagedGranularity === 'paragraph') setStagedEraseMs(val);
                              }}
                              className="neo-input text-xs py-0.5 px-1 w-16 text-center font-mono font-bold"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Requirement 7: Nâng cao - Tính toán độ dài câu/đoạn & Cơ chế gộp câu ngắn */}
                  <div className="p-2.5 bg-[#FFFDF0] border border-black space-y-2 text-xs font-mono">
                    <div className="font-bold uppercase text-[11px] text-black flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Sparkles size={13} className="text-[#00D2FF]" />
                        <span>Hiệu chỉnh thông minh (Advanced):</span>
                      </span>
                      <span className="neo-badge bg-[#00D2FF] text-black text-[9px] py-0 px-1 font-bold">
                        AI Pacing
                      </span>
                    </div>

                    {/* Toggle Dynamic Pacing */}
                    <label className="flex items-center gap-2 cursor-pointer font-bold select-none text-[11px]">
                      <input
                        type="checkbox"
                        checked={dynamicPacingEnabled}
                        onChange={e => setDynamicPacingEnabled(e.target.checked)}
                        className="w-4 h-4 accent-black cursor-pointer"
                      />
                      <span>Bù trừ thời gian theo độ dài (Dynamic Pacing)</span>
                    </label>

                    {dynamicPacingEnabled && (
                      <div className="pl-6 space-y-1.5 text-[10px]">
                        <div className="flex items-center justify-between">
                          <span className="text-neutral-600">Tốc độ đọc mẫu:</span>
                          <div className="flex gap-1">
                            {[
                              { wpm: 120, label: '120 Chậm' },
                              { wpm: 160, label: '160 Chuẩn' },
                              { wpm: 200, label: '200 Nhanh' },
                            ].map(item => (
                              <button
                                key={item.wpm}
                                type="button"
                                onClick={() => setReadingWpm(item.wpm)}
                                className={`px-1.5 py-0.5 border text-[10px] font-bold ${
                                  readingWpm === item.wpm
                                    ? 'bg-black text-white border-black'
                                    : 'bg-white text-black border-black/40 hover:border-black'
                                }`}
                              >
                                {item.label}
                              </button>
                            ))}
                          </div>
                        </div>
                        {stagedText && (
                          <div className="p-1.5 bg-white border border-black/30 text-[10px] text-neutral-800">
                            Unit #{stagedUnitIndex + 1}: <b>{dynamicHoldInfo.wordCount} từ</b> → Tính toán:{' '}
                            <b className="font-black text-black">{(dynamicHoldInfo.holdDurationMs / 1000).toFixed(1)}s</b>
                            {dynamicHoldInfo.isAdjusted && (
                              <span
                                className={`ml-1 font-bold ${
                                  dynamicHoldInfo.adjustedDiffMs > 0 ? 'text-green-700' : 'text-amber-700'
                                }`}
                              >
                                ({dynamicHoldInfo.adjustedDiffMs > 0 ? `+${(dynamicHoldInfo.adjustedDiffMs / 1000).toFixed(1)}s câu dài` : `${(dynamicHoldInfo.adjustedDiffMs / 1000).toFixed(1)}s câu ngắn`})
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Toggle Smart Unit Merging */}
                    <div className="pt-2 border-t border-black/10">
                      <label className="flex items-center gap-2 cursor-pointer font-bold select-none text-[11px]">
                        <input
                          type="checkbox"
                          checked={autoMergeShortUnits}
                          onChange={e => setAutoMergeShortUnits(e.target.checked)}
                          className="w-4 h-4 accent-black cursor-pointer"
                        />
                        <span>Tự gộp câu quá ngắn (&lt; min từ)</span>
                      </label>

                      {autoMergeShortUnits && (
                        <div className="pl-6 pt-1 space-y-1 text-[10px]">
                          <div className="flex items-center justify-between">
                            <span className="text-neutral-600">Ngưỡng tối thiểu:</span>
                            <span className="font-bold bg-white px-1 border border-black">{minWordsPerUnit} từ</span>
                          </div>
                          <input
                            type="range"
                            min={3}
                            max={8}
                            step={1}
                            value={minWordsPerUnit}
                            onChange={e => setMinWordsPerUnit(Number(e.target.value))}
                            className="w-full accent-black cursor-pointer"
                          />
                          <p className="text-neutral-500 italic text-[9px] leading-tight">
                            Ví dụ: &quot;Stay hungry.&quot; + &quot;Stay foolish.&quot; sẽ gộp thành 1 hiển thị mượt mà.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Mode Review Toàn Bài (Requirement 6) */}
                  <div className="p-2.5 border border-black bg-[#FFFDF0] flex items-center justify-between text-xs font-mono">
                    <div>
                      <div className="font-bold text-black text-[11px]">Xem lại toàn bài (Full Review):</div>
                      <div className="text-[10px] text-neutral-600">Chiếu toàn văn không đếm ngược</div>
                    </div>
                    <button
                      type="button"
                      onClick={handleToggleFullReview}
                      className={`neo-btn-sm px-2.5 py-1 text-xs font-bold ${
                        isFullReviewActive
                          ? 'bg-[#FF3838] text-white hover:bg-red-600'
                          : 'bg-[#FFE500] text-black hover:bg-yellow-300'
                      }`}
                    >
                      {isFullReviewActive ? 'Thoát Review' : 'Bật Review'}
                    </button>
                  </div>

                  {/* Hiệu ứng xóa chữ */}
                  <div>
                    <label className="block text-[11px] font-mono font-bold uppercase mb-1.5">
                      Hiệu ứng xóa chữ:
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {ERASE_EFFECT_OPTIONS.map(eff => (
                        <button
                          key={eff.id}
                          type="button"
                          onClick={() => setStagedEraseEffect(eff.id)}
                          aria-pressed={stagedEraseEffect === eff.id}
                          className={`py-1.5 px-2 text-xs font-mono font-bold border transition-all text-center ${
                            stagedEraseEffect === eff.id
                              ? 'bg-[#FFE500] border-black text-black shadow-[1.5px_1.5px_0px_#000]'
                              : 'bg-white border-black/30 text-neutral-700 hover:border-black'
                          }`}
                        >
                          {eff.label}
                        </button>
                      ))}
                    </div>
                    {stagedEraseEffect === 'dust' && (
                      <DustDirectionControl angle={stagedDustAngle} onChange={setStagedDustAngle} />
                    )}
                  </div>

                  {/* Highlights mini toggle */}
                  <div className="pt-2 border-t border-black/10 flex items-center justify-between text-xs font-mono">
                    <span className="text-[11px] font-bold uppercase text-neutral-700">Hiển thị Highlights:</span>
                    <button
                      type="button"
                      onClick={() => setStagedHighlight(!stagedHighlight)}
                      className={`py-1 px-3 border border-black text-[10px] font-bold uppercase flex items-center gap-1.5 ${
                        stagedHighlight ? 'bg-[#4ADE80] text-black' : 'bg-neutral-200 text-neutral-600'
                      }`}
                    >
                      {stagedHighlight ? <Check size={12} /> : <EyeOff size={12} />}
                      <span>{stagedHighlight ? 'Bật Highlights' : 'Tắt'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Card 2: Đổi bài học nhanh (Quick Switch Lesson) */}
              {(settingsTab === 'switch_lesson' || settingsTab === 'all') && (
                <div className="neo-box-sm bg-white p-3.5 space-y-3">
                  <div className="flex items-center justify-between border-b border-black pb-2">
                    <div className="flex items-center gap-1.5 font-black text-xs uppercase text-black font-mono">
                      <RefreshCw size={14} className="text-[#FF3838]" />
                      <span>Đổi bài học nhanh</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveMainTab('library')}
                      className="text-[10px] font-mono text-neutral-600 underline font-bold hover:text-black"
                    >
                      Mở thư viện →
                    </button>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-[11px] font-mono font-bold uppercase text-neutral-600">
                      Chọn bài đọc từ thư viện:
                    </label>
                    <select
                      value={selectedQuickSwitchId || activePresentedResource.id}
                      onChange={e => setSelectedQuickSwitchId(e.target.value)}
                      className="neo-input w-full text-xs py-1.5 font-bold"
                    >
                      {resources.map(r => (
                        <option key={r.id} value={r.id}>
                          {r.title} ({r.sentences?.length || 0} câu - {r.level})
                        </option>
                      ))}
                    </select>

                    {/* Target resource summary */}
                    {(() => {
                      const targetRes = resources.find(
                        r => r.id === (selectedQuickSwitchId || activePresentedResource.id)
                      );
                      if (!targetRes) return null;
                      const isCurrent = targetRes.id === activePresentedResource.id;
                      return (
                        <div className="p-2 bg-[#FFFDF0] border border-black/30 text-xs font-mono space-y-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-bold text-black truncate max-w-[170px]">{targetRes.title}</span>
                            {isCurrent ? (
                              <span className="neo-badge bg-[#4ADE80] text-black text-[9px] py-0 px-1 font-bold">
                                ĐANG CHIẾU
                              </span>
                            ) : (
                              <span className="text-neutral-500 text-[10px]">{targetRes.level}</span>
                            )}
                          </div>
                          <p className="text-[10px] text-neutral-600 line-clamp-2 font-reading">
                            {targetRes.canonicalText}
                          </p>
                        </div>
                      );
                    })()}

                    <button
                      type="button"
                      onClick={() => {
                        const targetRes = resources.find(
                          r => r.id === (selectedQuickSwitchId || activePresentedResource.id)
                        );
                        if (targetRes) {
                          handleOpenClassroom(targetRes);
                        }
                      }}
                      className="neo-btn w-full py-2 bg-[#4ADE80] text-black text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 hover:bg-green-400"
                    >
                      <RefreshCw size={13} />
                      <span>Chuyển sang bài này ngay</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Card 3: Thông tin phòng & Học sinh Online */}
              {(settingsTab === 'participants' || settingsTab === 'all') && (
                <div className="neo-box-sm bg-white p-3.5 space-y-3">
                  <div className="flex items-center justify-between border-b border-black pb-2">
                    <div className="flex items-center gap-1.5 font-black text-xs uppercase text-black font-mono">
                      <Users size={14} className="text-black" />
                      <span>Thông tin phòng & Kết nối</span>
                    </div>
                    <span className="neo-badge bg-[#4ADE80] text-black text-[9px] py-0 px-1 font-bold">
                      {participants.length} Online
                    </span>
                  </div>

                  {/* Large Room Code Banner */}
                  <div className="p-2.5 bg-[#FFFDF0] border-2 border-black text-center shadow-[1px_1px_0px_#000]">
                    <div className="text-[10px] font-mono uppercase text-neutral-500">Mã phòng học sinh:</div>
                    <div className="text-2xl font-black font-mono tracking-widest text-black mt-0.5">
                      {activeRoom.id}
                    </div>
                  </div>

                  {/* Copy Link & Student Screen Buttons (Dedicated Endpoint: /student?room=CH-XXXX) */}
                  <div className="space-y-1.5">
                    <button
                      type="button"
                      onClick={handleCopyLink}
                      className="neo-btn w-full py-2 bg-white text-black text-xs font-bold uppercase flex items-center justify-center gap-1.5"
                    >
                      {copiedLink ? <Check size={13} className="text-green-600" /> : <Copy size={13} />}
                      <span>{copiedLink ? 'Đã chép link học sinh!' : 'Copy Link Học Sinh (/student)'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onOpenLearnerView(activeRoom.id)}
                      className="neo-btn w-full py-2 bg-[#00D2FF] text-black text-xs font-bold uppercase flex items-center justify-center gap-1.5"
                    >
                      <ExternalLink size={13} />
                      <span>Mở Màn hình học sinh (Tab mới)</span>
                    </button>
                  </div>

                  {/* Danh sách học sinh online */}
                  <div className="pt-2 border-t border-black/15 space-y-1.5">
                    <div className="text-[11px] font-mono font-bold uppercase text-neutral-700 flex items-center justify-between">
                      <span>Danh sách học sinh:</span>
                      <span className="text-[10px] text-neutral-500 font-normal">{participants.length} bạn</span>
                    </div>

                    {participants.length === 0 ? (
                      <p className="text-[11px] font-mono text-neutral-400 italic">
                        Chưa có học sinh kết nối. Chia sẻ mã <b>{activeRoom.id}</b> để học sinh tham gia.
                      </p>
                    ) : (
                      <div className="max-h-32 overflow-y-auto space-y-1 pr-1">
                        {participants.map(p => (
                          <div
                            key={p.participantId}
                            className="px-2 py-1 bg-[#FFFDF0] border border-black/30 flex items-center justify-between text-xs font-mono"
                          >
                            <div className="flex items-center gap-1.5 truncate">
                              <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block shrink-0"></span>
                              <span className="font-bold truncate">{p.name}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeParticipant(activeRoom.id, p.participantId)}
                              className="text-neutral-400 hover:text-red-600 transition-colors shrink-0 ml-1"
                              title="Ngắt kết nối học sinh này"
                            >
                              <UserX size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* End Room Button */}
                  <div className="pt-2 border-t border-black/15">
                    <button
                      type="button"
                      onClick={handleEndRoom}
                      className="neo-btn w-full py-2 bg-white text-[#FF3838] border-2 border-[#FF3838] hover:bg-red-50 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5"
                    >
                      <X size={13} />
                      <span>Kết thúc buổi học</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

        ) : (
          /* NO ACTIVE ROOM: STREAMLINED SETUP SCREEN */
          <div className="neo-box bg-white p-6 sm:p-10 max-w-2xl mx-auto space-y-6">
            <div className="text-center space-y-2">
              <span className="neo-badge bg-[#FF3838] text-white text-xs font-mono uppercase font-bold">
                Live Classroom Ready
              </span>
              <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-black">
                Bắt đầu phòng học mới
              </h2>
              <p className="font-reading text-sm sm:text-base text-neutral-600">
                Chọn bài đọc tiếng Anh từ thư viện để mở lớp học trực tiếp và đồng bộ nhịp đọc cho học sinh.
              </p>
            </div>

            <div className="space-y-4 pt-2 border-t border-black">
              {resources.length === 0 ? (
                <div className="p-6 bg-[#FFFDF0] border border-dashed border-black text-center space-y-3">
                  <p className="text-xs font-mono text-neutral-600">
                    Thư viện chưa có bài đọc nào. Hãy đồng bộ tài liệu mẫu để bắt đầu ngay!
                  </p>
                  <button
                    type="button"
                    disabled={isSyncing}
                    onClick={handleSyncFullResources}
                    className="neo-btn px-4 py-2 bg-[#4ADE80] text-black text-xs font-black uppercase"
                  >
                    {isSyncing ? 'Đang đồng bộ...' : '🔄 Đồng bộ 5 TED Talks & Steve Jobs'}
                  </button>
                </div>
              ) : (
                <>
                  {/* Select resource */}
                  <div>
                    <label className="block text-xs font-mono font-bold uppercase mb-1.5">
                      Chọn bài đọc từ thư viện:
                    </label>
                    <select
                      value={selectedSetupResourceId || (resources[0]?.id || '')}
                      onChange={e => setSelectedSetupResourceId(e.target.value)}
                      className="neo-input w-full text-sm py-2 font-bold"
                    >
                      {resources.map(r => (
                        <option key={r.id} value={r.id}>
                          {r.title} ({r.sentences?.length || 0} câu • {r.level} • {r.category})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Preview card of selected resource */}
                  {(() => {
                    const selectedRes = resources.find(
                      r => r.id === (selectedSetupResourceId || (resources[0]?.id || ''))
                    );
                    if (!selectedRes) return null;
                    return (
                      <div className="neo-box-sm bg-[#FFFDF0] p-4 border-2 border-black space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-sm text-black font-reading truncate max-w-[280px]">
                            {selectedRes.title}
                          </h4>
                          <span className="neo-badge bg-[#FFE500] text-black text-[10px]">
                            {selectedRes.level}
                          </span>
                        </div>
                        <p className="text-xs font-reading text-neutral-700 line-clamp-3 italic">
                          "{selectedRes.canonicalText.slice(0, 180)}..."
                        </p>
                        <div className="flex items-center gap-3 text-[11px] font-mono text-neutral-500 pt-1 border-t border-black/10">
                          <span>{selectedRes.sentences?.length || 0} câu</span>
                          <span>•</span>
                          <span>{selectedRes.paragraphs?.length || 0} đoạn</span>
                          <span>•</span>
                          <span>{selectedRes.annotations?.length || 0} cụm từ</span>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Quick Granularity & Erase effect */}
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-[11px] font-mono font-bold uppercase mb-1">
                        Đơn vị chiếu ban đầu:
                      </label>
                      <div className="flex border border-black shadow-[1px_1px_0px_#000]">
                        <button
                          type="button"
                          onClick={() => setStagedGranularity('sentence')}
                          className={`flex-1 py-1.5 text-xs font-mono font-bold uppercase ${
                            stagedGranularity === 'sentence' ? 'bg-[#FFE500]' : 'bg-white'
                          }`}
                        >
                          Theo câu
                        </button>
                        <button
                          type="button"
                          onClick={() => setStagedGranularity('paragraph')}
                          className={`flex-1 py-1.5 text-xs font-mono font-bold uppercase border-l border-black ${
                            stagedGranularity === 'paragraph' ? 'bg-[#FFE500]' : 'bg-white'
                          }`}
                        >
                          Theo đoạn
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-mono font-bold uppercase mb-1">
                        Hiệu ứng xóa:
                      </label>
                      <select
                        value={stagedEraseEffect}
                        onChange={e => setStagedEraseEffect(e.target.value as EraseEffect)}
                        className="neo-input w-full text-xs py-1.5 font-bold"
                      >
                        {ERASE_EFFECT_OPTIONS.map(effect => <option key={effect.id} value={effect.id}>{effect.label}</option>)}
                      </select>
                    </div>
                  </div>

                  {stagedEraseEffect === 'dust' && <DustDirectionControl angle={stagedDustAngle} onChange={setStagedDustAngle} />}

                  {/* Launch Button */}
                  <button
                    type="button"
                    onClick={() => {
                      const chosen = resources.find(
                        r => r.id === (selectedSetupResourceId || (resources[0]?.id || ''))
                      );
                      if (chosen) {
                        handleOpenClassroom(chosen);
                      }
                    }}
                    className="neo-btn w-full py-3.5 bg-[#FF3838] text-white text-sm sm:text-base font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-[3px_3px_0px_#000]"
                  >
                    <span>🚀 Bắt đầu phòng học ngay!</span>
                  </button>

                  <div className="text-center pt-1">
                    <button
                      type="button"
                      onClick={() => setActiveMainTab('library')}
                      className="text-xs font-mono text-neutral-600 underline font-bold hover:text-black"
                    >
                      Hoặc vào Thư viện để duyệt toàn bộ bài đọc →
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )
      ) : activeMainTab === 'library' ? (
        /* Full-width Responsive Library View */
        <div className="neo-box bg-white p-4 sm:p-6 space-y-4">
          {renderLibraryContent(false)}
        </div>
      ) : (
        /* Dedicated Phrase Studio View */
        <div className="neo-box bg-white p-4 sm:p-6 space-y-4">
          {studioResource ? (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between border-b border-black pb-2.5 gap-2">
                <button
                  type="button"
                  onClick={() => setActiveMainTab('library')}
                  className="neo-btn-sm px-2.5 py-1 bg-neutral-100 text-black text-xs font-bold"
                >
                  ← Quay lại Thư viện
                </button>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-neutral-600">Đang chọn bài:</span>
                  <select
                    value={studioResource.id}
                    onChange={e => {
                      const found = resources.find(r => r.id === e.target.value);
                      if (found) setStudioResource(found);
                    }}
                    className="neo-input text-xs py-1 max-w-xs font-bold"
                  >
                    {resources.map(r => (
                      <option key={r.id} value={r.id}>
                        {r.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <PhraseEditorStudio
                resource={studioResource}
                onUpdateResource={updated => {
                  setResources(prev =>
                    prev.map(r => (r.id === updated.id ? updated : r))
                  );
                  setStudioResource(updated);
                }}
                onStartSession={handleOpenClassroom}
              />
            </div>
          ) : (
            <div className="p-8 text-center text-xs font-mono text-neutral-500">
              Hãy chọn một bài đọc trong thư viện để mở Studio chỉnh sửa highlights!
            </div>
          )}
        </div>
      )}


      {/* Slide-over Library Drawer when open during live room session */}
      {showLibraryDrawer && (
        <div className="fixed inset-0 z-50 bg-black/60 flex justify-end backdrop-blur-xs">
          <div className="w-full max-w-xl bg-white h-full overflow-y-auto shadow-2xl border-l-2 border-black animate-in slide-in-from-right">
            {renderLibraryContent(true)}
          </div>
        </div>
      )}

      {/* Modals */}
      {isEditorOpen && (
        <ResourceEditorModal
          initialResource={editingResource}
          existingCategories={existingCategories}
          onClose={() => setIsEditorOpen(false)}
          onSaved={() => {
            loadResources();
          }}
        />
      )}

      {reviewingResource && (
        <PhraseReviewModal
          resource={reviewingResource}
          onClose={() => setReviewingResource(null)}
          onUpdated={updatedAnnotations => {
            setResources(prev =>
              prev.map(r => (r.id === reviewingResource.id ? { ...r, annotations: updatedAnnotations } : r))
            );
            if (activePresentedResource?.id === reviewingResource.id) {
              setActivePresentedResource(prev => prev ? { ...prev, annotations: updatedAnnotations } : null);
            }
          }}
        />
      )}

      {showStudioModal && studioResource && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="w-full max-w-4xl max-h-[92vh] overflow-y-auto">
            <PhraseEditorStudio
              resource={studioResource}
              onUpdateResource={updated => {
                setResources(prev =>
                  prev.map(r => (r.id === updated.id ? updated : r))
                );
                setStudioResource(updated);
                if (activePresentedResource?.id === updated.id) {
                  setActivePresentedResource(updated);
                }
              }}
              onStartSession={res => {
                setShowStudioModal(false);
                handleOpenClassroom(res);
              }}
              onClose={() => setShowStudioModal(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};
