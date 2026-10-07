import React from 'react';
import { BookOpen, Users, Radio, Sparkles, LogIn, LogOut, UserCheck } from 'lucide-react';
import type { AuthUserProfile } from '../services/authService';

interface NavbarProps {
  currentView: 'teacher' | 'student';
  onViewChange: (view: 'teacher' | 'student') => void;
  roomCode: string;
  currentUser?: AuthUserProfile | null;
  onOpenJoinModal?: () => void;
  onSignOut?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ 
  currentView, 
  onViewChange, 
  roomCode,
  currentUser,
  onOpenJoinModal,
  onSignOut,
}) => {
  return (
    <header className="w-full bg-[var(--color-paper)] border-b border-[var(--color-border)] sticky top-0 z-50 px-4 sm:px-8 py-3 flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <img
          src="/logo.png"
          alt="Chunks Reading Logo"
          className="h-10 w-auto object-contain rounded-[var(--radius-sm)] shadow-xs"
        />
        <div className="flex flex-col sm:flex-row sm:items-baseline">
          <span className="font-serif text-xl sm:text-2xl font-bold tracking-tight text-[var(--color-ink)]">
            Chunks Reading
          </span>
          <span className="hidden sm:inline-block sm:ml-2.5 text-xs font-medium px-2 py-0.5 rounded-[var(--radius-sm)] bg-[var(--color-surface-container)] text-[var(--color-muted)]">
            Teacher-Controlled Reading
          </span>
        </div>
      </div>

      <div className="flex items-center space-x-2 sm:space-x-4">
        {/* Room Code Badge */}
        <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-[var(--radius-sm)] bg-[var(--color-card)] border border-[var(--color-border)] text-xs font-medium text-[var(--color-ink)]">
          <Radio className="w-3.5 h-3.5 text-[var(--color-accent)] animate-pulse" />
          <span className="text-[var(--color-muted)]">Room:</span>
          <span className="font-mono font-bold tracking-wider">{roomCode}</span>
        </div>

        {/* View Switcher with min 44px touch target */}
        <div className="flex rounded-[var(--radius-sm)] bg-[var(--color-surface-container)] p-1 border border-[var(--color-border)]">
          <button
            type="button"
            onClick={() => onViewChange('teacher')}
            className={`touch-target flex items-center space-x-1.5 px-3 py-1.5 rounded-[var(--radius-sm)] text-xs sm:text-sm font-semibold transition-all ${
              currentView === 'teacher'
                ? 'bg-[var(--color-accent)] text-white shadow-xs'
                : 'text-[var(--color-muted)] hover:text-[var(--color-ink)]'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Teacher</span>
          </button>
          <button
            type="button"
            onClick={() => onViewChange('student')}
            className={`touch-target flex items-center space-x-1.5 px-3 py-1.5 rounded-[var(--radius-sm)] text-xs sm:text-sm font-semibold transition-all ${
              currentView === 'student'
                ? 'bg-[var(--color-accent)] text-white shadow-xs'
                : 'text-[var(--color-muted)] hover:text-[var(--color-ink)]'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Learner</span>
          </button>
        </div>

        {/* User Identity / Sign-In Button */}
        {currentUser ? (
          <div className="flex items-center space-x-2">
            <div className="hidden md:flex items-center space-x-1.5 text-xs px-2.5 py-1.5 rounded-[var(--radius-sm)] bg-[var(--color-card)] border border-[var(--color-border)]">
              <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span className="font-medium text-[var(--color-ink)] truncate max-w-[120px]">
                {currentUser.displayName || (currentUser.isAnonymous ? 'Guest Learner' : 'Teacher')}
              </span>
            </div>
            {onSignOut && (
              <button
                type="button"
                onClick={onSignOut}
                className="touch-target p-2 rounded-[var(--radius-sm)] border border-[var(--color-border)] text-[var(--color-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-card)]"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        ) : (
          onOpenJoinModal && (
            <button
              type="button"
              onClick={onOpenJoinModal}
              className="touch-target px-3 py-1.5 rounded-[var(--radius-sm)] bg-[var(--color-card)] border border-[var(--color-control-border)] hover:bg-[var(--color-surface-container)] text-xs font-semibold text-[var(--color-ink)] flex items-center space-x-1.5"
            >
              <LogIn className="w-3.5 h-3.5 text-[var(--color-accent)]" />
              <span>Join / Sign In</span>
            </button>
          )
        )}
      </div>
    </header>
  );
};
