import { Controller, Get, Post, Body, Param, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.auth.guard';
import { MessagesService } from './messages.service';

@Controller('messages')
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(private readonly service: MessagesService) {}

  @Get(':conversationId')
  list(@Param('conversationId') id: string, @Req() req: any) {
    return this.service.list(id, req.user.id);
  }

  @Post()
  create(@Body() body: any) {
    return this.service.create(body);
  }
}