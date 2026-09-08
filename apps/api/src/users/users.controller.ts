import { Controller, Get, Put, Req, UseGuards, Body } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.auth.guard';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly service: UsersService) {}

  @Get('profile')
  profile(@Req() req: any) {
    return this.service.getProfile(req.user.id);
  }

  @Put('profile')
  update(@Req() req: any, @Body() body: any) {
    return this.service.updateProfile(req.user.id, body);
  }
}