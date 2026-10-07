/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { User } from 'firebase/auth';
import { signInTeacherWithGoogle, logOut } from '../firebase';
import { BookOpen, LogOut, User as UserIcon, GraduationCap, Monitor } from 'lucide-react';

interface NavbarProps {
  currentView: 'teacher' | 'student';
  onSwitchView: (view: 'teacher' | 'student') => void;
  user: User | null;
  activeRoomId?: string | null;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onSwitchView,
  user,
  activeRoomId,
}) => {
  const handleGoogleSignIn = async () => {
    try {
      await signInTeacherWithGoogle();
    } catch (err: any) {
      console.error('Google Sign-In failed:', err);
    }
  };

  const handleSignOut = async () => {
    try {
      await logOut();
    } catch (err: any) {
      console.error('Sign Out failed:', err);
    }
  };

  return (
    <header className="border-b border-black bg-white sticky top-0 z-40 shadow-[0_1px_0px_#000000]">
      <div className="max-w-6xl mx-auto px-3 sm:px-4 py-1.5 sm:py-2 flex items-center justify-between gap-2">
        {/* Brand Logo - Compact Minimal */}
        <div className="flex items-center gap-2">
          <div className="flex items-center">
            <span className="bg-[#FF3838] text-white font-black text-sm sm:text-base px-2 py-0.5 border border-black shadow-[1.5px_1.5px_0px_#000] tracking-wide">
              CHUNKS
            </span>
            <span className="bg-[#FFE500] text-black font-mono font-bold text-[11px] px-1.5 py-0.5 border-y border-r border-black uppercase hidden xs:inline-block">
              Reading
            </span>
          </div>

          {activeRoomId && (
            <span className="neo-badge bg-[#00D2FF] text-black text-[9px] hidden sm:inline-flex py-0.5 px-1.5">
              ROOM: {activeRoomId}
            </span>
          )}
        </div>

        {/* View Switcher Tabs - Minimal */}
        <div className="flex border border-black bg-[#FAF8F0] p-0.5 shadow-[1px_1px_0px_#000]">
          <button
            type="button"
            onClick={() => onSwitchView('teacher')}
            className={`px-2 py-0.5 text-[11px] font-mono font-bold uppercase flex items-center gap-1 transition-all ${
              currentView === 'teacher'
                ? 'bg-[#FF3838] text-white shadow-[1px_1px_0px_#000]'
                : 'text-neutral-700 hover:text-black'
            }`}
          >
            <GraduationCap size={13} /> Teacher
          </button>
          <button
            type="button"
            onClick={() => onSwitchView('student')}
            className={`px-2 py-0.5 text-[11px] font-mono font-bold uppercase flex items-center gap-1 transition-all ${
              currentView === 'student'
                ? 'bg-[#FFE500] text-black shadow-[1px_1px_0px_#000]'
                : 'text-neutral-700 hover:text-black'
            }`}
          >
            <Monitor size={13} /> Learner Desk
          </button>
        </div>

        {/* Teacher Auth / Profile Area */}
        <div className="flex items-center gap-2">
          {user ? (
            <div className="flex items-center gap-1.5">
              <div className="flex items-center gap-1.5 bg-[#FFFDF0] border border-black px-2 py-0.5 text-[11px] font-mono">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'Teacher'}
                    className="w-5 h-5 rounded-none border border-black"
                  />
                ) : (
                  <UserIcon size={13} className="text-black" />
                )}
                <span className="font-bold text-black max-w-[100px] truncate hidden sm:inline">
                  {user.displayName || user.email || 'Teacher'}
                </span>
              </div>
              <button
                type="button"
                onClick={handleSignOut}
                className="neo-btn-sm p-1 bg-neutral-100 text-black hover:bg-red-50 hover:text-red-700"
                title="Sign Out"
              >
                <LogOut size={13} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleGoogleSignIn}
              className="neo-btn-sm px-2.5 py-1 bg-white text-black text-[11px] font-bold font-mono uppercase flex items-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Teacher Login</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
