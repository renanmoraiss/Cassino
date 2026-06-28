import { randomUUID } from 'crypto';
import { Card, CardValue } from './card.types';
import { createDeck, drawVira, shuffleDeck } from './deck';
import { getInitialLives, getManilha, validateLastBid } from './game-rules';
import {
  GameRoomClientSnapshot,
  GameRoomSnapshot,
  LastTrickResultSnapshot,
  Player,
  RoomStatus,
} from './game-state.types';
import { PlayedCard, resolveTrick } from './trick-rules';

export class GameRoomState {
  private readonly id: string;
  private readonly code: string;

  private status: RoomStatus = 'LOBBY';
  private players: Player[] = [];
  private hostPlayerId: string | null = null;

  private initialLives: number | null = null;
  private roundNumber = 0;
  private maxCardsInRound: number | null = null;

  private deck: Card[] = [];
  private vira: Card | null = null;
  private manilha: CardValue | null = null;

  private currentBidIndex = 0;

  private currentTrickNumber = 0;
  private currentTrickPlayerIds: string[] = [];
  private currentTrickTurnIndex = 0;
  private currentTrickCards: PlayedCard[] = [];
  private currentTrickMeltedCards: PlayedCard[] = [];
  private lastTrickWinnerPlayerId: string | null = null;
  private lastTrickResult: LastTrickResultSnapshot | null = null;
  private winnerPlayerId: string | null = null;

  constructor(code: string) {
    this.id = randomUUID();
    this.code = code;
  }

  addPlayer(name: string, isHost = false): Player {
    if (this.status !== 'LOBBY') {
      throw new Error('Não é possível entrar em uma partida já iniciada.');
    }

    if (this.players.length >= 8) {
      throw new Error('A sala já possui o máximo de 8 jogadores.');
    }

    const player: Player = {
      id: randomUUID(),
      name,
      seat: this.players.length,
      lives: 0,
      isAlive: true,
      hand: [],
      bid: null,
      tricksWon: 0,
    };

    this.players.push(player);

    if (isHost) {
      this.hostPlayerId = player.id;
    }

    return player;
  }

  startGame(requesterPlayerId?: string): void {
    if (
      this.hostPlayerId &&
      requesterPlayerId &&
      requesterPlayerId !== this.hostPlayerId
    ) {
      throw new Error('Apenas o dono da sala pode iniciar a partida.');
    }
    if (this.status !== 'LOBBY') {
      throw new Error('A partida já foi iniciada.');
    }

    if (this.players.length < 2) {
      throw new Error('A partida precisa de pelo menos 2 jogadores.');
    }

    if (this.players.length > 8) {
      throw new Error('A partida pode ter no máximo 8 jogadores.');
    }

    this.initialLives = getInitialLives(this.players.length, 5);

    this.players = this.players.map((player) => ({
      ...player,
      lives: this.initialLives!,
      isAlive: true,
      hand: [],
      bid: null,
      tricksWon: 0,
    }));

    this.startRound();
  }

  playAgain(requesterPlayerId: string): void {
    if (this.status !== 'GAME_END') {
      throw new Error('Só é possível jogar novamente após o fim da partida.');
    }

    if (this.hostPlayerId !== requesterPlayerId) {
      throw new Error('Apenas o dono da sala pode iniciar uma nova partida.');
    }

    this.status = 'LOBBY';
    this.initialLives = null;
    this.roundNumber = 0;
    this.maxCardsInRound = null;
    this.deck = [];
    this.vira = null;
    this.manilha = null;
    this.currentBidIndex = 0;
    this.currentTrickNumber = 0;
    this.currentTrickPlayerIds = [];
    this.currentTrickTurnIndex = 0;
    this.currentTrickCards = [];
    this.currentTrickMeltedCards = [];
    this.lastTrickWinnerPlayerId = null;
    this.lastTrickResult = null;
    this.winnerPlayerId = null;
    this.players = this.players.map((player) => ({
      ...player,
      lives: 0,
      isAlive: true,
      hand: [],
      bid: null,
      tricksWon: 0,
    }));
  }

  startNextRound(): void {
    if (this.status !== 'ROUND_END') {
      throw new Error(
        'A próxima rodada só pode iniciar após o fim da rodada atual.',
      );
    }

    this.startRound();
  }

