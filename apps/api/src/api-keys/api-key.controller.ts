import { Controller, Get, Post, Delete, Patch, Body, Param, Req, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { ApiKeyService } from './api-key.service';

/**
 * API Key 管理 API
 */
@Controller('api-keys')
export class ApiKeyController {
  constructor(private readonly apiKeyService: ApiKeyService) {}

  private getUser(req: Request) {
    const user = (req as any).user;
    if (!user) throw new UnauthorizedException();
    return user;
  }

  @Get()
  async list(@Req() req: Request) {
    const user = this.getUser(req);
    return this.apiKeyService.list(user.id);
  }

  @Post()
  async create(
    @Body() body: { name: string; expiresInDays?: number },
    @Req() req: Request,
  ) {
    const user = this.getUser(req);
    return this.apiKeyService.create({
      userId: user.id,
      name: body.name,
      expiresInDays: body.expiresInDays,
    });
  }

  @Delete(':id')
  async revoke(@Param('id') id: string, @Req() req: Request) {
    const user = this.getUser(req);
    return { success: await this.apiKeyService.revoke(id, user.id) };
  }

  @Patch(':id/toggle')
  async toggle(
    @Param('id') id: string,
    @Body() body: { isActive: boolean },
    @Req() req: Request,
  ) {
    const user = this.getUser(req);
    return { success: await this.apiKeyService.toggle(id, user.id, body.isActive) };
  }
}
