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
  RoomParticipant,
  PhraseAnnotation,
  EraseEffect,
  TimingMode,
  EraseSchedule,
  CalculatedTimeline,
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
  selectAppliedUnitCommand,
  playTurnCommand,
  pauseTurnCommand,
  resumeTurnCommand,
  showTurnCommand,
  hideTurnCommand,
  endRoomCommand,
  removeParticipant,
  setFullReviewCommand,
} from '../services/roomService';
import { getSyncedRoomTimeline } from '../services/roomClock';
import { useRoomClock } from './useRoomClock';
import { TeacherPrivateUnitPreview } from './TeacherPrivateUnitPreview';
import { useTeacherTabRoute } from './useTeacherTabRoute';
import { calculateAutoReadingMs, getWordsPerSecond, validateWordsPerSecond } from '../utils/readingTiming';
import { getUnitApprovedSpans } from '../utils/unitAnnotations';
import { ReadingUnitText } from './ReadingUnitText';
import { ReadingCountdown } from './ReadingCountdown';
import { useTeacherReadingAudio } from './useTeacherReadingAudio';
import { TeacherReadingSettings } from './TeacherReadingSettings';
import { buildRenderSlices, segmentSentences, segmentParagraphs, mergeShortUnits } from '../utils/textSegmentation';
import { ResourceEditorModal } from './ResourceEditorModal';
import { PhraseReviewModal } from './PhraseReviewModal';
import { TimingPreview } from './TimingPreview';
import { PhraseEditorStudio } from './PhraseEditorStudio';
import { ResourceSelectCombobox } from './ResourceSelectCombobox';
import { LiveLearnerView } from './LiveLearnerView';
import { LiveLearnerPreview } from './LiveLearnerPreview';
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
  LayoutGrid,
  List,
  Table,
  Maximize,
  Minimize,
} from 'lucide-react';

