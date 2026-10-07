/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth, testConnection, signInTeacherWithGoogle } from './firebase';
import { Navbar } from './components/Navbar';
import { TeacherDashboard } from './components/TeacherDashboard';
import { StudentView } from './components/StudentView';
import { BookOpen, ShieldCheck, Zap, Layers, Sparkles, Check } from 'lucide-react';

function extractRoomFromUrl(): string {
  if (typeof window === 'undefined') return '';
  // Check standard query param ?room= or ?roomId= or ?join=
  const searchParams = new URLSearchParams(window.location.search);
  const roomQuery = searchParams.get('room') || searchParams.get('roomId') || searchParams.get('join');
  if (roomQuery) return roomQuery.trim().toUpperCase();

  // Also check hash fragment e.g. /#/?room=... or /#room=...
  if (window.location.hash) {
    const hash = window.location.hash;
    const qIdx = hash.indexOf('?');
    if (qIdx !== -1) {
      const hashParams = new URLSearchParams(hash.substring(qIdx));
      const hashRoom = hashParams.get('room') || hashParams.get('roomId') || hashParams.get('join');
      if (hashRoom) return hashRoom.trim().toUpperCase();
    } else {
      const match = hash.match(/[#&](?:room|join)=([^&]+)/i);
      if (match && match[1]) return decodeURIComponent(match[1]).trim().toUpperCase();
    }
  }
  return '';
}

export default function App() {
  const [detectedRoom] = useState<string>(() => extractRoomFromUrl());
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [currentView, setCurrentView] = useState<'teacher' | 'student'>(() => {
    return detectedRoom ? 'student' : 'teacher';
  });
  const [initialRoomCode, setInitialRoomCode] = useState<string>(detectedRoom);

  // 1. Initial connection verification on boot
  useEffect(() => {
    testConnection();
  }, []);

  // 2. Auth state listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, currentUser => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsub();
  }, []);

  // 3. Keep initialRoomCode in sync with URL changes
  useEffect(() => {
    const fromUrl = extractRoomFromUrl();
    if (fromUrl) {
      setInitialRoomCode(fromUrl);
      setCurrentView('student');
    }
  }, []);

  const handleOpenLearnerView = (roomCode?: string) => {
    if (roomCode) setInitialRoomCode(roomCode);
    setCurrentView('student');
  };

  return (
    <div className="min-h-screen bg-paper-grid flex flex-col selection:bg-[#FFE500] selection:text-black">
      {/* Neobrutalist Navbar */}
      <Navbar
        currentView={currentView}
        onSwitchView={setCurrentView}
        user={user}
        activeRoomId={initialRoomCode || undefined}
      />

      {/* Main View Area */}
      <main className="flex-1 pb-16">
        {currentView === 'student' ? (
          <StudentView
            initialRoomCode={initialRoomCode}
            onSwitchToTeacher={() => setCurrentView('teacher')}
          />
        ) : authLoading ? (
          <div className="min-h-[60vh] flex items-center justify-center">
            <div className="neo-box p-6 bg-white flex items-center gap-3">
              <span className="w-4 h-4 bg-[#FF3838] border-2 border-black animate-spin inline-block"></span>
              <span className="font-mono font-bold text-sm">Initializing Classroom Network...</span>
            </div>
          </div>
        ) : user ? (
          <TeacherDashboard
            user={user}
            onOpenLearnerView={handleOpenLearnerView}
          />
        ) : (
          /* Teacher Sign-In Hero Screen (Neobrutalism) */
          <div className="max-w-4xl mx-auto px-4 py-12 space-y-10">
            {/* Hero Card */}
            <div className="neo-box-lg bg-white p-8 md:p-12 relative overflow-hidden">
              <div className="absolute top-4 right-4 bg-[#FFE500] text-black font-mono font-black text-xs px-3 py-1 border-2 border-black uppercase shadow-[2px_2px_0px_#000]">
                Teacher-Controlled Assistant
              </div>

              <div className="max-w-2xl space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#FFFDF0] border-2 border-black font-mono font-bold text-xs uppercase">
                  <span className="w-2.5 h-2.5 bg-[#FF3838] border border-black inline-block"></span>
                  Chunks Reading System
                </div>

                <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tight text-black leading-none">
                  Present English Readings at Your Exact Pace
                </h1>

                <p className="font-reading text-lg md:text-xl text-neutral-700 leading-relaxed">
                  Prepare categorized English reading units, review and approve idiomatic phrases, and synchronize timed reading exposure directly to connected learner screens.
                </p>

                <div className="pt-4 flex flex-wrap items-center gap-4">
                  <button
                    type="button"
                    onClick={() => signInTeacherWithGoogle()}
                    className="neo-btn px-6 py-3.5 bg-[#FF3838] text-white text-sm font-black uppercase tracking-wider flex items-center gap-2.5"
                  >
                    <svg className="w-5 h-5 bg-white p-0.5 border border-black" viewBox="0 0 24 24">
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
                    <span>Sign In with Google to Start</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCurrentView('student')}
                    className="neo-btn px-6 py-3.5 bg-[#FFE500] text-black text-sm font-bold uppercase tracking-wider"
                  >
                    Enter as Student
                  </button>
                </div>
              </div>
            </div>

            {/* Feature Highlights Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="neo-box p-5 bg-[#FFFDF0]">
                <div className="w-10 h-10 bg-[#FF3838] text-white flex items-center justify-center font-black text-lg border-2 border-black mb-3">
                  <Zap size={20} />
                </div>
                <h3 className="text-base font-black uppercase text-black mb-1">
                  Paced Timed Eraser
                </h3>
                <p className="text-xs font-mono text-neutral-600 leading-relaxed">
                  Default 3s hold + 1s erase or windowed countdown. Learners see blank paper once erased until you advance.
                </p>
              </div>

              <div className="neo-box p-5 bg-[#FFFDF0]">
                <div className="w-10 h-10 bg-[#FFE500] text-black flex items-center justify-center font-black text-lg border-2 border-black mb-3">
                  <Sparkles size={20} />
                </div>
                <h3 className="text-base font-black uppercase text-black mb-1">
                  Expression Highlights
                </h3>
                <p className="text-xs font-mono text-neutral-600 leading-relaxed">
                  Deterministic matching and optional AI suggestions for idioms, phrasal verbs, and collocations with teacher approval.
                </p>
              </div>

              <div className="neo-box p-5 bg-[#FFFDF0]">
                <div className="w-10 h-10 bg-[#4ADE80] text-black flex items-center justify-center font-black text-lg border-2 border-black mb-3">
                  <ShieldCheck size={20} />
                </div>
                <h3 className="text-base font-black uppercase text-black mb-1">
                  Authoritative Sync
                </h3>
                <p className="text-xs font-mono text-neutral-600 leading-relaxed">
                  Learners join via link without registration. Late joiners and reloads sync to the exact authoritative progress.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Neobrutalist Footer */}
      <footer className="border-t border-black bg-white py-2 px-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-xs font-mono">
          <span className="font-black uppercase tracking-wider">Chunks reading</span>
          <span className="text-neutral-500 text-[11px]">Teacher-Controlled Paced Reading</span>
        </div>
      </footer>
    </div>
  );
}
