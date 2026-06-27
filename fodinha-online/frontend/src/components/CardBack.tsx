'use client';

type CardBackSize = 'sm' | 'md';

type CardBackProps = {
  size?: CardBackSize;
  className?: string;
};

type CardBackStackProps = {
  count: number;
  size?: CardBackSize;
  maxVisible?: number;
};

const SIZE_CLASSES: Record<CardBackSize, string> = {
  sm: 'h-20 w-14 rounded-xl',
  md: 'h-24 w-16 rounded-xl',
};

export function CardBack({ size = 'sm', className = '' }: CardBackProps) {
  return (
    <div
      className={[
        'relative shrink-0 overflow-hidden border-2 border-amber-100 bg-emerald-800 shadow-xl',
        SIZE_CLASSES[size],
        className,
      ].join(' ')}
    >
      <div className="absolute inset-1 rounded-lg border border-emerald-200/70" />

      <div className="absolute inset-3 rounded-md border border-emerald-100/40 bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.25),_transparent_55%)]" />

      <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,_rgba(255,255,255,0.16)_0px,_rgba(255,255,255,0.16)_2px,_transparent_2px,_transparent_7px)]" />

      <div className="absolute left-1/2 top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full border border-amber-100/70" />
    </div>
  );
}

export function CardBackStack({
  count,
  size = 'sm',
  maxVisible = 6,
}: CardBackStackProps) {
  const visibleCards = Math.min(count, maxVisible);

  if (count <= 0) {
    return <p className="text-xs font-bold text-emerald-200">Sem cartas</p>;
  }

  return (
    <div className="flex items-center justify-center">
      {Array.from({ length: visibleCards }, (_, index) => {
        const offset = index === 0 ? 0 : -26;
        const rotation = (index - (visibleCards - 1) / 2) * 4;

        return (
          <div
            key={index}
            style={{
              marginLeft: offset,
              transform: `rotate(${rotation}deg)`,
              zIndex: index,
            }}
          >
            <CardBack size={size} />
          </div>
        );
      })}

      {count > maxVisible && (
        <span className="ml-2 rounded-full bg-amber-300 px-2 py-1 text-xs font-black text-emerald-950">
          +{count - maxVisible}
        </span>
      )}
    </div>
  );
}