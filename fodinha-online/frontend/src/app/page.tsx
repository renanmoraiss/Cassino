"use client";

import { useEffect, useMemo, useState } from "react";
import { io, Socket } from "socket.io-client";
import { PlayerSeat } from "@/components/PlayerSeat";
import { PlayingCard } from "@/components/PlayingCard";
import type { GameRoomClientSnapshot, JoinedPlayer } from "@/types/game";

type RoomJoinedPayload = {
  player: JoinedPlayer;
  room: GameRoomClientSnapshot;
};

type StoredSession = {
  roomCode: string;
  playerId: string;
  name: string;
};

const SESSION_STORAGE_KEY = "fodinha-online-session";

function saveSession(session: StoredSession) {
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

function getStoredSession(): StoredSession | null {
  const storedSession = localStorage.getItem(SESSION_STORAGE_KEY);

  if (!storedSession) {
    return null;
  }

  try {
    return JSON.parse(storedSession) as StoredSession;
  } catch {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    return null;
  }
}

export default function Home() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [room, setRoom] = useState<GameRoomClientSnapshot | null>(null);
  const [player, setPlayer] = useState<JoinedPlayer | null>(null);

  const [name, setName] = useState("");
  const [roomCodeInput, setRoomCodeInput] = useState("");
  const [createdRoomCode, setCreatedRoomCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);

  const currentUser = useMemo(() => {
    return room?.players.find((item) => item.isCurrentUser) ?? null;
  }, [room]);

  const opponents = useMemo(() => {
    return room?.players.filter((item) => !item.isCurrentUser) ?? [];
  }, [room]);

  const topOpponents = opponents.slice(0, 3);
  const remainingOpponents = opponents.slice(3);
  const leftOpponents = remainingOpponents.filter(
    (_, index) => index % 2 === 0,
  );
  const rightOpponents = remainingOpponents.filter(
    (_, index) => index % 2 === 1,
  );

  const isMyBidTurn = Boolean(
    room && currentUser && room.currentBidPlayerId === currentUser.id,
  );

  const isMyPlayTurn = Boolean(
    room && currentUser && room.currentTurnPlayerId === currentUser.id,
  );

  const allowedBids = useMemo(() => {
    if (!room || !currentUser) {
      return [];
    }

    const bids = Array.from(
      { length: currentUser.lives + 1 },
      (_, index) => index,
    );

    if (room.status !== "BIDDING" || !isMyBidTurn) {
      return bids;
    }

    const alivePlayers = room.players.filter((item) => item.isAlive);
    const alivePlayersWithoutBid = alivePlayers.filter(
      (item) => item.bid === null,
    );

    const isLastBidder = alivePlayersWithoutBid.length === 1;

    if (!isLastBidder) {
      return bids;
    }

    const previousSum = alivePlayers.reduce((sum, item) => {
      return sum + (item.bid ?? 0);
    }, 0);

    const forbiddenBid = (room.maxCardsInRound ?? 0) - previousSum;

    return bids.filter((bid) => bid !== forbiddenBid);
  }, [room, currentUser, isMyBidTurn]);

  const winner = room?.players.find((item) => item.id === room.winnerPlayerId);

  const canStartGame = Boolean(
    room &&
    currentUser?.isHost &&
    room.status === "LOBBY" &&
    room.players.length >= 2,
  );

  const manilhaCard = room?.manilha
    ? {
        id: `manilha-${room.manilha}`,
        value: room.manilha,
        suit: "paus" as const,
      }
    : null;

  useEffect(() => {
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL;

    if (!socketUrl) {
      setError("NEXT_PUBLIC_SOCKET_URL não configurada.");
      return;
    }

    const newSocket = io(socketUrl);

    newSocket.on("connect", () => {
      console.log("Conectado ao WebSocket:", newSocket.id);

      const storedSession = getStoredSession();

      if (storedSession) {
        newSocket.emit("room:reconnect", {
          code: storedSession.roomCode,
          playerId: storedSession.playerId,
        });
      }
    });

    newSocket.on("room:left", () => {
      localStorage.removeItem(SESSION_STORAGE_KEY);
      setRoom(null);
      setPlayer(null);
      setCreatedRoomCode(null);
      setRoomCodeInput("");
      setError(null);
    });

    newSocket.on("room:created", (createdRoom: GameRoomClientSnapshot) => {
      setCreatedRoomCode(createdRoom.code);
      setRoomCodeInput(createdRoom.code);
      setRoom(createdRoom);
      setError(null);
    });

    newSocket.on("room:joined", ({ player, room }: RoomJoinedPayload) => {
      setPlayer(player);
      setRoom(room);
      setCreatedRoomCode(room.code);
      setRoomCodeInput(room.code);
      setName(player.name);
      setError(null);

      saveSession({
        roomCode: room.code,
        playerId: player.id,
        name: player.name,
      });
    });

    newSocket.on("room:reconnected", ({ player, room }: RoomJoinedPayload) => {
      setPlayer(player);
      setRoom(room);
      setCreatedRoomCode(room.code);
      setRoomCodeInput(room.code);
      setName(player.name);
      setError(null);

      saveSession({
        roomCode: room.code,
        playerId: player.id,
        name: player.name,
      });
    });

    newSocket.on("room:updated", (updatedRoom: GameRoomClientSnapshot) => {
      setRoom(updatedRoom);
      setError(null);
    });

    newSocket.on("game:error", (payload: { message: string }) => {
      setError(payload.message);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  function handleCreateRoom() {
    if (!socket) return;

    setError(null);
    socket.emit("room:create");
  }

  function handleLeaveRoom() {
    if (!socket || !room) return;

    socket.emit("room:leave", {
      code: room.code,
    });
  }

  function handleJoinRoom() {
    if (!socket) return;

    if (!name.trim()) {
      setError("Digite seu nome.");
      return;
    }

    if (!roomCodeInput.trim()) {
      setError("Digite o código da sala.");
      return;
    }

    setError(null);

    socket.emit("room:join", {
      code: roomCodeInput.trim().toUpperCase(),
      name: name.trim(),
    });
  }

  function handlePlayAgain() {
    if (!socket || !room) return;

    socket.emit("game:play-again", {
      code: room.code,
    });
  }

  function handleStartGame() {
    if (!socket || !room) return;

    socket.emit("game:start", {
      code: room.code,
    });
  }

  function handlePlaceBid(bid: number) {
    if (!socket || !room) return;

    socket.emit("bid:place", {
      code: room.code,
      bid,
    });
  }

  function handlePlayCard(cardId: string) {
    if (!socket || !room) return;

    socket.emit("card:play", {
      code: room.code,
      cardId,
    });
  }

  function handleNextRound() {
    if (!socket || !room) return;

    socket.emit("round:next", {
      code: room.code,
    });
  }

  async function handleCopyRoomCode() {
    if (!room) return;

    try {
      await navigator.clipboard.writeText(room.code);
      setCodeCopied(true);

      setTimeout(() => {
        setCodeCopied(false);
      }, 1500);
    } catch {
      setError("Não foi possível copiar o código da sala.");
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_center,_#064e3b_0%,_#022c22_45%,_#011a14_100%)] text-white">
      <div className="mx-auto flex min-h-screen max-w-[1600px] flex-col px-4 py-5">
        {!player && (
          <section className="mx-auto flex min-h-screen w-full max-w-5xl items-center">
            <div className="grid w-full gap-6 rounded-[2rem] border border-amber-400/30 bg-emerald-950/70 p-8 shadow-2xl backdrop-blur md:grid-cols-2">
              <div className="flex flex-col justify-between rounded-3xl border border-emerald-700 bg-emerald-900/60 p-6">
                <div>
                  <p className="text-sm uppercase tracking-[0.4em] text-amber-300">
                    Fodinha Online
                  </p>
                  <h1 className="mt-3 text-4xl font-black md:text-6xl">
                    Crie sua mesa
                  </h1>
                  <p className="mt-4 text-emerald-100">
                    Monte uma sala e chame seus amigos para jogar.
                  </p>
                </div>

                <div className="mt-8">
                  <button
                    onClick={handleCreateRoom}
                    className="rounded-xl bg-amber-400 px-5 py-3 font-bold text-emerald-950 transition hover:bg-amber-300"
                  >
                    Criar nova sala
                  </button>

                  {createdRoomCode && (
                    <p className="mt-4 text-emerald-100">
                      Sala criada:{" "}
                      <strong className="text-amber-300">
                        {createdRoomCode}
                      </strong>
                    </p>
                  )}

                  <p className="mt-3 text-sm text-emerald-200">
                    Depois de criar, entre com seu nome para virar o host da
                    sala.
                  </p>
                </div>
              </div>

              <div className="rounded-3xl border border-emerald-700 bg-emerald-950/80 p-6">
                <h2 className="mb-5 text-2xl font-black">Entrar na sala</h2>

                {error && (
                  <div className="mb-5 rounded-xl border border-red-400 bg-red-950/60 px-4 py-3 text-red-100">
                    {error}
                  </div>
                )}

                <div className="flex flex-col gap-3">
                  <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Seu nome"
                    className="rounded-xl border border-emerald-700 bg-emerald-950 px-4 py-3 outline-none placeholder:text-emerald-400 focus:border-amber-300"
                  />

                  <input
                    value={roomCodeInput}
                    onChange={(event) =>
                      setRoomCodeInput(event.target.value.toUpperCase())
                    }
                    placeholder="Código da sala"
                    className="rounded-xl border border-emerald-700 bg-emerald-950 px-4 py-3 uppercase outline-none placeholder:text-emerald-400 focus:border-amber-300"
                  />

                  <button
                    onClick={handleJoinRoom}
                    className="rounded-xl bg-white px-5 py-3 font-bold text-emerald-950 transition hover:bg-emerald-100"
                  >
                    Entrar
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        {player && room && (
          <section className="grid flex-1 gap-5 lg:grid-cols-[310px_1fr]">
            <aside className="flex flex-col gap-2">
              <section className="rounded-3xl border border-amber-400/30 bg-emerald-950/75 p-3 shadow-2xl backdrop-blur">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-3xl font-black">{room.code}</p>

                  <button
                    onClick={handleCopyRoomCode}
                    className="rounded-xl bg-white px-3 py-2 text-xs font-black text-emerald-950 transition hover:bg-emerald-100"
                  >
                    {codeCopied ? "Copiado!" : "Copiar"}
                  </button>
                </div>

                {room.status === "LOBBY" && (
                  <button
                    onClick={handleLeaveRoom}
                    className="mt-3 w-full rounded-xl border border-red-300/40 bg-red-500/15 px-4 py-2 text-sm font-black text-red-200 transition hover:bg-red-500/25"
                  >
                    Sair da sala
                  </button>
                )}
              </section>

              <section className="rounded-3xl border border-amber-400/30 bg-emerald-950/75 p-3 shadow-2xl backdrop-blur">
                <div className="flex flex-col gap-2">
                  {room.players.map((roomPlayer) => (
                    <div
                      key={roomPlayer.id}
                      className={[
                        "rounded-2xl border px-3 py-2",
                        roomPlayer.isCurrentUser
                          ? "border-amber-300 bg-amber-300/10"
                          : "border-emerald-700 bg-emerald-900/50",
                        !roomPlayer.isAlive && room.status !== "LOBBY"
                          ? "opacity-50"
                          : "",
                      ].join(" ")}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-bold">{roomPlayer.name}</p>

                        <div className="flex gap-1">
                          {roomPlayer.isHost && (
                            <span className="rounded-full bg-amber-300 px-2 py-1 text-[10px] font-black text-emerald-950">
                              host
                            </span>
                          )}

                          {roomPlayer.isCurrentUser && (
                            <span className="rounded-full bg-white px-2 py-1 text-[10px] font-black text-emerald-950">
                              você
                            </span>
                          )}
                        </div>
                      </div>

                      {room.status !== "LOBBY" && (
                        <div className="mt-2 flex flex-col gap-1">
                          <div className="flex flex-wrap gap-1">
                            {roomPlayer.lives > 0 ? (
                              Array.from(
                                { length: roomPlayer.lives },
                                (_, index) => (
                                  <span
                                    key={index}
                                    className="text-base leading-none"
                                  >
                                    ❤️
                                  </span>
                                ),
                              )
                            ) : (
                              <span className="text-sm font-bold text-red-300">
                                Eliminado
                              </span>
                            )}
                          </div>
                          <p className="text-sm font-black text-amber-300">
                            {roomPlayer.tricksWon}/{roomPlayer.bid ?? "-"}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="mt-3 flex flex-col gap-2">
                  {room.status === "LOBBY" && currentUser?.isHost && (
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={handleStartGame}
                        disabled={!canStartGame}
                        className={[
                          "rounded-xl px-4 py-3 font-black transition",
                          canStartGame
                            ? "bg-amber-400 text-emerald-950 hover:bg-amber-300"
                            : "cursor-not-allowed bg-emerald-800 text-emerald-300",
                        ].join(" ")}
                      >
                        Iniciar partida
                      </button>

                      {!canStartGame && (
                        <p className="text-xs font-bold text-emerald-200 text-center">
                          A mesa precisa de pelo menos 2 jogadores.
                        </p>
                      )}
                    </div>
                  )}

                  {room.status === "LOBBY" && !currentUser?.isHost && (
                    <p className="rounded-xl bg-emerald-900/80 px-4 py-3 text-sm text-emerald-100">
                      Aguardando o host iniciar a partida.
                    </p>
                  )}

                  {room.status === "ROUND_END" && (
                    <button
                      onClick={handleNextRound}
                      className="rounded-xl bg-amber-400 px-4 py-3 font-black text-emerald-950 transition hover:bg-amber-300"
                    >
                      Próxima rodada
                    </button>
                  )}
                </div>
              </section>

              {room.status !== "LOBBY" && room.vira && manilhaCard && (
                <section className="rounded-3xl border border-amber-400/30 bg-emerald-950/75 p-4 shadow-2xl backdrop-blur">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-emerald-900/70 p-3 text-center">
                      <h2 className="mb-3 text-sm font-black uppercase tracking-[0.2em] text-amber-200">
                        Vira
                      </h2>

                      <div className="flex justify-center">
                        <PlayingCard card={room.vira} size="sm" />
                      </div>
                    </div>

                    <div className="rounded-2xl bg-emerald-900/70 p-3 text-center">
                      <h2 className="mb-3 text-sm font-black uppercase tracking-[0.2em] text-amber-200">
                        Manilha
                      </h2>

                      <div className="flex justify-center">
                        <PlayingCard card={manilhaCard} size="sm" />
                      </div>
                    </div>
                  </div>
                </section>
              )}
            </aside>

            <section className="relative min-h-[500px] overflow-hidden rounded-[2rem] border border-amber-400/30 bg-[radial-gradient(circle_at_center,_#047857_0%,_#065f46_35%,_#022c22_80%)] shadow-2xl">
              <div className="absolute inset-4 rounded-[2rem] border border-amber-400/20" />
              <div className="absolute inset-12 rounded-full border border-emerald-300/10" />

              <div className="absolute left-6 right-6 top-3 z-10 flex flex-wrap justify-center gap-3">
                {topOpponents.map((opponent) => (
                  <PlayerSeat
                    key={opponent.id}
                    player={opponent}
                    status={room.status}
                    isBidTurn={room.currentBidPlayerId === opponent.id}
                    isPlayTurn={room.currentTurnPlayerId === opponent.id}
                  />
                ))}
              </div>

              <div className="absolute left-5 top-1/2 z-10 flex -translate-y-1/2 flex-col gap-4">
                {leftOpponents.map((opponent) => (
                  <PlayerSeat
                    key={opponent.id}
                    player={opponent}
                    status={room.status}
                    isBidTurn={room.currentBidPlayerId === opponent.id}
                    isPlayTurn={room.currentTurnPlayerId === opponent.id}
                  />
                ))}
              </div>

              <div className="absolute right-5 top-1/2 z-10 flex -translate-y-1/2 flex-col gap-4">
                {rightOpponents.map((opponent) => (
                  <PlayerSeat
                    key={opponent.id}
                    player={opponent}
                    status={room.status}
                    isBidTurn={room.currentBidPlayerId === opponent.id}
                    isPlayTurn={room.currentTurnPlayerId === opponent.id}
                  />
                ))}
              </div>

              <div className="absolute left-1/2 top-[40%] z-10 flex w-[88%] max-w-[420px] -translate-x-1/2 -translate-y-1/2 flex-col items-center rounded-2xl border border-amber-400/30 bg-emerald-950/65 p-3 text-center shadow-2xl backdrop-blur md:top-[43%] md:w-[min(460px,62%)] md:rounded-[2rem] md:p-4">
                {error && (
                  <div className="mb-4 w-full rounded-xl border border-red-400 bg-red-950/70 px-4 py-3 text-red-100">
                    {error}
                  </div>
                )}

                {room.status === "LOBBY" && (
                  <>
                    <p className="text-3xl font-black text-amber-300">
                      Aguardando início
                    </p>
                    <p className="mt-3 text-emerald-100">
                      O host inicia a partida quando todos estiverem na mesa.
                    </p>
                  </>
                )}

                {room.status === "BIDDING" && (
                  <>
                    <p className="text-sm font-black uppercase tracking-[0.25em] text-amber-300">
                      Rodada {room.roundNumber}
                    </p>
                    <h2 className="mt-2 text-3xl font-black">Apostas</h2>
                    <div className="mt-4 w-full">
                      <p className="mb-2 text-sm font-bold text-emerald-100">
                        Sua mão
                      </p>

                      <div className="flex max-w-full flex-wrap justify-center gap-2">
                        {currentUser?.hand.map((card) => (
                          <PlayingCard key={card.id} card={card} size="sm" />
                        ))}
                      </div>
                    </div>

                    {isMyBidTurn ? (
                      <>
                        <p className="mt-3 text-emerald-100">
                          Sua vez de falar quantas rodadas você faz.
                        </p>

                        <div className="mt-5 flex flex-wrap justify-center gap-3">
                          {allowedBids.map((bid) => (
                            <button
                              key={bid}
                              onClick={() => handlePlaceBid(bid)}
                              className="h-14 w-14 rounded-2xl bg-amber-400 text-xl font-black text-emerald-950 transition hover:bg-amber-300"
                            >
                              {bid}
                            </button>
                          ))}
                        </div>
                      </>
                    ) : (
                      <p className="mt-3 text-emerald-100">
                        Aguardando outro jogador apostar...
                      </p>
                    )}
                  </>
                )}

                {room.status === "PLAYING" && (
                  <>
                    <p className="text-xs font-black uppercase tracking-[0.25em] text-amber-300">
                      Rodada {room.currentTrickNumber}
                    </p>

                    <div className="mt-3 flex flex-wrap justify-center gap-3">
                      {room.currentTrickCards.length === 0 ? (
                        <p className="text-sm text-emerald-100">
                          Nenhuma carta jogada ainda.
                        </p>
                      ) : (
                        room.currentTrickCards.map((playedCard) => {
                          const playedBy = room.players.find(
                            (item) => item.id === playedCard.playerId,
                          );

                          return (
                            <div
                              key={`${playedCard.playerId}-${playedCard.playedAt}`}
                              className="flex flex-col items-center gap-1"
                            >
                              <p className="rounded-full bg-emerald-900 px-2 py-1 text-[10px] font-black text-emerald-100">
                                {playedBy?.name ?? "Jogador"}
                              </p>
                              <PlayingCard card={playedCard.card} size="sm" />
                            </div>
                          );
                        })
                      )}
                    </div>
                  </>
                )}

                {room.status === "ROUND_END" && (
                  <>
                    <h2 className="text-3xl font-black text-amber-300">
                      Resultado da rodada
                    </h2>

                    <div className="mt-5 grid w-full gap-3 md:grid-cols-3">
                      {room.players.map((roomPlayer) => (
                        <div
                          key={roomPlayer.id}
                          className="rounded-2xl bg-emerald-900/80 p-4"
                        >
                          <h3 className="font-black">{roomPlayer.name}</h3>
                          <p className="mt-2 text-sm text-emerald-100">
                            Apostou: {roomPlayer.bid ?? "-"}
                          </p>
                          <p className="text-sm text-emerald-100">
                            Fez: {roomPlayer.tricksWon}
                          </p>
                          <p className="text-sm text-emerald-100">
                            Vidas: {roomPlayer.lives}
                          </p>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {room.status === "GAME_END" && (
                  <>
                    <h2 className="text-4xl font-black text-amber-300">
                      Fim de jogo
                    </h2>

                    <p className="mt-3 text-2xl">
                      Vencedor:{" "}
                      <strong className="text-amber-300">
                        {winner?.name ?? "Indefinido"}
                      </strong>
                    </p>

                    {currentUser?.isHost ? (
                      <button
                        onClick={handlePlayAgain}
                        className="mt-6 rounded-xl bg-amber-400 px-5 py-3 font-black text-emerald-950 transition hover:bg-amber-300"
                      >
                        Jogar novamente
                      </button>
                    ) : (
                      <p className="mt-5 rounded-xl bg-emerald-900/80 px-4 py-3 text-sm text-emerald-100">
                        Aguardando o dono da sala iniciar uma nova partida.
                      </p>
                    )}
                  </>
                )}
              </div>

              {room.status !== "BIDDING" && (
                <div className="absolute bottom-2 left-1/2 z-20 flex w-[92%] -translate-x-1/2 flex-col items-center">
                  {currentUser && (
                    <div className="mb-2 rounded-xl border border-amber-400/50 bg-emerald-950/80 px-4 py-1 shadow-xl">
                      <p className="font-black text-amber-300">
                        {currentUser.name}
                        {currentUser.isHost ? " (host)" : ""}
                      </p>
                    </div>
                  )}

                  {room.status === "LOBBY" ? (
                    <div className="rounded-2xl bg-emerald-950/70 px-5 py-4 text-center">
                      <p className="text-emerald-100">
                        Você está na mesa. Aguarde o início da partida.
                      </p>
                    </div>
                  ) : (
                    <>
                      {currentUser && currentUser.hand.length > 0 ? (
                        <>
                          {room.status === "PLAYING" && (
                            <div
                              className={[
                                "mb-2 rounded-xl px-4 py-2 text-sm font-black shadow-xl",
                                isMyPlayTurn
                                  ? "bg-amber-400 text-emerald-950"
                                  : "bg-emerald-950/85 text-emerald-100",
                              ].join(" ")}
                            >
                              {isMyPlayTurn
                                ? "Sua vez de jogar"
                                : "Aguardando outro jogador jogar"}
                            </div>
                          )}

                          <div className="flex max-w-full flex-wrap justify-center gap-2">
                            {currentUser.hand.map((card) =>
                              room.status === "PLAYING" ? (
                                <PlayingCard
                                  key={card.id}
                                  card={card}
                                  size="sm"
                                  disabled={!isMyPlayTurn}
                                  onClick={() => handlePlayCard(card.id)}
                                />
                              ) : (
                                <PlayingCard
                                  key={card.id}
                                  card={card}
                                  size="sm"
                                />
                              ),
                            )}
                          </div>
                        </>
                      ) : (
                        <div className="rounded-2xl bg-emerald-950/70 px-5 py-4 text-center">
                          <p className="text-emerald-100">
                            Você está sem cartas nesta rodada.
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </section>
          </section>
        )}
      </div>
    </main>
  );
}
