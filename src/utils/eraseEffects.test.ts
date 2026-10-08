import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ClassroomRoom } from '../types';
import { calculateRoomTimeline } from './timingEngine';
import { DEFAULT_DUST_ANGLE, ERASE_EFFECT_OPTIONS, dustVector, getEraseProgress, normalizeDustAngle, remainingPolygon, seededRandom } from './eraseEffects';

const room = { timingPolicy: 'hold_then_erase', holdDurationMs: 3000, eraseDurationMs: 2000, totalWindowMs: 5000, playbackStatus: 'paused', pausedElapsedMs: 0, serverStartTime: null } as ClassroomRoom;

test('paused hold does not erase, paused erase preserves exact progress', () => {
  for (const [elapsed, progress] of [[0, 0], [1500, 0], [3000, 0], [3500, .25], [4500, .75], [5000, 1], [7000, 1]]) {
    assert.equal(getEraseProgress(calculateRoomTimeline({ ...room, pausedElapsedMs: elapsed })), progress);
  }
});
test('playing, paused and late joiners use the same erase progress', () => {
  for (const elapsed of [1500, 3500, 4900, 5500]) {
    const live = calculateRoomTimeline({ ...room, playbackStatus: 'playing', serverStartTime: 1000 }, 1000 + elapsed);
    const paused = calculateRoomTimeline({ ...room, pausedElapsedMs: elapsed });
    assert.equal(getEraseProgress(live), getEraseProgress(paused));
  }
  assert.equal(getEraseProgress(calculateRoomTimeline({ ...room, playbackStatus: 'manual_show' })), 0);
});
test('window timing also preserves paused progress', () => {
  const windowRoom = { ...room, timingPolicy: 'erase_within_window' as const, totalWindowMs: 3000, pausedElapsedMs: 2000 };
  assert.equal(getEraseProgress(calculateRoomTimeline(windowRoom)), .5);
});
test('dust angles normalize missing, invalid and out of range inputs', () => {
  assert.equal(normalizeDustAngle(), DEFAULT_DUST_ANGLE);
  assert.equal(normalizeDustAngle(NaN), DEFAULT_DUST_ANGLE);
  assert.equal(normalizeDustAngle(Infinity), DEFAULT_DUST_ANGLE);
  assert.equal(normalizeDustAngle(360), 180);
  assert.equal(normalizeDustAngle(-360), -180);
  assert.equal(normalizeDustAngle(27), 27);
});
test('downward and diagonal vectors point in the selected directions', () => {
  const down = dustVector(90); assert.ok(Math.abs(down.dx) < 1e-10); assert.equal(down.dy, 1);
  const diagonal = dustVector(135); assert.ok(diagonal.dx < 0 && diagonal.dy > 0);
});
test('clipped polygon only contains the not-yet-erased half plane for every direction', () => {
  for (const angle of [-180, -135, -90, -45, 0, 27, 45, 90, 135, 180]) {
    const { dx, dy } = dustVector(angle), cut = 50 * dx + 40 * dy;
    const polygon = remainingPolygon(100, 80, dx, dy, cut);
    assert.ok(polygon.length >= 3);
    for (const [x, y] of polygon) assert.ok(x * dx + y * dy >= cut - 1e-8);
    assert.deepEqual(remainingPolygon(100, 80, dx, dy, 1000), []);
  }
});
test('all effects are unique and deterministic seeds support seek/resume', () => {
  assert.equal(new Set(ERASE_EFFECT_OPTIONS.map(o => o.id)).size, 7);
  for (const id of ['eraser', 'dust', 'sparkle', 'vaporize', 'dissolve', 'fade', 'wipe']) assert.ok(ERASE_EFFECT_OPTIONS.some(o => o.id === id));
  for (let i = 0; i < 50; i++) { assert.equal(seededRandom(i), seededRandom(i)); assert.ok(seededRandom(i) >= 0 && seededRandom(i) < 1); }
});
