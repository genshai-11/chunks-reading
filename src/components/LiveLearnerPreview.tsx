/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ReadingUnitText } from './ReadingUnitText';
import { ReadingCountdown } from './ReadingCountdown';
import React, { useState } from 'react';
import { ClassroomRoom, CalculatedTimeline, ApprovedSpan } from '../types';

import { Monitor, Smartphone, Sparkles, Clock, Users, ArrowRight } from 'lucide-react';

interface LiveLearnerPreviewProps {
  room: ClassroomRoom;
  timeline: CalculatedTimeline;
  participantsCount?: number;
}

export const LiveLearnerPreview: React.FC<LiveLearnerPreviewProps> = ({
  room,
  timeline,
  participantsCount = 0,
}) => {
  const [deviceMode, setDeviceMode] = useState<'mobile' | 'desktop'>('mobile');
  const [activeTooltip, setActiveTooltip] = useState<ApprovedSpan | null>(null);

  const currentUnit = room.currentUnit;
  const approvedSpans =
    room.highlightEnabled && currentUnit?.annotations ? currentUnit.annotations : [];


  const isTextVisible =
    timeline.phase === 'hold' ||
    timeline.phase === 'erase' ||
    timeline.phase === 'paused' ||
    timeline.phase === 'manual_show';

  const selectedEffect = room.eraseEffect || 'vaporize';

  return (
    <div className="neo-box-sm p-4 bg-white space-y-3">
      {/* Header with device switcher */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-black pb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-ping"></div>
          <span className="text-xs font-mono font-black uppercase text-black flex items-center gap-1.5">
            <Monitor size={14} className="text-[#FF3838]" /> Live Learner View (Real-time)
          </span>
          <span className="text-[10px] font-mono text-neutral-500 hidden sm:inline">
            Exact view of {participantsCount} connected students
          </span>
        </div>

        <div className="flex items-center gap-1 bg-[#FAF8F0] border border-black p-0.5">
          <button
            type="button"
            onClick={() => setDeviceMode('mobile')}
            className={`px-2 py-0.5 text-[10px] font-mono font-bold uppercase flex items-center gap-1 transition-all ${
              deviceMode === 'mobile'
                ? 'bg-[#FFE500] text-black shadow-[1px_1px_0px_#000]'
                : 'text-neutral-600 hover:text-black'
            }`}
          >
            <Smartphone size={11} /> Mobile screen
          </button>
          <button
            type="button"
            onClick={() => setDeviceMode('desktop')}
            className={`px-2 py-0.5 text-[10px] font-mono font-bold uppercase flex items-center gap-1 transition-all ${
              deviceMode === 'desktop'
                ? 'bg-[#FFE500] text-black shadow-[1px_1px_0px_#000]'
                : 'text-neutral-600 hover:text-black'
            }`}
          >
            <Monitor size={11} /> Desktop screen
          </button>
        </div>
      </div>

      {/* Frame Container */}
      <div className="flex justify-center bg-neutral-100 p-3 sm:p-4 border border-black shadow-inner">
        <div
          className={`transition-all duration-300 w-full ${
            deviceMode === 'mobile' ? 'max-w-[360px]' : 'max-w-2xl'
          }`}
        >
          {/* Mock Student Screen */}
          <div className="neo-box bg-white overflow-hidden shadow-[3px_3px_0px_#000]">
            {/* Mock Top Status Bar */}
            <div className="bg-[#FAF8F0] border-b border-black px-3 py-1.5 flex items-center justify-between text-[10px] font-mono">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-green-500 inline-block"></span>
                <span className="font-bold text-black">{room.id}</span>

              </div>
              <div className="flex items-center gap-1 text-neutral-600">
                <Users size={10} />
                <span>{participantsCount} online</span>
              </div>
            </div>

            {/* Reading Paper Canvas Preview */}
            <div className="bg-paper-reading p-4 sm:p-6 min-h-[220px] flex flex-col justify-between relative overflow-hidden">
              {/* Timeline Header Badge & Progress */}
              <div className="flex items-center justify-between border-b border-black/10 pb-1.5 mb-2">
                <span className="text-[10px] font-mono font-bold text-neutral-500 uppercase truncate max-w-[150px]">
                  {room.resourceTitle}
                </span>

                <div className="flex items-center gap-1">
                  {timeline.phase === 'hold' && (
                    <span className="neo-badge bg-[#4ADE80] text-black text-[9px] py-0 px-1">
                      Reading ({Math.ceil((timeline.effectiveHoldMs - timeline.elapsedMs) / 1000)}s)
                    </span>
                  )}
                  {timeline.phase === 'erase' && (
                    <span className="neo-badge bg-[#FF3838] text-white text-[9px] py-0 px-1">
                      Erasing ({Math.ceil(timeline.remainingMs / 1000)}s)
                    </span>
                  )}
                  {timeline.phase === 'paused' && (
                    <span className="neo-badge bg-[#FFE500] text-black text-[9px] py-0 px-1">
                      Paused
                    </span>
                  )}
                  {timeline.phase === 'manual_show' && (
                    <span className="neo-badge bg-[#00D2FF] text-black text-[9px] py-0 px-1">
                      Discussion
                    </span>
                  )}
                  {timeline.phase === 'blank_finished' && (
                    <span className="neo-badge bg-neutral-200 text-neutral-700 text-[9px] py-0 px-1">
                      Hidden
                    </span>
                  )}
                  {timeline.phase === 'idle' && (
                    <span className="neo-badge bg-neutral-200 text-neutral-700 text-[9px] py-0 px-1">
                      Waiting to play
                    </span>
                  )}
                </div>
              </div>

              <ReadingCountdown timeline={timeline} />

              {/* Text Canvas Area */}
              <div className="flex-1 flex items-center justify-center py-4">
                {isTextVisible && currentUnit?.text ? (
                  <ReadingUnitText room={room} timeline={timeline} onAnnotationClick={setActiveTooltip}
                    className={`w-full text-center font-reading leading-relaxed text-[#111111] font-normal ${deviceMode === 'mobile' ? 'text-base sm:text-lg' : 'text-lg sm:text-2xl'}`} />
                ) : (
                  <div className="text-center py-4 space-y-1">
                    <Clock size={16} className="mx-auto text-neutral-400 animate-pulse" />
                    <div className="text-xs font-mono font-bold text-neutral-700">
                      {timeline.phase === 'blank_finished'
                        ? 'This unit has ended'
                        : 'Learner screen is blank (Waiting for Play)'}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer Note */}
              <div className="pt-2 border-t border-black/10 flex items-center justify-between text-[9px] font-mono text-neutral-400">
                <span>Effect: {selectedEffect}</span>
                <span>{approvedSpans.length} Chunks Highlight</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
