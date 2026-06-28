export type CardValue =
  "4" | "5" | "6" | "7" | "Q" | "J" | "K" | "A" | "2" | "3";

export type CardSuit = "ouros" | "espadas" | "copas" | "paus";

export type Card = {
  id: string;
  value: CardValue;
  suit: CardSuit;
};

export type RoomStatus =
  "LOBBY" | "BIDDING" | "PLAYING" | "ROUND_END" | "GAME_END";

export type PlayerClientSnapshot = {
  id: string;
  name: string;
  seat: number;
  lives: number;
  isAlive: boolean;
  hand: Card[];
  cardCount: number;
  bid: number | null;
  tricksWon: number;
  isCurrentUser: boolean;
  isHost: boolean;
};

export type PlayedCard = {
  playerId: string;
  card: Card;
  playedAt: number;
};

export type LastTrickResultSnapshot = {
  trickNumber: number;
  playedCards: PlayedCard[];
  validCards: PlayedCard[];
  meltedCards: PlayedCard[];
  winnerPlayerId: string | null;
  winningCard: PlayedCard | null;
};

export type GameRoomClientSnapshot = {
  id: string;
  code: string;
  status: RoomStatus;
  players: PlayerClientSnapshot[];
  hostPlayerId: string | null;
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
  isShowingTrickResult: boolean;
};

export type JoinedPlayer = {
  id: string;
  name: string;
  seat: number;
  lives: number;
  isAlive: boolean;
  hand: Card[];
  bid: number | null;
  tricksWon: number;
};
