import { Card, CardValue } from './card.types';
import { PlayedCard } from './trick-rules';

export type RoomStatus =
  'LOBBY' | 'BIDDING' | 'PLAYING' | 'ROUND_END' | 'GAME_END';

export type Player = {
  id: string;
  name: string;
  seat: number;
  lives: number;
  isAlive: boolean;
  hand: Card[];
  bid: number | null;
  tricksWon: number;
};

export type PlayerClientSnapshot = {
  id: string;
  name: string;
  isHost: boolean;
  seat: number;
  lives: number;
  isAlive: boolean;
  hand: Card[];
  cardCount: number;
  bid: number | null;
  tricksWon: number;
  isCurrentUser: boolean;
};

export type LastTrickResultSnapshot = {
  trickNumber: number;
  playedCards: PlayedCard[];
  validCards: PlayedCard[];
  meltedCards: PlayedCard[];
  winnerPlayerId: string | null;
  winningCard: PlayedCard | null;
};

export type GameRoomSnapshot = {
  id: string;
  code: string;
  status: RoomStatus;
  hostPlayerId: string | null;
  players: Player[];
  initialLives: number | null;
  roundNumber: number;
  maxCardsInRound: number | null;
  vira: Card | null;
  manilha: CardValue | null;
  currentBidPlayerId: string | null;
  currentTurnPlayerId: string | null;
  currentTrickNumber: number;
  currentTrickCards: PlayedCard[];
  currentTrickMeltedCards: PlayedCard[];
  lastTrickWinnerPlayerId: string | null;
  lastTrickResult: LastTrickResultSnapshot | null;
  winnerPlayerId: string | null;
};

export type GameRoomClientSnapshot = Omit<GameRoomSnapshot, 'players'> & {
  players: PlayerClientSnapshot[];
};
