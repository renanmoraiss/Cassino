import { CARD_VALUES, Card, CardSuit, CardValue } from './card.types';

export type PlayedCard = {
  playerId: string;
  card: Card;
  playedAt: number;
};

export type TrickResult = {
  validCards: PlayedCard[];
  meltedCards: PlayedCard[];
  winnerPlayerId: string | null;
  winningCard: PlayedCard | null;
};

const SUIT_STRENGTH: Record<CardSuit, number> = {
  ouros: 0,
  espadas: 1,
  copas: 2,
  paus: 3,
};

export function removeMelaCards(
  playedCards: PlayedCard[],
  manilha: CardValue,
): {
  validCards: PlayedCard[];
  meltedCards: PlayedCard[];
} {
  const validCards: PlayedCard[] = [];
  const meltedCards: PlayedCard[] = [];

  const cardsByValue = new Map<CardValue, PlayedCard[]>();

  for (const playedCard of playedCards) {
    const cardValue = playedCard.card.value;

    if (cardValue === manilha) {
      validCards.push(playedCard);
      continue;
    }

    const group = cardsByValue.get(cardValue) ?? [];
    group.push(playedCard);
    cardsByValue.set(cardValue, group);
  }

  for (const group of cardsByValue.values()) {
    const pairsToMelt = Math.floor(group.length / 2) * 2;

    for (let i = 0; i < group.length; i++) {
      if (i < pairsToMelt) {
        meltedCards.push(group[i]);
      } else {
        validCards.push(group[i]);
      }
    }
  }

  return {
    validCards,
    meltedCards,
  };
}

export function resolveTrick(
  playedCards: PlayedCard[],
  manilha: CardValue,
): TrickResult {
  const { validCards, meltedCards } = removeMelaCards(playedCards, manilha);

  if (validCards.length === 0) {
    return {
      validCards,
      meltedCards,
      winnerPlayerId: null,
      winningCard: null,
    };
  }

  let winningCard = validCards[0];

  for (let i = 1; i < validCards.length; i++) {
    const currentCard = validCards[i];

    if (comparePlayedCards(currentCard, winningCard, manilha) > 0) {
      winningCard = currentCard;
    }
  }

  return {
    validCards,
    meltedCards,
    winnerPlayerId: winningCard.playerId,
    winningCard,
  };
}

function comparePlayedCards(
  cardA: PlayedCard,
  cardB: PlayedCard,
  manilha: CardValue,
): number {
  const aIsManilha = cardA.card.value === manilha;
  const bIsManilha = cardB.card.value === manilha;

  if (aIsManilha && !bIsManilha) {
    return 1;
  }

  if (!aIsManilha && bIsManilha) {
    return -1;
  }

  if (aIsManilha && bIsManilha) {
    return SUIT_STRENGTH[cardA.card.suit] - SUIT_STRENGTH[cardB.card.suit];
  }

  const valueStrengthA = CARD_VALUES.indexOf(cardA.card.value);
  const valueStrengthB = CARD_VALUES.indexOf(cardB.card.value);

  return valueStrengthA - valueStrengthB;
}
