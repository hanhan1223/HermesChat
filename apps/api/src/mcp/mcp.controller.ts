import { Controller, Get, Post, Put, Delete, Body, Param, Req, UseGuards } from '@nestjs/common';
import { McpService } from './mcp.service';
import { JwtAuthGuard } from '../auth/jwt.auth.guard';

@Controller('mcp')
@UseGuards(JwtAuthGuard)
export class McpController {
  constructor(private readonly service: McpService) {}

  @Get()
  list(@Req() req: any) {
    return this.service.list(req.user.id);
  }

  @Post()
  create(@Req() req: any, @Body() body: any) {
    return this.service.create(req.user.id, body);
  }

  @Put(':id')
  update(@Param('id') id: string, @Req() req: any, @Body() body: any) {
    return this.service.update(id, req.user.id, body);
  }

  @Delete(':id')
  delete(@Param('id') id: string, @Req() req: any) {
    return this.service.delete(id, req.user.id);
  }

  @Post(':id/connect')
  connect(@Param('id') id: string, @Req() req: any) {
    return this.service.connect(id, req.user.id);
  }
}