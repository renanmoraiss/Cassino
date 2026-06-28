"use client";

import { CardBackStack } from "@/components/CardBack";
import type { PlayerClientSnapshot, RoomStatus } from "@/types/game";

type PlayerSeatProps = {
  player: PlayerClientSnapshot;
  status: RoomStatus;
  isBidTurn: boolean;
  isPlayTurn: boolean;
};

export function PlayerSeat({
  player,
  status,
  isBidTurn,
  isPlayTurn,
}: PlayerSeatProps) {
  const isLobby = status === "LOBBY";
  const isActiveTurn = isBidTurn || isPlayTurn;

  return (
    <div
      className={[
        "flex min-w-32 flex-col items-center gap-2 rounded-2xl border px-3 py-2 shadow-2xl backdrop-blur",
        isActiveTurn
          ? "border-amber-300 bg-amber-300/15"
          : "border-emerald-600/70 bg-emerald-950/75",
        !player.isAlive && !isLobby ? "opacity-50" : "",
      ].join(" ")}
    >
      <p className="text-sm font-black text-white">{player.name}</p>

      {isLobby ? (
        <p className="text-xs font-bold text-emerald-200">Na sala</p>
      ) : (
        <CardBackStack count={player.cardCount} size="sm" />
      )}
    </div>
  );
}
