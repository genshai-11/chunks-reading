# Security Specification: Chunks Reading Firestore Hardening

## 1. Data Invariants
1. **Teacher Isolation**: A teacher can only read, write, or delete their own resources (`resource.ownerId == request.auth.uid`). Other teachers cannot see private drafts or manage resources they do not own.
2. **Room Control Authority**: Only the room's creating teacher (`teacherId == request.auth.uid`) can create, update, or end the room. Learners have strictly read-only access to `/rooms/{roomId}`.
3. **No Unbounded Leaks**: The room document delivered to learners contains ONLY the `currentUnit` (active chunk text and its approved phrase spans), never the entire reading resource, unapproved draft phrases, or future units.
4. **Participant Self-Registration & Heartbeat**: A learner can create their participant entry with their own `participantId` and name up to 80 chars, and update their own `lastSeen` heartbeat. Only the teacher can set `isRemoved: true`.
5. **Immutable Ownership & Identifiers**: Document IDs, `ownerId`, and `teacherId` cannot be mutated after document creation.
6. **Strict Schema Constraints**: Strings have explicit size limits (titles <= 200, category <= 100, text <= 100,000 chars, participant name <= 80 chars).

## 2. The Dirty Dozen Payloads (Designed to Break Security)
1. **Attacker Resource Hijack**: Unauthenticated user attempts to create a resource document. (Expected: PERMISSION_DENIED)
2. **Cross-Teacher Resource Read**: Teacher B attempts to read Teacher A's draft resource. (Expected: PERMISSION_DENIED)
3. **Cross-Teacher Resource Overwrite**: Teacher B attempts to update Teacher A's resource. (Expected: PERMISSION_DENIED)
4. **Learner Room Command Spoof**: Unauthenticated learner or student attempts to change room `playbackStatus` to 'playing' or change `currentUnit`. (Expected: PERMISSION_DENIED)
5. **Ghost Field Injection (Shadow Update)**: User injects `isAdmin: true` into their `/teachers/{uid}` profile. (Expected: PERMISSION_DENIED)
6. **Path Traversal / Malicious ID**: Client attempts to create a room with invalid document ID containing path traversal characters like `../../hack`. (Expected: PERMISSION_DENIED)
7. **Oversized Name Poisoning**: Participant attempts to register with a 100KB spam string as name. (Expected: PERMISSION_DENIED)
8. **Immutability Breach**: Teacher attempts to change the `ownerId` of an existing resource to another user. (Expected: PERMISSION_DENIED)
9. **Participant Eviction by Peer**: Student A attempts to update Student B's record to set `isRemoved: true`. (Expected: PERMISSION_DENIED)
10. **Arbitrary Room Deletion**: Non-teacher attempts to delete `/rooms/{roomId}`. (Expected: PERMISSION_DENIED)
11. **Negative Duration Exploit**: Teacher payload attempts to set negative numbers for `holdDurationMs` or `eraseDurationMs`. (Expected: PERMISSION_DENIED)
12. **Blanket Query Scraping**: Malicious user attempts to list all resources across the entire database without filtering by `ownerId == auth.uid`. (Expected: PERMISSION_DENIED)
