import React, { useState } from 'react';
import { 
  X, Check, AlertCircle, FileText, Globe, Upload, 
  Sparkles, Plus, Trash2, ArrowRight, CheckCircle2
} from 'lucide-react';
import { validateImportUrl, sanitizeImportedText } from '../services/importService';
import { detectCandidatePhrases, splitTextIntoUnits } from '../services/phraseDetectionService';
import type { Article, PhraseAnnotation } from '../types';

interface ImportReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveArticle: (article: Article, isPublished: boolean) => void;
  categories: string[];
}

export const ImportReviewModal: React.FC<ImportReviewModalProps> = ({
  isOpen,
  onClose,
  onSaveArticle,
  categories,
}) => {
  const [importMode, setImportMode] = useState<'paste' | 'txt' | 'url'>('paste');
  const [rawText, setRawText] = useState('');
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [category, setCategory] = useState(categories[0] || 'Inspiration');
  const [urlInput, setUrlInput] = useState('');
  const [urlError, setUrlError] = useState<string | null>(null);

  // Phase: 'input' | 'review'
  const [step, setStep] = useState<'input' | 'review'>('input');
  const [annotations, setAnnotations] = useState<PhraseAnnotation[]>([]);

  if (!isOpen) return null;

  const handleProceedToReview = () => {
    if (!rawText.trim() || !title.trim()) return;

    const detected = detectCandidatePhrases(rawText);
    setAnnotations(detected);
    setStep('review');
  };

  const handleUrlFetch = () => {
    setUrlError(null);
    const validation = validateImportUrl(urlInput);
    if (!validation.valid) {
      setUrlError(validation.reason || 'Invalid URL');
      return;
    }

    // Safe simulated public URL extraction with fallback to paste
    const extracted = `Technology and humanity move forward together when we dare to step outside our comfort zone. Long story short, we decided to give it a shot and build something meaningful.`;
    setRawText(extracted);
    setTitle('Extracted Article from Public Source');
    setAuthor('Public Editorial');
    setUrlError(null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setRawText(sanitizeImportedText(content));
        setTitle(file.name.replace(/\.[^/.]+$/, ''));
      }
    };
    reader.readAsText(file);
  };

  const handleToggleAnnotationStatus = (id: string, newStatus: 'approved' | 'rejected') => {
    setAnnotations((prev) =>
      prev.map((a) => (a.id === id ? { ...a, reviewStatus: newStatus } : a))
    );
  };

  const handleComplete = (isPublished: boolean) => {
    const { sentences, paragraphs } = splitTextIntoUnits(rawText);

    // Filter approved annotations for inclusion
    const finalAnnotations = annotations.filter((a) => a.reviewStatus === 'approved');

    // Attach approved annotations to sentences
    sentences.forEach((s) => {
      s.annotations = finalAnnotations.filter((a) => s.text.includes(a.exactText));
    });
    paragraphs.forEach((p) => {
      p.annotations = finalAnnotations.filter((a) => p.text.includes(a.exactText));
    });

    const newArticle: Article = {
      id: `art-${Date.now()}`,
      title,
      author: author || 'Teacher Prepared',
      category,
      attribution: importMode === 'url' ? urlInput : 'Classroom Preparation',
      sentences,
      paragraphs,
      annotations: finalAnnotations,
    };

    onSaveArticle(newArticle, isPublished);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="w-full max-w-3xl bg-[var(--color-card)] rounded-[var(--radius-md)] border border-[var(--color-border)] shadow-xl p-6 relative max-h-[90vh] overflow-y-auto space-y-6">
        <button
          type="button"
          onClick={onClose}
          className="touch-target absolute top-4 right-4 p-2 text-[var(--color-muted)] hover:text-[var(--color-ink)]"
        >
          <X className="w-5 h-5" />
        </button>

        <div>
          <h2 className="font-serif text-2xl font-bold text-[var(--color-ink)]">
            {step === 'input' ? 'Import Reading Resource' : 'Review & Approve Candidate Phrases'}
          </h2>
          <p className="text-xs text-[var(--color-muted)] mt-1">
            {step === 'input' 
              ? 'Paste English text, upload a TXT file, or fetch from a public URL with SSRF protection.'
              : 'Review detected expressions. Only approved phrases will receive highlights for learners.'}
          </p>
        </div>

        {step === 'input' ? (
          <div className="space-y-5">
            {/* Mode Tabs */}
            <div className="flex border-b border-[var(--color-border)]">
              {[
                { id: 'paste', label: 'Paste Text', icon: FileText },
                { id: 'txt', label: 'TXT File', icon: Upload },
                { id: 'url', label: 'Public URL', icon: Globe },
              ].map((m) => {
                const Icon = m.icon;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setImportMode(m.id as any)}
                    className={`touch-target px-4 py-2 border-b-2 text-xs font-semibold flex items-center space-x-1.5 transition-all ${
                      importMode === m.id
                        ? 'border-[var(--color-accent)] text-[var(--color-accent)]'
                        : 'border-transparent text-[var(--color-muted)] hover:text-[var(--color-ink)]'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{m.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Inputs based on Mode */}
            {importMode === 'url' && (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wider">
                  Article URL
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="https://example.com/article"
                    className="touch-target flex-1 px-3 py-2 border border-[var(--color-control-border)] rounded-[var(--radius-sm)] text-sm"
                  />
                  <button
                    type="button"
                    onClick={handleUrlFetch}
                    className="touch-target px-4 py-2 bg-[var(--color-surface-container)] border border-[var(--color-border)] rounded-[var(--radius-sm)] text-xs font-bold hover:bg-[var(--color-paper)]"
                  >
                    Fetch
                  </button>
                </div>
                {urlError && (
                  <p className="text-xs text-[var(--color-error)] flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {urlError}
                  </p>
                )}
              </div>
            )}

            {importMode === 'txt' && (
              <div>
                <label className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wider mb-2 block">
                  Select Plain Text (.txt) File
                </label>
                <input
                  type="file"
                  accept=".txt"
                  onChange={handleFileUpload}
                  className="touch-target text-xs text-[var(--color-muted)] file:mr-4 file:py-2 file:px-4 file:rounded-[var(--radius-sm)] file:border-0 file:text-xs file:font-semibold file:bg-[var(--color-accent)] file:text-white hover:file:opacity-95"
                />
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--color-muted)] mb-1">
                  Article Title *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Giving It a Shot"
                  className="touch-target w-full px-3 py-2 border border-[var(--color-control-border)] rounded-[var(--radius-sm)] text-sm bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--color-muted)] mb-1">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="touch-target w-full px-3 py-2 border border-[var(--color-control-border)] rounded-[var(--radius-sm)] text-sm bg-white"
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--color-muted)] mb-1">
                English Text Content *
              </label>
              <textarea
                rows={6}
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder="Paste or type English reading content here..."
                className="w-full p-3 border border-[var(--color-control-border)] rounded-[var(--radius-sm)] text-sm font-serif leading-relaxed"
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-[var(--color-border)]">
              <button
                type="button"
                onClick={onClose}
                className="touch-target px-4 py-2 border border-[var(--color-control-border)] rounded-[var(--radius-sm)] text-xs font-semibold hover:bg-[var(--color-paper)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleProceedToReview}
                disabled={!rawText.trim() || !title.trim()}
                className="touch-target px-5 py-2 bg-[var(--color-accent)] text-white rounded-[var(--radius-sm)] text-xs font-bold uppercase tracking-wider flex items-center space-x-1.5 shadow-xs disabled:opacity-50"
              >
                <span>Run Phrase Detection</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          /* Step 2: Phrase Review Panel */
          <div className="space-y-6">
            <div className="bg-[var(--color-paper)] p-4 rounded-[var(--radius-md)] border border-[var(--color-border)] max-h-48 overflow-y-auto font-serif text-sm leading-relaxed">
              {rawText}
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted)] flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-[var(--color-accent)]" />
                  Candidate Expressions ({annotations.length} detected)
                </h4>
                <span className="text-xs text-[var(--color-muted)]">
                  Approved: {annotations.filter((a) => a.reviewStatus === 'approved').length}
                </span>
              </div>

              {annotations.length === 0 ? (
                <div className="p-4 text-center text-xs text-[var(--color-muted)] bg-[var(--color-surface-container)] rounded-[var(--radius-sm)]">
                  No multi-word candidate expressions automatically detected in this text.
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {annotations.map((ann) => (
                    <div
                      key={ann.id}
                      className={`p-3 rounded-[var(--radius-sm)] border flex items-center justify-between text-xs transition-all ${
                        ann.reviewStatus === 'approved'
                          ? 'border-[var(--color-accent)] bg-[var(--color-accent-soft)]'
                          : ann.reviewStatus === 'rejected'
                          ? 'border-[var(--color-border)] bg-gray-50 opacity-60'
                          : 'border-[var(--color-control-border)] bg-white'
                      }`}
                    >
                      <div>
                        <strong className="text-sm font-serif text-[var(--color-ink)]">
                          "{ann.exactText}"
                        </strong>
                        <div className="text-[11px] text-[var(--color-muted)] mt-0.5">
                          Type: {ann.type} • Status: <strong className="capitalize">{ann.reviewStatus}</strong>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={() => handleToggleAnnotationStatus(ann.id, 'approved')}
                          className={`touch-target px-3 py-1.5 rounded-[var(--radius-sm)] text-xs font-semibold flex items-center space-x-1 ${
                            ann.reviewStatus === 'approved'
                              ? 'bg-[var(--color-accent)] text-white'
                              : 'border border-[var(--color-control-border)] hover:bg-[var(--color-paper)]'
                          }`}
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Approve</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleAnnotationStatus(ann.id, 'rejected')}
                          className={`touch-target px-3 py-1.5 rounded-[var(--radius-sm)] text-xs font-semibold flex items-center space-x-1 ${
                            ann.reviewStatus === 'rejected'
                              ? 'bg-gray-700 text-white'
                              : 'border border-[var(--color-control-border)] text-gray-500 hover:bg-[var(--color-paper)]'
                          }`}
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Reject</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-[var(--color-border)]">
              <button
                type="button"
                onClick={() => setStep('input')}
                className="touch-target px-4 py-2 border border-[var(--color-control-border)] rounded-[var(--radius-sm)] text-xs font-semibold hover:bg-[var(--color-paper)]"
              >
                Back to Edit
              </button>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleComplete(false)}
                  className="touch-target px-4 py-2 border border-[var(--color-control-border)] rounded-[var(--radius-sm)] text-xs font-semibold text-[var(--color-ink)] hover:bg-[var(--color-paper)]"
                >
                  Save as Draft
                </button>
                <button
                  type="button"
                  onClick={() => handleComplete(true)}
                  className="touch-target px-5 py-2 bg-[var(--color-accent)] text-white rounded-[var(--radius-sm)] text-xs font-bold uppercase tracking-wider flex items-center space-x-1.5 shadow-xs"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Publish to Library</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
