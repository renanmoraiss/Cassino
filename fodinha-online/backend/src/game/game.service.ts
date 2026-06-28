import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { GameRoomState } from './domain/game-room-state';
import {
  GameRoomClientSnapshot,
  GameRoomSnapshot,
  Player,
} from './domain/game-state.types';

@Injectable()
export class GameService {
  private readonly rooms = new Map<string, GameRoomState>();

  createRoom(): GameRoomSnapshot {
    let code = this.generateRoomCode();

    while (this.rooms.has(code)) {
      code = this.generateRoomCode();
    }

    const room = new GameRoomState(code);

    this.rooms.set(code, room);

    return room.getSnapshot();
  }

  playAgain(code: string, requesterPlayerId: string): GameRoomSnapshot {
    if (!requesterPlayerId) {
      throw new BadRequestException('O ID do jogador é obrigatório.');
    }

    const room = this.getRoomOrThrow(code);

    try {
      room.playAgain(requesterPlayerId);
      return room.getSnapshot();
    } catch (error) {
      throw this.toBadRequestException(error);
    }
  }

  getRoom(code: string): GameRoomSnapshot {
    const room = this.getRoomOrThrow(code);

    return room.getSnapshot();
  }

  leaveRoom(code: string, playerId: string): GameRoomSnapshot | null {
    const room = this.getRoomOrThrow(code);

    try {
      room.leavePlayer(playerId);

      const snapshot = room.getSnapshot();

      if (snapshot.players.length === 0) {
        this.rooms.delete(snapshot.code);
        return null;
      }

      return snapshot;
    } catch (error) {
      throw this.toBadRequestException(error);
    }
  }

  reconnectRoom(
    code: string,
    playerId: string,
  ): {
    player: Player;
    room: GameRoomClientSnapshot;
  } {
    if (!playerId) {
      throw new BadRequestException('O ID do jogador é obrigatório.');
    }

    const room = this.getRoomOrThrow(code);
    const snapshot = room.getSnapshot();

    const player = snapshot.players.find((item) => item.id === playerId);

    if (!player) {
      throw new BadRequestException('Jogador não encontrado nesta sala.');
    }

    return {
      player,
      room: room.getClientSnapshot(player.id),
    };
  }

  getRoomForPlayer(
    code: string,
    playerId?: string | null,
  ): GameRoomClientSnapshot {
    const room = this.getRoomOrThrow(code);

    return room.getClientSnapshot(playerId);
  }

  joinRoom(
    code: string,
    name: string,
    isHost = false,
  ): {
    player: Player;
    room: GameRoomSnapshot;
  } {
    if (!name || !name.trim()) {
      throw new BadRequestException('O nome do jogador é obrigatório.');
    }

    const room = this.getRoomOrThrow(code);

    try {
      const player = room.addPlayer(name.trim(), isHost);

      return {
        player,
        room: room.getSnapshot(),
      };
    } catch (error) {
      throw this.toBadRequestException(error);
    }
  }

  startGame(code: string, requesterPlayerId?: string): GameRoomSnapshot {
    const room = this.getRoomOrThrow(code);

    try {
      room.startGame(requesterPlayerId);

      return room.getSnapshot();
    } catch (error) {
      throw this.toBadRequestException(error);
    }
  }

  placeBid(code: string, playerId: string, bid: number): GameRoomSnapshot {
    if (!playerId) {
      throw new BadRequestException('O ID do jogador é obrigatório.');
    }

    const normalizedBid = Number(bid);

    if (!Number.isInteger(normalizedBid)) {
      throw new BadRequestException('A aposta deve ser um número inteiro.');
    }

    const room = this.getRoomOrThrow(code);

    try {
      room.placeBid(playerId, normalizedBid);

      return room.getSnapshot();
    } catch (error) {
      throw this.toBadRequestException(error);
    }
  }

  playCard(code: string, playerId: string, cardId: string): GameRoomSnapshot {
    if (!playerId) {
      throw new BadRequestException('O ID do jogador é obrigatório.');
    }

    if (!cardId) {
      throw new BadRequestException('O ID da carta é obrigatório.');
    }

    const room = this.getRoomOrThrow(code);

    try {
      room.playCard(playerId, cardId);

      return room.getSnapshot();
    } catch (error) {
      throw this.toBadRequestException(error);
    }
  }

  startNextRound(code: string): GameRoomSnapshot {
    const room = this.getRoomOrThrow(code);

    try {
      room.startNextRound();

      return room.getSnapshot();
    } catch (error) {
      throw this.toBadRequestException(error);
    }
  }

  private getRoomOrThrow(code: string): GameRoomState {
    const normalizedCode = code.toUpperCase();

    const room = this.rooms.get(normalizedCode);

    if (!room) {
      throw new NotFoundException('Sala não encontrada.');
    }

    return room;
  }

  private generateRoomCode(): string {
    const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const codeLength = 6;

    let code = '';

    for (let i = 0; i < codeLength; i++) {
      const randomIndex = Math.floor(Math.random() * characters.length);
      code += characters[randomIndex];
    }

    return code;
  }

  private toBadRequestException(error: unknown): BadRequestException {
    if (error instanceof BadRequestException) {
      return error;
    }

    if (error instanceof Error) {
      return new BadRequestException(error.message);
    }

    return new BadRequestException('Erro inesperado.');
  }
}
