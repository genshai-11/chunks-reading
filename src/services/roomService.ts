import type { 
  RoomState, 
  Article, 
  PhraseAnnotation, 
  TimingConfig, 
  PlaybackStatus, 
  UnitMode, 
  EraserEffectType,
  DerivedPhaseResult
} from '../types';
import { 
  applyStagedToRoom, 
  executePlayCommand, 
  executePauseCommand, 
  executeResumeCommand, 
  executeShowCommand, 
  executeHideCommand 
} from '../domain/roomCommands';
import { computeReadingPhase } from '../domain/timing';

export type CommandType = 'PLAY' | 'PAUSE' | 'RESUME' | 'SHOW' | 'HIDE' | 'APPLY_STAGED' | 'END';

export interface RoomCommand {
  commandId: string;
  type: CommandType;
  expectedRevision?: number;
  issuedAt?: number;
}

export interface CommandResult {
  success: boolean;
  statusCode: number;
  room?: RoomState;
  error?: string;
}

export interface LearnerRoomSnapshot {
  roomId: string;
  code: string;
  revision: number;
  status: PlaybackStatus;
  currentUnitText: string;
  annotations: PhraseAnnotation[];
  timing: TimingConfig;
  startedAt?: number;
  pausedElapsedMs?: number;
  guideEnabled: boolean;
  eraserEffect: EraserEffectType;
  unitMode: UnitMode;
  unitIndex: number;
  totalUnits: number;
}

/**
 * Calculates estimated client-to-server clock offset in milliseconds.
 * Positive offset indicates server time is ahead of client time.
 */
export function estimateClockOffset(
  serverTime: number,
  clientSendTime: number,
  clientReceiveTime: number
): number {
  const roundTripTime = clientReceiveTime - clientSendTime;
  const estimatedServerAtReceive = serverTime + roundTripTime / 2;
  return Math.round(estimatedServerAtReceive - clientReceiveTime);
}

export class RoomAuthorityService {
  private room: RoomState;
  private articles: Article[];
  private executedCommandIds: Map<string, RoomState> = new Map();

  constructor(initialRoom: RoomState, articles: Article[]) {
    this.room = { ...initialRoom };
    this.articles = articles;
  }

  public getRoomState(): RoomState {
    return { ...this.room };
  }

  public executeCommand(command: RoomCommand): CommandResult {
    // Check idempotency
    if (this.executedCommandIds.has(command.commandId)) {
      return {
        success: true,
        statusCode: 200,
        room: this.executedCommandIds.get(command.commandId),
      };
    }

    // Check revision concurrency
    if (command.expectedRevision !== undefined && command.expectedRevision !== this.room.revision) {
      return {
        success: false,
        statusCode: 409,
        error: `Revision conflict: expected revision ${command.expectedRevision}, but room is currently at ${this.room.revision}`,
      };
    }

    const now = command.issuedAt ?? Date.now();
    let nextRoom: RoomState;

    switch (command.type) {
      case 'PLAY':
        nextRoom = executePlayCommand(this.room, now);
        break;
      case 'PAUSE':
        nextRoom = executePauseCommand(this.room, now);
        break;
      case 'RESUME':
        nextRoom = executeResumeCommand(this.room, now);
        break;
      case 'SHOW':
        nextRoom = executeShowCommand(this.room);
        break;
      case 'HIDE':
        nextRoom = executeHideCommand(this.room);
        break;
      case 'APPLY_STAGED':
        nextRoom = applyStagedToRoom(this.room);
        break;
      case 'END':
        nextRoom = {
          ...this.room,
          status: 'ended',
          startedAt: undefined,
          pausedElapsedMs: undefined,
          revision: this.room.revision + 1,
        };
        break;
      default:
        return {
          success: false,
          statusCode: 400,
          error: `Unknown command type ${(command as any).type}`,
        };
    }

    this.room = nextRoom;
    this.executedCommandIds.set(command.commandId, nextRoom);

    return {
      success: true,
      statusCode: 200,
      room: nextRoom,
    };
  }

  public getLearnerSnapshot(): LearnerRoomSnapshot {
    const article = this.articles.find((a) => a.id === this.room.articleId) || this.articles[0];
    const units = this.room.unitMode === 'sentence' ? article.sentences : article.paragraphs;
    const currentUnit = units[this.room.unitIndex] || units[0];

    const approvedAnnotations = (currentUnit?.annotations || []).filter(
      (a) => a.reviewStatus === 'approved'
    );

    return {
      roomId: this.room.id,
      code: this.room.code,
      revision: this.room.revision,
      status: this.room.status,
      currentUnitText: currentUnit ? currentUnit.text : '',
      annotations: this.room.highlightEnabled ? approvedAnnotations : [],
      timing: this.room.timing,
      startedAt: this.room.startedAt,
      pausedElapsedMs: this.room.pausedElapsedMs,
      guideEnabled: this.room.guideEnabled,
      eraserEffect: this.room.eraserEffect,
      unitMode: this.room.unitMode,
      unitIndex: this.room.unitIndex,
      totalUnits: units.length,
    };
  }

  public deriveLearnerPhase(clientNow: number, clockOffsetMs: number = 0): DerivedPhaseResult {
    return computeReadingPhase(
      {
        status: this.room.status,
        startedAt: this.room.startedAt,
        pausedElapsedMs: this.room.pausedElapsedMs,
        timing: this.room.timing,
      },
      clientNow,
      clockOffsetMs
    );
  }
}
