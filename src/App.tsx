import { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { TeacherView } from './components/TeacherView';
import { StudentView } from './components/StudentView';
import { JoinModal } from './components/JoinModal';
import { SAMPLE_ARTICLES } from './data/sampleArticles';
import { useRoomSession } from './hooks/useRoomSession';
import { 
  subscribeToAuthState, 
  signInTeacherWithGoogle, 
  signInLearnerAnonymously, 
  signOutCurrentUser,
  type AuthUserProfile 
} from './services/authService';
import type { RoomState, Article } from './types';

const INITIAL_ROOM: RoomState = {
  id: 'room-demo',
  code: 'CHUNK-88',
  articleId: SAMPLE_ARTICLES[0].id,
  unitMode: 'sentence',
  unitIndex: 0,
  highlightEnabled: true,
  timing: {
    policy: 'hold_then_erase',
    holdMs: 3000,
    eraseMs: 1000,
  },
  guideEnabled: true,
  eraserEffect: 'eraser',
  status: 'waiting',
  revision: 1,
  staged: {
    articleId: SAMPLE_ARTICLES[0].id,
    unitMode: 'sentence',
    unitIndex: 0,
    highlightEnabled: true,
    timing: {
      policy: 'hold_then_erase',
      holdMs: 3000,
      eraseMs: 1000,
    },
    guideEnabled: true,
    eraserEffect: 'eraser',
  },
};

export function App() {
  const [currentView, setCurrentView] = useState<'teacher' | 'student'>('teacher');
  const [articles, setArticles] = useState<Article[]>(SAMPLE_ARTICLES);
  const [selectedArticleId, setSelectedArticleId] = useState<string>(SAMPLE_ARTICLES[0].id);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<AuthUserProfile | null>(null);

  const { roomState, learnerSnapshot, updateStaged, dispatchCommand } = useRoomSession(
    INITIAL_ROOM,
    articles
  );

  useEffect(() => {
    const unsubscribe = subscribeToAuthState((profile) => {
      setCurrentUser(profile);
      if (profile && profile.role === 'learner') {
        setCurrentView('student');
      }
    });
    return () => unsubscribe();
  }, []);

  const currentArticle = articles.find(a => a.id === selectedArticleId) || articles[0];

  const handleUpdateRoom = (updater: Partial<RoomState>) => {
    if (updater.staged) {
      updateStaged(updater.staged);
    }
    if (updater.status && updater.status !== roomState.status) {
      if (updater.status === 'reading') dispatchCommand('PLAY');
      else if (updater.status === 'paused') dispatchCommand('PAUSE');
      else if (updater.status === 'manual_show') dispatchCommand('SHOW');
      else if (updater.status === 'waiting') dispatchCommand('HIDE');
      else if (updater.status === 'ended') dispatchCommand('END');
    }
  };

  const handleJoinAsLearner = async (name: string, roomCode: string) => {
    await signInLearnerAnonymously(name);
    setCurrentView('student');
  };

  const handleSignInTeacher = async () => {
    await signInTeacherWithGoogle();
    setCurrentView('teacher');
  };

  const handleSaveNewArticle = (newArticle: Article) => {
    setArticles((prev: Article[]) => [newArticle, ...prev]);
    setSelectedArticleId(newArticle.id);
  };

  return (
    <div className="min-h-screen bg-[var(--color-surface)] flex flex-col justify-between">
      <Navbar
        currentView={currentView}
        onViewChange={setCurrentView}
        roomCode={roomState.code}
        currentUser={currentUser}
        onOpenJoinModal={() => setIsJoinModalOpen(true)}
        onSignOut={signOutCurrentUser}
      />

      <main className="flex-1">
        {currentView === 'teacher' ? (
          <TeacherView
            roomState={roomState}
            onUpdateRoom={handleUpdateRoom}
            articles={articles}
            currentArticle={currentArticle}
            onSelectArticle={setSelectedArticleId}
            onSaveNewArticle={handleSaveNewArticle}
          />
        ) : (
          <StudentView
            snapshot={learnerSnapshot}
            articleTitle={currentArticle.title}
          />
        )}
      </main>

      <footer className="w-full bg-[var(--color-paper)] border-t border-[var(--color-border)] py-4 px-6 text-center text-xs text-[var(--color-muted)]">
        <div className="flex flex-col sm:flex-row items-center justify-between max-w-6xl mx-auto gap-2">
          <div>
            <span>© 2026 Chunks Reading — Teacher-Controlled English Reading</span>
          </div>
          <div className="flex items-center space-x-3">
            <span>Hosting: <strong className="text-[var(--color-ink)]">chunks-reading.web.app</strong></span>
            <span>•</span>
            <span>App: <strong className="text-[var(--color-ink)]">chunks-reading</strong></span>
          </div>
        </div>
      </footer>

      <JoinModal
        isOpen={isJoinModalOpen}
        onClose={() => setIsJoinModalOpen(false)}
        onJoinAsLearner={handleJoinAsLearner}
        onSignInTeacher={handleSignInTeacher}
        initialRoomCode={roomState.code}
      />
    </div>
  );
}

export default App;
