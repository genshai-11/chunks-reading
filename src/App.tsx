import { useState } from 'react';
import { Navbar } from './components/Navbar';
import { TeacherView } from './components/TeacherView';
import { StudentView } from './components/StudentView';
import { SAMPLE_ARTICLES } from './data/sampleArticles';
import type { RoomState } from './types';

export function App() {
  const [currentView, setCurrentView] = useState<'teacher' | 'student'>('teacher');
  const [articles] = useState(SAMPLE_ARTICLES);
  const [selectedArticleId, setSelectedArticleId] = useState<string>(SAMPLE_ARTICLES[0].id);

  const [roomState, setRoomState] = useState<RoomState>({
    id: 'room-demo',
    code: 'CHUNK-88',
    articleId: SAMPLE_ARTICLES[0].id,
    unitMode: 'sentence',
    unitIndex: 0,
    highlightEnabled: true,
    timingMode: 'fixed',
    holdDurationSec: 5,
    eraseDurationSec: 3,
    effect: 'guide',
    status: 'idle',
    revision: 1,
  });

  const handleUpdateRoom = (updater: Partial<RoomState>) => {
    setRoomState(prev => ({
      ...prev,
      ...updater,
    }));
  };

  const currentArticle = articles.find(a => a.id === selectedArticleId) || articles[0];

  return (
    <div className="min-h-screen bg-[#F8F5EE] flex flex-col justify-between">
      <Navbar
        currentView={currentView}
        onViewChange={setCurrentView}
        roomCode={roomState.code}
      />

      <main className="flex-1">
        {currentView === 'teacher' ? (
          <TeacherView
            roomState={roomState}
            onUpdateRoom={handleUpdateRoom}
            articles={articles}
            currentArticle={currentArticle}
            onSelectArticle={setSelectedArticleId}
          />
        ) : (
          <StudentView
            roomState={roomState}
            currentArticle={currentArticle}
          />
        )}
      </main>

      <footer className="w-full bg-[#FAF7F2] border-t border-[#E2DBD0] py-4 px-6 text-center text-xs text-[#5C6761]">
        <div className="flex flex-col sm:flex-row items-center justify-between max-w-6xl mx-auto gap-2">
          <div>
            <span>© 2026 Chunks Reading — Đọc Tương Tác Cùng Nhịp</span>
          </div>
          <div className="flex items-center space-x-3">
            <span>Firebase Hosting: <strong>chunks-reading.web.app</strong></span>
            <span>•</span>
            <span>Firebase App: <strong>chunks-reading-web</strong></span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
