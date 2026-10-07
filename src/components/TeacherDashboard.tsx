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
} from '../services/roomService';
import { calculateRoomTimeline } from '../utils/timingEngine';
import { buildRenderSlices } from '../utils/textSegmentation';
import { ResourceEditorModal } from './ResourceEditorModal';
import { PhraseReviewModal } from './PhraseReviewModal';
import { TimingPreview } from './TimingPreview';
import { PhraseEditorStudio } from './PhraseEditorStudio';
import { LiveLearnerView } from './LiveLearnerView';
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
  UserX,
  Layers,
  Sliders,
  AlertCircle,
  Highlighter,
  RefreshCw,
  X,
  ExternalLink,
  Monitor
} from 'lucide-react';

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
  const [activeMainTab, setActiveMainTab] = useState<'library' | 'studio'>('library');

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
  const [stagedHoldMs, setStagedHoldMs] = useState(3000);
  const [stagedEraseMs, setStagedEraseMs] = useState(1000);
  const [stagedWindowMs, setStagedWindowMs] = useState(3000);
  const [stagedEraseEffect, setStagedEraseEffect] = useState<EraseEffect>('vaporize');
  const [isApplying, setIsApplying] = useState(false);

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
        if (existingRoom.eraseEffect) {
          setStagedEraseEffect(existingRoom.eraseEffect);
        }

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

  // Start new classroom room (supports any resource, auto-publishing if draft)
  const handleOpenClassroom = async (res: ReadingResource) => {
    setDashboardNotice(null);
    try {
      // Auto publish if draft so learners have access
      if (res.status !== 'published') {
        await publishResource(res.id);
        res.status = 'published';
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
        stagedEraseEffect
      );
      setActivePresentedResource(res);
      setActiveRoom(newRoom);
      setStagedUnitIndex(0);
      setShowLibraryDrawer(false);
      setDashboardNotice({
        type: 'success',
        text: `Phòng học ${newRoom.id} đã mở! Học sinh có thể truy cập bằng link hoặc mã ${newRoom.id}.`,
      });
    } catch (err: any) {
      console.error('Could not create classroom:', err);
      setDashboardNotice({ type: 'error', text: `Không thể mở phòng học: ${err.message}` });
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
        stagedEraseEffect
      );
      setDashboardNotice({ type: 'success', text: `Đã áp dụng đoạn #${stagedUnitIndex + 1} sang màn hình học sinh.` });
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

  // Copy join link
  const handleCopyLink = () => {
    if (!activeRoom) return;
    const url = `${window.location.origin}/?room=${activeRoom.id}`;
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
  const currentUnitsList = activePresentedResource
    ? stagedGranularity === 'sentence'
      ? activePresentedResource.sentences
      : activePresentedResource.paragraphs
    : [];
  const stagedText = currentUnitsList[stagedUnitIndex] || '';

  const stagedApprovedSpans = activePresentedResource
    ? activePresentedResource.annotations
        .filter(a => a.status === 'approved' && a.unitIndex === stagedUnitIndex && a.unitType === stagedGranularity)
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

                    <button
                      type="button"
                      onClick={() => handleOpenClassroom(res)}
                      className="neo-btn-sm px-2 py-0.5 bg-[#FF3838] text-white text-[10px] font-bold hover:bg-red-600"
                      title="Mở phòng live với bài này ngay"
                    >
                      <Play size={10} className="mr-0.5" /> Live
                    </button>
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

      {/* Live Room Header Banner (When room is active) */}
      {activeRoom && (
        <div className="neo-box bg-[#FFE500] p-3 sm:p-4 border border-black">
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="w-2.5 h-2.5 bg-[#FF3838] border border-black inline-block animate-pulse shrink-0"></span>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="neo-badge bg-black text-white text-[9px] py-0 px-1">LIVE ROOM</span>
                  <span className="font-mono text-sm sm:text-base font-black text-black">
                    CODE: {activeRoom.id}
                  </span>
                </div>
                <h3 className="text-xs font-bold text-neutral-800 truncate max-w-xs sm:max-w-md">
                  {activeRoom.resourceTitle}
                </h3>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={handleCopyLink}
                className="neo-btn-sm px-2.5 py-1 bg-white text-black text-xs font-bold"
                title="Sao chép link mời học sinh (tham gia ngay không cần đăng nhập)"
              >
                {copiedLink ? <Check size={12} className="mr-1 text-green-600" /> : <Share2 size={12} className="mr-1" />}
                {copiedLink ? 'Đã sao chép link!' : 'Copy Link Học Sinh'}
              </button>

              {/* Icon-Collapsed Library Button */}
              <button
                type="button"
                onClick={() => setShowLibraryDrawer(true)}
                className="neo-btn-sm px-2.5 py-1 bg-[#4ADE80] text-black text-xs font-bold flex items-center gap-1 hover:bg-green-400"
                title="Mở thư viện bài đọc để đổi bài khác hoặc chỉnh sửa"
              >
                <BookOpen size={12} />
                <span>Thư viện ({resources.length})</span>
              </button>

              {/* Toggle Live Learner View Embedded Preview */}
              <button
                type="button"
                onClick={() => setShowLiveLearnerView(!showLiveLearnerView)}
                className={`neo-btn-sm px-2.5 py-1 text-xs font-bold flex items-center gap-1 transition-all ${
                  showLiveLearnerView ? 'bg-[#FFE500] text-black ring-2 ring-black font-black' : 'bg-white text-black'
                }`}
                title="Bật/tắt xem trực tiếp màn hình học sinh ngay trong bảng điều khiển"
              >
                <Monitor size={12} />
                <span>{showLiveLearnerView ? 'Ẩn Live Learner View' : 'Live Learner View'}</span>
              </button>

              <button
                type="button"
                onClick={() => onOpenLearnerView(activeRoom.id)}
                className="neo-btn-sm px-2.5 py-1 bg-[#00D2FF] text-black text-xs font-bold"
                title="Xem giao diện học sinh toàn màn hình"
              >
                <ExternalLink size={12} className="mr-1" /> Màn hình học sinh
              </button>

              <button
                type="button"
                onClick={handleEndRoom}
                className="neo-btn-sm px-2.5 py-1 bg-[#FF3838] text-white text-xs font-bold hover:bg-red-600"
              >
                Kết thúc buổi học
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Container */}
      {activeRoom && activePresentedResource ? (
        /* FOCUSED FULL-WIDTH CLASSROOM CONTROL DESK (Library is hidden to an icon) */
        <div className="max-w-4xl mx-auto space-y-4">
          {/* Embedded Realtime Live Learner View */}
          {showLiveLearnerView && (
            <LiveLearnerView
              room={activeRoom}
              participants={participants}
              onClose={() => setShowLiveLearnerView(false)}
              stagedEraseEffect={stagedEraseEffect}
              onSelectEraseEffect={setStagedEraseEffect}
              stagedHoldMs={stagedHoldMs}
              stagedEraseMs={stagedEraseMs}
            />
          )}

          <div className="neo-box bg-white p-4 sm:p-5 space-y-5">
            <div className="flex flex-wrap items-center justify-between border-b border-black pb-2.5 gap-2">
              <div className="flex items-center gap-2">
                <Sliders size={18} className="text-black" />
                <h2 className="text-sm sm:text-base font-black uppercase tracking-tight text-black">
                  Bảng điều khiển lớp học trực tiếp
                </h2>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-mono">
                <button
                  type="button"
                  onClick={() => {
                    setStudioResource(activePresentedResource);
                    setShowStudioModal(true);
                  }}
                  className="neo-btn-sm px-2 py-0.5 bg-[#FFE500] text-black text-[11px] font-bold"
                  title="Chỉnh sửa hoặc thêm highlights cho bài đang chiếu"
                >
                  <Highlighter size={11} className="mr-1" /> Sửa Highlights
                </button>
                <span className="neo-badge bg-[#4ADE80] text-black text-[10px]">
                  {participants.length} Học sinh online
                </span>
                <span className="neo-badge bg-black text-white text-[10px]">
                  Rev #{activeRoom.revision}
                </span>
              </div>
            </div>

            {/* Private Unit Stepper */}
            <div className="neo-box-sm p-3.5 bg-[#FFFDF0] space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-600">
                  Điều hướng câu / đoạn ({stagedUnitIndex + 1} / {currentUnitsList.length})
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={stagedUnitIndex === 0}
                    onClick={() => setStagedUnitIndex(prev => Math.max(0, prev - 1))}
                    className="neo-btn-sm px-2.5 py-0.5 bg-white text-black text-xs font-bold"
                  >
                    <ChevronLeft size={14} /> Trước
                  </button>
                  <button
                    type="button"
                    disabled={stagedUnitIndex >= currentUnitsList.length - 1}
                    onClick={() => setStagedUnitIndex(prev => Math.min(currentUnitsList.length - 1, prev + 1))}
                    className="neo-btn-sm px-2.5 py-0.5 bg-white text-black text-xs font-bold"
                  >
                    Sau <ChevronRight size={14} />
                  </button>
                </div>
              </div>

              {/* Staged Unit Text Preview */}
              <div className="p-3.5 bg-white border border-black min-h-20 shadow-[1px_1px_0px_#000]">
                <div className="text-[10px] font-mono uppercase text-neutral-400 mb-1">
                  Bản xem trước đoạn chuẩn bị phát (Chỉ giáo viên thấy):
                </div>
                <p className="font-reading text-lg sm:text-xl leading-relaxed text-[#111111]">
                  {stagedSlices.map((slice, i) => (
                    slice.isHighlight ? (
                      <mark
                        key={i}
                        className="bg-[#FFE500] text-black font-semibold px-1 py-0.5 border-b border-black"
                        title={slice.annotation?.meaning}
                      >
                        {slice.text}
                      </mark>
                    ) : (
                      <span key={i}>{slice.text}</span>
                    )
                  ))}
                </p>
              </div>

              {/* Granularity & Highlight Controls */}
              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <div>
                  <label className="block text-[11px] font-mono font-bold uppercase mb-1">
                    Độ dài đơn vị chiếu:
                  </label>
                  <div className="flex border border-black shadow-[1px_1px_0px_#000]">
                    <button
                      type="button"
                      onClick={() => {
                        setStagedGranularity('sentence');
                        setStagedUnitIndex(0);
                      }}
                      className={`flex-1 py-1 text-xs font-bold font-mono uppercase ${
                        stagedGranularity === 'sentence' ? 'bg-[#FFE500]' : 'bg-white'
                      }`}
                    >
                      Câu ({activePresentedResource.sentences?.length || 0})
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setStagedGranularity('paragraph');
                        setStagedUnitIndex(0);
                      }}
                      className={`flex-1 py-1 text-xs font-bold font-mono uppercase border-l border-black ${
                        stagedGranularity === 'paragraph' ? 'bg-[#FFE500]' : 'bg-white'
                      }`}
                    >
                      Đoạn ({activePresentedResource.paragraphs?.length || 0})
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-mono font-bold uppercase mb-1">
                    Hiện highlight cụm từ:
                  </label>
                  <button
                    type="button"
                    onClick={() => setStagedHighlight(!stagedHighlight)}
                    className={`w-full py-1 border border-black text-xs font-bold font-mono uppercase flex items-center justify-center gap-1.5 shadow-[1px_1px_0px_#000] ${
                      stagedHighlight ? 'bg-[#4ADE80] text-black' : 'bg-neutral-200 text-neutral-600'
                    }`}
                  >
                    {stagedHighlight ? <Check size={13} /> : <EyeOff size={13} />}
                    {stagedHighlight ? 'BẬT HIGHLIGHTS' : 'TẮT HIGHLIGHTS'}
                  </button>
                </div>
              </div>

              {/* Apply Button */}
              <button
                type="button"
                onClick={handleApplyToRoom}
                disabled={isApplying}
                className="neo-btn w-full py-2.5 bg-[#FF3838] text-white text-xs sm:text-sm font-black uppercase tracking-wider"
              >
                <Radio size={14} className="mr-1.5" />
                {isApplying ? 'Đang chuyển đoạn...' : 'Chuyển đoạn này sang màn hình học sinh'}
              </button>
            </div>

            {/* Authoritative Playback Controls */}
            <div className="neo-box-sm p-3.5 bg-white space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-600">
                  Điều khiển phát (Broadcast)
                </span>
                <span className="neo-badge bg-[#FFE500] text-black text-[10px]">
                  TRẠNG THÁI: {activeRoom.playbackStatus.toUpperCase()}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {/* Play / Replay */}
                <button
                  type="button"
                  onClick={handlePlayTurn}
                  className="neo-btn py-2 bg-[#4ADE80] text-black text-xs font-black uppercase tracking-wider"
                >
                  <Play size={13} className="mr-1" />
                  {activeRoom.playbackStatus === 'playing' ? 'Phát lại' : 'Phát (Play)'}
                </button>

                {/* Pause / Resume */}
                {activeRoom.playbackStatus === 'paused' ? (
                  <button
                    type="button"
                    onClick={handleResumeTurn}
                    className="neo-btn py-2 bg-[#00D2FF] text-black text-xs font-black uppercase tracking-wider"
                  >
                    <Play size={13} className="mr-1" /> Tiếp tục
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handlePauseTurn}
                    disabled={activeRoom.playbackStatus !== 'playing'}
                    className="neo-btn py-2 bg-[#FFE500] text-black text-xs font-black uppercase tracking-wider"
                  >
                    <Pause size={13} className="mr-1" /> Tạm dừng
                  </button>
                )}

                {/* Show (Manual indefinite) */}
                <button
                  type="button"
                  onClick={handleShowTurn}
                  className="neo-btn py-2 bg-neutral-100 text-black text-xs font-black uppercase tracking-wider hover:bg-neutral-200"
                >
                  <Eye size={13} className="mr-1" /> Hiện chữ (Show)
                </button>

                {/* Hide */}
                <button
                  type="button"
                  onClick={handleHideTurn}
                  className="neo-btn py-2 bg-neutral-800 text-white text-xs font-black uppercase tracking-wider hover:bg-black"
                >
                  <EyeOff size={13} className="mr-1" /> Ẩn chữ (Hide)
                </button>
              </div>
            </div>

            {/* Dynamic Timing Configuration & Preview */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-black flex items-center gap-1.5">
                  <Clock size={14} /> Thời gian hiện và xóa chữ
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-mono font-bold uppercase mb-1">
                    Chế độ thời gian:
                  </label>
                  <select
                    value={stagedPolicy}
                    onChange={e => setStagedPolicy(e.target.value as TimingPolicy)}
                    className="neo-input w-full text-xs"
                  >
                    <option value="hold_then_erase">Hiện rồi Xóa (Hold Then Erase)</option>
                    <option value="erase_within_window">Xóa trong khung giờ cố định</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-mono font-bold uppercase mb-1">
                      Giữ chữ (ms):
                    </label>
                    <input
                      type="number"
                      step={500}
                      min={1000}
                      value={stagedHoldMs}
                      onChange={e => setStagedHoldMs(Number(e.target.value))}
                      className="neo-input w-full text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-mono font-bold uppercase mb-1">
                      Thời gian xóa (ms):
                    </label>
                    <input
                      type="number"
                      step={250}
                      min={500}
                      value={stagedEraseMs}
                      onChange={e => setStagedEraseMs(Number(e.target.value))}
                      className="neo-input w-full text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-mono font-bold uppercase mb-1">
                    Hiệu ứng xóa (Erase Effect):
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    {(
                      [
                        { id: 'vaporize', label: '✨ Tan biến', desc: 'Sương khói bốc hơi' },
                        { id: 'dissolve', label: '🌫️ Hòa tan', desc: 'Hạt li ti phân tán' },
                        { id: 'fade', label: '💨 Mờ dần', desc: 'Mờ dần đều êm dịu' },
                        { id: 'wipe', label: '✂️ Gạt cuộn', desc: 'Quét màn hình ngang' },
                      ] as const
                    ).map(eff => (
                      <button
                        key={eff.id}
                        type="button"
                        onClick={() => setStagedEraseEffect(eff.id)}
                        className={`p-2 border text-left text-xs font-mono transition-all ${
                          stagedEraseEffect === eff.id
                            ? 'bg-[#FFE500] border-black text-black font-bold shadow-[2px_2px_0px_#000]'
                            : 'bg-white border-black/30 text-neutral-700 hover:border-black'
                        }`}
                      >
                        <div className="font-bold">{eff.label}</div>
                        <div className="text-[10px] text-neutral-500">{eff.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Dynamic Timing Preview */}
              <TimingPreview
                policy={stagedPolicy}
                holdDurationMs={stagedHoldMs}
                eraseDurationMs={stagedEraseMs}
                totalWindowMs={stagedWindowMs}
              />
            </div>

            {/* Connected Learners Roster */}
            <div className="neo-box-sm p-3.5 bg-white space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-black flex items-center gap-1.5">
                  <Users size={14} /> Danh sách học sinh đang kết nối ({participants.length})
                </span>
                <span className="text-[10px] font-mono text-neutral-500">
                  Hỗ trợ mượt mà hơn 20+ học sinh kết nối đồng thời
                </span>
              </div>

              {participants.length === 0 ? (
                <p className="text-xs font-mono text-neutral-500 italic">
                  Chưa có học sinh nào kết nối. Hãy chia sẻ mã <b>{activeRoom.id}</b> hoặc bấm nút "Copy Link Học Sinh" ở trên.
                </p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {participants.map(p => (
                    <div
                      key={p.participantId}
                      className="neo-box-sm px-2 py-0.5 bg-[#FFFDF0] flex items-center gap-1.5 text-xs font-mono"
                    >
                      <span className="w-2 h-2 rounded-full bg-green-500 inline-block"></span>
                      <span className="font-bold">{p.name}</span>
                      <button
                        type="button"
                        onClick={() => removeParticipant(activeRoom.id, p.participantId)}
                        className="text-neutral-400 hover:text-red-600 transition-colors"
                        title="Ngắt kết nối học sinh này"
                      >
                        <UserX size={11} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* WHEN NO ACTIVE ROOM: TABBED WORKSPACE (LIBRARY OR PHRASE STUDIO) */
        <div className="space-y-4">
          {/* Main Workspace Tabs */}
          <div className="flex border border-black bg-white p-0.5 shadow-[1.5px_1.5px_0px_#000] max-w-md">
            <button
              type="button"
              onClick={() => setActiveMainTab('library')}
              className={`flex-1 py-1.5 text-xs font-mono font-bold uppercase flex items-center justify-center gap-1.5 transition-all ${
                activeMainTab === 'library'
                  ? 'bg-[#FFE500] text-black shadow-[1px_1px_0px_#000]'
                  : 'text-neutral-700 hover:text-black'
              }`}
            >
              <Layers size={13} /> Thư viện ({resources.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveMainTab('studio')}
              className={`flex-1 py-1.5 text-xs font-mono font-bold uppercase flex items-center justify-center gap-1.5 transition-all ${
                activeMainTab === 'studio'
                  ? 'bg-[#FF3838] text-white shadow-[1px_1px_0px_#000]'
                  : 'text-neutral-700 hover:text-black'
              }`}
            >
              <Highlighter size={13} /> Studio Cụm từ & Highlights
            </button>
          </div>

          {activeMainTab === 'library' ? (
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
