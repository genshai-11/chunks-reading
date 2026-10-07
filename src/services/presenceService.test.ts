import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PresenceManager, type RoomParticipant } from './presenceService';

describe('PresenceManager', () => {
  let manager: PresenceManager;

  beforeEach(() => {
    manager = new PresenceManager('room-123', 'teacher-uid');
  });

  it('allows learners to join with display name and records online status', () => {
    const member: RoomParticipant = {
      id: 'learner-1',
      name: 'Alice',
      joinedAt: 1000,
      lastSeenAt: 1000,
      isOnline: true,
    };

    manager.upsertMember(member);
    expect(manager.getOnlineCount()).toBe(1);
    expect(manager.getOnlineMembers()).toHaveLength(1);
    expect(manager.getOnlineMembers()[0].name).toBe('Alice');
  });

  it('updates heartbeat for existing members without duplicating entries', () => {
    manager.upsertMember({
      id: 'learner-1',
      name: 'Alice',
      joinedAt: 1000,
      lastSeenAt: 1000,
      isOnline: true,
    });

    manager.upsertMember({
      id: 'learner-1',
      name: 'Alice',
      joinedAt: 1000,
      lastSeenAt: 5000,
      isOnline: true,
    });

    expect(manager.getOnlineCount()).toBe(1);
    expect(manager.getOnlineMembers()[0].lastSeenAt).toBe(5000);
  });

  it('allows room teacher to remove a participant', () => {
    manager.upsertMember({
      id: 'learner-1',
      name: 'Alice',
      joinedAt: 1000,
      lastSeenAt: 1000,
      isOnline: true,
    });

    const removalSuccess = manager.removeMember('learner-1', 'teacher-uid');
    expect(removalSuccess).toBe(true);
    expect(manager.getOnlineCount()).toBe(0);
  });

  it('rejects participant removal attempted by non-teachers', () => {
    manager.upsertMember({
      id: 'learner-1',
      name: 'Alice',
      joinedAt: 1000,
      lastSeenAt: 1000,
      isOnline: true,
    });

    const removalSuccess = manager.removeMember('learner-1', 'another-learner-uid');
    expect(removalSuccess).toBe(false);
    expect(manager.getOnlineCount()).toBe(1);
  });
});
