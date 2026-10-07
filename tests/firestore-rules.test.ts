import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Firestore Security Rules Contract Verification', () => {
  const rulesPath = path.resolve(process.cwd(), 'firestore.rules');
  const rulesContent = fs.readFileSync(rulesPath, 'utf8');

  it('declares rules_version = 2 and default deny on root', () => {
    expect(rulesContent).toContain("rules_version = '2';");
    expect(rulesContent).toContain('match /{document=**}');
    expect(rulesContent).toContain('allow read, write: if false;');
  });

  it('restricts /rooms/{roomId} updates strictly to authenticated room teacher', () => {
    // Verifies that learners cannot modify room controls
    expect(rulesContent).toContain('match /rooms/{roomId}');
    expect(rulesContent).toContain('resource.data.teacherUid == request.auth.uid');
    expect(rulesContent).toContain('request.resource.data.teacherUid == resource.data.teacherUid');
  });

  it('restricts /resources/{resourceId} learner read access strictly to published status', () => {
    // Draft resources must not be readable by unauthenticated learners
    expect(rulesContent).toContain("resource.data.status == 'published'");
    expect(rulesContent).toContain('resource.data.ownerUid == request.auth.uid');
  });

  it('enforces immutable versions on resource versions subcollection', () => {
    expect(rulesContent).toContain('match /versions/{versionId}');
    expect(rulesContent).toContain('allow update: if false;');
  });

  it('enforces participant display name length boundaries and teacher removal authority', () => {
    expect(rulesContent).toContain('match /members/{memberId}');
    expect(rulesContent).toContain('request.resource.data.name.size() <= 50');
    expect(rulesContent).toContain('isRoomTeacher(roomId)');
  });
});
