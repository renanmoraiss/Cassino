import { CARD_VALUES, CardValue } from './card.types';

export function getManilha(vira: CardValue): CardValue {
  const viraIndex = CARD_VALUES.indexOf(vira);

  if (viraIndex === -1) {
    throw new Error('Vira inválido.');
  }

  const nextIndex = (viraIndex + 1) % CARD_VALUES.length;

  return CARD_VALUES[nextIndex];
}

export function getMaxCardsPerPlayer(playerCount: number): number {
  const totalCards = 40;
  const viraCards = 1;

  if (playerCount < 3 || playerCount > 8) {
    throw new Error('A mesa deve ter entre 3 e 8 jogadores.');
  }

  return Math.floor((totalCards - viraCards) / playerCount);
}

export function getInitialLives(
  playerCount: number,
  preferredLives = 5,
): number {
  const maxCardsPerPlayer = getMaxCardsPerPlayer(playerCount);

  return Math.min(preferredLives, maxCardsPerPlayer);
}

export function validateLastBid(params: {
  previousBids: number[];
  lastBid: number;
  maxCardsInRound: number;
}): void {
  const { previousBids, lastBid, maxCardsInRound } = params;

  if (lastBid < 0) {
    throw new Error('A aposta não pode ser negativa.');
  }

  if (lastBid > maxCardsInRound) {
    throw new Error(
      'A aposta não pode ser maior que o número de cartas da rodada.',
    );
  }

  const previousSum = previousBids.reduce((sum, bid) => sum + bid, 0);
  const finalSum = previousSum + lastBid;

  if (finalSum === maxCardsInRound) {
    throw new Error(
      `A aposta ${lastBid} não é permitida, pois a soma final ficaria ${maxCardsInRound}.`,
    );
  }
}
