import React, { useState } from 'react';
import { LogIn, User, Radio, ArrowRight, X } from 'lucide-react';

interface JoinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJoinAsLearner: (name: string, roomCode: string) => Promise<void>;
  onSignInTeacher: () => Promise<void>;
  initialRoomCode?: string;
}

export const JoinModal: React.FC<JoinModalProps> = ({
  isOpen,
  onClose,
  onJoinAsLearner,
  onSignInTeacher,
  initialRoomCode = '',
}) => {
  const [roomCode, setRoomCode] = useState(initialRoomCode);
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleLearnerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      setError('Please enter your name to join the class.');
      return;
    }
    if (!roomCode.trim()) {
      setError('Please enter a valid room code.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await onJoinAsLearner(displayName.trim(), roomCode.trim().toUpperCase());
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to join room. Please check the code.');
    } finally {
      setLoading(false);
    }
  };

  const handleTeacherGoogle = async () => {
    setLoading(true);
    setError(null);
    try {
      await onSignInTeacher();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Google sign-in was cancelled or failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div 
        role="dialog"
        aria-modal="true"
        aria-labelledby="join-dialog-title"
        className="w-full max-w-md bg-[var(--color-card)] rounded-[var(--radius-md)] border border-[var(--color-border)] shadow-xl p-6 relative space-y-6"
      >
        <button
          type="button"
          onClick={onClose}
          className="touch-target absolute top-4 right-4 p-2 text-[var(--color-muted)] hover:text-[var(--color-ink)]"
          aria-label="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        <div>
          <h2 id="join-dialog-title" className="font-serif text-xl font-bold text-[var(--color-ink)]">
            Enter Classroom
          </h2>
          <p className="text-xs text-[var(--color-muted)] mt-1">
            Join an active reading session as a learner or sign in to manage as teacher.
          </p>
        </div>

        {error && (
          <div className="p-3 text-xs bg-[var(--color-error-container)] text-[var(--color-on-error-container)] rounded-[var(--radius-sm)] border border-[var(--color-error)]">
            {error}
          </div>
        )}

        {/* Learner Join Form */}
        <form onSubmit={handleLearnerSubmit} className="space-y-4">
          <div>
            <label htmlFor="room-code-input" className="block text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wider mb-1">
              Room Code
            </label>
            <div className="relative">
              <Radio className="w-4 h-4 absolute left-3 top-3 text-[var(--color-muted)]" />
              <input
                id="room-code-input"
                type="text"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                placeholder="e.g. CHUNK-88"
                maxLength={20}
                className="touch-target w-full pl-9 pr-3 py-2 text-sm font-mono tracking-wider border border-[var(--color-control-border)] rounded-[var(--radius-sm)] bg-white text-[var(--color-ink)] uppercase"
              />
            </div>
          </div>

          <div>
            <label htmlFor="display-name-input" className="block text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wider mb-1">
              Your Display Name
            </label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3 top-3 text-[var(--color-muted)]" />
              <input
                id="display-name-input"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Alex"
                maxLength={50}
                className="touch-target w-full pl-9 pr-3 py-2 text-sm border border-[var(--color-control-border)] rounded-[var(--radius-sm)] bg-white text-[var(--color-ink)]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="touch-target w-full py-2.5 px-4 rounded-[var(--radius-sm)] bg-[var(--color-accent)] text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center space-x-2 shadow-xs hover:opacity-95 disabled:opacity-50"
          >
            <span>{loading ? 'Joining...' : 'Join as Learner'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="relative flex items-center justify-center py-2">
          <div className="border-t border-[var(--color-border)] w-full" />
          <span className="bg-[var(--color-card)] px-3 text-xs text-[var(--color-muted)] uppercase tracking-wider font-semibold">
            Or
          </span>
        </div>

        {/* Teacher Google Sign-In */}
        <div>
          <button
            type="button"
            onClick={handleTeacherGoogle}
            disabled={loading}
            className="touch-target w-full py-2.5 px-4 rounded-[var(--radius-sm)] border border-[var(--color-control-border)] hover:bg-[var(--color-paper)] text-xs font-semibold text-[var(--color-ink)] flex items-center justify-center space-x-2 transition-all"
          >
            <LogIn className="w-4 h-4 text-[var(--color-accent)]" />
            <span>Continue with Google (Teacher)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
