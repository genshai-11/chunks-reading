// Dev-only fixture. No Firebase writes, authentication or production route.
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { EraseTextEffect } from '../src/components/EraseTextEffect';
import { DustDirectionControl } from '../src/components/DustDirectionControl';
import { LiveLearnerPreview } from '../src/components/LiveLearnerPreview';
import { LiveLearnerView } from '../src/components/LiveLearnerView';
import { ERASE_EFFECT_OPTIONS } from '../src/utils/eraseEffects';
import { calculateRoomTimeline } from '../src/utils/timingEngine';
import type { ClassroomRoom, EraseEffect } from '../src/types';
import '../src/index.css';

function Fixture() {
  const [effect, setEffect] = useState<EraseEffect>('eraser');
  const [angle, setAngle] = useState(-45);
  const [progress, setProgress] = useState(0);
  const [width, setWidth] = useState(620);
  const [text, setText] = useState('Learning happens when we slow down, notice the little things, and connect the dots. Tiếng Việt: chữ tan biến ✨.');
  const [highlight, setHighlight] = useState(true);
  const room: ClassroomRoom = { id: 'TEST', teacherId: 'test', teacherName: 'Fixture', resourceId: 'test', resourceTitle: 'Local verification', status: 'active', granularity: 'sentence', highlightEnabled: highlight, timingPolicy: 'hold_then_erase', holdDurationMs: 3000, eraseDurationMs: 2000, totalWindowMs: 5000, eraseEffect: effect, dustAngle: angle, playbackStatus: 'paused', serverStartTime: null, pausedElapsedMs: 3000 + progress * 2000, revision: 1, currentUnit: { index: 0, totalUnits: 1, granularity: 'sentence', text, annotations: [{ id: 'a', text: text.slice(0, 8), startOffset: 0, endOffset: 8, type: 'collocation', meaning: 'Test' }] } };
  const timeline = calculateRoomTimeline(room);
  return <main className="p-6 space-y-5">
    <h1>Actual React erase renderer — paused timeline fixture</h1>
    <select aria-label="Effect" value={effect} onChange={e => setEffect(e.target.value as EraseEffect)}>{ERASE_EFFECT_OPTIONS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}</select>
    <label>Progress<input aria-label="Progress" type="range" min={0} max={1} step={.01} value={progress} onChange={e => setProgress(Number(e.target.value))} /></label>
    <label>Width<input aria-label="Width" type="range" min={280} max={800} value={width} onChange={e => setWidth(Number(e.target.value))} /></label>
    <label><input aria-label="Highlight" type="checkbox" checked={highlight} onChange={e => setHighlight(e.target.checked)} />Highlight</label>
    <textarea aria-label="Text" value={text} onChange={e => setText(e.target.value)} />
    <DustDirectionControl angle={angle} onChange={setAngle} />
    <div id="shared" className="bg-paper-reading p-6" style={{ width, maxWidth: '100%', overflow: 'hidden' }}>
      <EraseTextEffect effect={effect} timeline={timeline} dustAngle={angle} contentKey={JSON.stringify([text, highlight])}>
        <p className="font-reading text-2xl text-center leading-loose">{highlight ? <><mark className="bg-[#FFE500] px-1 py-0.5 border-b-2 border-black inline-block">{text.slice(0, 8)}</mark>{text.slice(8)}</> : text}</p>
      </EraseTextEffect>
    </div>
    <LiveLearnerPreview room={room} timeline={timeline} />
    <LiveLearnerView room={room} participants={[]} stagedEraseEffect={effect} onSelectEraseEffect={setEffect} stagedDustAngle={angle} onSelectDustAngle={setAngle} />
  </main>;
}
if (import.meta.env.DEV) createRoot(document.getElementById('root')!).render(<Fixture />);
