import React, { useState } from 'react';
import { Radio, Settings2, BookOpen } from 'lucide-react';
import type { RoomState, Article, StagedSettings } from '../types';
import { TeacherLive } from './TeacherLive';
import { TeacherSetup } from './TeacherSetup';
import { LibraryView } from './LibraryView';
import { ImportReviewModal } from './ImportReviewModal';
import { 
  applyStagedToRoom, 
  executePlayCommand, 
  executePauseCommand, 
  executeResumeCommand, 
  executeShowCommand, 
  executeHideCommand,
  updateStagedSettings
} from '../domain/roomCommands';

interface TeacherViewProps {
  roomState: RoomState;
  onUpdateRoom: (updater: Partial<RoomState>) => void;
  articles: Article[];
  currentArticle: Article;
  onSelectArticle: (articleId: string) => void;
  onSaveNewArticle?: (article: Article) => void;
}

export const TeacherView: React.FC<TeacherViewProps> = ({
  roomState,
  onUpdateRoom,
  articles,
  currentArticle,
  onSelectArticle,
  onSaveNewArticle,
}) => {
  const [activeTab, setActiveTab] = useState<'live' | 'setup' | 'library'>('live');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [customCategories, setCustomCategories] = useState<string[]>([
    'Inspiration',
    'TED Talks',
    'News',
    'Literature',
  ]);

  const handleUpdateStaged = (partial: Partial<StagedSettings>) => {
    const updated = updateStagedSettings(roomState, partial);
    onUpdateRoom(updated);
  };

  const handleApplyToRoom = () => {
    const updated = applyStagedToRoom(roomState);
    onUpdateRoom(updated);
  };

  const handlePlay = () => {
    const updated = executePlayCommand(roomState, Date.now());
    onUpdateRoom(updated);
  };

  const handlePause = () => {
    const updated = executePauseCommand(roomState, Date.now());
    onUpdateRoom(updated);
  };

  const handleResume = () => {
    const updated = executeResumeCommand(roomState, Date.now());
    onUpdateRoom(updated);
  };

  const handleShow = () => {
    const updated = executeShowCommand(roomState);
    onUpdateRoom(updated);
  };

  const handleHide = () => {
    const updated = executeHideCommand(roomState);
    onUpdateRoom(updated);
  };

  const handleEndRoom = () => {
    onUpdateRoom({
      status: 'ended',
      startedAt: undefined,
      pausedElapsedMs: undefined,
      revision: roomState.revision + 1,
    });
  };

  const handleAddCategory = (category: string) => {
    if (!customCategories.includes(category)) {
      setCustomCategories((prev) => [...prev, category]);
    }
  };

  const handleSaveArticle = (article: Article, isPublished: boolean) => {
    if (onSaveNewArticle) {
      onSaveNewArticle(article);
    }
    if (isPublished) {
      onSelectArticle(article.id);
      handleUpdateStaged({ articleId: article.id, unitIndex: 0 });
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Teacher Workspace Header & Sub-Navigation */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-[var(--color-border)] gap-4">
        <div>
          <h2 className="font-serif text-2xl font-bold text-[var(--color-ink)]">
            Teacher Workbench
          </h2>
          <p className="text-xs text-[var(--color-muted)] mt-0.5">
            Manage your resource library, reading unit timing, and live presentation authority.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex rounded-[var(--radius-sm)] bg-[var(--color-surface-container)] p-1 border border-[var(--color-border)]">
          <button
            type="button"
            onClick={() => setActiveTab('live')}
            className={`touch-target flex items-center space-x-1.5 px-3.5 py-1.5 rounded-[var(--radius-sm)] text-xs font-semibold transition-all ${
              activeTab === 'live'
                ? 'bg-[var(--color-accent)] text-white shadow-xs'
                : 'text-[var(--color-muted)] hover:text-[var(--color-ink)]'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Live Classroom</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('setup')}
            className={`touch-target flex items-center space-x-1.5 px-3.5 py-1.5 rounded-[var(--radius-sm)] text-xs font-semibold transition-all ${
              activeTab === 'setup'
                ? 'bg-[var(--color-accent)] text-white shadow-xs'
                : 'text-[var(--color-muted)] hover:text-[var(--color-ink)]'
            }`}
          >
            <Settings2 className="w-3.5 h-3.5" />
            <span>Session Setup</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('library')}
            className={`touch-target flex items-center space-x-1.5 px-3.5 py-1.5 rounded-[var(--radius-sm)] text-xs font-semibold transition-all ${
              activeTab === 'library'
                ? 'bg-[var(--color-accent)] text-white shadow-xs'
                : 'text-[var(--color-muted)] hover:text-[var(--color-ink)]'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Resource Library</span>
          </button>
        </div>
      </div>

      {/* Tab Panels */}
      {activeTab === 'live' && (
        <TeacherLive
          roomState={roomState}
          articles={articles}
          currentArticle={currentArticle}
          onSelectArticle={onSelectArticle}
          onUpdateStaged={handleUpdateStaged}
          onApplyToRoom={handleApplyToRoom}
          onPlay={handlePlay}
          onPause={handlePause}
          onResume={handleResume}
          onShow={handleShow}
          onHide={handleHide}
          onEndRoom={handleEndRoom}
        />
      )}

      {activeTab === 'setup' && (
        <TeacherSetup
          roomState={roomState}
          onUpdateStaged={handleUpdateStaged}
          onApplyToRoom={handleApplyToRoom}
          articles={articles}
        />
      )}

      {activeTab === 'library' && (
        <LibraryView
          articles={articles}
          selectedArticleId={roomState.articleId}
          onSelectArticle={(id) => {
            onSelectArticle(id);
            handleUpdateStaged({ articleId: id, unitIndex: 0 });
          }}
          onOpenImportModal={() => setIsImportModalOpen(true)}
          categories={customCategories}
          onAddCategory={handleAddCategory}
        />
      )}

      {/* Import & Phrase Review Modal */}
      <ImportReviewModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSaveArticle={handleSaveArticle}
        categories={customCategories}
      />
    </div>
  );
};
