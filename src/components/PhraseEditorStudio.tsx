/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { ReadingResource, PhraseAnnotation, PhraseType, Granularity } from '../types';
import { updateResourceAnnotations, publishResource } from '../services/resourceService';
import { detectPhrasesDeterministic, detectPhrasesWithAI } from '../services/phraseDetection';
import { buildRenderSlices, findPhraseMatches } from '../utils/textSegmentation';
import {
  Highlighter,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Sparkles,
  Play,
  Layers,
  ChevronLeft,
  ChevronRight,
  Save,
  BookOpen,
  Info,
  HelpCircle,
  AlertTriangle
} from 'lucide-react';

interface PhraseEditorStudioProps {
  resource: ReadingResource;
  onUpdateResource: (updated: ReadingResource) => void;
  onStartSession?: (resource: ReadingResource) => void;
  onClose?: () => void;
  /** Optional: controlled granularity from parent classroom. When provided,
   *  the internal granularity toggle is hidden and this value is used instead. */
  controlledGranularity?: Granularity;
  /** Optional: controlled active unit index from parent classroom. When
   *  provided, the internal stepper is hidden and this value is used instead. */
  controlledUnitIndex?: number;
}

export const PhraseEditorStudio: React.FC<PhraseEditorStudioProps> = ({
  resource,
  onUpdateResource,
  onStartSession,
  onClose,
  controlledGranularity,
  controlledUnitIndex,
}) => {
  const [annotations, setAnnotations] = useState<PhraseAnnotation[]>(resource.annotations || []);
  const [internalGranularity, setInternalGranularity] = useState<Granularity>('sentence');
  const [internalUnitIndex, setInternalUnitIndex] = useState(0);

  // Resolve controlled vs internal: when parent provides these props, use them.
  const granularity: Granularity = controlledGranularity ?? internalGranularity;
  const activeUnitIndex: number = controlledUnitIndex ?? internalUnitIndex;
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Text selection state
  const [selectedText, setSelectedText] = useState('');
  const [selectionOffsets, setSelectionOffsets] = useState<{ start: number; end: number } | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedPhraseType, setSelectedPhraseType] = useState<PhraseType>('collocation');
  const [selectedMeaning, setSelectedMeaning] = useState('');
  const [addFormError, setAddFormError] = useState('');

  // Editing existing annotation state
  const [editingAnnotationId, setEditingAnnotationId] = useState<string | null>(null);
  const [editMeaning, setEditMeaning] = useState('');
  const [editType, setEditType] = useState<PhraseType>('collocation');

  const readingTextRef = useRef<HTMLDivElement>(null);

  const units = granularity === 'sentence' ? resource.sentences : resource.paragraphs;
  const currentUnitText = units[activeUnitIndex] || '';

  // Expand partial selection to whole word boundaries so letters like 'G' in 'Give it a shot' are never missed
  const expandToWordBoundaries = (fullText: string, start: number, end: number): { start: number; end: number } => {
    let s = Math.max(0, start);
    let e = Math.min(fullText.length, end);
    while (s > 0 && /[a-zA-Z0-9']/.test(fullText[s - 1])) {
      s--;
    }
    while (e < fullText.length && /[a-zA-Z0-9']/.test(fullText[e])) {
      e++;
    }
    return { start: s, end: e };
  };

  // Synchronize annotations if resource changes
  useEffect(() => {
    setAnnotations(resource.annotations || []);
  }, [resource.id, resource.annotations]);

  useEffect(() => {
    setShowAddForm(false);
    setSelectedText('');
    setSelectionOffsets(null);
    setEditingAnnotationId(null);
  }, [resource.id, activeUnitIndex, granularity]);

  // Filter annotations for currently active unit and granularity
  const currentUnitAnnotations = annotations.filter(
    a => a.unitIndex === activeUnitIndex && a.unitType === granularity
  );

  /**
   * Handle cursor selection using real DOM Range offsets within readingTextRef.
   *
   * This correctly identifies the actual selected occurrence — including repeated
   * phrases — rather than always snapping to the first indexOf match.
   */
  const handleMouseUp = () => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
      return;
    }

    const container = readingTextRef.current;
    if (!container) return;

    const range = sel.getRangeAt(0);

    // Reject selections originating outside our reading container
    if (!container.contains(range.commonAncestorContainer)) {
      return;
    }

    // Walk text nodes to convert DOM node+offset into a character offset within
    // the container's concatenated text (which equals currentUnitText).
    const domToChar = (targetNode: Node, targetOffset: number): number => {
      const before = document.createRange();
      before.selectNodeContents(container);
      before.setEnd(targetNode, targetOffset);
      return before.toString().length;
    };

    const rawStart = domToChar(range.startContainer, range.startOffset);
    const rawEnd   = domToChar(range.endContainer,   range.endOffset);

    if (rawStart === -1 || rawEnd === -1 || rawStart >= rawEnd) return;

    // Expand to word boundaries in the original unit text
    const { start, end } = expandToWordBoundaries(currentUnitText, rawStart, rawEnd);
    if (start >= end || end > currentUnitText.length) return;

    const cleanMatched = currentUnitText.slice(start, end).trim();
    if (!cleanMatched || cleanMatched.length < 2) return;

    // Re-anchor after trim (trim may have moved the start forward)
    const trimmedStart = currentUnitText.indexOf(cleanMatched, start);
    const finalStart = trimmedStart !== -1 ? trimmedStart : start;
    const finalEnd = finalStart + cleanMatched.length;

    setSelectedText(cleanMatched);
    setSelectionOffsets({ start: finalStart, end: finalEnd });
    setSelectedMeaning('');
    setAddFormError('');
    setShowAddForm(true);
  };

  /**
   * Called when the user manually edits the phrase text field after DOM selection.
   * If the current offsets already point to the same text (case-insensitive), keep
   * them so we don't lose the correct repeated-occurrence position.  Only
   * re-resolve if the text no longer matches what's stored.
   */
  const handlePhraseTextChange = (newVal: string) => {
    setSelectedText(newVal);
    setAddFormError('');
    const trimTarget = newVal.trim();
    if (!trimTarget) {
      setSelectionOffsets(null);
      return;
    }
    // If existing offsets still match the new value, keep them (preserves
    // the correct occurrence captured from the DOM Range).
    if (
      selectionOffsets &&
      currentUnitText.slice(selectionOffsets.start, selectionOffsets.end)
        .toLowerCase() === trimTarget.toLowerCase()
    ) {
      return;
    }
    // Offsets no longer match — fall back to first occurrence (best effort for
    // keyboard-typed phrases where no DOM Range is available).
    const matches = findPhraseMatches(currentUnitText, trimTarget);
    setSelectionOffsets(matches.length === 1 ? matches[0] : null);
  };

  // Confirm adding new highlight
  const handleConfirmAddHighlight = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setAddFormError('');
    const trimmed = selectedText.trim();
    if (!trimmed) {
      setAddFormError('Vui lòng nhập cụm từ.');
      return;
    }

    // Use stored DOM-Range offsets when available (preserves correct occurrence).
    // Fall back to first indexOf only when user typed the phrase without a DOM selection.
    let startOffset: number;
    let endOffset: number;
    if (
      selectionOffsets &&
      selectionOffsets.start >= 0 &&
      selectionOffsets.end <= currentUnitText.length &&
      currentUnitText.slice(selectionOffsets.start, selectionOffsets.end)
        .toLowerCase() === trimmed.toLowerCase()
    ) {
      startOffset = selectionOffsets.start;
      endOffset = selectionOffsets.end;
    } else {
      const matches = findPhraseMatches(currentUnitText, trimmed);
      if (matches.length !== 1) {
        setAddFormError(matches.length ? 'Cụm từ lặp lại: hãy bôi chọn đúng vị trí trong bài đọc.' : `Không tìm thấy "${trimmed}" trong đoạn/câu này.`);
        return;
      }
      startOffset = matches[0].start;
      endOffset = matches[0].end;
    }
    const exactText = currentUnitText.slice(startOffset, endOffset);

    // Check collision with existing annotations
    const collision = currentUnitAnnotations.find(
      a =>
        startOffset < a.endOffset && endOffset > a.startOffset
    );

    if (collision) {
      setAddFormError(`Cụm từ này bị trùng với highlight đã có: "${collision.text}".`);
      return;
    }

    const newAnnotation: PhraseAnnotation = {
      id: `ann_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      unitIndex: activeUnitIndex,
      unitType: granularity,
      text: exactText,
      startOffset,
      endOffset,
      type: selectedPhraseType,
      meaning: selectedMeaning.trim() || 'Key expression',
      status: 'approved', // Directly approved by teacher
      source: 'manual',
    };

    const nextAnnotations = [...annotations, newAnnotation];
    setAnnotations(nextAnnotations);
    setShowAddForm(false);
    setSelectedText('');
    setSelectionOffsets(null);

    // Auto-save to Firestore
    await persistAnnotations(nextAnnotations);
  };

  // Remove a highlight
  const handleRemoveHighlight = async (id: string) => {
    const nextAnnotations = annotations.filter(a => a.id !== id);
    setAnnotations(nextAnnotations);
    if (editingAnnotationId === id) setEditingAnnotationId(null);
    await persistAnnotations(nextAnnotations);
  };

  // Save edit of existing annotation
  const handleSaveExistingEdit = async (id: string) => {
    const nextAnnotations = annotations.map(a =>
      a.id === id ? { ...a, meaning: editMeaning.trim(), type: editType } : a
    );
    setAnnotations(nextAnnotations);
    setEditingAnnotationId(null);
    await persistAnnotations(nextAnnotations);
  };

  // Auto-detect suggestions using deterministic algorithm
  const handleSuggestPhrases = async () => {
    if (!currentUnitText) return;
    const suggestions = detectPhrasesDeterministic(currentUnitText, activeUnitIndex, granularity);
    if (suggestions.length === 0) {
      alert('No additional standard idioms or collocations found in this chunk. You can manually highlight any phrase with your mouse!');
      return;
    }

    // Merge non-colliding
    const existingSpans = currentUnitAnnotations;
    const newItems: PhraseAnnotation[] = [];

    for (const sug of suggestions) {
      const collides = existingSpans.some(
        ex =>
          (sug.startOffset >= ex.startOffset && sug.startOffset < ex.endOffset) ||
          (sug.endOffset > ex.startOffset && sug.endOffset <= ex.endOffset)
      );
      if (!collides) {
        newItems.push({ ...sug, status: 'approved' }); // approved for the editor
      }
    }

    if (newItems.length === 0) {
      alert('All suggested phrases in this chunk are already highlighted.');
      return;
    }

    const nextAnnotations = [...annotations, ...newItems];
    setAnnotations(nextAnnotations);
    await persistAnnotations(nextAnnotations);
    setSaveMessage(`Added ${newItems.length} phrase highlight(s)!`);
    setTimeout(() => setSaveMessage(''), 3000);
  };

  // AI Phrase Detection
  const handleAiSuggestPhrases = async () => {
    if (!currentUnitText) return;
    setIsAiLoading(true);
    try {
      const candidates = await detectPhrasesWithAI(currentUnitText, activeUnitIndex, granularity);
      const existingSpans = currentUnitAnnotations;
      const newItems: PhraseAnnotation[] = [];

      for (const cand of candidates) {
        const collides = existingSpans.some(
          ex =>
            (cand.startOffset >= ex.startOffset && cand.startOffset < ex.endOffset) ||
            (cand.endOffset > ex.startOffset && cand.endOffset <= ex.endOffset)
        );
        if (!collides) {
          newItems.push({ ...cand, status: 'approved' });
        }
      }

      if (newItems.length > 0) {
        const nextAnnotations = [...annotations, ...newItems];
        setAnnotations(nextAnnotations);
        await persistAnnotations(nextAnnotations);
        setSaveMessage(`AI identified ${newItems.length} expression(s)!`);
        setTimeout(() => setSaveMessage(''), 3000);
      } else {
        alert('AI did not find new expressions in this sentence.');
      }
    } finally {
      setIsAiLoading(false);
    }
  };

  // Persist to database
  const persistAnnotations = async (newAnnotations: PhraseAnnotation[]) => {
    setIsSaving(true);
    try {
      await updateResourceAnnotations(resource.id, newAnnotations);
      onUpdateResource({
        ...resource,
        annotations: newAnnotations,
      });
      setSaveMessage('Saved');
      setTimeout(() => setSaveMessage(''), 2000);
    } catch (err: any) {
      console.error('Failed to update annotations:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Launch classroom session directly with current highlights
  const handleLaunchSession = async () => {
    let currentRes = resource;
    if (resource.status !== 'published') {
      try {
        await publishResource(resource.id);
        currentRes = { ...resource, status: 'published' };
      } catch (err: any) {
        alert(`Could not publish resource: ${err.message}`);
        return;
      }
    }
    if (onStartSession) {
      onStartSession(currentRes);
    }
  };

  // Convert approved spans for current unit into render slices
  const approvedSpans = currentUnitAnnotations.map(a => ({
    id: a.id,
    text: a.text,
    startOffset: a.startOffset,
    endOffset: a.endOffset,
    type: a.type,
    meaning: a.meaning,
  }));

  const slices = buildRenderSlices(currentUnitText, approvedSpans);

  return (
    <div className="neo-box bg-white p-4 sm:p-5 space-y-4">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-black pb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="neo-badge bg-[#FFE500] text-black text-[10px]">
              Highlight Editor
            </span>
            <span className="text-[11px] font-mono text-neutral-600 font-bold">
              {resource.level} • {resource.category}
            </span>
            {saveMessage && (
              <span className="neo-badge bg-[#4ADE80] text-black text-[10px]">
                {saveMessage}
              </span>
            )}
          </div>
          <h2 className="text-base sm:text-lg font-black uppercase tracking-tight text-black flex items-center gap-1.5">
            <Highlighter size={16} className="text-[#FF3838]" />
            Phrases: <span className="font-reading font-bold truncate max-w-xs sm:max-w-md">{resource.title}</span>
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {onStartSession && (
            <button
              type="button"
              onClick={handleLaunchSession}
              className="neo-btn px-3 py-1.5 bg-[#FF3838] text-white text-xs font-black uppercase tracking-wider flex items-center gap-1"
            >
              <Play size={12} /> Present Live
            </button>
          )}

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="neo-btn-sm p-1 bg-neutral-100 text-black hover:bg-neutral-200"
              title="Close Editor"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Controls Bar: Mode Switcher & Unit Stepper */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#FAF8F0] p-3 neo-box-sm">
        {/* Granularity switch — hidden when parent controls granularity */}
        {!controlledGranularity && <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono font-bold uppercase text-neutral-600">Unit:</span>
          <div className="flex border border-black bg-white">
            <button
              type="button"
              onClick={() => {
                setInternalGranularity('sentence');
                setInternalUnitIndex(0);
              }}
              className={`px-2.5 py-0.5 text-xs font-mono font-bold uppercase ${
                granularity === 'sentence' ? 'bg-[#FFE500] text-black' : 'text-neutral-700'
              }`}
            >
              Sentence
            </button>
            <button
              type="button"
              onClick={() => {
                setInternalGranularity('paragraph');
                setInternalUnitIndex(0);
              }}
              className={`px-2.5 py-0.5 text-xs font-mono font-bold uppercase border-l border-black ${
                granularity === 'paragraph' ? 'bg-[#FFE500] text-black' : 'text-neutral-700'
              }`}
            >
              Paragraph
            </button>
          </div>
        </div>}

        {/* Unit Stepper — hidden when parent controls unit index */}
        {controlledUnitIndex === undefined && <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={activeUnitIndex === 0}
            onClick={() => setInternalUnitIndex(prev => Math.max(0, prev - 1))}
            className="neo-btn-sm px-2 py-0.5 bg-white text-black text-xs font-bold"
          >
            <ChevronLeft size={14} />
          </button>
          <span className="text-xs font-mono font-bold uppercase px-2 py-0.5 bg-white border border-black">
            {activeUnitIndex + 1} / {units.length}
          </span>
          <button
            type="button"
            disabled={activeUnitIndex >= units.length - 1}
            onClick={() => setInternalUnitIndex(prev => Math.min(units.length - 1, prev + 1))}
            className="neo-btn-sm px-2 py-0.5 bg-white text-black text-xs font-bold"
          >
            <ChevronRight size={14} />
          </button>
        </div>}

        {/* Suggestion triggers */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSuggestPhrases}
            className="neo-btn-sm px-2.5 py-0.5 bg-[#FFE500] text-black text-[11px] font-bold font-mono uppercase"
            title="Scan for idioms and collocations"
          >
            <Sparkles size={11} className="mr-1 inline" /> Suggest
          </button>

          <button
            type="button"
            onClick={handleAiSuggestPhrases}
            disabled={isAiLoading}
            className="neo-btn-sm px-2.5 py-0.5 bg-[#00D2FF] text-black text-[11px] font-bold font-mono uppercase"
          >
            {isAiLoading ? 'AI...' : 'AI Detect'}
          </button>
        </div>
      </div>

      {/* Interactive Text Highlighting Canvas */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs font-mono text-neutral-600">
          <span className="font-bold uppercase flex items-center gap-1.5 text-black">
            <Info size={14} className="text-[#FF3838]" />
            Highlight Instructions: Select text with mouse to define a phrase, or click an existing highlight to edit/delete.
          </span>
          <span className="font-bold text-black">
            {currentUnitAnnotations.length} highlight(s) defined in this chunk
          </span>
        </div>

        {/* Reading Passage Canvas */}
        <div
          ref={readingTextRef}
          onMouseUp={handleMouseUp}
          className="p-6 md:p-8 bg-paper-reading neo-box-sm min-h-36 relative select-text cursor-text"
        >
          <p className="font-reading text-2xl md:text-3xl leading-relaxed text-[#111111] font-medium">
            {slices.map((slice, i) =>
              slice.isHighlight && slice.annotation ? (
                <mark
                  key={i}
                  onClick={e => {
                    e.stopPropagation();
                    setEditingAnnotationId(slice.annotation!.id);
                    setEditMeaning(slice.annotation!.meaning);
                    setEditType(slice.annotation!.type);
                  }}
                  className="bg-[#FFE500] text-black font-bold px-1.5 py-0.5 border-b-3 border-black cursor-pointer shadow-[2px_2px_0px_#000000] inline-block hover:bg-yellow-400 transition-colors mr-1"
                  title="Click to edit or remove highlight"
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

      {/* Floating Add Highlight Form (Appears when text is selected) */}
      {showAddForm && (
        <div className="neo-box-sm p-4 bg-[#FFFDF0] border-3 border-black shadow-[4px_4px_0px_#000] space-y-3 animate-in fade-in">
          <div className="flex items-center justify-between border-b-2 border-black pb-2">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-[#FF3838] border border-black inline-block"></span>
              <span className="text-xs font-mono font-black uppercase text-black">
                Gắn nhãn cụm từ Highlight: "{selectedText}"
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setShowAddForm(false);
                setSelectedText('');
                setSelectionOffsets(null);
                setAddFormError('');
              }}
              className="p-1 hover:bg-neutral-200"
            >
              <X size={14} />
            </button>
          </div>

          {addFormError && (
            <div className="p-2 bg-red-50 border border-black text-red-800 text-xs font-mono">
              {addFormError}
            </div>
          )}

          <form onSubmit={handleConfirmAddHighlight} className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="md:col-span-12">
              <label className="block text-[10px] font-mono font-bold uppercase mb-1">
                Cụm từ hiển thị (tự động mở rộng trọn vẹn từ, có thể chỉnh sửa):
              </label>
              <input
                type="text"
                value={selectedText}
                onChange={e => handlePhraseTextChange(e.target.value)}
                className="neo-input w-full text-sm font-reading font-bold bg-white py-1.5"
                placeholder='vd: "Give it a shot"'
                required
              />
            </div>

            <div className="md:col-span-4">
              <label className="block text-[10px] font-mono font-bold uppercase mb-1">
                Phân loại cụm từ:
              </label>
              <select
                value={selectedPhraseType}
                onChange={e => setSelectedPhraseType(e.target.value as PhraseType)}
                className="neo-input w-full text-xs py-1.5"
              >
                <option value="idiom">Idiom (Thành ngữ)</option>
                <option value="phrasal_verb">Phrasal Verb (Cụm động từ)</option>
                <option value="collocation">Collocation (Cụm từ cố định)</option>
                <option value="fixed_expression">Fixed Expression (Cách diễn đạt)</option>
              </select>
            </div>

            <div className="md:col-span-5">
              <label className="block text-[10px] font-mono font-bold uppercase mb-1">
                Ý nghĩa / Giải thích cho học sinh:
              </label>
              <input
                type="text"
                placeholder='vd: "Thử làm điều gì đó mới mẻ"'
                value={selectedMeaning}
                onChange={e => setSelectedMeaning(e.target.value)}
                className="neo-input w-full text-xs py-1.5"
              />
            </div>

            <div className="md:col-span-3 flex items-end">
              <button
                type="submit"
                className="neo-btn w-full py-2 bg-[#4ADE80] text-black text-xs font-black uppercase"
              >
                <Check size={14} className="mr-1 inline" /> Thêm Highlight
              </button>
            </div>
          </form>
        </div>
      )}

      {/* List of Defined Highlights in Current Unit with Edit/Remove Actions */}
      <div className="space-y-3">
        <h3 className="text-xs font-mono font-black uppercase tracking-wider text-black flex items-center justify-between">
          <span>Active Highlights in Unit #{activeUnitIndex + 1}</span>
          <span className="text-[11px] text-neutral-500 font-normal">
            Total in whole reading: {annotations.length} highlights
          </span>
        </h3>

        {currentUnitAnnotations.length === 0 ? (
          <div className="p-4 bg-neutral-50 border-2 border-dashed border-black text-center text-xs font-mono text-neutral-500">
            No phrases highlighted yet in this chunk. Use your mouse to select any phrase in the text above, or click <b>"Suggest Idioms"</b>!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {currentUnitAnnotations.map(ann => {
              const isEditing = editingAnnotationId === ann.id;

              return (
                <div
                  key={ann.id}
                  className="neo-box-sm p-3 bg-white flex flex-col justify-between gap-2 border-2 border-black"
                >
                  {isEditing ? (
                    /* Inline Edit Mode */
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm font-reading">"{ann.text}"</span>
                        <button
                          type="button"
                          onClick={() => setEditingAnnotationId(null)}
                          className="text-neutral-400 hover:text-black"
                        >
                          <X size={14} />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <select
                          value={editType}
                          onChange={e => setEditType(e.target.value as PhraseType)}
                          className="neo-input text-xs py-1"
                        >
                          <option value="idiom">Idiom</option>
                          <option value="phrasal_verb">Phrasal Verb</option>
                          <option value="collocation">Collocation</option>
                          <option value="fixed_expression">Fixed Expression</option>
                        </select>
                        <input
                          type="text"
                          value={editMeaning}
                          onChange={e => setEditMeaning(e.target.value)}
                          placeholder="Meaning"
                          className="neo-input text-xs py-1"
                        />
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => handleRemoveHighlight(ann.id)}
                          className="neo-btn-sm px-2 py-0.5 bg-red-100 text-red-700 text-xs"
                        >
                          <Trash2 size={12} className="mr-1" /> Delete
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveExistingEdit(ann.id)}
                          className="neo-btn-sm px-3 py-0.5 bg-[#4ADE80] text-black text-xs font-bold"
                        >
                          <Check size={12} className="mr-1" /> Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Normal Display Mode */
                    <>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="font-reading font-bold text-base text-black">
                              "{ann.text}"
                            </span>
                            <span className="text-[10px] font-mono uppercase px-1.5 py-0.2 border border-black bg-[#FFE500]">
                              {ann.type.replace('_', ' ')}
                            </span>
                          </div>
                          <p className="text-xs font-reading text-neutral-600 italic">
                            {ann.meaning || 'No definition set'}
                          </p>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingAnnotationId(ann.id);
                              setEditMeaning(ann.meaning);
                              setEditType(ann.type);
                            }}
                            className="p-1 hover:bg-neutral-100 border border-black text-black"
                            title="Edit Meaning or Type"
                          >
                            <Edit2 size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveHighlight(ann.id)}
                            className="p-1 hover:bg-red-100 border border-black text-red-600"
                            title="Remove this highlight"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[10px] font-mono text-neutral-400 pt-1 border-t border-neutral-100">
                        <span>offsets: [{ann.startOffset}, {ann.endOffset})</span>
                        <span>source: {ann.source}</span>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
