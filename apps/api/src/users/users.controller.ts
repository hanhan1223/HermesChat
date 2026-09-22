import {
  Controller, Get, Put, Post, Delete, Req, Res, Param, Body,
  UseGuards, UploadedFile, UseInterceptors, BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request, Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt.auth.guard';
import { UsersService } from './users.service';
import { StorageService } from '../storage/storage.service';

const AVATAR_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const AVATAR_MAX_BYTES = 2 * 1024 * 1024;

@Controller('users')
export class UsersController {
  constructor(
    private readonly service: UsersService,
    private readonly storage: StorageService,
  ) {}

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  profile(@Req() req: any) {
    return this.service.getProfile(req.user.id);
  }

  @Put('profile')
  @UseGuards(JwtAuthGuard)
  update(@Req() req: any, @Body() body: { name?: string; avatarUrl?: string | null }) {
    return this.service.updateProfile(req.user.id, body);
  }

  /**
   * 上传头像（覆盖旧图）
   * POST /users/avatar  — multipart 字段名 file
   */
  @Post('avatar')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: AVATAR_MAX_BYTES } }))
  async uploadAvatar(
    @Req() req: any,
    @UploadedFile() file: { buffer: Buffer; originalname: string; mimetype: string; size: number },
  ) {
    if (!file) throw new BadRequestException('缺少头像文件');
    if (!AVATAR_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException('仅支持 JPG / PNG / WebP / GIF');
    }
    if (file.size > AVATAR_MAX_BYTES) {
      throw new BadRequestException('头像不能超过 2MB');
    }

    await this.storage.uploadAvatar({
      userId: req.user.id,
      file: file.buffer,
      contentType: file.mimetype,
    });

    // 稳定路径，前端拼上 API 前缀即可；时间戳做缓存穿透
    const avatarUrl = `/users/${req.user.id}/avatar?v=${Date.now()}`;
    return this.service.updateProfile(req.user.id, { avatarUrl });
  }

  /**
   * 清除头像（恢复默认）
   * DELETE /users/avatar
   */
  @Delete('avatar')
  @UseGuards(JwtAuthGuard)
  async clearAvatar(@Req() req: any) {
    await this.storage.deleteAvatar(req.user.id);
    return this.service.updateProfile(req.user.id, { avatarUrl: null });
  }

  /**
   * 读取用户头像（公开，供 <img src> 直接引用）
   * GET /users/:id/avatar
   */
  @Get(':id/avatar')
  async getAvatar(@Param('id') id: string, @Res() res: Response) {
    const avatar = await this.storage.getAvatarContent(id);
    if (!avatar) {
      res.status(404).send({ message: '头像不存在' });
      return;
    }
    res.setHeader('Content-Type', avatar.contentType);
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.send(avatar.content);
  }
}
