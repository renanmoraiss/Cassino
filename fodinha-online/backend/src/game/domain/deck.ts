import { Card, CARD_SUITS, CARD_VALUES } from './card.types';

export function createDeck(): Card[] {
  const deck: Card[] = [];

  for (const value of CARD_VALUES) {
    for (const suit of CARD_SUITS) {
      deck.push({
        id: `${value}-${suit}`,
        value,
        suit,
      });
    }
  }

  return deck;
}

export function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck];

  for (let i = shuffled.length - 1; i > 0; i--) {
    const randomIndex = Math.floor(Math.random() * (i + 1));

    const temp = shuffled[i];
    shuffled[i] = shuffled[randomIndex];
    shuffled[randomIndex] = temp;
  }

  return shuffled;
}

export function drawVira(deck: Card[]): {
  vira: Card;
  remainingDeck: Card[];
} {
  if (deck.length === 0) {
    throw new Error('Não é possível tirar o vira de um baralho vazio.');
  }

  const [vira, ...remainingDeck] = deck;

  return {
    vira,
    remainingDeck,
  };
}
