import React from 'react';
import { 
  Play, Pause, SkipBack, SkipForward, RotateCcw, 
  Sparkles, Clock, Eye, Highlighter, Layers, 
  Settings2, BookText
} from 'lucide-react';
import type { Article, RoomState, UnitMode, ReaderEffect } from '../types';

interface TeacherViewProps {
  roomState: RoomState;
  onUpdateRoom: (updater: Partial<RoomState>) => void;
  articles: Article[];
  currentArticle: Article;
  onSelectArticle: (articleId: string) => void;
}

export const TeacherView: React.FC<TeacherViewProps> = ({
  roomState,
  onUpdateRoom,
  articles,
  currentArticle,
  onSelectArticle,
}) => {
  const units = roomState.unitMode === 'sentence' ? currentArticle.sentences : currentArticle.paragraphs;
  const currentUnit = units[roomState.unitIndex] || units[0];

  const handleNext = () => {
    if (roomState.unitIndex < units.length - 1) {
      onUpdateRoom({ unitIndex: roomState.unitIndex + 1, revision: roomState.revision + 1 });
    }
  };

  const handlePrev = () => {
    if (roomState.unitIndex > 0) {
      onUpdateRoom({ unitIndex: roomState.unitIndex - 1, revision: roomState.revision + 1 });
    }
  };

  const handleTogglePlay = () => {
    const nextStatus = roomState.status === 'reading' ? 'paused' : 'reading';
    onUpdateRoom({ 
      status: nextStatus,
      startedAt: nextStatus === 'reading' ? Date.now() : undefined,
      revision: roomState.revision + 1 
    });
  };

  const handleReplay = () => {
    onUpdateRoom({ 
      status: 'reading',
      startedAt: Date.now(),
      revision: roomState.revision + 1 
    });
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Left Column: Article & Configuration */}
      <div className="space-y-6">
        {/* Article Selector */}
        <div className="bg-white rounded-xl p-5 border border-[#E2DBD0] shadow-xs space-y-4">
          <div className="flex items-center space-x-2 text-[#285238] font-bold text-base">
            <BookText className="w-5 h-5" />
            <h3>Chọn bài đọc</h3>
          </div>

          <div className="space-y-2">
            {articles.map((art) => (
              <button
                key={art.id}
                onClick={() => {
                  onSelectArticle(art.id);
                  onUpdateRoom({ articleId: art.id, unitIndex: 0, revision: roomState.revision + 1 });
                }}
                className={`w-full text-left p-3 rounded-lg border text-sm transition-all ${
                  art.id === currentArticle.id
                    ? 'border-[#285238] bg-[#F2F7F4] text-[#1F2421] font-semibold'
                    : 'border-[#EAE3D2] hover:bg-[#FAF7F2] text-[#5C6761]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs px-2 py-0.5 rounded bg-[#EAE3D2] text-[#285238] font-medium">
                    {art.category}
                  </span>
                  <span className="text-xs text-gray-400">{art.sentences.length} câu</span>
                </div>
                <div className="mt-1 font-serif font-medium text-base">{art.title}</div>
                <div className="text-xs text-gray-500 mt-0.5">{art.author}</div>
              </button>
            ))}
          </div>
        </div>

        {/* 3 Axes of Configuration: Unit, Highlight, Effect */}
        <div className="bg-white rounded-xl p-5 border border-[#E2DBD0] shadow-xs space-y-5">
          <div className="flex items-center space-x-2 text-[#285238] font-bold text-base">
            <Settings2 className="w-5 h-5" />
            <h3>Cấu hình nhịp đọc</h3>
          </div>

          {/* Unit mode: Sentence vs Paragraph */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#5C6761] uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" />
              1. Đơn vị hiển thị
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(['sentence', 'paragraph'] as UnitMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => onUpdateRoom({ unitMode: mode, unitIndex: 0, revision: roomState.revision + 1 })}
                  className={`py-2 px-3 text-xs font-semibold rounded-md border text-center transition-all ${
                    roomState.unitMode === mode
                      ? 'bg-[#285238] text-white border-[#285238]'
                      : 'border-[#DDD5C7] text-[#5C6761] hover:bg-[#F8F5EE]'
                  }`}
                >
                  {mode === 'sentence' ? 'Từng câu' : 'Từng đoạn'}
                </button>
              ))}
            </div>
          </div>

          {/* Highlight toggle */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#5C6761] uppercase tracking-wider flex items-center gap-1.5">
              <Highlighter className="w-3.5 h-3.5" />
              2. Lớp nhấn mạnh (Highlight Idioms/Phrases)
            </label>
            <button
              onClick={() => onUpdateRoom({ highlightEnabled: !roomState.highlightEnabled, revision: roomState.revision + 1 })}
              className={`w-full py-2 px-3 text-xs font-semibold rounded-md border flex items-center justify-between transition-all ${
                roomState.highlightEnabled
                  ? 'bg-[#FEF3C7] text-[#92400E] border-[#F59E0B]'
                  : 'border-[#DDD5C7] text-[#5C6761] hover:bg-[#F8F5EE]'
              }`}
            >
              <span>Bật Highlight Cụm từ</span>
              <span>{roomState.highlightEnabled ? 'Đang bật' : 'Tắt'}</span>
            </button>
          </div>

          {/* Effect: Reading Guide vs Eraser */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#5C6761] uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              3. Hiệu ứng đọc
            </label>
            <div className="grid grid-cols-3 gap-2">
              {([
                { id: 'guide', label: 'Vệt dẫn' },
                { id: 'eraser', label: 'Cục gôm' },
                { id: 'none', label: 'Tĩnh' }
              ] as { id: ReaderEffect; label: string }[]).map((ef) => (
                <button
                  key={ef.id}
                  onClick={() => onUpdateRoom({ effect: ef.id, revision: roomState.revision + 1 })}
                  className={`py-2 px-2 text-xs font-semibold rounded-md border text-center transition-all ${
                    roomState.effect === ef.id
                      ? 'bg-[#285238] text-white border-[#285238]'
                      : 'border-[#DDD5C7] text-[#5C6761] hover:bg-[#F8F5EE]'
                  }`}
                >
                  {ef.label}
                </button>
              ))}
            </div>
          </div>

          {/* Timing (Duration per unit) */}
          <div className="space-y-1.5 pt-2 border-t border-[#F0ECE1]">
            <div className="flex justify-between items-center text-xs font-semibold text-[#5C6761]">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> Thời gian giữ chữ (Hold):
              </span>
              <span className="font-mono text-[#285238]">{roomState.holdDurationSec} giây</span>
            </div>
            <input
              type="range"
              min="2"
              max="15"
              step="1"
              value={roomState.holdDurationSec}
              onChange={(e) => onUpdateRoom({ holdDurationSec: Number(e.target.value), revision: roomState.revision + 1 })}
              className="w-full accent-[#285238] cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Center & Right Column: Live Teacher Console */}
      <div className="lg:col-span-2 space-y-6">
        {/* Main Reading Preview Monitor */}
        <div className="bg-[#FAF7F2] rounded-2xl p-6 sm:p-10 border border-[#E2DBD0] shadow-sm relative min-h-[360px] flex flex-col justify-between">
          {/* Status bar */}
          <div className="flex items-center justify-between pb-4 border-b border-[#EAE3D2] text-xs">
            <div className="flex items-center space-x-2">
              <span className={`w-2.5 h-2.5 rounded-full ${roomState.status === 'reading' ? 'bg-emerald-500 animate-ping' : 'bg-amber-400'}`} />
              <span className="font-semibold text-[#285238] uppercase tracking-wider">
                Trạng thái: {roomState.status === 'reading' ? 'Đang đọc' : roomState.status === 'paused' ? 'Tạm dừng' : 'Chờ bắt đầu'}
              </span>
            </div>
            <div className="font-mono font-medium text-[#5C6761]">
              Tiến độ: {roomState.unitIndex + 1} / {units.length}
            </div>
          </div>

          {/* Synchronized Reading Text Display */}
          <div className="my-8 flex items-center justify-center">
            <div className="w-full text-center">
              <p className={`font-serif text-2xl sm:text-3xl lg:text-4xl leading-relaxed text-[#1F2421] transition-all ${
                roomState.effect === 'guide' && roomState.status === 'reading' ? 'guide-active' : ''
              }`}>
                {currentUnit?.text}
              </p>

              {/* Show annotations if highlights enabled */}
              {roomState.highlightEnabled && currentArticle.annotations.length > 0 && (
                <div className="mt-6 flex flex-wrap gap-2 justify-center">
                  {currentArticle.annotations.map(ann => (
                    <span key={ann.id} className="text-xs px-2.5 py-1 rounded bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]">
                      ✨ <strong>{ann.phrase}</strong>: {ann.meaning}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Timeline progress line */}
          <div className="w-full bg-[#EAE3D2] h-1.5 rounded-full overflow-hidden">
            <div 
              className="bg-[#285238] h-full transition-all duration-300"
              style={{ width: `${((roomState.unitIndex + 1) / units.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Master Playback Controls */}
        <div className="bg-white rounded-xl p-5 border border-[#E2DBD0] shadow-xs flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrev}
              disabled={roomState.unitIndex <= 0}
              className="p-3 rounded-lg border border-[#DDD5C7] text-[#285238] hover:bg-[#F8F5EE] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              title="Câu trước"
            >
              <SkipBack className="w-5 h-5" />
            </button>

            <button
              onClick={handleTogglePlay}
              className="flex items-center space-x-2 px-6 py-3 rounded-lg bg-[#285238] hover:bg-[#1E3F2B] text-white font-bold text-sm shadow-sm transition-all"
            >
              {roomState.status === 'reading' ? (
                <>
                  <Pause className="w-5 h-5" />
                  <span>Tạm dừng</span>
                </>
              ) : (
                <>
                  <Play className="w-5 h-5" />
                  <span>Bắt đầu nhịp đọc</span>
                </>
              )}
            </button>

            <button
              onClick={handleNext}
              disabled={roomState.unitIndex >= units.length - 1}
              className="p-3 rounded-lg border border-[#DDD5C7] text-[#285238] hover:bg-[#F8F5EE] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              title="Câu kế tiếp"
            >
              <SkipForward className="w-5 h-5" />
            </button>

            <button
              onClick={handleReplay}
              className="p-3 rounded-lg border border-[#DDD5C7] text-[#5C6761] hover:bg-[#F8F5EE] transition-all"
              title="Phát lại nhịp này"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Info & Share Link */}
          <div className="flex items-center space-x-3 text-xs text-[#5C6761]">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#FAF7F2] border border-[#E2DBD0]">
              <Eye className="w-4 h-4 text-[#285238]" />
              <span>Chế độ đồng bộ: <strong>Thời gian thực</strong></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
