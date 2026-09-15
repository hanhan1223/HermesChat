import {
  Controller, Get, Post, Delete, Param, Body, Req, Res,
  UnauthorizedException, UploadedFile, UseInterceptors, BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request, Response } from 'express';
import { StorageService } from './storage.service';

/**
 * 文件存储 API — 会话级隔离的云盘
 */
@Controller('files')
export class StorageController {
  constructor(private readonly storage: StorageService) {}

  private getUser(req: Request) {
    const user = (req as any).user;
    if (!user) throw new UnauthorizedException();
    return user;
  }

  /**
   * 上传文件到指定会话
   * POST /files/conversations/:conversationId/upload
   */
  @Post('conversations/:conversationId/upload')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 50 * 1024 * 1024 } }))
  uploadFile(
    @Param('conversationId') conversationId: string,
    @UploadedFile() file: { buffer: Buffer; originalname: string; mimetype: string; size: number },
    @Req() req: Request,
  ) {
    if (!file) throw new BadRequestException('缺少文件');
    const user = this.getUser(req);
    return this.storage.uploadUserFile({
      userId: user.id,
      conversationId,
      file: file.buffer,
      filename: file.originalname,
      contentType: file.mimetype,
    });
  }

  /**
   * 列出会话中的所有文件（云盘视图）
   * GET /files/conversations/:conversationId
   */
  @Get('conversations/:conversationId')
  listConversationFiles(
    @Param('conversationId') conversationId: string,
    @Req() req: Request,
  ) {
    const user = this.getUser(req);
    return this.storage.listConversationFiles(user.id, conversationId);
  }

  /**
   * 删除文件
   * DELETE /files/*
   */
  @Delete()
  deleteFile(@Body() body: { objectPath: string }, @Req() req: Request) {
    this.getUser(req);
    if (!body.objectPath) throw new BadRequestException('缺少文件路径');
    return this.storage.deleteFile(body.objectPath).then(() => ({ success: true }));
  }

  /**
   * 删除会话的所有文件
   * DELETE /files/conversations/:conversationId
   */
  @Delete('conversations/:conversationId')
  deleteConversationFiles(
    @Param('conversationId') conversationId: string,
    @Req() req: Request,
  ) {
    const user = this.getUser(req);
    return this.storage.deleteConversationFiles(user.id, conversationId)
      .then((count) => ({ success: true, deletedCount: count }));
  }

  /**
   * 获取文件下载链接
   * GET /files/download?path=xxx
   */
  @Get('download')
  async getDownloadUrl(
    @Body('path') path: string,
    @Req() req: Request,
  ) {
    this.getUser(req);
    const objectPath = path || (req.query.path as string);
    if (!objectPath) throw new BadRequestException('缺少文件路径');
    const url = await this.storage.getPresignedUrl(objectPath);
    return { downloadUrl: url };
  }

  /**
   * 代理下载文件（直接返回文件流）
   * GET /files/stream?path=xxx
   */
  @Get('stream')
  async streamFile(
    @Req() req: Request,
    @Res() res: Response,
  ) {
    this.getUser(req);
    const objectPath = req.query.path as string;
    if (!objectPath) throw new BadRequestException('缺少文件路径');

    // 安全检查：只允许访问用户自己的文件
    const user = (req as any).user;
    if (!objectPath.startsWith(`users/${user.id}/`)) {
      throw new BadRequestException('无权访问此文件');
    }

    try {
      const content = await this.storage.getFileContent(objectPath);
      const filename = objectPath.split('/').pop() || 'file';
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
      res.setHeader('Content-Type', 'application/octet-stream');
      res.send(content);
    } catch {
      res.status(404).send({ message: '文件不存在' });
    }
  }
}
