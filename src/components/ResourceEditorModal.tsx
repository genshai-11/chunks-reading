/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ReadingResource, ResourceStatus, SourceType } from '../types';
import { saveReadingResource } from '../services/resourceService';
import { segmentSentences, segmentParagraphs } from '../utils/textSegmentation';
import { X, Upload, Globe, FileText, Check, AlertCircle, Plus } from 'lucide-react';

interface ResourceEditorModalProps {
  initialResource?: ReadingResource | null;
  existingCategories: string[];
  onClose: () => void;
  onSaved: (resource: ReadingResource) => void;
}

export const ResourceEditorModal: React.FC<ResourceEditorModalProps> = ({
  initialResource,
  existingCategories,
  onClose,
  onSaved,
}) => {
  const [title, setTitle] = useState(initialResource?.title || '');
  const [category, setCategory] = useState(initialResource?.category || 'General English');
  const [customCategory, setCustomCategory] = useState('');
  const [isAddingCustomCategory, setIsAddingCustomCategory] = useState(false);
  const [topic, setTopic] = useState(initialResource?.topic || 'Reading Fluency');
  const [level, setLevel] = useState(initialResource?.level || 'B2 Upper-Intermediate');
  const [sourceType, setSourceType] = useState<SourceType>(initialResource?.sourceType || 'paste');
  const [sourceUrl, setSourceUrl] = useState(initialResource?.sourceUrl || '');
  const [provenance, setProvenance] = useState(initialResource?.provenance || 'Original Classroom Text');
  const [rightsBasis, setRightsBasis] = useState(initialResource?.rightsBasis || 'Fair Educational Use');
  const [canonicalText, setCanonicalText] = useState(initialResource?.canonicalText || '');
  const [status, setStatus] = useState<ResourceStatus>(initialResource?.status || 'draft');

  const [urlFetchLoading, setUrlFetchLoading] = useState(false);
  const [urlFetchError, setUrlFetchError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [textEditView, setTextEditView] = useState<'full' | 'paragraphs'>('full');

  // Sentence count preview
  const sentences = segmentSentences(canonicalText);
  const paragraphs = segmentParagraphs(canonicalText);
  const wordCount = canonicalText.trim() ? canonicalText.trim().split(/\s+/).length : 0;

  // Paragraph-by-paragraph modification helpers
  const handleUpdateParagraph = (index: number, newText: string) => {
    const nextParagraphs = paragraphs.length > 0 ? [...paragraphs] : [''];
    nextParagraphs[index] = newText;
    setCanonicalText(nextParagraphs.join('\n\n'));
  };

  const handleAddParagraph = () => {
    const current = paragraphs.length > 0 ? paragraphs : [''];
    const nextParagraphs = [...current, ''];
    setCanonicalText(nextParagraphs.join('\n\n'));
  };

  const handleRemoveParagraph = (index: number) => {
    if (paragraphs.length <= 1) {
      setCanonicalText('');
      return;
    }
    const nextParagraphs = paragraphs.filter((_, i) => i !== index);
    setCanonicalText(nextParagraphs.join('\n\n'));
  };

  const handleMergeParagraphWithPrev = (index: number) => {
    if (index <= 0) return;
    const nextParagraphs = [...paragraphs];
    nextParagraphs[index - 1] = `${nextParagraphs[index - 1]} ${nextParagraphs[index]}`.trim();
    nextParagraphs.splice(index, 1);
    setCanonicalText(nextParagraphs.join('\n\n'));
  };

  // Handle TXT file import
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.txt')) {
      setFormError('Please select a plain text (.txt) file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = event => {
      const content = event.target?.result as string;
      setCanonicalText(content);
      if (!title) {
        setTitle(file.name.replace('.txt', ''));
      }
      setSourceType('txt');
      setProvenance(`Imported file: ${file.name}`);
    };
    reader.readAsText(file);
  };

  // Handle URL import with fallback
  const handleFetchUrl = async () => {
    if (!sourceUrl.trim()) return;
    setUrlFetchLoading(true);
    setUrlFetchError('');

    try {
      // Basic validation for URL
      if (!sourceUrl.startsWith('http://') && !sourceUrl.startsWith('https://')) {
        throw new Error('URL must start with http:// or https://');
      }

      // Call server proxy or public text extraction helper
      const res = await fetch(`/api/extract-url?url=${encodeURIComponent(sourceUrl)}`);
      if (!res.ok) {
        throw new Error('Unable to extract article text from this URL. Please use the Paste tab.');
      }
      const data = await res.json();
      if (data.text) {
        setCanonicalText(data.text);
        if (data.title && !title) setTitle(data.title);
        setSourceType('url');
        setProvenance(data.provenance || sourceUrl);
      } else {
        throw new Error('No readable text extracted. Please paste directly.');
      }
    } catch (err: any) {
      setUrlFetchError(err.message || 'URL fetch failed. You can paste the article text below.');
    } finally {
      setUrlFetchLoading(false);
    }
  };

  const handleSave = async (targetStatus: ResourceStatus) => {
    setFormError('');
    if (!title.trim()) {
      setFormError('Please provide a title for the reading.');
      return;
    }
    if (!canonicalText.trim()) {
      setFormError('Please paste or import the reading text.');
      return;
    }

    setIsSaving(true);
    try {
      const selectedCategory = isAddingCustomCategory && customCategory.trim()
        ? customCategory.trim()
        : category;

      const saved = await saveReadingResource({
        ...(initialResource || {}),
        title: title.trim(),
        category: selectedCategory,
        topic: topic.trim(),
        level,
        sourceType,
        sourceUrl: sourceUrl.trim(),
        provenance: provenance.trim(),
        rightsBasis: rightsBasis.trim(),
        status: targetStatus,
        canonicalText: canonicalText.trim(),
      });

      onSaved(saved);
      onClose();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save resource.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs">
      <div className="neo-box-lg w-full max-w-3xl max-h-[92vh] flex flex-col bg-[#FFFDF0] overflow-hidden">
        {/* Header */}
        <div className="bg-[#FF3838] border-b-3 border-black p-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 bg-[#FFE500] border-2 border-black inline-block"></span>
            <h2 className="text-xl font-black uppercase tracking-tight text-white">
              {initialResource ? 'Edit Reading Resource' : 'Add New Reading Resource'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="neo-btn-sm bg-white p-1.5 text-black hover:bg-neutral-100"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {formError && (
            <div className="p-3 bg-red-100 border-2 border-black text-red-900 text-xs font-mono font-bold flex items-center gap-2">
              <AlertCircle size={16} /> {formError}
            </div>
          )}

          {/* Title & Level */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-mono font-bold uppercase mb-1">
                Reading Title *
              </label>
              <input
                type="text"
                placeholder="e.g. Taking the First Step"
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="neo-input w-full text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-mono font-bold uppercase mb-1">
                Estimated CEFR Level
              </label>
              <select
                value={level}
                onChange={e => setLevel(e.target.value)}
                className="neo-input w-full text-sm"
              >
                <option value="A2 Elementary">A2 Elementary</option>
                <option value="B1 Intermediate">B1 Intermediate</option>
                <option value="B2 Upper-Intermediate">B2 Upper-Intermediate</option>
                <option value="C1 Advanced">C1 Advanced</option>
                <option value="C2 Proficiency">C2 Proficiency</option>
              </select>
            </div>
          </div>

          {/* Category & Topic */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-mono font-bold uppercase">
                  Category *
                </label>
                <button
                  type="button"
                  onClick={() => setIsAddingCustomCategory(!isAddingCustomCategory)}
                  className="text-[11px] font-mono text-black font-bold underline flex items-center gap-0.5"
                >
                  <Plus size={12} /> {isAddingCustomCategory ? 'Use Existing' : 'New Category'}
                </button>
              </div>

              {isAddingCustomCategory ? (
                <input
                  type="text"
                  placeholder="Enter custom category"
                  value={customCategory}
                  onChange={e => setCustomCategory(e.target.value)}
                  className="neo-input w-full text-sm bg-yellow-50"
                />
              ) : (
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="neo-input w-full text-sm"
                >
                  {Array.from(new Set([...existingCategories, 'Everyday Psychology', 'Urban Studies', 'Technology', 'Literature', 'General English'])).map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block text-xs font-mono font-bold uppercase mb-1">
                Topic & Keywords
              </label>
              <input
                type="text"
                placeholder="e.g. Courage, Decision Making"
                value={topic}
                onChange={e => setTopic(e.target.value)}
                className="neo-input w-full text-sm"
              />
            </div>
          </div>

          {/* Input Method Tabs */}
          <div className="neo-box-sm p-4 bg-white space-y-3">
            <div className="flex items-center gap-2 border-b-2 border-black pb-2">
              <button
                type="button"
                onClick={() => setSourceType('paste')}
                className={`neo-btn-sm px-3 py-1 text-xs font-bold ${sourceType === 'paste' ? 'bg-[#FFE500]' : 'bg-neutral-100'}`}
              >
                <FileText size={14} className="mr-1" /> Paste Text
              </button>
              <button
                type="button"
                onClick={() => setSourceType('txt')}
                className={`neo-btn-sm px-3 py-1 text-xs font-bold ${sourceType === 'txt' ? 'bg-[#FFE500]' : 'bg-neutral-100'}`}
              >
                <Upload size={14} className="mr-1" /> Upload .TXT
              </button>
              <button
                type="button"
                onClick={() => setSourceType('url')}
                className={`neo-btn-sm px-3 py-1 text-xs font-bold ${sourceType === 'url' ? 'bg-[#FFE500]' : 'bg-neutral-100'}`}
              >
                <Globe size={14} className="mr-1" /> Import from URL
              </button>
            </div>

            {sourceType === 'txt' && (
              <div className="p-3 border-2 border-dashed border-black bg-neutral-50 text-center">
                <input
                  type="file"
                  accept=".txt"
                  id="txt-upload"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <label
                  htmlFor="txt-upload"
                  className="neo-btn-sm px-4 py-2 bg-[#FFE500] text-black text-xs cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Upload size={14} /> Choose Plain Text File (.txt)
                </label>
                <p className="text-[11px] font-mono text-neutral-500 mt-2">
                  Automatically extracts plain text and splits into classroom chunks.
                </p>
              </div>
            )}

            {sourceType === 'url' && (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder="https://example.com/article"
                    value={sourceUrl}
                    onChange={e => setSourceUrl(e.target.value)}
                    className="neo-input flex-1 text-xs"
                  />
                  <button
                    type="button"
                    onClick={handleFetchUrl}
                    disabled={urlFetchLoading}
                    className="neo-btn-sm px-4 py-1 bg-[#FFE500] text-black text-xs font-bold"
                  >
                    {urlFetchLoading ? 'Fetching...' : 'Fetch Article'}
                  </button>
                </div>
                {urlFetchError && (
                  <p className="text-xs font-mono text-red-600 bg-red-50 p-2 border border-red-300">
                    {urlFetchError}
                  </p>
                )}
              </div>
            )}

            {/* Canonical text area with Paragraph Management */}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                <label className="text-xs font-mono font-bold uppercase text-black">
                  Nội dung bài đọc (Canonical Text) *
                </label>

                {/* View switcher: Full text vs Paragraph blocks */}
                <div className="flex items-center gap-2">
                  <div className="inline-flex border border-black bg-white p-0.5 shadow-[1px_1px_0px_#000]">
                    <button
                      type="button"
                      onClick={() => setTextEditView('full')}
                      className={`px-2 py-0.5 text-[11px] font-mono font-bold uppercase transition-all ${
                        textEditView === 'full' ? 'bg-[#FFE500] text-black' : 'text-neutral-600 hover:text-black'
                      }`}
                    >
                      Toàn văn ({paragraphs.length} đoạn)
                    </button>
                    <button
                      type="button"
                      onClick={() => setTextEditView('paragraphs')}
                      className={`px-2 py-0.5 text-[11px] font-mono font-bold uppercase transition-all ${
                        textEditView === 'paragraphs' ? 'bg-[#FF3838] text-white' : 'text-neutral-600 hover:text-black'
                      }`}
                    >
                      Từng đoạn văn ({paragraphs.length})
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs font-mono text-neutral-600">
                    <span className="font-bold text-black">{wordCount} từ</span>
                    <span>•</span>
                    <span>{sentences.length} câu</span>
                    <span>•</span>
                    <span className="font-bold text-[#FF3838]">{paragraphs.length} đoạn</span>
                  </div>
                </div>
              </div>

              {textEditView === 'full' ? (
                <div>
                  <textarea
                    rows={8}
                    value={canonicalText}
                    onChange={e => setCanonicalText(e.target.value)}
                    placeholder="Dán nội dung bài đọc tiếng Anh tại đây. Tách các đoạn văn bằng 1 dòng trống (Enter 2 lần)."
                    className="neo-input w-full text-sm font-reading leading-relaxed"
                  ></textarea>
                  <p className="text-[11px] font-mono text-neutral-500 mt-1">
                    Mẹo: Nhấn Enter 2 lần (để lại 1 dòng trống) để phân tách giữa các đoạn văn (Paragraphs). Hoặc bấm tab "Từng đoạn văn" ở trên để chỉnh sửa số lượng đoạn văn.
                  </p>
                </div>
              ) : (
                /* Paragraph Blocks Mode */
                <div className="space-y-3 p-3 bg-white border-2 border-black">
                  <div className="flex items-center justify-between text-xs font-mono font-bold text-neutral-700 pb-1 border-b border-black/15">
                    <span>Quản lý danh sách đoạn văn ({paragraphs.length} đoạn)</span>
                    <button
                      type="button"
                      onClick={handleAddParagraph}
                      className="neo-btn-sm px-2.5 py-1 bg-[#4ADE80] text-black text-[11px] font-bold"
                    >
                      + Thêm đoạn văn mới
                    </button>
                  </div>

                  {paragraphs.length === 0 ? (
                    <div className="p-4 text-center text-xs font-mono text-neutral-400">
                      Chưa có đoạn văn nào. Bấm "+ Thêm đoạn văn mới" để bắt đầu.
                    </div>
                  ) : (
                    paragraphs.map((pText, pIdx) => {
                      const pSentences = segmentSentences(pText);
                      const pWords = pText.trim() ? pText.trim().split(/\s+/).length : 0;
                      return (
                        <div key={pIdx} className="p-2.5 bg-[#FFFDF0] border border-black space-y-1.5">
                          <div className="flex items-center justify-between text-[11px] font-mono">
                            <span className="font-bold text-black flex items-center gap-1.5">
                              <span className="w-2 h-2 bg-[#FF3838] inline-block"></span>
                              Đoạn #{pIdx + 1} ({pSentences.length} câu • {pWords} từ)
                            </span>

                            <div className="flex items-center gap-1">
                              {pIdx > 0 && (
                                <button
                                  type="button"
                                  onClick={() => handleMergeParagraphWithPrev(pIdx)}
                                  className="text-[10px] px-1.5 py-0.5 bg-neutral-100 hover:bg-neutral-200 border border-black"
                                  title="Gộp nội dung này vào đoạn phía trên"
                                >
                                  Gộp với đoạn #{pIdx}
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleRemoveParagraph(pIdx)}
                                className="text-[10px] px-1.5 py-0.5 bg-red-100 hover:bg-red-200 text-red-700 border border-black"
                                title="Xóa đoạn văn này"
                              >
                                Xóa đoạn
                              </button>
                            </div>
                          </div>

                          <textarea
                            rows={3}
                            value={pText}
                            onChange={e => handleUpdateParagraph(pIdx, e.target.value)}
                            placeholder={`Nội dung đoạn văn #${pIdx + 1}...`}
                            className="neo-input w-full text-xs font-reading leading-relaxed"
                          ></textarea>
                        </div>
                      );
                    })
                  )}

                  <button
                    type="button"
                    onClick={handleAddParagraph}
                    className="neo-btn w-full py-1.5 bg-[#FFE500] text-black text-xs font-bold"
                  >
                    + Thêm đoạn văn mới
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Provenance & Rights */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono font-bold uppercase mb-1">
                Attribution / Provenance
              </label>
              <input
                type="text"
                placeholder="e.g. BBC Learning English / Personal Notes"
                value={provenance}
                onChange={e => setProvenance(e.target.value)}
                className="neo-input w-full text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-mono font-bold uppercase mb-1">
                Rights Basis
              </label>
              <input
                type="text"
                placeholder="e.g. Original Text / Fair Educational Use"
                value={rightsBasis}
                onChange={e => setRightsBasis(e.target.value)}
                className="neo-input w-full text-xs"
              />
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="bg-neutral-100 border-t-3 border-black p-4 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="neo-btn px-4 py-2 bg-white text-black text-xs uppercase"
          >
            Cancel
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={isSaving}
              onClick={() => handleSave('draft')}
              className="neo-btn px-4 py-2 bg-[#FFE500] text-black text-xs uppercase font-bold"
            >
              Save as Draft
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={() => handleSave('published')}
              className="neo-btn px-5 py-2 bg-[#FF3838] text-white text-xs uppercase font-black"
            >
              <Check size={14} className="mr-1.5" />
              Publish Directly
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