  private startRound(): void {
    const alivePlayers = this.getAlivePlayers();

    this.roundNumber += 1;
    this.status = 'BIDDING';
    this.currentBidIndex = 0;

    this.currentTrickNumber = 0;
    this.currentTrickPlayerIds = [];
    this.currentTrickTurnIndex = 0;
    this.currentTrickCards = [];
    this.currentTrickMeltedCards = [];
    this.lastTrickWinnerPlayerId = null;
    this.lastTrickResult = null;
    this.winnerPlayerId = null;

    this.maxCardsInRound = Math.max(
      ...alivePlayers.map((player) => player.lives),
    );

    const shuffledDeck = shuffleDeck(createDeck());
    const { vira, remainingDeck } = drawVira(shuffledDeck);

    this.vira = vira;
    this.manilha = getManilha(vira.value);
    this.deck = remainingDeck;

    this.players = this.players.map((player) => ({
      ...player,
      hand: [],
      bid: null,
      tricksWon: 0,
    }));

    this.dealCards();
  }

  private dealCards(): void {
    let deckIndex = 0;

    this.players = this.players.map((player) => {
      if (!player.isAlive) {
        return {
          ...player,
          hand: [],
        };
      }

      const cardsToDeal = player.lives;
      const hand = this.deck.slice(deckIndex, deckIndex + cardsToDeal);

      deckIndex += cardsToDeal;

      return {
        ...player,
        hand,
      };
    });
  }

  placeBid(playerId: string, bid: number): void {
    if (this.status !== 'BIDDING') {
      throw new Error('A rodada não está na fase de apostas.');
    }

    const alivePlayers = this.getAlivePlayers();
    const currentPlayer = alivePlayers[this.currentBidIndex];

    if (!currentPlayer) {
      throw new Error('Não há jogador atual para apostar.');
    }

    if (currentPlayer.id !== playerId) {
      throw new Error('Ainda não é a vez desse jogador apostar.');
    }

    if (bid < 0) {
      throw new Error('A aposta não pode ser negativa.');
    }

    if (bid > currentPlayer.lives) {
      throw new Error(
        'A aposta não pode ser maior que a quantidade de cartas do jogador.',
      );
    }

    const isLastBidder = this.currentBidIndex === alivePlayers.length - 1;

    if (isLastBidder) {
      const previousBids = alivePlayers
        .filter((player) => player.id !== playerId)
        .map((player) => player.bid)
        .filter((value): value is number => value !== null);

      validateLastBid({
        previousBids,
        lastBid: bid,
        maxCardsInRound: this.maxCardsInRound!,
      });
    }

    this.players = this.players.map((player) => {
      if (player.id !== playerId) {
        return player;
      }

      return {
        ...player,
        bid,
      };
    });

    if (isLastBidder) {
      this.status = 'PLAYING';
      this.startNextTrick();
      return;
    }

    this.currentBidIndex += 1;
  }

  playCard(playerId: string, cardId: string): void {
    if (this.status !== 'PLAYING') {
      throw new Error('A rodada não está na fase de jogar cartas.');
    }

    const currentPlayerId = this.getCurrentTurnPlayerId();

    if (!currentPlayerId) {
      throw new Error('Não há jogador atual para jogar.');
    }

    if (currentPlayerId !== playerId) {
      throw new Error('Ainda não é a vez desse jogador jogar carta.');
    }

    const player = this.players.find((current) => current.id === playerId);

    if (!player) {
      throw new Error('Jogador não encontrado.');
    }

    const card = player.hand.find((currentCard) => currentCard.id === cardId);

    if (!card) {
      throw new Error('Carta não encontrada na mão do jogador.');
    }

    this.players = this.players.map((currentPlayer) => {
      if (currentPlayer.id !== playerId) {
        return currentPlayer;
      }

      return {
        ...currentPlayer,
        hand: currentPlayer.hand.filter(
          (currentCard) => currentCard.id !== cardId,
        ),
      };
    });

    this.currentTrickCards.push({
      playerId,
      card,
      playedAt: Date.now(),
    });

    const allPlayersInTrickPlayed =
      this.currentTrickCards.length === this.currentTrickPlayerIds.length;

    if (allPlayersInTrickPlayed) {
      this.resolveCurrentTrick();
      return;
    }

    this.currentTrickTurnIndex += 1;
  }

  getSnapshot(): GameRoomSnapshot {
    const alivePlayers = this.getAlivePlayers();
    const currentBidPlayer =
      this.status === 'BIDDING' ? alivePlayers[this.currentBidIndex] : null;

    return {
      id: this.id,
      code: this.code,
      status: this.status,
      players: this.players,
      hostPlayerId: this.hostPlayerId,
      initialLives: this.initialLives,
      roundNumber: this.roundNumber,
      maxCardsInRound: this.maxCardsInRound,
      vira: this.vira,
      manilha: this.manilha,
      currentBidPlayerId: currentBidPlayer?.id ?? null,
      currentTurnPlayerId: this.getCurrentTurnPlayerId(),
      currentTrickNumber: this.currentTrickNumber,
      currentTrickCards: this.currentTrickCards,
      currentTrickMeltedCards: this.currentTrickMeltedCards,
      lastTrickWinnerPlayerId: this.lastTrickWinnerPlayerId,
      lastTrickResult: this.lastTrickResult,
      winnerPlayerId: this.winnerPlayerId,
    };
  }

