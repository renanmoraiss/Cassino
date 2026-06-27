import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { GameService } from './game.service';

type JoinRoomPayload = {
  code: string;
  name: string;
};

type StartGamePayload = {
  code: string;
};

type PlaceBidPayload = {
  code: string;
  bid: number;
};

type PlayCardPayload = {
  code: string;
  cardId: string;
};

type NextRoundPayload = {
  code: string;
};

type GetRoomPayload = {
  code: string;
};

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class GameGateway {
  @WebSocketServer()
  private server!: Server;

  constructor(private readonly gameService: GameService) {}

  @SubscribeMessage('room:create')
  handleCreateRoom(@ConnectedSocket() client: Socket) {
    try {
      const room = this.gameService.createRoom();

      client.join(room.code);
      client.data.createdRoomCode = room.code;

      client.emit('room:created', room);
      void this.emitRoomUpdate(room.code);
    } catch (error) {
      this.emitError(client, error);
    }
  }

  @SubscribeMessage('room:get')
  handleGetRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: GetRoomPayload,
  ) {
    try {
      const room = this.gameService.getRoom(payload.code);

      client.join(room.code);
      client.emit(
        'room:updated',
        this.gameService.getRoomForPlayer(room.code, client.data.playerId),
      );
    } catch (error) {
      this.emitError(client, error);
    }
  }

  @SubscribeMessage('room:join')
  handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: JoinRoomPayload,
  ) {
    try {
      const isHost = client.data.createdRoomCode === payload.code.toUpperCase();
      const { player, room } = this.gameService.joinRoom(
        payload.code,
        payload.name,
        isHost,
      );

      client.join(room.code);

      client.data.roomCode = room.code;
      client.data.playerId = player.id;

      client.emit('room:joined', {
        player,
        room: this.gameService.getRoomForPlayer(room.code, player.id),
      });

      void this.emitRoomUpdate(room.code);
    } catch (error) {
      this.emitError(client, error);
    }
  }

  @SubscribeMessage('game:start')
  handleStartGame(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: StartGamePayload,
  ) {
    try {
      const playerId = this.getAuthenticatedPlayerId(client);

      const room = this.gameService.startGame(payload.code, playerId);

      void this.emitRoomUpdate(room.code);
    } catch (error) {
      this.emitError(client, error);
    }
  }

  @SubscribeMessage('bid:place')
  handlePlaceBid(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: PlaceBidPayload,
  ) {
    try {
      const playerId = this.getAuthenticatedPlayerId(client);

      const room = this.gameService.placeBid(
        payload.code,
        playerId,
        payload.bid,
      );

      void this.emitRoomUpdate(room.code);
    } catch (error) {
      this.emitError(client, error);
    }
  }

  @SubscribeMessage('card:play')
  handlePlayCard(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: PlayCardPayload,
  ) {
    try {
      const playerId = this.getAuthenticatedPlayerId(client);

      const room = this.gameService.playCard(
        payload.code,
        playerId,
        payload.cardId,
      );

      void this.emitRoomUpdate(room.code);
    } catch (error) {
      this.emitError(client, error);
    }
  }

  @SubscribeMessage('round:next')
  handleNextRound(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: NextRoundPayload,
  ) {
    try {
      const room = this.gameService.startNextRound(payload.code);

      void this.emitRoomUpdate(room.code);
    } catch (error) {
      this.emitError(client, error);
    }
  }

  private getAuthenticatedPlayerId(client: Socket): string {
    const playerId = client.data.playerId as string | undefined;
    if (!playerId) {
      throw new Error('Jogador não autenticado na sala.');
    }
    return playerId;
  }

  private async emitRoomUpdate(code: string): Promise<void> {
    const roomSockets = await this.server.in(code).fetchSockets();
    for (const socket of roomSockets) {
      const playerId = socket.data.playerId as string | undefined;
      const room = this.gameService.getRoomForPlayer(code, playerId);
      socket.emit('room:updated', room);
    }
  }

  private emitError(client: Socket, error: unknown): void {
    if (error instanceof Error) {
      client.emit('game:error', {
        message: error.message,
      });

      return;
    }

    client.emit('game:error', {
      message: 'Erro inesperado.',
    });
  }
}
