/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ReadingResource, PhraseAnnotation, PhraseType } from '../types';
import { updateResourceAnnotations } from '../services/resourceService';
import { detectPhrasesWithAI } from '../services/phraseDetection';
import { buildRenderSlices, segmentSentences } from '../utils/textSegmentation';
import {
  Check,
  X,
  Plus,
  Sparkles,
  AlertCircle,
  Save,
  BookOpen,
  FileText,
  Search,
  Filter,
  Trash2,
  CheckCircle2,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  Eye
} from 'lucide-react';

interface PhraseReviewModalProps {
  resource: ReadingResource;
  onClose: () => void;
  onUpdated: (updatedAnnotations: PhraseAnnotation[]) => void;
}

export const PhraseReviewModal: React.FC<PhraseReviewModalProps> = ({
  resource,
  onClose,
  onUpdated,
}) => {
  const [annotations, setAnnotations] = useState<PhraseAnnotation[]>(resource.annotations || []);
  const [reviewTab, setReviewTab] = useState<'unit' | 'full' | 'all_phrases'>('unit');
  const [activeUnitIndex, setActiveUnitIndex] = useState<number>(0);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Search and filter for full phrase catalog tab
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // New manual phrase form state
  const [newPhraseText, setNewPhraseText] = useState('');
  const [newPhraseType, setNewPhraseType] = useState<PhraseType>('collocation');
  const [newPhraseMeaning, setNewPhraseMeaning] = useState('');
  const [newPhraseError, setNewPhraseError] = useState('');

  const currentSentence = resource.sentences[activeUnitIndex] || '';

  // Annotations for currently active unit
  const unitAnnotations = annotations.filter(a => a.unitIndex === activeUnitIndex);

  // Toggle approval / rejection for an individual phrase
  const handleToggleStatus = (id: string, newStatus: 'approved' | 'rejected') => {
    setAnnotations(prev =>
      prev.map(a => (a.id === id ? { ...a, status: newStatus } : a))
    );
  };

  // Delete an annotation
  const handleDeleteAnnotation = (id: string) => {
    setAnnotations(prev => prev.filter(a => a.id !== id));
  };

  // Bulk actions: Approve all in this unit / Approve all in entire resource
  const handleApproveAllInUnit = () => {
    setAnnotations(prev =>
      prev.map(a => (a.unitIndex === activeUnitIndex ? { ...a, status: 'approved' } : a))
    );
  };

  const handleApproveAllInResource = () => {
    setAnnotations(prev => prev.map(a => ({ ...a, status: 'approved' })));
  };

  // Add manual phrase
  const handleAddManualPhrase = (e: React.FormEvent) => {
    e.preventDefault();
    setNewPhraseError('');

    const trimmedInput = newPhraseText.trim();
    if (!trimmedInput) {
      setNewPhraseError('Vui lòng nhập cụm từ cần gắn highlight.');
      return;
    }

    // Exact or case-insensitive search in current sentence
    const lowerSentence = currentSentence.toLowerCase();
    const lowerTarget = trimmedInput.toLowerCase();
    const matchIdx = lowerSentence.indexOf(lowerTarget);

    if (matchIdx === -1) {
      setNewPhraseError(`Không tìm thấy "${trimmedInput}" trong câu số ${activeUnitIndex + 1}.`);
      return;
    }

    const startOffset = matchIdx;
    const endOffset = matchIdx + trimmedInput.length;

    // Check collision with existing phrases in this unit
    const collision = unitAnnotations.find(
      a =>
        (startOffset >= a.startOffset && startOffset < a.endOffset) ||
        (endOffset > a.startOffset && endOffset <= a.endOffset)
    );

    if (collision) {
      setNewPhraseError(`Trùng với cụm từ đã có: "${collision.text}".`);
      return;
    }

    // Preserve exact case from original sentence
    const exactMatchedText = currentSentence.slice(startOffset, endOffset);

    const newAnn: PhraseAnnotation = {
      id: `manual-${activeUnitIndex}-${startOffset}-${endOffset}-${Date.now()}`,
      unitIndex: activeUnitIndex,
      unitType: 'sentence',
      text: exactMatchedText,
      startOffset,
      endOffset,
      type: newPhraseType,
      meaning: newPhraseMeaning.trim() || 'Key expression',
      status: 'approved',
      source: 'manual',
    };

    setAnnotations(prev => [...prev, newAnn]);
    setNewPhraseText('');
    setNewPhraseMeaning('');
  };

  // AI assistant trigger
  const handleDetectWithAI = async () => {
    if (!currentSentence) return;
    setIsAiLoading(true);
    try {
      const candidates = await detectPhrasesWithAI(currentSentence, activeUnitIndex, 'sentence');
      setAnnotations(prev => {
        const otherUnits = prev.filter(a => a.unitIndex !== activeUnitIndex);
        return [...otherUnits, ...candidates];
      });
    } finally {
      setIsAiLoading(false);
    }
  };

  // Save changes
  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      await updateResourceAnnotations(resource.id, annotations);
      setSaveSuccess(true);
      onUpdated(annotations);
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err) {
      console.error('Failed to save phrase annotations:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Approved spans for the live preview box of the active unit
  const approvedPreviewSpans = unitAnnotations
    .filter(a => a.status === 'approved')
    .map(a => ({
      id: a.id,
      text: a.text,
      startOffset: a.startOffset,
      endOffset: a.endOffset,
      type: a.type,
      meaning: a.meaning,
    }));

  const previewSlices = buildRenderSlices(currentSentence, approvedPreviewSpans);

  // Total counts
  const totalApproved = annotations.filter(a => a.status === 'approved').length;
  const totalPending = annotations.filter(a => a.status === 'pending').length;
  const totalRejected = annotations.filter(a => a.status === 'rejected').length;

  // Filtered list for "All Phrases" catalog view
  const filteredAnnotations = annotations.filter(ann => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchText = ann.text.toLowerCase().includes(q);
      const matchMeaning = ann.meaning.toLowerCase().includes(q);
      if (!matchText && !matchMeaning) return false;
    }
    if (filterType !== 'all' && ann.type !== filterType) return false;
    if (filterStatus !== 'all' && ann.status !== filterStatus) return false;
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-3 sm:p-4 backdrop-blur-xs">
      <div className="neo-box-lg w-full max-w-5xl max-h-[94vh] flex flex-col bg-[#FFFDF0] overflow-hidden">
        {/* Header */}
        <div className="bg-[#FFE500] border-b-2 border-black p-3 sm:p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 bg-black text-white flex items-center justify-center font-black text-sm border border-black shrink-0">
              EP
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-black uppercase tracking-tight text-black truncate">
                Xem & Duyệt Cụm từ • {resource.title}
              </h2>
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-neutral-800">
                <span>{resource.sentences.length} câu</span>
                <span>•</span>
                <span>{resource.paragraphs?.length || 1} đoạn</span>
                <span>•</span>
                <span className="font-bold text-green-800">{totalApproved} đã duyệt</span>
                <span>•</span>
                <span className="font-bold text-neutral-700">{totalPending} chờ duyệt</span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="neo-btn-sm bg-white p-1.5 text-black hover:bg-neutral-100 shrink-0"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Tab Switcher Header */}
        <div className="bg-white border-b border-black px-4 py-2 flex flex-wrap items-center justify-between gap-2">
          <div className="flex border border-black bg-[#FAF8F0] p-0.5 shadow-[1px_1px_0px_#000]">
            <button
              type="button"
              onClick={() => setReviewTab('unit')}
              className={`px-3 py-1 text-xs font-mono font-bold uppercase flex items-center gap-1.5 transition-all ${
                reviewTab === 'unit'
                  ? 'bg-[#FFE500] text-black shadow-[1px_1px_0px_#000]'
                  : 'text-neutral-700 hover:text-black'
              }`}
            >
              <Eye size={13} /> Từng câu ({resource.sentences.length})
            </button>
            <button
              type="button"
              onClick={() => setReviewTab('full')}
              className={`px-3 py-1 text-xs font-mono font-bold uppercase flex items-center gap-1.5 transition-all ${
                reviewTab === 'full'
                  ? 'bg-[#FF3838] text-white shadow-[1px_1px_0px_#000]'
                  : 'text-neutral-700 hover:text-black'
              }`}
            >
              <BookOpen size={13} /> Toàn bộ bài đọc
            </button>
            <button
              type="button"
              onClick={() => setReviewTab('all_phrases')}
              className={`px-3 py-1 text-xs font-mono font-bold uppercase flex items-center gap-1.5 transition-all ${
                reviewTab === 'all_phrases'
                  ? 'bg-[#00D2FF] text-black shadow-[1px_1px_0px_#000]'
                  : 'text-neutral-700 hover:text-black'
              }`}
            >
              <SlidersHorizontal size={13} /> Danh mục cụm từ ({annotations.length})
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleApproveAllInResource}
              className="neo-btn-sm px-2.5 py-1 bg-[#4ADE80] text-black text-[11px] font-bold"
              title="Duyệt tất cả các cụm từ trong bài"
            >
              <CheckCircle2 size={12} className="mr-1 inline" /> Duyệt tất cả ({annotations.length})
            </button>
          </div>
        </div>

        {/* Content body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* TAB 1: REVIEW BY UNIT (SENTENCE STEPPER) */}
          {reviewTab === 'unit' && (
            <div className="space-y-5">
              {/* Sentence navigator */}
              <div className="neo-box-sm p-3.5 bg-white space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-black">
                      Câu số: {activeUnitIndex + 1} / {resource.sentences.length}
                    </span>
                    <span className="text-[11px] font-mono text-neutral-500">
                      ({unitAnnotations.length} cụm từ gắn trong câu này)
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={activeUnitIndex === 0}
                      onClick={() => setActiveUnitIndex(prev => prev - 1)}
                      className="neo-btn-sm px-2 py-0.5 bg-neutral-100 text-xs font-bold"
                    >
                      <ChevronLeft size={14} className="inline mr-0.5" /> Câu trước
                    </button>
                    <select
                      value={activeUnitIndex}
                      onChange={e => setActiveUnitIndex(Number(e.target.value))}
                      className="neo-input text-xs py-0.5 px-1 font-mono font-bold"
                    >
                      {resource.sentences.map((_, idx) => (
                        <option key={idx} value={idx}>
                          Câu {idx + 1}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      disabled={activeUnitIndex >= resource.sentences.length - 1}
                      onClick={() => setActiveUnitIndex(prev => prev + 1)}
                      className="neo-btn-sm px-2 py-0.5 bg-neutral-100 text-xs font-bold"
                    >
                      Câu sau <ChevronRight size={14} className="inline ml-0.5" />
                    </button>
                  </div>
                </div>

                {/* Live Chunk Preview */}
                <div className="p-4 bg-[#FFFDF7] border-2 border-black min-h-20 shadow-[1px_1px_0px_#000]">
                  <div className="text-[10px] font-mono uppercase text-neutral-400 mb-1 flex items-center justify-between">
                    <span>Màn hình học sinh sẽ thấy đoạn này:</span>
                    <span className="text-neutral-500 font-bold">{approvedPreviewSpans.length} highlights</span>
                  </div>
                  <p className="font-reading text-xl sm:text-2xl leading-relaxed text-[#111111]">
                    {previewSlices.map((slice, i) =>
                      slice.isHighlight ? (
                        <mark
                          key={i}
                          className="bg-[#FFE500] text-black font-semibold px-1 py-0.5 border-b-2 border-black rounded-none shadow-[2px_2px_0px_#000000] mr-1"
                          title={`${slice.annotation?.type.replace('_', ' ')}: ${slice.annotation?.meaning}`}
                        >
                          {slice.text}
                        </mark>
                      ) : (
                        <span key={i}>{slice.text}</span>
                      )
                    )}
                  </p>
                </div>
              </div>

              {/* Action Row: AI trigger & counters */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="neo-badge bg-[#4ADE80] text-black text-[11px]">
                    {unitAnnotations.filter(a => a.status === 'approved').length} Đã duyệt
                  </span>
                  <span className="neo-badge bg-neutral-200 text-black text-[11px]">
                    {unitAnnotations.filter(a => a.status === 'pending').length} Chờ duyệt
                  </span>
                  <button
                    type="button"
                    onClick={handleApproveAllInUnit}
                    className="text-xs font-mono font-bold text-blue-700 underline hover:text-blue-900 ml-1"
                  >
                    Duyệt tất cả trong câu này
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleDetectWithAI}
                  disabled={isAiLoading}
                  className="neo-btn-sm px-3 py-1 bg-[#00D2FF] text-black text-xs font-bold"
                >
                  <Sparkles size={13} className={`mr-1 inline ${isAiLoading ? 'animate-spin' : ''}`} />
                  {isAiLoading ? 'Đang phân tích...' : 'AI Quét cụm từ tự động'}
                </button>
              </div>

              {/* Candidates List for this Unit */}
              <div className="space-y-2.5">
                <h3 className="text-xs font-mono font-bold uppercase tracking-wide text-black">
                  Các cụm từ phát hiện trong câu #{activeUnitIndex + 1}
                </h3>

                {unitAnnotations.length === 0 ? (
                  <div className="neo-box-sm p-4 bg-white text-center text-neutral-500 font-mono text-xs">
                    Chưa có cụm từ nào được đánh dấu trong câu này. Thêm thủ công bằng form bên dưới hoặc bấm "AI Quét cụm từ"!
                  </div>
                ) : (
                  <div className="space-y-2">
                    {unitAnnotations.map(ann => {
                      const isApproved = ann.status === 'approved';
                      return (
                        <div
                          key={ann.id}
                          className={`p-3 border-2 border-black flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 transition-all ${
                            isApproved ? 'bg-[#FFFDF0] shadow-[2px_2px_0px_#000]' : 'bg-neutral-100 opacity-80'
                          }`}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <span className="font-bold text-base text-black font-reading">
                                "{ann.text}"
                              </span>
                              <span className="text-[10px] font-mono uppercase px-1.5 py-0.2 border border-black bg-white">
                                {ann.type.replace('_', ' ')}
                              </span>
                              <span className="text-[10px] font-mono text-neutral-500">
                                vị trí: [{ann.startOffset}, {ann.endOffset})
                              </span>
                              <span className="text-[10px] font-mono text-neutral-400">
                                nguồn: {ann.source}
                              </span>
                            </div>
                            <div className="text-xs text-neutral-700 italic">
                              Ý nghĩa: {ann.meaning}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {isApproved ? (
                              <button
                                type="button"
                                onClick={() => handleToggleStatus(ann.id, 'rejected')}
                                className="neo-btn-sm px-2 py-1 bg-red-100 text-red-700 border-red-900 text-xs hover:bg-red-200"
                                title="Bỏ duyệt cụm từ này"
                              >
                                <X size={13} className="mr-0.5 inline" /> Bỏ duyệt
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleToggleStatus(ann.id, 'approved')}
                                className="neo-btn-sm px-2 py-1 bg-[#4ADE80] text-black text-xs hover:bg-green-400 font-bold"
                                title="Duyệt cụm từ này"
                              >
                                <Check size={13} className="mr-0.5 inline" /> Duyệt
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => handleDeleteAnnotation(ann.id)}
                              className="p-1 hover:bg-red-100 border border-black text-red-600"
                              title="Xóa hẳn cụm từ này"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Add Manual Phrase Form */}
              <div className="neo-box-sm p-4 bg-white space-y-2.5">
                <h4 className="text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <Plus size={14} /> Thêm cụm từ thủ công vào câu #{activeUnitIndex + 1}
                </h4>

                {newPhraseError && (
                  <div className="p-2 bg-red-50 border border-red-500 text-red-700 text-xs font-mono flex items-center gap-1.5">
                    <AlertCircle size={14} /> {newPhraseError}
                  </div>
                )}

                <form onSubmit={handleAddManualPhrase} className="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                  <div className="md:col-span-5">
                    <input
                      type="text"
                      placeholder='Cụm từ chuẩn xác (vd: "give it a shot")'
                      value={newPhraseText}
                      onChange={e => setNewPhraseText(e.target.value)}
                      className="neo-input w-full text-xs"
                    />
                  </div>

                  <div className="md:col-span-3">
                    <select
                      value={newPhraseType}
                      onChange={e => setNewPhraseType(e.target.value as PhraseType)}
                      className="neo-input w-full text-xs"
                    >
                      <option value="idiom">Idiom</option>
                      <option value="phrasal_verb">Phrasal Verb</option>
                      <option value="collocation">Collocation</option>
                      <option value="fixed_expression">Fixed Expression</option>
                    </select>
                  </div>

                  <div className="md:col-span-4">
                    <button
                      type="submit"
                      className="neo-btn w-full py-2 bg-[#FFE500] text-black text-xs font-bold"
                    >
                      <Plus size={13} className="mr-1 inline" /> Thêm cụm từ
                    </button>
                  </div>

                  <div className="md:col-span-12">
                    <input
                      type="text"
                      placeholder="Ý nghĩa hoặc giải thích hiển thị cho học sinh (vd: thử làm điều gì đó mới)"
                      value={newPhraseMeaning}
                      onChange={e => setNewPhraseMeaning(e.target.value)}
                      className="neo-input w-full text-xs"
                    />
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* TAB 2: FULL ARTICLE PREVIEW WITH HIGHLIGHTS */}
          {reviewTab === 'full' && (
            <div className="space-y-4">
              <div className="neo-box-sm p-3.5 bg-white flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-xs font-mono font-bold uppercase text-black">
                    Toàn bộ bài đọc: {resource.title}
                  </h3>
                  <p className="text-[11px] font-mono text-neutral-500">
                    Hiển thị trọn vẹn toàn bộ các đoạn văn và câu kèm theo tất cả các cụm từ highlight đã duyệt.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="neo-badge bg-[#FFE500] text-black text-[10px]">
                    {resource.paragraphs?.length || 1} Đoạn văn
                  </span>
                  <span className="neo-badge bg-[#4ADE80] text-black text-[10px]">
                    {totalApproved} Highlights đã duyệt
                  </span>
                </div>
              </div>

              {/* Full Reading Passage Body */}
              <div className="p-6 md:p-8 bg-paper-reading neo-box-sm space-y-6">
                {(resource.paragraphs && resource.paragraphs.length > 0
                  ? resource.paragraphs
                  : [resource.canonicalText]
                ).map((paraText, pIdx) => {
                  const paraSentences = segmentSentences(paraText);
                  return (
                    <div key={pIdx} className="space-y-2 pb-4 border-b border-black/10 last:border-b-0">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 bg-[#FF3838] border border-black inline-block"></span>
                        <span className="text-[11px] font-mono font-bold text-neutral-600 uppercase">
                          Đoạn {pIdx + 1} ({paraSentences.length} câu)
                        </span>
                      </div>
                      <p className="font-reading text-lg md:text-xl leading-relaxed text-[#111111]">
                        {paraSentences.map((sentence, sInParaIdx) => {
                          const sIdx = resource.sentences.findIndex(
                            s => s === sentence || s.trim() === sentence.trim()
                          );
                          const resolvedIdx = sIdx !== -1 ? sIdx : 0;
                          const approvedSentenceSpans = annotations
                            .filter(a => a.unitIndex === resolvedIdx && a.status === 'approved')
                            .map(a => ({
                              id: a.id,
                              text: a.text,
                              startOffset: a.startOffset,
                              endOffset: a.endOffset,
                              type: a.type,
                              meaning: a.meaning,
                            }));
                          const slices = buildRenderSlices(sentence, approvedSentenceSpans);

                          return (
                            <span
                              key={sInParaIdx}
                              onClick={() => {
                                if (sIdx !== -1) {
                                  setActiveUnitIndex(sIdx);
                                  setReviewTab('unit');
                                }
                              }}
                              className="hover:bg-yellow-100/60 cursor-pointer rounded-xs transition-colors mr-1.5"
                              title={`Bấm để chuyển tới Câu #${resolvedIdx + 1}`}
                            >
                              {slices.map((sl, slIdx) =>
                                sl.isHighlight ? (
                                  <mark
                                    key={slIdx}
                                    className="bg-[#FFE500] text-black font-semibold px-1 py-0.2 border-b-2 border-black rounded-none shadow-[1.5px_1.5px_0px_#000]"
                                    title={`${sl.annotation?.type}: ${sl.annotation?.meaning}`}
                                  >
                                    {sl.text}
                                  </mark>
                                ) : (
                                  <span key={slIdx}>{sl.text}</span>
                                )
                              )}
                            </span>
                          );
                        })}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: ALL PHRASES CATALOG TABLE */}
          {reviewTab === 'all_phrases' && (
            <div className="space-y-4">
              {/* Filter & Search Bar */}
              <div className="neo-box-sm p-3 bg-white flex flex-wrap items-center justify-between gap-2.5">
                <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                  <Search size={14} className="text-neutral-500" />
                  <input
                    type="text"
                    placeholder="Tìm theo cụm từ hoặc ý nghĩa..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="neo-input text-xs py-1 flex-1"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={filterType}
                    onChange={e => setFilterType(e.target.value)}
                    className="neo-input text-xs py-1"
                  >
                    <option value="all">Tất cả loại cụm từ</option>
                    <option value="idiom">Idiom</option>
                    <option value="phrasal_verb">Phrasal Verb</option>
                    <option value="collocation">Collocation</option>
                    <option value="fixed_expression">Fixed Expression</option>
                  </select>

                  <select
                    value={filterStatus}
                    onChange={e => setFilterStatus(e.target.value)}
                    className="neo-input text-xs py-1"
                  >
                    <option value="all">Tất cả trạng thái</option>
                    <option value="approved">Đã duyệt (Approved)</option>
                    <option value="pending">Chờ duyệt (Pending)</option>
                    <option value="rejected">Bị từ chối (Rejected)</option>
                  </select>
                </div>
              </div>

              {/* Table / List */}
              <div className="space-y-2">
                {filteredAnnotations.length === 0 ? (
                  <div className="neo-box-sm p-6 bg-white text-center text-xs font-mono text-neutral-500">
                    Không tìm thấy cụm từ nào khớp với bộ lọc.
                  </div>
                ) : (
                  filteredAnnotations.map((ann, idx) => {
                    const isApproved = ann.status === 'approved';
                    return (
                      <div
                        key={ann.id || idx}
                        className={`p-3 border-2 border-black flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 ${
                          isApproved ? 'bg-[#FFFDF0]' : 'bg-neutral-50 opacity-75'
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span className="font-bold text-base text-black font-reading">
                              "{ann.text}"
                            </span>
                            <span className="text-[10px] font-mono uppercase px-1.5 py-0.2 border border-black bg-white">
                              {ann.type.replace('_', ' ')}
                            </span>
                            <span className="text-[10px] font-mono text-neutral-500 bg-neutral-100 px-1 border border-black">
                              Câu #{(ann.unitIndex ?? 0) + 1}
                            </span>
                            <span
                              className={`text-[10px] font-mono uppercase font-bold px-1.5 py-0.2 border border-black ${
                                isApproved ? 'bg-[#4ADE80] text-black' : 'bg-neutral-200 text-neutral-700'
                              }`}
                            >
                              {ann.status}
                            </span>
                          </div>
                          <div className="text-xs text-neutral-700 italic">
                            Ý nghĩa: {ann.meaning || 'Chưa có giải nghĩa'}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setActiveUnitIndex(ann.unitIndex ?? 0);
                              setReviewTab('unit');
                            }}
                            className="neo-btn-sm px-2 py-1 bg-white text-black text-xs hover:bg-neutral-100"
                            title="Chuyển tới câu này"
                          >
                            Xem câu #{(ann.unitIndex ?? 0) + 1}
                          </button>

                          {isApproved ? (
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(ann.id, 'rejected')}
                              className="neo-btn-sm px-2 py-1 bg-red-100 text-red-700 text-xs"
                            >
                              <X size={13} className="mr-0.5 inline" /> Bỏ duyệt
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(ann.id, 'approved')}
                              className="neo-btn-sm px-2 py-1 bg-[#4ADE80] text-black text-xs font-bold"
                            >
                              <Check size={13} className="mr-0.5 inline" /> Duyệt
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleDeleteAnnotation(ann.id)}
                            className="p-1 hover:bg-red-100 border border-black text-red-600"
                            title="Xóa cụm từ này"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-neutral-100 border-t-2 border-black p-3 sm:p-4 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="neo-btn px-4 py-2 bg-white text-black text-xs uppercase"
          >
            Đóng
          </button>

          <div className="flex items-center gap-3">
            {saveSuccess && (
              <span className="text-xs font-mono font-bold text-green-700 flex items-center gap-1">
                <Check size={16} /> Đã lưu thành công!
              </span>
            )}
            <button
              type="button"
              onClick={handleSaveAll}
              disabled={isSaving}
              className="neo-btn px-6 py-2 bg-[#FF3838] text-white text-xs uppercase tracking-wider font-black shadow-[2px_2px_0px_#000]"
            >
              <Save size={14} className="mr-1.5 inline" />
              {isSaving ? 'Đang lưu...' : 'Lưu Thay Đổi'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
