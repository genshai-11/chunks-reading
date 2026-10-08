import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ReadingUnitText } from '../components/ReadingUnitText';
import { calculateRoomTimeline } from './timingEngine';
import type { ClassroomRoom } from '../types';

Object.assign(globalThis, { window: { matchMedia: () => ({ matches: false }) } });
const text = 'one  two\nthree four five';
const room: ClassroomRoom = { id:'test', teacherId:'teacher', teacherName:'T', resourceId:'r', resourceTitle:'R', status:'active',
  granularity:'sentence', highlightEnabled:true, timingPolicy:'hold_then_erase', holdDurationMs:4000, eraseDurationMs:1000, totalWindowMs:3000,
  playbackStatus:'paused', serverStartTime:null, pausedElapsedMs:1125, revision:1, timingMode:'auto', wordsPerSecond:4, eraseSchedule:'word_groups',
  currentUnit:{index:0,totalUnits:1,granularity:'sentence',text,annotations:[]}};
for (const effect of ['eraser','dust','sparkle','vaporize','dissolve','fade','wipe'] as const) {
  test(`selected ${effect} renderer is used for sequential and after-reading schedules`, () => {
    for (const schedule of ['word_groups', 'after_reading'] as const) {
      const actual = { ...room, eraseSchedule:schedule, eraseEffect:effect };
      const html = renderToStaticMarkup(createElement(ReadingUnitText,{room:actual,timeline:calculateRoomTimeline(actual)}));
      assert.ok(html.includes(`data-erase-effect="${effect}"`));
      if (schedule === 'word_groups') assert.ok(html.includes('data-erase-progress="0.500"'));
    }
  });
}
test('sequential effects preserve original spaces and text at mid-erase and completion', () => {
  for (const elapsed of [999,1125,1250,2000,2250]) {
    const actual = { ...room, pausedElapsedMs:elapsed };
    const html = renderToStaticMarkup(createElement(ReadingUnitText,{room:actual,timeline:calculateRoomTimeline(actual)}));
    assert.equal(html.replace(/<[^>]*>/g,''),text);
    assert.equal(/<div[^>]*data-erase-effect/.test(html),false); // inline word effects must not introduce block layout
  }
});
test('active inline eraser has a front stacking context above later words', () => {
  const actual={...room,eraseEffect:'eraser' as const};
  const html=renderToStaticMarkup(createElement(ReadingUnitText,{room:actual,timeline:calculateRoomTimeline(actual)}));
  assert.ok(html.includes('isolation:isolate;display:inline-block;vertical-align:baseline;z-index:2'));
});
test('manual full review bypasses erasure effects', () => {
  const actual={...room,playbackStatus:'manual_show' as const};
  const html=renderToStaticMarkup(createElement(ReadingUnitText,{room:actual,timeline:calculateRoomTimeline(actual)}));
  assert.ok(html.includes('data-erase-schedule="manual"'));
  assert.equal(html.includes('data-erase-effect='),false);
});
