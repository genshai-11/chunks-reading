import React from 'react';
import { BookOpen, Users, Radio, Sparkles } from 'lucide-react';

interface NavbarProps {
  currentView: 'teacher' | 'student';
  onViewChange: (view: 'teacher' | 'student') => void;
  roomCode: string;
}

export const Navbar: React.FC<NavbarProps> = ({ currentView, onViewChange, roomCode }) => {
  return (
    <header className="w-full bg-[#FAF7F2] border-b border-[#E2DBD0] sticky top-0 z-50 px-4 sm:px-8 py-3 flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <img
          src="/logo.png"
          alt="Chunks Reading Logo"
          className="h-10 w-auto object-contain rounded-md shadow-xs"
          onError={(e) => {
            // Fallback if logo not found
            (e.target as HTMLElement).style.display = 'none';
          }}
        />
        <div>
          <span className="font-serif text-xl sm:text-2xl font-bold tracking-tight text-[#1F2421]">
            Chunks Reading
          </span>
          <span className="hidden sm:inline-block ml-2 text-xs font-medium px-2 py-0.5 rounded-full bg-[#EAE3D2] text-[#3D4D41]">
            Nhịp đọc tương tác
          </span>
        </div>
      </div>

      <div className="flex items-center space-x-2 sm:space-x-4">
        {/* Room Code Badge */}
        <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-[#F0ECE1] border border-[#DDD5C7] text-xs font-medium text-[#285238]">
          <Radio className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
          <span>Phòng:</span>
          <span className="font-mono font-bold tracking-wider">{roomCode}</span>
        </div>

        {/* View Switcher */}
        <div className="flex rounded-lg bg-[#ECE6D9] p-1 border border-[#DDD5C7]">
          <button
            onClick={() => onViewChange('teacher')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs sm:text-sm font-semibold transition-all ${
              currentView === 'teacher'
                ? 'bg-[#285238] text-white shadow-xs'
                : 'text-[#5C6761] hover:text-[#1F2421]'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Giáo viên</span>
          </button>
          <button
            onClick={() => onViewChange('student')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs sm:text-sm font-semibold transition-all ${
              currentView === 'student'
                ? 'bg-[#285238] text-white shadow-xs'
                : 'text-[#5C6761] hover:text-[#1F2421]'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Học viên</span>
          </button>
        </div>

        {/* Firebase Connected Indicator */}
        <div className="hidden md:flex items-center space-x-1 text-[11px] text-[#5C6761] bg-white px-2.5 py-1 rounded-md border border-[#E2DBD0]">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>Firebase: <strong className="text-[#285238]">chunks-reading</strong></span>
        </div>
      </div>
    </header>
  );
};
