export type CardValue =
  '4' | '5' | '6' | '7' | 'Q' | 'J' | 'K' | 'A' | '2' | '3';

export type CardSuit = 'ouros' | 'espadas' | 'copas' | 'paus';

export type Card = {
  id: string;
  value: CardValue;
  suit: CardSuit;
};

export const CARD_VALUES: CardValue[] = [
  '4',
  '5',
  '6',
  '7',
  'Q',
  'J',
  'K',
  'A',
  '2',
  '3',
];

export const CARD_SUITS: CardSuit[] = ['ouros', 'espadas', 'copas', 'paus'];
