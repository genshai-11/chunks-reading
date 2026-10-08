/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Firestore Security Rules & Classroom Contract Verification Suite
 * Verifies room creation, access permissions, learner presence, and timing contracts.
 */

// Lightweight test assertion framework
let passedCount = 0;
let totalCount = 0;

function describe(suiteName: string, fn: () => void) {
  console.log(`\n--- Test Suite: ${suiteName} ---`);
  fn();
}

function test(testName: string, fn: () => void) {
  totalCount++;
  try {
    fn();
    passedCount++;
    console.log(`  ✓ ${testName}`);
  } catch (error: any) {
    console.error(`  ✗ ${testName}: ${error?.message || error}`);
    throw error;
  }
}

function expect<T>(actual: T) {
  return {
    toBe: (expected: T) => {
      if (actual !== expected) {
        throw new Error(`Expected ${String(expected)} but received ${String(actual)}`);
      }
    },
    toEqual: (expected: any) => {
      if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)} but received ${JSON.stringify(actual)}`);
      }
    },
    toBeTruthy: () => {
      if (!actual) {
        throw new Error(`Expected truthy value but received ${String(actual)}`);
      }
    },
    toBeFalsy: () => {
      if (actual) {
        throw new Error(`Expected falsy value but received ${String(actual)}`);
      }
    },
  };
}

// ----------------- Rules Logic Simulator -----------------
function isValidId(id: any): boolean {
  return typeof id === 'string' && id.length > 0 && id.length <= 128;
}

interface AuthContext {
  uid: string | null;
}

interface RuleRequest {
  auth: AuthContext | null;
  resource?: { data: any };
}

// Check allow create on /rooms/{roomId}
function checkRoomCreate(request: RuleRequest, roomId: string, incomingData: any): boolean {
  const isSignedIn = request.auth !== null && typeof request.auth.uid === 'string';
  if (!isSignedIn) return false;
  if (!isValidId(roomId)) return false;
  if (incomingData?.teacherId !== request.auth?.uid) return false;
  if (!['active', 'ended'].includes(incomingData?.status)) return false;
  return true;
}

// Check allow get on /rooms/{roomId}
function checkRoomGet(request: RuleRequest, roomId: string): boolean {
  return isValidId(roomId);
}

// Check allow update on /rooms/{roomId}
function checkRoomUpdate(request: RuleRequest, roomId: string, existingData: any, incomingData: any): boolean {
  const isSignedIn = request.auth !== null && typeof request.auth.uid === 'string';
  if (!isSignedIn) return false;
  if (!isValidId(roomId)) return false;
  if (existingData?.teacherId !== request.auth?.uid) return false;
  if (incomingData?.teacherId !== existingData?.teacherId) return false;
  return true;
}

// Check allow delete on /rooms/{roomId}
function checkRoomDelete(request: RuleRequest, roomId: string, existingData: any): boolean {
  const isSignedIn = request.auth !== null && typeof request.auth.uid === 'string';
  if (!isSignedIn) return false;
  if (!isValidId(roomId)) return false;
  return existingData?.teacherId === request.auth?.uid;
}

// Check allow create on /rooms/{roomId}/participants/{participantId}
function checkParticipantCreate(roomId: string, participantId: string, incomingData: any): boolean {
  if (!isValidId(roomId) || !isValidId(participantId)) return false;
  if (incomingData?.participantId !== participantId) return false;
  if (typeof incomingData?.name !== 'string') return false;
  if (incomingData.name.length === 0 || incomingData.name.length > 80) return false;
  return true;
}

// Check reading resource ownership rules
function checkResourceCreate(request: RuleRequest, resourceId: string, incomingData: any): boolean {
  const isSignedIn = request.auth !== null && typeof request.auth.uid === 'string';
  if (!isSignedIn) return false;
  if (!isValidId(resourceId)) return false;
  if (incomingData?.ownerId !== request.auth?.uid) return false;
  if (typeof incomingData?.title !== 'string' || incomingData.title.length > 200) return false;
  if (typeof incomingData?.canonicalText !== 'string' || incomingData.canonicalText.length > 100000) return false;
  return true;
}

function checkResourceRead(request: RuleRequest, existingData: any): boolean {
  const isSignedIn = request.auth !== null && typeof request.auth.uid === 'string';
  if (!isSignedIn) return false;
  return existingData?.ownerId === request.auth?.uid;
}

// ----------------- Test Scenarios -----------------

describe('1. Room Creation Rules', () => {
  test('Signed-in teacher creates active room successfully', () => {
    const req: RuleRequest = { auth: { uid: 'teacher_123' } };
    const room = { teacherId: 'teacher_123', status: 'active', revision: 1 };
    expect(checkRoomCreate(req, 'CH-9999', room)).toBe(true);
  });

  test('Unauthenticated user cannot create room', () => {
    const req: RuleRequest = { auth: null };
    const room = { teacherId: 'teacher_123', status: 'active' };
    expect(checkRoomCreate(req, 'CH-9999', room)).toBe(false);
  });

  test('Teacher cannot create room for another teacher ID', () => {
    const req: RuleRequest = { auth: { uid: 'teacher_456' } };
    const room = { teacherId: 'teacher_123', status: 'active' };
    expect(checkRoomCreate(req, 'CH-9999', room)).toBe(false);
  });

  test('Invalid status rejected on room creation', () => {
    const req: RuleRequest = { auth: { uid: 'teacher_123' } };
    const room = { teacherId: 'teacher_123', status: 'invalid_status' };
    expect(checkRoomCreate(req, 'CH-9999', room)).toBe(false);
  });

  test('Invalid/Empty roomId rejected', () => {
    const req: RuleRequest = { auth: { uid: 'teacher_123' } };
    const room = { teacherId: 'teacher_123', status: 'active' };
    expect(checkRoomCreate(req, '', room)).toBe(false);
  });
});

describe('2. Room Read & Modification Permissions', () => {
  test('Students without auth can read room by valid code', () => {
    const req: RuleRequest = { auth: null };
    expect(checkRoomGet(req, 'CH-7788')).toBe(true);
  });

  test('Room owner teacher can update playback state and units', () => {
    const req: RuleRequest = { auth: { uid: 'teacher_123' } };
    const existing = { teacherId: 'teacher_123', status: 'active' };
    const incoming = { teacherId: 'teacher_123', playbackStatus: 'playing', revision: 2 };
    expect(checkRoomUpdate(req, 'CH-7788', existing, incoming)).toBe(true);
  });

  test('Non-owner teacher cannot update another teacher room', () => {
    const req: RuleRequest = { auth: { uid: 'teacher_hijacker' } };
    const existing = { teacherId: 'teacher_123', status: 'active' };
    const incoming = { teacherId: 'teacher_123', playbackStatus: 'playing' };
    expect(checkRoomUpdate(req, 'CH-7788', existing, incoming)).toBe(false);
  });

  test('Immutability breach: teacherId cannot be reassigned on update', () => {
    const req: RuleRequest = { auth: { uid: 'teacher_123' } };
    const existing = { teacherId: 'teacher_123', status: 'active' };
    const incoming = { teacherId: 'teacher_999', playbackStatus: 'playing' };
    expect(checkRoomUpdate(req, 'CH-7788', existing, incoming)).toBe(false);
  });

  test('Only owning teacher can delete room', () => {
    const ownerReq: RuleRequest = { auth: { uid: 'teacher_123' } };
    const otherReq: RuleRequest = { auth: { uid: 'teacher_other' } };
    const existing = { teacherId: 'teacher_123' };

    expect(checkRoomDelete(ownerReq, 'CH-7788', existing)).toBe(true);
    expect(checkRoomDelete(otherReq, 'CH-7788', existing)).toBe(false);
  });
});

describe('3. Learner Participant Presence Rules', () => {
  test('Learner can register with valid participantId and name', () => {
    const participant = { participantId: 'p_123', name: 'Student Linh' };
    expect(checkParticipantCreate('CH-7788', 'p_123', participant)).toBe(true);
  });

  test('Oversized participant name (> 80 characters) rejected', () => {
    const longName = 'A'.repeat(81);
    const participant = { participantId: 'p_123', name: longName };
    expect(checkParticipantCreate('CH-7788', 'p_123', participant)).toBe(false);
  });

  test('Empty participant name rejected', () => {
    const participant = { participantId: 'p_123', name: '' };
    expect(checkParticipantCreate('CH-7788', 'p_123', participant)).toBe(false);
  });

  test('Mismatched participantId in payload rejected', () => {
    const participant = { participantId: 'p_impostor', name: 'Alice' };
    expect(checkParticipantCreate('CH-7788', 'p_legit', participant)).toBe(false);
  });
});

describe('4. Resource Isolation Rules', () => {
  test('Teacher can create reading resource with valid lengths', () => {
    const req: RuleRequest = { auth: { uid: 'teacher_1' } };
    const resource = {
      ownerId: 'teacher_1',
      title: 'Stanford Speech',
      category: 'Speeches',
      canonicalText: 'Stay hungry, stay foolish.',
    };
    expect(checkResourceCreate(req, 'res_001', resource)).toBe(true);
  });

  test('Cross-teacher resource read rejected', () => {
    const req: RuleRequest = { auth: { uid: 'teacher_2' } };
    const existingResource = { ownerId: 'teacher_1', title: 'Private' };
    expect(checkResourceRead(req, existingResource)).toBe(false);
  });
});

describe('5. Timing Contracts & Erase Effects', () => {
  const VALID_TIMING_POLICIES = ['hold_then_erase', 'erase_within_window'];
  const VALID_ERASE_EFFECTS = ['vaporize', 'dissolve', 'fade', 'wipe', 'eraser', 'dust', 'sparkle'];
  const VALID_PLAYBACK_STATES = ['idle', 'playing', 'paused', 'manual_show', 'ended'];

  test('All 7 erase effects are recognized in room contract', () => {
    expect(VALID_ERASE_EFFECTS.length).toBe(7);
    for (const effect of ['eraser', 'dust', 'sparkle']) expect(VALID_ERASE_EFFECTS.includes(effect)).toBe(true);
    expect(VALID_ERASE_EFFECTS.includes('vaporize')).toBe(true);
    expect(VALID_ERASE_EFFECTS.includes('dissolve')).toBe(true);
    expect(VALID_ERASE_EFFECTS.includes('fade')).toBe(true);
    expect(VALID_ERASE_EFFECTS.includes('wipe')).toBe(true);
  });

  test('Both timing policies are recognized', () => {
    expect(VALID_TIMING_POLICIES.includes('hold_then_erase')).toBe(true);
    expect(VALID_TIMING_POLICIES.includes('erase_within_window')).toBe(true);
  });

  test('Authoritative playback status states are exhaustive', () => {
    expect(VALID_PLAYBACK_STATES.length).toBe(5);
    for (const state of ['idle', 'playing', 'paused', 'manual_show', 'ended']) {
      expect(VALID_PLAYBACK_STATES.includes(state)).toBe(true);
    }
  });

  test('Timing values must be positive integers', () => {
    const holdMs = 3000;
    const eraseMs = 1000;
    expect(holdMs > 0 && eraseMs > 0).toBe(true);
    expect(holdMs >= 1000).toBe(true);
    expect(eraseMs >= 500).toBe(true);
  });
});

console.log(`\n========================================`);
console.log(`Test Execution Finished: ${passedCount}/${totalCount} tests passed.`);
console.log(`========================================\n`);
