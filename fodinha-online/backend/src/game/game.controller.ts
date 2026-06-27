import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { GameService } from './game.service';

@Controller('game')
export class GameController {
  constructor(private readonly gameService: GameService) {}

  @Post('rooms')
  createRoom() {
    return this.gameService.createRoom();
  }

  @Get('rooms/:code')
  getRoom(@Param('code') code: string) {
    return this.gameService.getRoom(code);
  }

  @Post('rooms/:code/join')
  joinRoom(@Param('code') code: string, @Body('name') name: string) {
    return this.gameService.joinRoom(code, name);
  }

  @Post('rooms/:code/start')
  startGame(@Param('code') code: string) {
    return this.gameService.startGame(code);
  }

  @Post('rooms/:code/bid')
  placeBid(
    @Param('code') code: string,
    @Body('playerId') playerId: string,
    @Body('bid') bid: number,
  ) {
    return this.gameService.placeBid(code, playerId, bid);
  }

  @Post('rooms/:code/play-card')
  playCard(
    @Param('code') code: string,
    @Body('playerId') playerId: string,
    @Body('cardId') cardId: string,
  ) {
    return this.gameService.playCard(code, playerId, cardId);
  }

  @Post('rooms/:code/next-round')
  startNextRound(@Param('code') code: string) {
    return this.gameService.startNextRound(code);
  }
}
