import React, { useState, useEffect } from 'react';
import { Type, Sparkles, AlertCircle } from 'lucide-react';
import type { Article, RoomState } from '../types';

interface StudentViewProps {
  roomState: RoomState;
  currentArticle: Article;
}

export const StudentView: React.FC<StudentViewProps> = ({ roomState, currentArticle }) => {
  const [fontSize, setFontSize] = useState<number>(32);
  const [eraserProgress, setEraserProgress] = useState<number>(0);

  const units = roomState.unitMode === 'sentence' ? currentArticle.sentences : currentArticle.paragraphs;
  const currentUnit = units[roomState.unitIndex] || units[0];

  // Eraser animation effect loop when active
  useEffect(() => {
    if (roomState.effect !== 'eraser' || roomState.status !== 'reading') {
      setEraserProgress(0);
      return;
    }

    const duration = roomState.holdDurationSec * 1000;
    const intervalTime = 50;
    const step = (intervalTime / duration) * 100;

    const timer = setInterval(() => {
      setEraserProgress((prev) => {
        if (prev >= 100) return 0;
        return prev + step;
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, [roomState.effect, roomState.status, roomState.unitIndex, roomState.holdDurationSec]);

  // Helper to highlight phrases within text
  const renderUnitText = () => {
    if (!currentUnit) return null;
    const text = currentUnit.text;

    if (!roomState.highlightEnabled || !currentUnit.highlightPhrases || currentUnit.highlightPhrases.length === 0) {
      return <span>{text}</span>;
    }

    // Split text with highlights
    let elements: React.ReactNode[] = [text];
    for (const phrase of currentUnit.highlightPhrases) {
      const regex = new RegExp(`(${phrase})`, 'gi');
      elements = elements.flatMap((part, idx) => {
        if (typeof part === 'string') {
          const splitParts = part.split(regex);
          return splitParts.map((sub, sIdx) => 
            sub.toLowerCase() === phrase.toLowerCase() ? (
              <mark key={`${idx}-${sIdx}`} className="chunk-highlight">
                {sub}
              </mark>
            ) : sub
          );
        }
        return part;
      });
    }

    return elements;
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 min-h-[calc(100vh-80px)] flex flex-col justify-between">
      {/* Student Top Bar: Article info & Font Sizer */}
      <div className="flex items-center justify-between pb-4 border-b border-[#E2DBD0] text-xs text-[#5C6761]">
        <div>
          <span className="font-serif font-bold text-[#1F2421] text-sm sm:text-base mr-2">
            {currentArticle.title}
          </span>
          <span className="text-xs text-gray-500">— {currentArticle.author}</span>
        </div>

        <div className="flex items-center space-x-2">
          {/* Font Resizer */}
          <div className="flex items-center bg-white border border-[#DDD5C7] rounded-lg px-2 py-1 space-x-1">
            <Type className="w-3.5 h-3.5 text-gray-400" />
            <button
              onClick={() => setFontSize(s => Math.max(20, s - 4))}
              className="px-1.5 py-0.5 text-xs font-bold text-[#5C6761] hover:text-[#1F2421]"
              title="Chữ nhỏ hơn"
            >
              A-
            </button>
            <span className="text-gray-300">|</span>
            <button
              onClick={() => setFontSize(s => Math.min(48, s + 4))}
              className="px-1.5 py-0.5 text-xs font-bold text-[#5C6761] hover:text-[#1F2421]"
              title="Chữ lớn hơn"
            >
              A+
            </button>
          </div>
        </div>
      </div>

      {/* Center Reading Canvas */}
      <div className="my-auto py-12 px-6 sm:px-12 rounded-3xl parchment-sheet border border-[#E2DBD0] relative flex items-center justify-center min-h-[400px]">
        {/* Paused notice overlay if paused */}
        {roomState.status === 'paused' && (
          <div className="absolute top-4 right-4 flex items-center space-x-1 text-xs text-amber-800 bg-amber-100 px-2.5 py-1 rounded-full border border-amber-200">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Giáo viên đang tạm dừng</span>
          </div>
        )}

        <div className="w-full text-center relative">
          {/* Main Reading Text with Effect */}
          <div 
            className={`font-serif leading-relaxed text-[#1F2421] transition-all relative inline-block ${
              roomState.effect === 'guide' && roomState.status === 'reading' ? 'guide-active' : ''
            }`}
            style={{ fontSize: `${fontSize}px` }}
          >
            {renderUnitText()}

            {/* Eraser effect mask */}
            {roomState.effect === 'eraser' && roomState.status === 'reading' && (
              <div 
                className="absolute inset-0 bg-[#FDFAF5] opacity-90 transition-all pointer-events-none"
                style={{ 
                  left: 0,
                  width: `${eraserProgress}%`,
                  borderRight: eraserProgress > 0 && eraserProgress < 100 ? '3px solid #285238' : 'none'
                }}
              />
            )}
          </div>

          {/* Unit counter */}
          <div className="mt-8 text-xs font-mono text-gray-400">
            {roomState.unitMode === 'sentence' ? 'Câu' : 'Đoạn'} {roomState.unitIndex + 1} / {units.length}
          </div>
        </div>
      </div>

      {/* Vocabulary / Annotations Drawer for current unit */}
      <div className="pt-4 border-t border-[#E2DBD0] text-center">
        {roomState.highlightEnabled && currentArticle.annotations.length > 0 ? (
          <div className="inline-flex flex-wrap gap-2 justify-center items-center">
            <span className="text-xs font-semibold text-[#285238] flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" /> Ghi chú từ vựng:
            </span>
            {currentArticle.annotations.map(ann => (
              <span key={ann.id} className="text-xs px-2.5 py-1 rounded-md bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]">
                <strong>{ann.phrase}</strong>: {ann.meaning}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-500">
            Tập trung theo dõi nhịp đọc cùng giáo viên trên lớp.
          </p>
        )}
      </div>
    </div>
  );
};
