import React, { useState } from 'react';
import { 
  BookOpen, Plus, Search, Filter, Tag, CheckCircle2, 
  Clock, ArrowRight, Upload, Sparkles 
} from 'lucide-react';
import type { Article } from '../types';

interface LibraryViewProps {
  articles: Article[];
  selectedArticleId: string;
  onSelectArticle: (articleId: string) => void;
  onOpenImportModal: () => void;
  categories: string[];
  onAddCategory: (category: string) => void;
}

export const LibraryView: React.FC<LibraryViewProps> = ({
  articles,
  selectedArticleId,
  onSelectArticle,
  onOpenImportModal,
  categories,
  onAddCategory,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [newCatName, setNewCatName] = useState('');
  const [isAddingCat, setIsAddingCat] = useState(false);

  const filtered = articles.filter((art) => {
    const matchesCategory = selectedCategory === 'All' || art.category === selectedCategory;
    const matchesSearch = 
      art.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      art.author.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (newCatName.trim()) {
      onAddCategory(newCatName.trim());
      setNewCatName('');
      setIsAddingCat(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Action & Search Bar */}
      <div className="bg-[var(--color-card)] p-5 rounded-[var(--radius-md)] border border-[var(--color-border)] shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-3 text-[var(--color-muted)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search resources by title or author..."
            className="touch-target w-full pl-9 pr-3 py-2 text-sm border border-[var(--color-control-border)] rounded-[var(--radius-sm)] bg-white text-[var(--color-ink)]"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Add Category Toggle */}
          <button
            type="button"
            onClick={() => setIsAddingCat(!isAddingCat)}
            className="touch-target px-3.5 py-2 border border-[var(--color-control-border)] rounded-[var(--radius-sm)] text-xs font-semibold text-[var(--color-ink)] hover:bg-[var(--color-paper)] flex items-center space-x-1.5"
          >
            <Plus className="w-4 h-4 text-[var(--color-accent)]" />
            <span>New Category</span>
          </button>

          {/* Import Resource Button */}
          <button
            type="button"
            onClick={onOpenImportModal}
            className="touch-target px-4 py-2 bg-[var(--color-accent)] text-white rounded-[var(--radius-sm)] text-xs font-bold uppercase tracking-wider flex items-center space-x-1.5 shadow-xs hover:opacity-95"
          >
            <Upload className="w-4 h-4" />
            <span>Import Resource</span>
          </button>
        </div>
      </div>

      {/* Category Creation Inline Form */}
      {isAddingCat && (
        <form onSubmit={handleCreateCategory} className="p-4 bg-[var(--color-surface-container)] rounded-[var(--radius-md)] border border-[var(--color-border)] flex items-center gap-3">
          <input
            type="text"
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            placeholder="New Category Name (e.g. Science & Nature)"
            className="touch-target flex-1 px-3 py-1.5 text-sm border border-[var(--color-control-border)] rounded-[var(--radius-sm)] bg-white"
          />
          <button
            type="submit"
            className="touch-target px-4 py-1.5 bg-[var(--color-accent)] text-white text-xs font-bold uppercase tracking-wider rounded-[var(--radius-sm)]"
          >
            Add
          </button>
          <button
            type="button"
            onClick={() => setIsAddingCat(false)}
            className="touch-target px-3 py-1.5 border border-[var(--color-control-border)] text-xs font-semibold rounded-[var(--radius-sm)]"
          >
            Cancel
          </button>
        </form>
      )}

      {/* Category & Status Filter Pills */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wider mr-1 flex items-center gap-1">
          <Filter className="w-3.5 h-3.5" /> Category:
        </span>
        {['All', ...categories].map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setSelectedCategory(cat)}
            className={`touch-target px-3 py-1 rounded-[var(--radius-sm)] text-xs font-medium transition-all ${
              selectedCategory === cat
                ? 'bg-[var(--color-accent)] text-white font-semibold'
                : 'bg-[var(--color-card)] text-[var(--color-ink)] border border-[var(--color-border)] hover:bg-[var(--color-paper)]'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Resource Grid / List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((art) => (
          <div
            key={art.id}
            className={`p-5 rounded-[var(--radius-md)] border card-surface flex flex-col justify-between transition-all ${
              art.id === selectedArticleId
                ? 'border-[var(--color-accent)] ring-1 ring-[var(--color-accent)]'
                : 'border-[var(--color-border)]'
            }`}
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-[var(--radius-sm)] bg-[var(--color-surface-container)] text-[var(--color-ink)]">
                  {art.category}
                </span>
                <span className="text-xs text-[var(--color-muted)] font-mono">
                  {art.sentences.length} sentences • {art.paragraphs.length} paragraphs
                </span>
              </div>

              <h4 className="font-serif text-lg font-bold text-[var(--color-ink)] leading-snug">
                {art.title}
              </h4>

              <div className="text-xs text-[var(--color-muted)]">
                Author: <strong className="text-[var(--color-ink)]">{art.author}</strong>
                {art.attribution && <span> • {art.attribution}</span>}
              </div>

              {art.annotations.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {art.annotations.map((ann) => (
                    <span key={ann.id} className="text-[11px] px-2 py-0.5 rounded-[var(--radius-sm)] bg-[var(--color-phrase)] text-[var(--color-phrase-text)] font-medium">
                      {ann.exactText}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-4 mt-4 border-t border-[var(--color-border)] flex items-center justify-between">
              <span className="inline-flex items-center space-x-1 text-xs text-emerald-700">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Published Version</span>
              </span>

              <button
                type="button"
                onClick={() => onSelectArticle(art.id)}
                className={`touch-target px-3.5 py-1.5 rounded-[var(--radius-sm)] text-xs font-semibold flex items-center space-x-1.5 transition-all ${
                  art.id === selectedArticleId
                    ? 'bg-emerald-700 text-white'
                    : 'border border-[var(--color-control-border)] text-[var(--color-ink)] hover:bg-[var(--color-paper)]'
                }`}
              >
                <span>{art.id === selectedArticleId ? 'Active in Room' : 'Select for Room'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