  getClientSnapshot(viewerPlayerId?: string | null): GameRoomClientSnapshot {
    const snapshot = this.getSnapshot();

    return {
      ...snapshot,
      players: snapshot.players.map((player) => ({
        id: player.id,
        name: player.name,
        seat: player.seat,
        lives: player.lives,
        isAlive: player.isAlive,
        hand: player.id === viewerPlayerId ? player.hand : [],
        cardCount: player.hand.length,
        bid: player.bid,
        tricksWon: player.tricksWon,
        isCurrentUser: player.id === viewerPlayerId,
        isHost: player.id === this.hostPlayerId,
      })),
    };
  }

  private startNextTrick(preferredStarterPlayerId?: string | null): void {
    const playersWithCards = this.getAlivePlayersWithCards();

    if (playersWithCards.length === 0) {
      this.finishRound();
      return;
    }

    this.currentTrickNumber += 1;
    this.currentTrickCards = [];
    this.currentTrickMeltedCards = [];
    this.currentTrickTurnIndex = 0;

    const orderedPlayers = this.rotatePlayersByStarter(
      playersWithCards,
      preferredStarterPlayerId,
    );

    this.currentTrickPlayerIds = orderedPlayers.map((player) => player.id);
  }

  private resolveCurrentTrick(): void {
    if (!this.manilha) {
      throw new Error('Manilha não definida.');
    }

    const result = resolveTrick(this.currentTrickCards, this.manilha);

    this.currentTrickMeltedCards = result.meltedCards;
    this.lastTrickWinnerPlayerId = result.winnerPlayerId;

    this.lastTrickResult = {
      trickNumber: this.currentTrickNumber,
      playedCards: [...this.currentTrickCards],
      validCards: result.validCards,
      meltedCards: result.meltedCards,
      winnerPlayerId: result.winnerPlayerId,
      winningCard: result.winningCard,
    };

    if (result.winnerPlayerId) {
      this.players = this.players.map((player) => {
        if (player.id !== result.winnerPlayerId) {
          return player;
        }

        return {
          ...player,
          tricksWon: player.tricksWon + 1,
        };
      });
    }

    this.startNextTrick(result.winnerPlayerId);
  }

  private finishRound(): void {
    this.players = this.players.map((player) => {
      if (!player.isAlive) {
        return player;
      }

      const playerHitBid = player.bid === player.tricksWon;
      const newLives = playerHitBid ? player.lives : player.lives - 1;

      return {
        ...player,
        lives: Math.max(newLives, 0),
        isAlive: newLives > 0,
        hand: [],
      };
    });

    const alivePlayers = this.getAlivePlayers();

    if (alivePlayers.length <= 1) {
      this.status = 'GAME_END';
      this.winnerPlayerId = alivePlayers[0]?.id ?? null;
      return;
    }

    this.status = 'ROUND_END';
  }

  private getCurrentTurnPlayerId(): string | null {
    if (this.status !== 'PLAYING') {
      return null;
    }

    return this.currentTrickPlayerIds[this.currentTrickTurnIndex] ?? null;
  }

  private getAlivePlayers(): Player[] {
    return this.players
      .filter((player) => player.isAlive)
      .sort((a, b) => a.seat - b.seat);
  }

  private getAlivePlayersWithCards(): Player[] {
    return this.getAlivePlayers().filter((player) => player.hand.length > 0);
  }

  private rotatePlayersByStarter(
    players: Player[],
    preferredStarterPlayerId?: string | null,
  ): Player[] {
    if (!preferredStarterPlayerId) {
      return players;
    }

    const starter = this.players.find(
      (player) => player.id === preferredStarterPlayerId,
    );

    if (!starter) {
      return players;
    }

    const exactStarterIndex = players.findIndex(
      (player) => player.id === preferredStarterPlayerId,
    );

    if (exactStarterIndex !== -1) {
      return [
        ...players.slice(exactStarterIndex),
        ...players.slice(0, exactStarterIndex),
      ];
    }

    const nextStarterIndex = players.findIndex(
      (player) => player.seat > starter.seat,
    );

    if (nextStarterIndex !== -1) {
      return [
        ...players.slice(nextStarterIndex),
        ...players.slice(0, nextStarterIndex),
      ];
    }

    return players;
  }
}
