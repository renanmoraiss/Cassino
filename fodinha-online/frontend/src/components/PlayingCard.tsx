'use client';

import type { Card, CardSuit } from '@/types/game';

type CardSize = 'sm' | 'md' | 'lg';

type PlayingCardProps = {
  card: Card;
  size?: CardSize;
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
};

const SUIT_SYMBOL: Record<CardSuit, string> = {
  ouros: '♦',
  espadas: '♠',
  copas: '♥',
  paus: '♣',
};

const SUIT_LABEL: Record<CardSuit, string> = {
  ouros: 'Ouros',
  espadas: 'Espadas',
  copas: 'Copas',
  paus: 'Paus',
};

const SIZE_CLASSES: Record<
  CardSize,
  {
    card: string;
    value: string;
    suit: string;
  }
> = {
  sm: {
    card: 'h-20 w-14 rounded-xl',
    value: 'text-2xl',
    suit: 'text-3xl',
  },
  md: {
    card: 'h-28 w-20 rounded-2xl',
    value: 'text-3xl',
    suit: 'text-4xl',
  },
  lg: {
    card: 'h-36 w-24 rounded-2xl',
    value: 'text-4xl',
    suit: 'text-5xl',
  },
};

export function PlayingCard({
  card,
  size = 'md',
  disabled = false,
  onClick,
  className = '',
}: PlayingCardProps) {
  const sizeClasses = SIZE_CLASSES[size];

  const suitColor =
    card.suit === 'copas' || card.suit === 'ouros'
      ? 'text-red-600'
      : 'text-slate-950';

  const content = (
    <div
      className={[
        'flex shrink-0 flex-col items-center justify-center gap-1 border-2 border-slate-200 bg-white shadow-xl',
        sizeClasses.card,
        disabled ? 'opacity-50' : '',
        className,
      ].join(' ')}
    >
      <span
        className={[
          'font-black leading-none text-slate-950',
          sizeClasses.value,
        ].join(' ')}
      >
        {card.value}
      </span>

      <span className={['font-black leading-none', suitColor, sizeClasses.suit].join(' ')}>
        {SUIT_SYMBOL[card.suit]}
      </span>
    </div>
  );

  if (!onClick) {
    return content;
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={`${card.value} de ${SUIT_LABEL[card.suit]}`}
      className={[
        'transition',
        disabled
          ? 'cursor-not-allowed'
          : 'cursor-pointer hover:-translate-y-2 hover:scale-105',
      ].join(' ')}
    >
      {content}
    </button>
  );
}