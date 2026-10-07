export interface RoomParticipant {
  id: string;
  name: string;
  joinedAt: number;
  lastSeenAt: number;
  isOnline: boolean;
}

export class PresenceManager {
  private roomId: string;
  private teacherUid: string;
  private members: Map<string, RoomParticipant> = new Map();

  constructor(roomId: string, teacherUid: string) {
    this.roomId = roomId;
    this.teacherUid = teacherUid;
  }

  public upsertMember(participant: RoomParticipant): void {
    const existing = this.members.get(participant.id);
    if (existing) {
      this.members.set(participant.id, {
        ...existing,
        ...participant,
        lastSeenAt: participant.lastSeenAt,
        isOnline: participant.isOnline,
      });
    } else {
      this.members.set(participant.id, { ...participant });
    }
  }

  public removeMember(memberId: string, actorUid: string): boolean {
    // Only the teacher can remove participants (or the member themselves)
    if (actorUid !== this.teacherUid && actorUid !== memberId) {
      return false;
    }
    return this.members.delete(memberId);
  }

  public getOnlineMembers(): RoomParticipant[] {
    return Array.from(this.members.values()).filter((m) => m.isOnline);
  }

  public getOnlineCount(): number {
    return this.getOnlineMembers().length;
  }
}