const ERASE_EFFECT_NAMES: Record<EraseEffect, string> = {
  vaporize: 'Vaporize',
  dissolve: 'Dissolve',
  fade: 'Fade',
  wipe: 'Wipe',
  eraser: 'Eraser',
  dust: 'Word Dust',
  sparkle: 'Sparkle Wave',
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
  const [libraryViewMode, setLibraryViewMode] = useState<'grid' | 'list' | 'table'>('table');
  // Modals & Studio state
  const [editingResource, setEditingResource] = useState<ReadingResource | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [reviewingResource, setReviewingResource] = useState<ReadingResource | null>(null);
  const [studioResource, setStudioResource] = useState<ReadingResource | null>(null);
  const [showStudioModal, setShowStudioModal] = useState(false);
  const [showLibraryDrawer, setShowLibraryDrawer] = useState(false);
  const [dashboardNotice, setDashboardNotice] = useState<{ type: 'error' | 'success' | 'info'; text: string } | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [activeMainTab, setActiveMainTab] = useTeacherTabRoute();
  const [selectedQuickSwitchId, setSelectedQuickSwitchId] = useState<string>('');
  const [quickSwitchCategory, setQuickSwitchCategory] = useState<string>('all');
  const [selectedSetupResourceId, setSelectedSetupResourceId] = useState<string>('');
  const [setupCategory, setSetupCategory] = useState<string>('all');
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
  const [showFullArticlePreview, setShowFullArticlePreview] = useState(false);
  const [unitReviewMode, setUnitReviewMode] = useState(false);
  const unitReviewModeRef = React.useRef(unitReviewMode);
  unitReviewModeRef.current = unitReviewMode;
  const reviewReturnIndex = React.useRef(0);

  // Dynamic Pacing & Length Calibration (Requirement 7)
  const [stagedTimingMode, setStagedTimingMode] = useState<TimingMode>('fixed');
  const [stagedWordsPerSecond, setStagedWordsPerSecond] = useState(4);
  const [stagedEraseSchedule, setStagedEraseSchedule] = useState<EraseSchedule>('after_reading');
  const dynamicPacingEnabled = stagedTimingMode === 'auto';
  const clockStatus = useRoomClock(activeRoom?.id);
  const readingAreaRef = React.useRef<HTMLDivElement>(null);
  const [isReadingFullscreen, setIsReadingFullscreen] = useState(false);
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
  const stagedGranularityRef = React.useRef(stagedGranularity);
  stagedGranularityRef.current = stagedGranularity;


  const autoAdvanceTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoAdvanceTriggeredUnitRef = React.useRef<number | null>(null);

  // Active Room Live Progress calculation
  const [roomProgress, setRoomProgress] = useState<CalculatedTimeline>({
    phase: 'idle', elapsedMs: 0, progress: 0, remainingMs: 0, totalDurationMs: 0, effectiveHoldMs: 0, effectiveEraseMs: 0,
  });
  const teacherAudio = useTeacherReadingAudio(activeRoom, roomProgress);
  useEffect(() => {
    const changed = () => setIsReadingFullscreen(document.fullscreenElement === readingAreaRef.current && !!document.fullscreenElement);
    document.addEventListener('fullscreenchange', changed);
    return () => document.removeEventListener('fullscreenchange', changed);
  }, []);
  const toggleReadingFullscreen = async () => {
    try {
      if (document.fullscreenElement === readingAreaRef.current) await document.exitFullscreen();
      else if (readingAreaRef.current?.requestFullscreen) await readingAreaRef.current.requestFullscreen();
      else throw new Error('Fullscreen is not supported by your browser.');
    } catch (error) {
      setDashboardNotice({ type: 'error', text: error instanceof Error ? error.message : 'Failed to enter fullscreen.' });
    }
  };

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
        setStagedTimingMode(existingRoom.timingMode ?? 'fixed');
        setStagedWordsPerSecond(getWordsPerSecond(existingRoom.wordsPerSecond));
        setStagedEraseSchedule(existingRoom.eraseSchedule ?? 'after_reading');
        setUnitReviewMode(existingRoom.playbackStatus === 'manual_show' && !existingRoom.isFullReview && !existingRoom.currentUnit?.isFullReview);
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
      setDashboardNotice({ type: 'error', text: `Failed to load resources: ${err?.message || 'Unable to connect'}` });
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
      const calculated = getSyncedRoomTimeline(activeRoom);
      setRoomProgress(calculated);
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [activeRoom]);

  const getStagedRoomOptions = (resource: ReadingResource) => {
    const rate = stagedTimingMode === 'auto' ? validateWordsPerSecond(stagedWordsPerSecond) : getWordsPerSecond(stagedWordsPerSecond);
    const raw = stagedGranularity === 'sentence' ? resource.sentences : resource.paragraphs;
    return { timingMode: stagedTimingMode, wordsPerSecond: rate, eraseSchedule: stagedEraseSchedule,
      sentenceHoldMs: stagedSentenceHoldMs, sentenceEraseMs: stagedSentenceEraseMs,
      paragraphHoldMs: stagedParagraphHoldMs, paragraphEraseMs: stagedParagraphEraseMs,
      dynamicPacingEnabled: false, readingWpm, autoMergeShortUnits, minWordsPerUnit,
      customUnitsList: autoMergeShortUnits ? mergeShortUnits(raw, { minWords: minWordsPerUnit }) : raw };
  };

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
          'hold_then_erase',
          stagedHoldMs,
          stagedEraseMs,
          stagedWindowMs,
          stagedEraseEffect,
          stagedDustAngle,
          getStagedRoomOptions(res)
        );
        setActivePresentedResource(res);
        setStagedUnitIndex(0);
        setSelectedQuickSwitchId(res.id);
        // Room snapshots, not an optimistic partial payload, own live configuration.
        setShowLibraryDrawer(false);
        setActiveMainTab('live');
        setDashboardNotice({
          type: 'success',
          text: `Switched to new reading passage: "${res.title}" in current room!`,
        });
        return;
      }

      const newRoom = await createClassroomRoom(
        res,
        user.displayName || 'Teacher',
        stagedGranularity,
        stagedHighlight,
        'hold_then_erase',
        stagedHoldMs,
        stagedEraseMs,
        stagedWindowMs,
        stagedEraseEffect,
        stagedDustAngle,
        getStagedRoomOptions(res)
      );
      setActivePresentedResource(res);
      setActiveRoom(newRoom);
      setStagedUnitIndex(0);
      setSelectedQuickSwitchId(res.id);
      setShowLibraryDrawer(false);
      setActiveMainTab('live');
      setDashboardNotice({
        type: 'success',
        text: `Classroom ${newRoom.id} is open! Students can join using link or code ${newRoom.id}.`,
      });
    } catch (err: any) {
      console.error('Could not create or reuse classroom:', err);
      setDashboardNotice({ type: 'error', text: err?.message || 'Unknown error opening room' });
    }
  };

  // Sync full sample library (Steve Jobs + 5 TED Talks + 10 IELTS + 10 Naval Ravikant)
  const handleSyncFullResources = async () => {
    setIsSyncing(true);
    setDashboardNotice(null);
    try {
      const data = await resetAndSyncFullResources(user.uid);
      setResources(data);
      if (data.length > 0) setStudioResource(data[0]);
      setDashboardNotice({
        type: 'success',
        text: 'Successfully loaded and synced all 26 sample reading articles (Steve Jobs, 5 TED Talks, 10 IELTS Reading, 10 Naval Ravikant)!',
      });
    } catch (err: any) {
      setDashboardNotice({ type: 'error', text: `Failed to sync reading articles: ${err.message}` });
    } finally {
      setIsSyncing(false);
    }
  };

  // Publish resource handler
  const handlePublish = async (resId: string) => {
    try {
      await publishResource(resId);
      await loadResources();
      setDashboardNotice({ type: 'success', text: 'Successfully published reading article!' });
    } catch (err: any) {
      setDashboardNotice({ type: 'error', text: `Failed to publish: ${err.message}` });
    }
  };

  // Delete resource handler
  const handleDelete = async (resId: string) => {
    try {
      await deleteResource(resId);
      await loadResources();
      setDashboardNotice({ type: 'info', text: 'Reading article deleted from library.' });
    } catch (err: any) {
      setDashboardNotice({ type: 'error', text: `Failed to delete: ${err.message}` });
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
        'hold_then_erase',
        stagedHoldMs,
        stagedEraseMs,
        stagedWindowMs,
        stagedEraseEffect,
        stagedDustAngle,
        getStagedRoomOptions(activePresentedResource)
      );
      setDashboardNotice({ type: 'success', text: `Settings saved and unit #${stagedUnitIndex + 1} applied to student screens.` });
    } catch (err: any) {
      setDashboardNotice({ type: 'error', text: `Failed to apply: ${err.message}` });
    } finally {
      setIsApplying(false);
    }
  };

  // Playback commands
  const handlePlayTurn = async () => {
    const currentRoom = activeRoomRef.current;
    if (!currentRoom) return;
    try {
      await playTurnCommand(currentRoom.id, currentRoom.revision);
    } catch (err: any) {
      setDashboardNotice({ type: 'error', text: `Playback error: ${err.message}` });
    }
  };

  const handlePauseTurn = async () => {
    const currentRoom = activeRoomRef.current;
    if (!currentRoom) return;
    try {
      await pauseTurnCommand(currentRoom.id, currentRoom.revision, getSyncedRoomTimeline(currentRoom).elapsedMs);
    } catch (err: any) {
      setDashboardNotice({ type: 'error', text: `Pause error: ${err.message}` });
    }
  };

  const handleResumeTurn = async () => {
    const currentRoom = activeRoomRef.current;
    if (!currentRoom) return;
    try {
      await resumeTurnCommand(currentRoom.id, currentRoom.revision, currentRoom.pausedElapsedMs);
    } catch (err: any) {
      setDashboardNotice({ type: 'error', text: `Resume error: ${err.message}` });
    }
  };

  const handleShowTurn = async () => {
    const currentRoom = activeRoomRef.current;
    if (!currentRoom) return;
    try {
      let revision = currentRoom.revision;
      if (!showFullArticlePreview && !currentRoom.isFullReview && !currentRoom.currentUnit?.isFullReview && currentRoom.granularity !== stagedGranularity) {
        const resource = activePresentedResourceRef.current;
        if (!resource) throw new Error('Reading article is loading. Please try again.');
        await selectAppliedUnitCommand(currentRoom.id, revision, resource, stagedUnitIndex, stagedGranularity);
        revision = Math.max(revision + 1, activeRoomRef.current?.revision ?? 0);
      }
      await showTurnCommand(currentRoom.id, revision);
    } catch (err: any) {
      setDashboardNotice({ type: 'error', text: `Display error: ${err.message}` });
    }
  };

  const handleHideTurn = async () => {
    const currentRoom = activeRoomRef.current;
    if (!currentRoom) return;
    try {
      await hideTurnCommand(currentRoom.id, currentRoom.revision);
    } catch (err: any) {
      setDashboardNotice({ type: 'error', text: `Hide error: ${err.message}` });
    }
  };

  const handleEndRoom = async () => {
    if (!activeRoom) return;
    try {
      await endRoomCommand(activeRoom.id, activeRoom.revision);
      setActiveRoom(null);
      setDashboardNotice({ type: 'info', text: 'Live classroom session ended.' });
    } catch (err: any) {
      setDashboardNotice({ type: 'error', text: `Failed to end room: ${err.message}` });
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

  const quickSwitchFilteredResources = quickSwitchCategory === 'all'
    ? resources
    : resources.filter(r => r.category === quickSwitchCategory);

  const setupFilteredResources = setupCategory === 'all'
    ? resources
    : resources.filter(r => r.category === setupCategory);
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


  const stagedText = currentUnitsList[stagedUnitIndex] || '';

  const dynamicHoldInfo = React.useMemo(() => {
    const hold = stagedTimingMode === 'auto' ? calculateAutoReadingMs(stagedText, getWordsPerSecond(stagedWordsPerSecond)) : stagedHoldMs;
    return { holdDurationMs: hold, wordCount: stagedText.trim().split(/\s+/).filter(Boolean).length,
      isAdjusted: hold !== stagedHoldMs, adjustedDiffMs: hold - stagedHoldMs };
  }, [stagedText, stagedTimingMode, stagedWordsPerSecond, stagedHoldMs]);
  const stagedApprovedSpans = activePresentedResource
    ? getUnitApprovedSpans(activePresentedResource, stagedText, stagedUnitIndex, stagedGranularity) : [];

  const fullReviewApprovedSpans = React.useMemo(() => activePresentedResource
    ? getUnitApprovedSpans(activePresentedResource, activePresentedResource.canonicalText, 0, 'paragraph') : [], [activePresentedResource]);

  const stagedSlices = buildRenderSlices(stagedText, stagedHighlight ? stagedApprovedSpans : []);

  // Private staging only. Apply explicitly installs granularity/timing in the room.
  const handleSwitchGranularity = async (newGranularity: Granularity) => {
    setShowFullArticlePreview(false);
    setStagedGranularity(newGranularity); setStagedUnitIndex(0);
    setStagedHoldMs(newGranularity === 'sentence' ? stagedSentenceHoldMs : stagedParagraphHoldMs);
    setStagedEraseMs(newGranularity === 'sentence' ? stagedSentenceEraseMs : stagedParagraphEraseMs);
    const room = activeRoomRef.current, resource = activePresentedResourceRef.current;
    if (room && resource && (room.isFullReview || room.currentUnit?.isFullReview)) {
      const index = newGranularity === room.granularity ? reviewReturnIndex.current : 0;
      try {
        await selectAppliedUnitCommand(room.id, room.revision, resource, index, newGranularity);
        setStagedUnitIndex(index);
        unitReviewModeRef.current = false; setUnitReviewMode(false);
      } catch (error) { setDashboardNotice({type:'error',text:error instanceof Error ? error.message : 'Failed to exit full article review.'}); }
    }
  };

  // Full Text Review Mode handlers (Requirement 6)
  const isFullReviewActive = Boolean(activeRoom?.isFullReview || activeRoom?.currentUnit?.isFullReview);

  const handleToggleFullReview = async () => {
    if (!activeRoom || !activePresentedResource) return;
    try {
      const nextReview = !(isFullReviewActive && roomProgress.phase === 'manual_show');
      if (nextReview) {
        setUnitReviewMode(false);
        if (!isFullReviewActive) reviewReturnIndex.current = activeRoom.currentUnit?.index ?? 0;
        await setFullReviewCommand(activeRoom.id, activeRoom.revision, activePresentedResource, true);
      } else {
        await selectAppliedUnitCommand(activeRoom.id, activeRoom.revision, activePresentedResource, reviewReturnIndex.current);
      }
      setDashboardNotice({
        type: nextReview ? 'success' : 'info',
        text: nextReview
          ? 'Full Reading Passage Review mode enabled! Student screen is displaying full text without time limit.'
          : 'Full Reading Passage Review mode disabled. Returned to unit reading pace.',
      });
    } catch (err: unknown) {
      setDashboardNotice({ type: 'error', text: `Failed to toggle full review: ${err instanceof Error ? err.message : String(err)}` });
    }
  };

  const handleExitFullReview = async () => {
    setShowFullArticlePreview(false);
    if (!activeRoom || !activePresentedResource) return;
    try {
      await selectAppliedUnitCommand(activeRoom.id, activeRoom.revision, activePresentedResource, reviewReturnIndex.current);
      setDashboardNotice({ type: 'info', text: 'Exited Full Reading Review mode.' });
    } catch (err: any) {
      console.error('Error exiting review:', err);
    }
  };

  // Commands use the currently APPLIED unit/settings, never private staging.
  const navigateAppliedUnit = async (delta: number, play: boolean) => {
    const currentRoom = activeRoomRef.current; const resource = activePresentedResourceRef.current;
    if (!currentRoom || !resource || currentRoom.isFullReview || currentRoom.currentUnit?.isFullReview) return;
    const nextIndex = (currentRoom.currentUnit?.index ?? 0) + delta;
    if (nextIndex < 0 || nextIndex >= (currentRoom.currentUnit?.totalUnits ?? 0)) return;
    teacherAudio.unlock();
    try {
      await selectAppliedUnitCommand(currentRoom.id, currentRoom.revision, resource, nextIndex);
      if (stagedGranularityRef.current === currentRoom.granularity) setStagedUnitIndex(nextIndex);
      if (play) {
        const revision = activeRoomRef.current?.revision ?? currentRoom.revision + 1;
        if (unitReviewModeRef.current) await showTurnCommand(currentRoom.id, Math.max(revision, currentRoom.revision + 1));
        else await playTurnCommand(currentRoom.id, Math.max(revision, currentRoom.revision + 1));
      }
    } catch (error) {
      setDashboardNotice({ type: 'error', text: error instanceof Error ? error.message : 'Error switching reading unit.' });
    }
  };
  const handleAdvanceAndPlay = () => navigateAppliedUnit(1, true);
  const handlePreviousAndPlay = () => navigateAppliedUnit(-1, true);

  const handleReplayCurrent = async () => {
    const currentRoom = activeRoomRef.current;
    if (!currentRoom) return;
    try {
      if (unitReviewModeRef.current) await showTurnCommand(currentRoom.id, currentRoom.revision);
      else await playTurnCommand(currentRoom.id, currentRoom.revision);
    } catch (err: any) {
      console.error('Error replaying current unit:', err);
      setDashboardNotice({ type: 'error', text: `Replay error: ${err instanceof Error ? err.message : String(err)}` });
    }
  };

  const handleTogglePlayPause = async () => {
    const currentRoom = activeRoomRef.current;
    if (!currentRoom) return;
    if (unitReviewModeRef.current) {
      await handleToggleBlankOrShow();
    } else if (currentRoom.playbackStatus === 'playing') {
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
    if (!showFullArticlePreview && !currentRoom.isFullReview && !currentRoom.currentUnit?.isFullReview) {
      unitReviewModeRef.current = true;
      setUnitReviewMode(true);
    }
    const phase = getSyncedRoomTimeline(currentRoom).phase;
    if (['idle', 'blank_finished'].includes(phase)) await handleShowTurn();
    else await handleHideTurn();
  };

  // Keyboard controls: previous, replay, play/pause, next and blank/show.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat || e.isComposing) return;
      const control = (e.target as HTMLElement | null)?.closest('button, summary, a');
      if (control && (e.code === 'Space' || e.key === ' ' || e.key === 'Enter')) return;
      // Guard: ignore keydown when active element is input, textarea, or contentEditable
      const target = e.target as HTMLElement | null;
      if (target?.closest('[data-testid="private-unit-preview"]')) return;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
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

      if ((activeRoomRef.current.isFullReview || activeRoomRef.current.currentUnit?.isFullReview) && ['ArrowRight', 'ArrowLeft', 'PageDown', 'PageUp', 'r', 'R', ' '].includes(e.key)) return;
      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        e.preventDefault();
        handleAdvanceAndPlay();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        handlePreviousAndPlay();
      } else if (e.key.toLowerCase() === 'r') {
        e.preventDefault();
        handleReplayCurrent();
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
  }, [isEditorOpen, reviewingResource, showStudioModal, showLibraryDrawer, showFullArticlePreview]);

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
      const index = activeRoom.currentUnit?.index ?? 0;
      if (autoAdvanceTriggeredUnitRef.current === index) {
        return;
      }
      autoAdvanceTriggeredUnitRef.current = index;
      autoAdvanceTimerRef.current = setTimeout(() => {
        if (index < (activeRoom.currentUnit?.totalUnits ?? 0) - 1) {
          handleAdvanceAndPlay();
        } else {
          setAutoAdvance(false);
          setDashboardNotice({
            type: 'success',
            text: 'Successfully completed auto-advance for the entire passage!',
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
    activeRoom?.currentUnit?.index,
    activeRoom?.currentUnit?.totalUnits,
  ]);

  // Render Library Content (reusable for main view or slide-over drawer)
  const renderLibraryContent = (isDrawerMode: boolean) => (
    <div className={`space-y-4 ${isDrawerMode ? 'p-5' : ''}`}>
      <div className="flex flex-wrap items-center justify-between border-b border-black pb-2.5 gap-2">
        <div className="flex items-center gap-2">
          <Layers size={16} className="text-black" />
          <h2 className="text-sm font-black uppercase tracking-tight text-black">
            Reading Library ({filteredResources.length})
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            disabled={isSyncing}
            onClick={handleSyncFullResources}
            className="neo-btn-sm px-2.5 py-1 bg-[#4ADE80] text-black text-[11px] font-bold flex items-center gap-1 hover:bg-green-400"
            title="Sync all 26 sample reading articles (Steve Jobs, 5 TED Talks, 10 IELTS Reading, 10 Naval Ravikant)"
          >
            <RefreshCw size={12} className={isSyncing ? 'animate-spin' : ''} />
            <span>{isSyncing ? 'Syncing...' : 'Sync Sample Library (26 articles)'}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setEditingResource(null);
              setIsEditorOpen(true);
            }}
            className="neo-btn-sm px-2 py-1 bg-[#FFE500] text-black text-[11px] font-bold"
          >
            <Plus size={12} className="mr-0.5" /> New Article
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

      {/* Redesigned Unified Single-Row Library Toolbar */}
      <div
        data-testid="library-filter-toolbar"
        className="bg-[#FFFDF0] border-2 border-black p-1.5 shadow-[2px_2px_0px_#000] flex flex-wrap items-center justify-between gap-2 text-xs font-mono"
      >
        {/* Left: Search + Category Icon Filter + Level Icon Filter */}
        <div className="flex flex-wrap items-center gap-1.5 flex-1 min-w-[260px]">
          {/* Search bar */}
          <div className="relative flex-1 min-w-[140px] max-w-xs">
            <Search size={13} className="absolute left-2.5 top-2 text-neutral-400" />
            <input
              type="text"
              placeholder="Search articles..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="neo-input w-full text-xs py-1 pl-7 pr-2 bg-white"
            />
          </div>

          {/* Category Dropdown with Icon */}
          <div className="flex items-center gap-1 bg-white border border-black px-1.5 py-0.5 shadow-[1px_1px_0px_#000]" title="Filter by category">
            <Filter size={12} className="text-neutral-500 shrink-0" />
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              aria-label="Filter by category"
              className="bg-transparent text-xs font-bold py-0.5 pr-0 outline-none cursor-pointer max-w-[130px] truncate"
            >
              <option value="all">All Topics</option>
              {existingCategories.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Level Dropdown with Icon */}
          <div className="flex items-center gap-1 bg-white border border-black px-1.5 py-0.5 shadow-[1px_1px_0px_#000]" title="Filter by level">
            <Sparkles size={11} className="text-neutral-500 shrink-0" />
            <select
              value={selectedLevel}
              onChange={e => setSelectedLevel(e.target.value)}
              aria-label="Filter by level"
              className="bg-transparent text-xs font-bold py-0.5 pr-0 outline-none cursor-pointer max-w-[95px]"
            >
              <option value="all">All Levels</option>
              <option value="B1 Intermediate">B1 Inter</option>
              <option value="B2 Upper-Intermediate">B2 Upper</option>
              <option value="C1 Advanced">C1 Adv</option>
            </select>
          </div>
        </div>

        {/* Right: Status Tabs + View Mode Toggle */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Status Tabs: Compact icon/badge format */}
          <div className="inline-flex border border-black bg-white p-0.5 shadow-[1px_1px_0px_#000]" role="tablist" aria-label="Article status">
            <button
              type="button"
              onClick={() => setStatusTab('all')}
              aria-pressed={statusTab === 'all'}
              title={`All (${resources.length})`}
              className={`px-2 py-0.5 font-bold text-[11px] transition-all ${
                statusTab === 'all' ? 'bg-black text-white' : 'text-neutral-700 hover:text-black'
              }`}
            >
              All ({resources.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusTab('published')}
              aria-pressed={statusTab === 'published'}
              title={`Published (${resources.filter(r => r.status === 'published').length})`}
              className={`px-1.5 py-0.5 font-bold text-[11px] transition-all flex items-center gap-1 ${
                statusTab === 'published' ? 'bg-[#4ADE80] text-black shadow-[1px_1px_0px_#000]' : 'text-neutral-700 hover:text-black'
              }`}
            >
              <CheckCircle size={11} />
              <span className="hidden sm:inline">Pub</span>
              <span>({resources.filter(r => r.status === 'published').length})</span>
            </button>
            <button
              type="button"
              onClick={() => setStatusTab('draft')}
              aria-pressed={statusTab === 'draft'}
              title={`Draft (${resources.filter(r => r.status === 'draft').length})`}
              className={`px-1.5 py-0.5 font-bold text-[11px] transition-all flex items-center gap-1 ${
                statusTab === 'draft' ? 'bg-[#FFE500] text-black shadow-[1px_1px_0px_#000]' : 'text-neutral-700 hover:text-black'
              }`}
            >
              <Sparkles size={11} />
              <span className="hidden sm:inline">Draft</span>
              <span>({resources.filter(r => r.status === 'draft').length})</span>
            </button>
          </div>

          {/* View Mode Toggle: Grid vs List vs Table (Icons only) */}
          {!isDrawerMode && (
            <div className="inline-flex border border-black bg-white p-0.5 shadow-[1px_1px_0px_#000]" data-testid="library-view-mode-toggle">
              <button
                type="button"
                onClick={() => setLibraryViewMode('grid')}
                aria-label="Grid view"
                aria-pressed={libraryViewMode === 'grid'}
                title="Grid"
                className={`p-1.5 transition-all ${
                  libraryViewMode === 'grid' ? 'bg-[#FFE500] text-black shadow-[1px_1px_0px_#000]' : 'text-neutral-600 hover:text-black'
                }`}
              >
                <LayoutGrid size={13} />
              </button>
              <button
                type="button"
                onClick={() => setLibraryViewMode('list')}
                aria-label="List view"
                aria-pressed={libraryViewMode === 'list'}
                title="List"
                className={`p-1.5 transition-all ${
                  libraryViewMode === 'list' ? 'bg-[#FFE500] text-black shadow-[1px_1px_0px_#000]' : 'text-neutral-600 hover:text-black'
                }`}
              >
                <List size={13} />
              </button>
              <button
                type="button"
                onClick={() => setLibraryViewMode('table')}
                aria-label="Table view"
                aria-pressed={libraryViewMode === 'table'}
                title="Table"
                className={`p-1.5 transition-all ${
                  libraryViewMode === 'table' ? 'bg-[#FFE500] text-black shadow-[1px_1px_0px_#000]' : 'text-neutral-600 hover:text-black'
                }`}
              >
                <Table size={13} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Resources Display (Grid or Compact List) */}
      {loadingResources ? (
        <div className="p-8 text-center text-xs font-mono text-neutral-500 bg-neutral-50 border border-dashed border-black">
          <span className="w-3 h-3 bg-[#FF3838] border border-black inline-block animate-spin mr-2"></span>
          Loading reading articles...
        </div>
      ) : filteredResources.length === 0 ? (
        <div className="p-6 text-center text-xs font-mono text-neutral-500 bg-neutral-50 border border-dashed border-black">
          No matching articles found. Click "Sync Sample Library (26 articles)" to load articles!
        </div>
      ) : libraryViewMode === 'table' && !isDrawerMode ? (
        <div className="border-2 border-black bg-white shadow-[2px_2px_0px_#000] overflow-x-auto" data-testid="library-table-view">
          <table className="w-full text-left border-collapse text-xs font-mono">
            <thead>
              <tr className="bg-[#FFE500] border-b-2 border-black text-[11px] font-black uppercase text-black">
                <th className="py-2 px-3 whitespace-nowrap">#</th>
                <th className="py-2 px-3 min-w-[240px]">Article Title</th>
                <th className="py-2 px-3 whitespace-nowrap">Category</th>
                <th className="py-2 px-3 whitespace-nowrap">Level</th>
                <th className="py-2 px-3 whitespace-nowrap text-center">Scale</th>
                <th className="py-2 px-3 whitespace-nowrap text-center">Chunks</th>
                <th className="py-2 px-3 whitespace-nowrap text-right pr-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/15">
              {filteredResources.map((res, idx) => {
                const isPublished = res.status === 'published';
                const approvedCount = res.annotations.filter(a => a.status === 'approved').length;
                const totalPhrases = res.annotations.length;
                const sentenceCount = res.sentences?.length || 0;
                const paragraphCount = res.paragraphs?.length || 0;
                const isCurrentActive = activeRoom?.status === 'active' && activeRoom.resourceId === res.id;

                return (
                  <tr
                    key={res.id}
                    className={`transition-colors ${
                      isCurrentActive
                        ? 'bg-red-50 hover:bg-red-100/70 font-semibold'
                        : idx % 2 === 0
                        ? 'bg-[#FFFDF9] hover:bg-[#FFF8D6]'
                        : 'bg-white hover:bg-[#FFF8D6]'
                    }`}
                  >
                    {/* Index & Active indicator */}
                    <td className="py-2 px-3 text-neutral-500 font-bold text-[11px] whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        {isCurrentActive && (
                          <span className="w-2 h-2 rounded-full bg-[#FF3838] animate-ping" title="Live Now" />
                        )}
                        <span>{idx + 1}</span>
                      </div>
                    </td>

                    {/* Title & Status */}
                    <td className="py-2 px-3 font-reading">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className="font-bold text-sm text-black hover:underline cursor-pointer"
                          onClick={() => setReviewingResource(res)}
                          title={res.title}
                        >
                          {res.title}
                        </span>
                        {isCurrentActive && (
                          <span className="neo-badge bg-[#FF3838] text-white text-[8px] py-0 px-1 font-bold">
                            LIVE
                          </span>
                        )}
                        {isPublished ? (
                          <span className="neo-badge bg-[#4ADE80] text-black text-[8px] py-0 px-1">
                            Published
                          </span>
                        ) : (
                          <span className="neo-badge bg-[#FFE500] text-black text-[8px] py-0 px-1">
                            Draft
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Category */}
                    <td className="py-2 px-3 whitespace-nowrap">
                      <span className="bg-neutral-100 px-1.5 py-0.5 border border-black/30 text-[10px] text-neutral-800 font-bold">
                        {res.category}
                      </span>
                    </td>

                    {/* Level */}
                    <td className="py-2 px-3 whitespace-nowrap text-[11px] text-neutral-700">
                      {res.level.split(' ')[0]} <span className="text-[10px] text-neutral-500 font-normal">({res.level.replace(res.level.split(' ')[0] + ' ', '')})</span>
                    </td>

                    {/* Size */}
                    <td className="py-2 px-3 whitespace-nowrap text-center text-[11px] text-neutral-600">
                      {sentenceCount} sentences / {paragraphCount} paragraphs
                    </td>

                    {/* Chunks */}
                    <td className="py-2 px-3 whitespace-nowrap text-center">
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
                        className="hover:underline font-bold text-[#111111] inline-flex items-center gap-1 text-[11px]"
                        title="Open Chunks Studio"
                      >
                        <Highlighter size={11} className="text-[#FF3838]" />
                        <span>{approvedCount}/{totalPhrases}</span>
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="py-2 px-3 whitespace-nowrap text-right pr-4">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setReviewingResource(res)}
                          className="p-1 hover:bg-neutral-200 border border-black/60 bg-white"
                          title="Quick view article & chunks"
                        >
                          <Eye size={12} />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingResource(res);
                            setIsEditorOpen(true);
                          }}
                          className="p-1 hover:bg-neutral-200 border border-black/60 bg-white"
                          title="Edit reading article"
                        >
                          <Edit size={12} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(res.id)}
                          className="p-1 hover:bg-red-200 text-red-700 border border-black/60 bg-white"
                          title="Delete reading article"
                        >
                          <Trash2 size={12} />
                        </button>
                        {isCurrentActive ? (
                          <button
                            type="button"
                            onClick={() => handleOpenClassroom(res)}
                            className="px-2 py-0.5 bg-[#4ADE80] text-black text-[10px] font-bold border border-black hover:bg-green-400 ml-1 inline-flex items-center gap-1"
                            title="Load to currently open room"
                          >
                            <RefreshCw size={10} />
                            <span>Load</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleOpenClassroom(res)}
                            className="px-2 py-0.5 bg-[#FF3838] text-white text-[10px] font-bold border border-black hover:bg-red-600 ml-1 inline-flex items-center gap-1"
                            title="Go live now"
                          >
                            <Play size={10} />
                            <span>Live</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : libraryViewMode === 'list' && !isDrawerMode ? (
        <div className="space-y-2" data-testid="library-compact-list">
          {filteredResources.map(res => {
            const isPublished = res.status === 'published';
            const approvedCount = res.annotations.filter(a => a.status === 'approved').length;
            const totalPhrases = res.annotations.length;
            const sentenceCount = res.sentences?.length || 0;
            const paragraphCount = res.paragraphs?.length || 0;
            const isCurrentActive = activeRoom?.status === 'active' && activeRoom.resourceId === res.id;

            return (
              <div
                key={res.id}
                className={`p-2.5 border-2 border-black flex flex-col md:flex-row md:items-center justify-between gap-2.5 transition-all shadow-[2px_2px_0px_#000] ${
                  isCurrentActive ? 'border-[#FF3838] bg-red-50/60 ring-2 ring-[#FF3838]' : 'bg-[#FFFDF0] hover:bg-white'
                }`}
              >
                {/* Left Column: Title & Metadata badges */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono">
                    {isCurrentActive && (
                      <span className="neo-badge bg-[#FF3838] text-white text-[9px] py-0 px-1 font-bold">
                        LIVE NOW
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
                    <span className="bg-white px-1.5 py-0.5 border border-black text-neutral-800 font-bold">
                      {res.category}
                    </span>
                    <span className="bg-neutral-100 px-1.5 py-0.5 border border-black/40 text-neutral-600">
                      {res.level}
                    </span>
                    <span className="text-neutral-500">
                      {sentenceCount} sentences • {paragraphCount} paragraphs
                    </span>
                  </div>
                  <h4 className="font-bold text-sm text-black truncate font-reading" title={res.title}>
                    {res.title}
                  </h4>
                </div>

                {/* Right Column: Chunk Count & Action Buttons */}
                <div className="flex flex-wrap items-center gap-1.5 shrink-0 text-xs font-mono">
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
                    className="neo-btn-sm px-2 py-1 bg-white text-neutral-900 font-bold hover:bg-neutral-100 flex items-center gap-1"
                    title="Studio review & add chunks"
                  >
                    <Highlighter size={12} className="text-[#FF3838]" />
                    <span>{approvedCount}/{totalPhrases} Chunks</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setReviewingResource(res)}
                    className="neo-btn-sm px-2 py-1 text-[11px] font-bold bg-white text-black hover:bg-neutral-100"
                    title="View phrase list"
                  >
                    <Eye size={12} />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setEditingResource(res);
                      setIsEditorOpen(true);
                    }}
                    className="neo-btn-sm px-1.5 py-1 hover:bg-neutral-200 text-black border border-black bg-white"
                    title="Edit article"
                  >
                    <Edit size={12} />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(res.id)}
                    className="neo-btn-sm px-1.5 py-1 hover:bg-red-200 text-red-700 border border-black bg-white"
                    title="Delete article"
                  >
                    <Trash2 size={12} />
                  </button>

                  {isCurrentActive ? (
                    <button
                      type="button"
                      onClick={() => handleOpenClassroom(res)}
                      className="neo-btn-sm px-2.5 py-1 bg-[#4ADE80] text-black text-[11px] font-bold hover:bg-green-400 flex items-center gap-1"
                      title="Load this article to active classroom"
                    >
                      <RefreshCw size={11} />
                      <span>Load to Room</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleOpenClassroom(res)}
                      className="neo-btn-sm px-2.5 py-1 bg-[#FF3838] text-white text-[11px] font-bold hover:bg-red-600 flex items-center gap-1"
                      title="Go live with this article now"
                    >
                      <Play size={11} />
                      <span>Live</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className={isDrawerMode ? "space-y-3 max-h-[60vh] overflow-y-auto pr-1" : "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"}>
          {filteredResources.map(res => {
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
                            LIVE NOW
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
                          {sentenceCount} sentences • {paragraphCount} paragraphs
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
                        title="Edit article"
                      >
                        <Edit size={11} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(res.id)}
                        className="p-1 hover:bg-red-200 text-red-700 border border-black"
                        title="Delete article"
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
                    title="Open Studio to review & add chunks"
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
                      title="View phrase list"
                    >
                      <Eye size={10} className="mr-0.5" /> View
                    </button>

                    {activeRoom && activeRoom.status === 'active' ? (
                      <button
                        type="button"
                        onClick={() => handleOpenClassroom(res)}
                        className="neo-btn-sm px-2 py-0.5 bg-[#4ADE80] text-black text-[10px] font-bold hover:bg-green-400"
                        title="Load this article to active classroom"
                      >
                        <RefreshCw size={10} className="mr-0.5 inline" />
                        <span>Load to Room</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleOpenClassroom(res)}
                        className="neo-btn-sm px-2 py-0.5 bg-[#FF3838] text-white text-[10px] font-bold hover:bg-red-600"
                        title="Go live with this article now"
                      >
                        <Play size={10} className="mr-0.5" /> Live
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
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
            <span>🔴 Live Classroom</span>
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
            <span>📚 Library ({resources.length})</span>
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
            <span>✨ Chunks Studio</span>
          </button>
        </div>

        {/* Quick Header Actions if Live Room Active */}
        {activeRoom && activeRoom.status === 'active' && (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleCopyLink}
              className="neo-btn-sm px-2.5 py-1 bg-white text-black text-xs font-bold"
              title="Copy student link"
            >
              {copiedLink ? <Check size={12} className="mr-1 text-green-600" /> : <Copy size={12} />}
              <span>{copiedLink ? 'Copied Link!' : 'Copy Link'}</span>
            </button>

            <button
              type="button"
              onClick={() => onOpenLearnerView(activeRoom.id)}
              className="neo-btn-sm px-2 py-1 bg-[#00D2FF] text-black text-xs font-bold"
              title="View student interface fullscreen"
            >
              <ExternalLink size={12} className="mr-1" /> Student Screen
            </button>

            <button
              type="button"
              onClick={handleEndRoom}
              className="neo-btn-sm px-2.5 py-1 bg-[#FF3838] text-white text-xs font-bold hover:bg-red-600"
            >
              End
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
              {/* UNIFIED CONTAINER: Unit content + Navigation + Remote Presentation Controls */}
              <div ref={readingAreaRef} data-testid="teacher-reading-area" className={`neo-box bg-white p-4 sm:p-5 space-y-4 ${isReadingFullscreen ? 'h-screen w-screen overflow-y-auto lg:pr-[44%] flex flex-col' : ''}`}>
                <div className="flex justify-between items-center gap-2">
                  <span className="text-xs font-mono">Reading & Controls</span>
                  <button type="button" onClick={toggleReadingFullscreen} aria-label={isReadingFullscreen ? 'Exit fullscreen' : 'Fullscreen reading area'} title={isReadingFullscreen ? 'Exit fullscreen (Esc)' : 'Fullscreen reading area and learner view'} className="neo-btn-sm px-2 py-1 bg-white text-black flex items-center gap-1">
                    {isReadingFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
                  </button>
                </div>
                {/* Header: Unit index + Mini progress bar + Headcount + Room code + Playback status */}
                <div className="space-y-2 pb-3 border-b border-black">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="neo-badge bg-[#FFE500] text-black text-xs font-mono font-bold">
                        {isFullReviewActive
                          ? 'Full Article Review'
                          : `${stagedGranularity === 'paragraph' ? 'Paragraph' : 'Sentence'} ${stagedUnitIndex + 1} / ${currentUnitsList.length}`}
                      </span>
                      <span className="font-mono text-xs font-bold text-neutral-800 truncate max-w-[200px] sm:max-w-xs">
                        {activePresentedResource.title}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      {/* Online count */}
                      <span className="neo-badge bg-[#4ADE80] text-black text-[10px] py-0.5 px-1.5 font-bold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-700 animate-pulse inline-block"></span>
                        👥 {participants.length}
                      </span>

                      {/* Room code */}
                      <span className="neo-badge bg-white text-black text-[10px] py-0.5 px-1.5 font-mono font-bold">
                        🏷️ {activeRoom.id}
                      </span>

                      {/* Playback status */}
                      {(() => {
                        if (isFullReviewActive) {
                          return (
                            <span className="neo-badge bg-[#00D2FF] text-black text-[10px] py-0.5 px-1.5 font-bold">
                              📖 FULL PASSAGE REVIEW
                            </span>
                          );
                        }
                        const status = activeRoom.playbackStatus;
                        if (status === 'playing') {
                          return (
                            <span className="neo-badge bg-[#4ADE80] text-black text-[10px] py-0.5 px-1.5 font-bold animate-pulse">
                              ● PLAYING
                            </span>
                          );
                        }
                        if (status === 'paused') {
                          return (
                            <span className="neo-badge bg-[#FFE500] text-black text-[10px] py-0.5 px-1.5 font-bold">
                              ❚❚ PAUSED
                            </span>
                          );
                        }
                        if (status === 'manual_show') {
                          return (
                            <span className="neo-badge bg-[#00D2FF] text-black text-[10px] py-0.5 px-1.5 font-bold">
                              💬 DISCUSSION
                            </span>
                          );
                        }
                        return (
                          <span className="neo-badge bg-neutral-200 text-neutral-700 text-[10px] py-0.5 px-1.5 font-bold">
                            ○ WAITING
                          </span>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Reading unit mini progress bar */}
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

                {/* Presentation mode: Sentence | Paragraph | Full Review (Requirement 5 & 6) */}
                <div className="flex flex-wrap items-center justify-between gap-2 py-1 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-mono font-bold uppercase text-neutral-700">Reading Unit:</span>
                    <div className="inline-flex border border-black bg-white shadow-[1px_1px_0px_#000]">
                      <button
                        type="button"
                        onClick={() => handleSwitchGranularity('sentence')}
                        className={`px-2.5 py-1 text-xs font-mono font-black uppercase transition-all ${
                          stagedGranularity === 'sentence' && !isFullReviewActive
                            ? 'bg-[#FFE500] text-black shadow-[1px_1px_0px_#000]'
                            : 'text-neutral-700 hover:text-black hover:bg-neutral-50'
                        }`}
                        title="Display sentence by sentence"
                      >
                        📝 Sentence
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSwitchGranularity('paragraph')}
                        className={`px-2.5 py-1 text-xs font-mono font-black uppercase border-l border-black transition-all ${
                          stagedGranularity === 'paragraph' && !isFullReviewActive
                            ? 'bg-[#FFE500] text-black shadow-[1px_1px_0px_#000]'
                            : 'text-neutral-700 hover:text-black hover:bg-neutral-50'
                        }`}
                        title="Display paragraph by paragraph"
                      >
                        📄 Paragraph
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button type="button" onClick={() => setShowFullArticlePreview(value => !value)}
                      aria-label="Teacher private full preview" aria-pressed={showFullArticlePreview}
                      title="Full preview — teacher only, does not affect student screen"
                      className="neo-btn-sm px-2 py-1 bg-white text-black"><BookOpen size={16} /></button>
                    {showFullArticlePreview && <button type="button" onClick={handleToggleFullReview}
                      aria-label={isFullReviewActive && roomProgress.phase === 'manual_show' ? 'Stop broadcasting full article' : 'Broadcast full article to students'}
                      title="Toggle broadcasting full article to students" className="neo-btn-sm px-2 py-1 bg-[#FFE500] text-black"><Radio size={16} /></button>}
                    {isFullReviewActive && <button type="button" onClick={handleExitFullReview} aria-label="Exit student review" title="Exit student review"
                      className="neo-btn-sm px-2 py-1 bg-white text-black"><X size={16} /></button>}
                  </div>
                </div>

                <div data-testid="reading-highlight-toggle" className="flex flex-wrap items-center gap-2 text-xs font-mono">
                  <label className={`inline-flex cursor-pointer items-center gap-2 rounded-full border-2 border-black px-3 py-1.5 font-bold shadow-[2px_2px_0px_#000] ${stagedHighlight ? 'bg-[#FFE500]' : 'bg-white'}`}>
                    <Highlighter size={16} /><span>Highlights</span><input type="checkbox" aria-label="Show Highlights" checked={stagedHighlight}
                    onChange={e => setStagedHighlight(e.target.checked)} className="accent-black" />
                  </label>
                  <span className="rounded-full border border-black/20 bg-neutral-100 px-2 py-1 text-[10px] text-neutral-600">{stagedHighlight !== activeRoom.highlightEnabled ? 'Not applied · click Apply' : 'Applied'}</span>
                </div>
                {clockStatus.failed && <p role="status" className="text-xs text-red-700">Server time sync failed. Check connection and try Replay.</p>}

                {/* Current sentence / paragraph / full passage content (Reading Text Display: Clear, prominent typography) */}
                <div data-testid="teacher-reading-canvas" className={`p-4 sm:p-6 bg-paper-reading border-2 border-black flex flex-col items-center justify-center text-center shadow-[2px_2px_0px_#000] relative ${isReadingFullscreen ? 'flex-1 min-h-[50vh]' : 'min-h-[140px]'}`}>
                  {showFullArticlePreview ? (
                    <div data-testid="private-full-article-preview" className="w-full text-left space-y-2 max-h-[340px] overflow-y-auto">
                      <p className="text-xs font-mono text-neutral-500">Teacher private preview · broadcast to students with live icon.</p>
                      <ReadingUnitText room={{ ...activeRoom, highlightEnabled: stagedHighlight }} timeline={{ ...roomProgress, phase: 'manual_show' }}
                        fullReview text={activePresentedResource.canonicalText} annotations={fullReviewApprovedSpans}
                        className="font-reading text-lg sm:text-xl leading-relaxed" />
                    </div>
                  ) : !isFullReviewActive && stagedGranularity !== activeRoom.granularity && stagedText ? (
                    <div data-testid="private-staged-unit-preview" className="w-full space-y-2">
                      <p className="text-xs font-mono text-neutral-500">Teacher private preview · {stagedGranularity === 'sentence' ? 'Sentence' : 'Paragraph'} · requires Apply or Show to display on student screen.</p>
                      <ReadingUnitText room={{...activeRoom,highlightEnabled:stagedHighlight}} timeline={{...roomProgress,phase:'manual_show'}} text={stagedText} annotations={stagedApprovedSpans} className="font-reading text-xl sm:text-2xl md:text-3xl leading-relaxed" />
                    </div>
                  ) : unitReviewMode && roomProgress.phase === 'idle' ? (
                    <p data-testid="teacher-reading-hidden" className="text-xs font-mono text-neutral-500">Hidden on teacher and student screens.</p>
                  ) : ['hold', 'erase', 'paused', 'manual_show'].includes(roomProgress.phase) && activeRoom.currentUnit && !isFullReviewActive ? (
                    <div className="w-full space-y-3">
                      <ReadingCountdown timeline={roomProgress} />
                      <ReadingUnitText room={activeRoom} timeline={roomProgress} className="font-reading text-xl sm:text-2xl md:text-3xl leading-relaxed" />
                      <p className="text-[10px] font-mono text-neutral-500">{roomProgress.phase === 'manual_show' ? 'Unit review · untimed · matches student screen.' : 'Applied student state.'}</p>
                    </div>
                  ) : isFullReviewActive ? (
                    /* Full Text Review Mode Display */
                    <div className="w-full text-left space-y-3 py-2 max-h-[340px] overflow-y-auto pr-1 select-text">
                      <div className="bg-[#FFE500] border border-black p-2 text-xs font-mono font-bold flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <BookOpen size={14} /> Full Reading Passage (Review & Discussion Mode)
                        </span>
                        <span className="bg-white px-1.5 py-0.5 border border-black text-[10px] uppercase">
                          Untimed
                        </span>
                      </div>
                      <ReadingUnitText room={activeRoom} timeline={roomProgress} className="font-reading text-lg sm:text-xl leading-relaxed text-[#111111]" />
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
                          <span>Hold duration: <b>{(dynamicHoldInfo.holdDurationMs / 1000).toFixed(1)}s</b></span>
                          {dynamicPacingEnabled && (
                            <span className="bg-[#FFFDF0] px-1 border border-black text-[10px] text-black font-bold">
                              ⚡ {dynamicHoldInfo.wordCount} words {dynamicHoldInfo.isAdjusted ? `(${dynamicHoldInfo.adjustedDiffMs > 0 ? '+' : ''}${(dynamicHoldInfo.adjustedDiffMs / 1000).toFixed(1)}s adjusted)` : '(standard)'}
                            </span>
                          )}
                        </div>
                        {autoMergeShortUnits && (
                          <span className="text-[10px] text-neutral-500">
                            (Auto-merge short sentences &lt; {minWordsPerUnit} words enabled)
                          </span>
                        )}
                      </div>
                    </>
                  ) : (
                    <span className="text-neutral-400 font-mono text-sm italic">
                      No sentence content
                    </span>
                  )}
                </div>
                <TeacherPrivateUnitPreview room={activeRoom} resource={activePresentedResource} currentIndex={isFullReviewActive ? reviewReturnIndex.current : undefined} />

                <nav aria-label="Keyboard reading controls" className="space-y-2">
                  <div className="text-center text-xs font-mono">
                    <span>{isFullReviewActive ? 'Learner: full text' : `${activeRoom.granularity === 'paragraph' ? 'Paragraph' : 'Sentence'} ${(activeRoom.currentUnit?.index ?? 0) + 1} / ${activeRoom.currentUnit?.totalUnits ?? 0}`}</span>
                  </div>
                  <div className="flex flex-wrap justify-center gap-2">
                    <button type="button" onClick={handlePreviousAndPlay} disabled={(activeRoom.currentUnit?.index ?? 0) <= 0 || isFullReviewActive}
                      aria-label={activeRoom.granularity === 'paragraph' ? 'Previous paragraph' : 'Previous sentence'} title={unitReviewMode ? 'Review previous unit, untimed (←)' : 'Previous unit and play immediately (← / PageUp)'} className="neo-btn-sm p-2 bg-white disabled:opacity-40"><ChevronLeft size={18} /></button>
                    <button type="button" onClick={handleReplayCurrent} disabled={isFullReviewActive}
                      aria-label={activeRoom.granularity === 'paragraph' ? 'Replay this paragraph' : 'Replay this sentence'} title={unitReviewMode ? 'Show this unit again, untimed (R)' : 'Replay (R)'} className="neo-btn-sm p-2 bg-white disabled:opacity-40"><RotateCcw size={18} /></button>
                    {!isFullReviewActive && ['playing','paused'].includes(activeRoom.playbackStatus) && roomProgress.phase !== 'blank_finished' && <button type="button"
                      onClick={activeRoom.playbackStatus === 'paused' ? handleResumeTurn : handlePauseTurn}
                      aria-label={activeRoom.playbackStatus === 'paused' ? 'Resume reading' : 'Pause reading'} title={activeRoom.playbackStatus === 'paused' ? 'Resume reading (Space)' : 'Pause reading (Space)'}
                      className="neo-btn-sm p-2 bg-[#FFE500]">{activeRoom.playbackStatus === 'paused' ? <Play size={18} /> : <Pause size={18} />}</button>}
                    <button type="button" onClick={handleAdvanceAndPlay} disabled={(activeRoom.currentUnit?.index ?? 0) >= (activeRoom.currentUnit?.totalUnits ?? 0) - 1 || isFullReviewActive}
                      aria-label={activeRoom.granularity === 'paragraph' ? 'Next paragraph' : 'Next sentence'} title={unitReviewMode ? 'Review next unit, untimed (→)' : 'Next unit and play immediately (→ / PageDown)'} className="neo-btn-sm p-2 bg-white disabled:opacity-40"><ChevronRight size={18} /></button>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono text-neutral-500">
                    <label className="flex items-center gap-1.5"><input type="checkbox" checked={autoAdvance} onChange={e => setAutoAdvance(e.target.checked)} />Auto-advance</label>
                    <span>{unitReviewMode ? '← Prev · R Replay · → Next · Space/B Hide/Show · untimed' : '← Prev · R Replay · Space Play/Pause · → Next · B Hide/Show'}</span>
                  </div>
                </nav>

                <div className="flex items-center justify-between text-xs font-mono">
                    <button type="button" onClick={handleToggleBlankOrShow}
                      aria-label={['idle', 'blank_finished'].includes(roomProgress.phase) ? 'Show student screen' : 'Hide student screen'} title="Hide / show review on teacher and learner, untimed (B / .)"
                      className="neo-btn-sm p-2 bg-white">{['idle', 'blank_finished'].includes(roomProgress.phase) ? <Eye size={18} /> : <EyeOff size={18} />}</button>
                  {unitReviewMode && !showFullArticlePreview && <button type="button" onClick={() => { unitReviewModeRef.current = false; setUnitReviewMode(false); }}
                    aria-label="Return to timed reading" title="Return to timed reading — press Replay to start" className="neo-btn-sm p-2 bg-white"><Clock size={16} /></button>}
                  <button type="button" onClick={() => setShowLiveLearnerView(value => !value)} aria-label="Learner perspective"
                    title="Learner perspective" className="neo-btn-sm px-2 py-1 bg-white"><Monitor size={16} /></button>
                </div>
                {isReadingFullscreen ? <div data-testid="fullscreen-learner-view" className="lg:fixed lg:right-5 lg:top-5 lg:w-[40vw] lg:max-h-[calc(100vh-2.5rem)] lg:overflow-y-auto">
                  <LiveLearnerPreview room={activeRoom} timeline={roomProgress} participantsCount={participants.length} />
                </div> : showLiveLearnerView && <LiveLearnerView room={activeRoom} participants={participants}
                  onClose={() => setShowLiveLearnerView(false)} stagedEraseEffect={stagedEraseEffect} stagedDustAngle={stagedDustAngle}
                  onSelectDustAngle={setStagedDustAngle} onSelectEraseEffect={setStagedEraseEffect} stagedHoldMs={stagedHoldMs} stagedEraseMs={stagedEraseMs}
                  stagedEraseSchedule={stagedEraseSchedule} onSelectEraseSchedule={setStagedEraseSchedule} />}
              </div>

            </div>

            {/* Right Column: lg:col-span-4 (~30% width) with Icon Tab Navigation (Requirement 4) */}
            <div className="lg:col-span-4 space-y-3">
              {/* Icon Navigation Bar (Requirement 4) */}
              <div className="bg-white border-2 border-black p-1 shadow-[2px_2px_0px_#000]">
                <div className="grid grid-cols-4 gap-1">
                  <button
                    type="button"
                    onClick={() => setSettingsTab('timings')}
                    aria-label="Settings"
                    aria-pressed={settingsTab === 'timings'}
                    className={`py-2 px-1 text-xs font-mono font-bold flex items-center justify-center border transition-all ${
                      settingsTab === 'timings'
                        ? 'bg-[#FFE500] text-black border-black shadow-[1px_1px_0px_#000]'
                        : 'bg-white text-neutral-600 border-transparent hover:border-black/30 hover:text-black'
                    }`}
                    title="Presentation & Timing Settings (Sentence vs Paragraph)"
                  >
                    <Sliders size={16} />
                  </button>

                  <button
                    type="button"
                    onClick={() => setSettingsTab('switch_lesson')}
                    aria-label="Switch Lesson"
                    aria-pressed={settingsTab === 'switch_lesson'}
                    className={`py-2 px-1 text-xs font-mono font-bold flex items-center justify-center border transition-all ${
                      settingsTab === 'switch_lesson'
                        ? 'bg-[#4ADE80] text-black border-black shadow-[1px_1px_0px_#000]'
                        : 'bg-white text-neutral-600 border-transparent hover:border-black/30 hover:text-black'
                    }`}
                    title="Quick switch lesson from library"
                  >
                    <BookOpen size={16} />
                  </button>

                  <button
                    type="button"
                    onClick={() => setSettingsTab('participants')}
                    aria-label="Participants"
                    aria-pressed={settingsTab === 'participants'}
                    className={`py-2 px-1 text-xs font-mono font-bold flex items-center justify-center border transition-all relative ${
                      settingsTab === 'participants'
                        ? 'bg-[#00D2FF] text-black border-black shadow-[1px_1px_0px_#000]'
                        : 'bg-white text-neutral-600 border-transparent hover:border-black/30 hover:text-black'
                    }`}
                    title={`Students & Room Code (${participants.length} connected)`}
                  >
                    <Users size={16} />
                    {participants.length > 0 && (
                      <span className="neo-badge bg-[#FF3838] text-white text-[8px] py-0 px-1 font-bold absolute -top-1 -right-1">
                        {participants.length}
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setSettingsTab('all')}
                    aria-label="View All Panels"
                    aria-pressed={settingsTab === 'all'}
                    className={`py-2 px-1 text-xs font-mono font-bold flex items-center justify-center border transition-all ${
                      settingsTab === 'all'
                        ? 'bg-black text-white border-black shadow-[1px_1px_0px_#000]'
                        : 'bg-white text-neutral-600 border-transparent hover:border-black/30 hover:text-black'
                    }`}
                    title="View all cards"
                  >
                    <LayoutGrid size={16} />
                  </button>
                </div>
              </div>

              {/* Card 1: Presentation settings (Timings & Advanced Engine - Requirements 4, 6, 7) */}
              {(settingsTab === 'timings' || settingsTab === 'all') && (
                <div data-testid="presentation-settings" className="neo-box-sm bg-white p-3.5 space-y-3">
                  <div className="flex items-center justify-between border-b border-black pb-2">
                    <div className="flex items-center gap-1.5 font-black text-xs uppercase text-black font-mono">
                      <Sliders size={14} className="text-black" />
                      <span>Presentation Settings</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleApplyToRoom}
                      disabled={isApplying}
                      className="neo-btn-sm px-2.5 py-0.5 bg-[#FFE500] text-black text-[10px] font-bold"
                      title="Save settings and synchronize with students"
                    >
                      {isApplying ? 'Saving...' : 'Save Settings'}
                    </button>
                  </div>

                  {/* Current Mode: Sentence vs Paragraph */}
                  <div className="flex items-center justify-between p-2 bg-[#FFFDF0] border border-black text-xs font-mono">
                    <span className="font-bold text-black uppercase text-[11px]">Currently Showing:</span>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => handleSwitchGranularity('sentence')}
                        className={`px-2 py-0.5 font-bold uppercase text-[10px] border border-black transition-colors ${
                          stagedGranularity === 'sentence' ? 'bg-[#FFE500] shadow-[1px_1px_0px_#000]' : 'bg-white hover:bg-neutral-100'
                        }`}
                      >
                        📝 Sentence
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSwitchGranularity('paragraph')}
                        className={`px-2 py-0.5 font-bold uppercase text-[10px] border border-black transition-colors ${
                          stagedGranularity === 'paragraph' ? 'bg-[#FFE500] shadow-[1px_1px_0px_#000]' : 'bg-white hover:bg-neutral-100'
                        }`}
                      >
                        📄 Paragraph
                      </button>
                    </div>
                  </div>

                  <details open className="text-xs font-mono space-y-2">
                    <summary className="cursor-pointer font-bold">Timing & Sounds</summary>
                    <TeacherReadingSettings mode={stagedTimingMode} onMode={setStagedTimingMode}
                      rate={stagedWordsPerSecond} onRate={setStagedWordsPerSecond}
                      schedule={stagedEraseSchedule} onSchedule={setStagedEraseSchedule} text={stagedText}
                      profiles={{ sentence: { holdMs: stagedSentenceHoldMs, eraseMs: stagedSentenceEraseMs }, paragraph: { holdMs: stagedParagraphHoldMs, eraseMs: stagedParagraphEraseMs } }}
                      onProfile={(granularity, field, value) => {
                        if (granularity === 'sentence') { if (field === 'holdMs') setStagedSentenceHoldMs(value); else setStagedSentenceEraseMs(value); }
                        else { if (field === 'holdMs') setStagedParagraphHoldMs(value); else setStagedParagraphEraseMs(value); }
                        if (granularity === stagedGranularity) { if (field === 'holdMs') setStagedHoldMs(value); else setStagedEraseMs(value); }
                      }} sounds={teacherAudio.sounds} onSound={teacherAudio.toggleSound} soundOptions={teacherAudio.soundOptions}
                      onSelectSound={teacherAudio.selectSound} onPreviewSound={teacherAudio.previewSound} />
                  </details>
                  <label className="flex items-center gap-2 text-xs font-mono"><input type="checkbox" checked={autoMergeShortUnits}
                    onChange={e => setAutoMergeShortUnits(e.target.checked)} />Merge short units</label>
                  {autoMergeShortUnits && <label className="flex items-center justify-between gap-2 text-xs font-mono">Min word count
                    <input type="number" min={3} max={8} value={minWordsPerUnit} onChange={e => setMinWordsPerUnit(Number(e.target.value))}
                      className="neo-input w-16 text-xs" /></label>}

                  {/* Erase effects */}
                  <div>
                    <label className="block text-[11px] font-mono font-bold uppercase mb-1.5">
                      Erase Effect:
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

                </div>
              )}

              {/* Card 2: Quick Switch Lesson */}
              {(settingsTab === 'switch_lesson' || settingsTab === 'all') && (
                <div className="neo-box-sm bg-white p-3.5 space-y-3">
                  <div className="flex items-center justify-between border-b border-black pb-2">
                    <div className="flex items-center gap-1.5 font-black text-xs uppercase text-black font-mono">
                      <RefreshCw size={14} className="text-[#FF3838]" />
                      <span>Quick Switch Lesson</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveMainTab('library')}
                      className="text-[10px] font-mono text-neutral-600 underline font-bold hover:text-black"
                    >
                      Open Library →
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {/* Layer 1: Select category chips to filter related reading passages */}
                    <div data-testid="quick-switch-category-layer">
                      <div className="flex items-center justify-between text-[11px] font-mono font-bold uppercase text-neutral-600 mb-1">
                        <span className="flex items-center gap-1">
                          <Filter size={11} className="text-black" />
                          <span>Category ({existingCategories.length}):</span>
                        </span>
                        {quickSwitchCategory !== 'all' && (
                          <button
                            type="button"
                            onClick={() => setQuickSwitchCategory('all')}
                            className="text-[10px] text-neutral-500 hover:text-black underline font-normal"
                          >
                            All
                          </button>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto pr-0.5">
                        <button
                          type="button"
                          onClick={() => setQuickSwitchCategory('all')}
                          className={`px-2 py-0.5 text-[10px] font-mono font-bold border transition-all ${
                            quickSwitchCategory === 'all'
                              ? 'bg-black text-white border-black shadow-[1px_1px_0px_#000]'
                              : 'bg-white text-neutral-700 border-black/40 hover:bg-neutral-100'
                          }`}
                        >
                          All ({resources.length})
                        </button>
                        {existingCategories.map(cat => {
                          const count = resources.filter(r => r.category === cat).length;
                          const isSelected = quickSwitchCategory === cat;
                          return (
                            <button
                              key={cat}
                              type="button"
                              onClick={() => {
                                setQuickSwitchCategory(cat);
                                const inCat = resources.filter(r => r.category === cat);
                                if (inCat.length > 0 && !inCat.some(r => r.id === selectedQuickSwitchId)) {
                                  setSelectedQuickSwitchId(inCat[0].id);
                                }
                              }}
                              className={`px-2 py-0.5 text-[10px] font-mono font-bold border transition-all ${
                                isSelected
                                  ? 'bg-[#FFE500] text-black border-black shadow-[1px_1px_0px_#000]'
                                  : 'bg-white text-neutral-700 border-black/40 hover:bg-neutral-100'
                              }`}
                            >
                              {cat} ({count})
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Layer 2: Select reading article in filtered category (Rich Neobrutalist Combobox) */}
                    <div>
                      <ResourceSelectCombobox
                        label={`Choose article (${quickSwitchFilteredResources.length}):`}
                        resources={quickSwitchFilteredResources}
                        selectedId={selectedQuickSwitchId || (quickSwitchFilteredResources.some(r => r.id === activePresentedResource.id) ? activePresentedResource.id : quickSwitchFilteredResources[0]?.id || '')}
                        onSelect={id => setSelectedQuickSwitchId(id)}
                        activeId={activePresentedResource.id}
                      />
                    </div>

                    {/* Target resource summary */}
                    {(() => {
                      const effectiveId = selectedQuickSwitchId || (quickSwitchFilteredResources.some(r => r.id === activePresentedResource.id) ? activePresentedResource.id : quickSwitchFilteredResources[0]?.id || '');
                      const targetRes = resources.find(r => r.id === effectiveId);
                      if (!targetRes) return null;
                      const isCurrent = targetRes.id === activePresentedResource.id;
                      return (
                        <div className="p-2 bg-[#FFFDF0] border border-black/30 text-xs font-mono space-y-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-bold text-black truncate max-w-[170px]">{targetRes.title}</span>
                            {isCurrent ? (
                              <span className="neo-badge bg-[#4ADE80] text-black text-[9px] py-0 px-1 font-bold">
                                LIVE
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
                        const effectiveId = selectedQuickSwitchId || (quickSwitchFilteredResources.some(r => r.id === activePresentedResource.id) ? activePresentedResource.id : quickSwitchFilteredResources[0]?.id || '');
                        const targetRes = resources.find(r => r.id === effectiveId);
                        if (targetRes) {
                          handleOpenClassroom(targetRes);
                        }
                      }}
                      className="neo-btn w-full py-2 bg-[#4ADE80] text-black text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 hover:bg-green-400"
                    >
                      <RefreshCw size={13} />
                      <span>Switch to this article now</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Card 3: Room Info & Online Students */}
              {(settingsTab === 'participants' || settingsTab === 'all') && (
                <div className="neo-box-sm bg-white p-3.5 space-y-3">
                  <div className="flex items-center justify-between border-b border-black pb-2">
                    <div className="flex items-center gap-1.5 font-black text-xs uppercase text-black font-mono">
                      <Users size={14} className="text-black" />
                      <span>Room Info & Connection</span>
                    </div>
                    <span className="neo-badge bg-[#4ADE80] text-black text-[9px] py-0 px-1 font-bold">
                      {participants.length} Online
                    </span>
                  </div>

                  {/* Large Room Code Banner */}
                  <div className="p-2.5 bg-[#FFFDF0] border-2 border-black text-center shadow-[1px_1px_0px_#000]">
                    <div className="text-[10px] font-mono uppercase text-neutral-500">Classroom Room Code:</div>
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
                      <span>{copiedLink ? 'Copied student link!' : 'Copy Student Link (/student)'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onOpenLearnerView(activeRoom.id)}
                      className="neo-btn w-full py-2 bg-[#00D2FF] text-black text-xs font-bold uppercase flex items-center justify-center gap-1.5"
                    >
                      <ExternalLink size={13} />
                      <span>Open Student Screen (New Tab)</span>
                    </button>
                  </div>

                  {/* Online student roster */}
                  <div className="pt-2 border-t border-black/15 space-y-1.5">
                    <div className="text-[11px] font-mono font-bold uppercase text-neutral-700 flex items-center justify-between">
                      <span>Student List:</span>
                      <span className="text-[10px] text-neutral-500 font-normal">{participants.length} connected</span>
                    </div>

                    {participants.length === 0 ? (
                      <p className="text-[11px] font-mono text-neutral-400 italic">
                        No students connected yet. Share code <b>{activeRoom.id}</b> for students to join.
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
                              title="Disconnect this student"
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
                      <span>End Live Session</span>
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
                Start New Classroom
              </h2>
              <p className="font-reading text-sm sm:text-base text-neutral-600">
                Select an English reading article from the library to launch a live classroom and synchronize reading pace for students.
              </p>
            </div>

            <div className="space-y-4 pt-2 border-t border-black">
              {resources.length === 0 ? (
                <div className="p-6 bg-[#FFFDF0] border border-dashed border-black text-center space-y-3">
                  <p className="text-xs font-mono text-neutral-600">
                    No reading articles in library yet. Sync sample articles to start immediately!
                  </p>
                  <button
                    type="button"
                    disabled={isSyncing}
                    onClick={handleSyncFullResources}
                    className="neo-btn px-4 py-2 bg-[#4ADE80] text-black text-xs font-black uppercase"
                  >
                    {isSyncing ? 'Syncing...' : '🔄 Sync Sample Library (26 articles)'}
                  </button>
                </div>
              ) : (
                <>
                  {/* Layer 1: Category selection chips */}
                  <div className="space-y-1.5" data-testid="setup-category-layer">
                    <div className="flex items-center justify-between text-xs font-mono font-bold uppercase text-neutral-600">
                      <span className="flex items-center gap-1.5">
                        <Filter size={12} className="text-black" />
                        <span>Category ({existingCategories.length}):</span>
                      </span>
                      {setupCategory !== 'all' && (
                        <button
                          type="button"
                          onClick={() => setSetupCategory('all')}
                          className="text-[10px] text-neutral-500 hover:text-black underline font-normal"
                        >
                          All
                        </button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => setSetupCategory('all')}
                        className={`px-2.5 py-1 text-xs font-mono font-bold border transition-all ${
                          setupCategory === 'all'
                            ? 'bg-black text-white border-black shadow-[1px_1px_0px_#000]'
                            : 'bg-white text-neutral-700 border-black/40 hover:bg-neutral-100'
                        }`}
                      >
                        All ({resources.length})
                      </button>
                      {existingCategories.map(cat => {
                        const count = resources.filter(r => r.category === cat).length;
                        const isSelected = setupCategory === cat;
                        return (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => {
                              setSetupCategory(cat);
                              const inCat = resources.filter(r => r.category === cat);
                              if (inCat.length > 0 && !inCat.some(r => r.id === selectedSetupResourceId)) {
                                setSelectedSetupResourceId(inCat[0].id);
                              }
                            }}
                            className={`px-2.5 py-1 text-xs font-mono font-bold border transition-all ${
                              isSelected
                                ? 'bg-[#FFE500] text-black border-black shadow-[1px_1px_0px_#000]'
                                : 'bg-white text-neutral-700 border-black/40 hover:bg-neutral-100'
                            }`}
                          >
                            {cat} ({count})
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Layer 2: Select reading article from library (Rich Neobrutalist Combobox) */}
                  <div>
                    <ResourceSelectCombobox
                      label={`Select reading article (${setupFilteredResources.length}):`}
                      resources={setupFilteredResources}
                      selectedId={selectedSetupResourceId || (setupFilteredResources[0]?.id || '')}
                      onSelect={id => setSelectedSetupResourceId(id)}
                    />
                  </div>

                  {/* Preview card of selected resource */}
                  {(() => {
                    const effectiveSetupId = selectedSetupResourceId || (setupFilteredResources[0]?.id || '');
                    const selectedRes = resources.find(r => r.id === effectiveSetupId);
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
                          <span>{selectedRes.sentences?.length || 0} sentences</span>
                          <span>•</span>
                          <span>{selectedRes.paragraphs?.length || 0} paragraphs</span>
                          <span>•</span>
                          <span>{selectedRes.annotations?.length || 0} chunks</span>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Quick Granularity & Erase effect */}
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-[11px] font-mono font-bold uppercase mb-1">
                        Initial reading unit:
                      </label>
                      <div className="flex border border-black shadow-[1px_1px_0px_#000]">
                        <button
                          type="button"
                          onClick={() => setStagedGranularity('sentence')}
                          className={`flex-1 py-1.5 text-xs font-mono font-bold uppercase ${
                            stagedGranularity === 'sentence' ? 'bg-[#FFE500]' : 'bg-white'
                          }`}
                        >
                          Sentence
                        </button>
                        <button
                          type="button"
                          onClick={() => setStagedGranularity('paragraph')}
                          className={`flex-1 py-1.5 text-xs font-mono font-bold uppercase border-l border-black ${
                            stagedGranularity === 'paragraph' ? 'bg-[#FFE500]' : 'bg-white'
                          }`}
                        >
                          Paragraph
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-mono font-bold uppercase mb-1">
                        Erase effect:
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
                      const effectiveSetupId = selectedSetupResourceId || (setupFilteredResources[0]?.id || '');
                      const chosen = resources.find(r => r.id === effectiveSetupId);
                      if (chosen) {
                        handleOpenClassroom(chosen);
                      }
                    }}
                    className="neo-btn w-full py-3.5 bg-[#FF3838] text-white text-sm sm:text-base font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-[3px_3px_0px_#000]"
                  >
                    <span>🚀 Launch Classroom Now!</span>
                  </button>

                  <div className="text-center pt-1">
                    <button
                      type="button"
                      onClick={() => setActiveMainTab('library')}
                      className="text-xs font-mono text-neutral-600 underline font-bold hover:text-black"
                    >
                      Or go to Library to browse all reading articles →
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
                  ← Back to Library
                </button>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-neutral-600">Selected Article:</span>
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
              Select a reading article from the library to open Studio and edit highlights!
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
