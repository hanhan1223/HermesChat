import {
  Controller, Get, Post, Delete, Body, Param, Query, Req, Res,
  UnauthorizedException, UploadedFile, UseInterceptors, BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request, Response } from 'express';
import { KnowledgeBaseService } from './knowledge-base.service';

/**
 * 知识库管理 API — 委托 RAGFlow 引擎
 */
@Controller('knowledge')
export class KnowledgeController {
  constructor(private readonly kb: KnowledgeBaseService) {}

  private getUser(req: Request) {
    const user = (req as any).user;
    if (!user) throw new UnauthorizedException();
    return user;
  }

  // ==================== 知识库 ====================

  @Get('datasets')
  listDatasets(@Req() req: Request) {
    return this.kb.listDatasets(this.getUser(req).id);
  }

  @Post('datasets')
  createDataset(
    @Body() body: { name: string; description?: string },
    @Req() req: Request,
  ) {
    return this.kb.createDataset({
      userId: this.getUser(req).id,
      name: body.name,
      description: body.description,
    });
  }

  @Get('datasets/:id')
  getDataset(@Param('id') id: string, @Req() req: Request) {
    return this.kb.getDataset(id, this.getUser(req).id);
  }

  @Delete('datasets/:id')
  deleteDataset(@Param('id') id: string, @Req() req: Request) {
    return this.kb.deleteDataset(id, this.getUser(req).id);
  }

  // ==================== 文档 ====================

  @Get('datasets/:id/documents')
  listDocuments(@Param('id') id: string, @Req() req: Request) {
    return this.kb.listDocuments(id, this.getUser(req).id);
  }

  /** 纯文本文档 */
  @Post('datasets/:id/documents')
  addDocument(
    @Param('id') datasetId: string,
    @Body() body: { title: string; content: string; sourceType?: string },
    @Req() req: Request,
  ) {
    return this.kb.addDocument({
      datasetId,
      userId: this.getUser(req).id,
      title: body.title,
      content: body.content,
      sourceType: body.sourceType,
    });
  }

  /** 文件上传（PDF / Word / Excel / 图片等） */
  @Post('datasets/:id/upload')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 50 * 1024 * 1024 } }))
  uploadFile(
    @Param('id') datasetId: string,
    @UploadedFile() file: { buffer: Buffer; originalname: string; size: number; mimetype: string },
    @Req() req: Request,
  ) {
    if (!file) throw new BadRequestException('缺少文件');
    return this.kb.uploadFile({
      datasetId,
      userId: this.getUser(req).id,
      file: file.buffer,
      filename: file.originalname,
    });
  }

  @Delete('datasets/:id/documents')
  deleteDocuments(
    @Param('id') datasetId: string,
    @Body() body: { documentIds: string[] },
  ) {
    return this.kb.deleteDocuments(datasetId, body.documentIds);
  }

  /** 查询文档解析进度 */
  @Get('datasets/:id/documents/:docId/status')
  getDocumentStatus(
    @Param('id') datasetId: string,
    @Param('docId') docId: string,
  ) {
    return this.kb.getDocumentStatus(datasetId, docId);
  }

  // ==================== RAG 检索 ====================

  @Post('search')
  search(
    @Body() body: { query: string; datasetIds?: string[]; limit?: number },
    @Req() req: Request,
  ) {
    return this.kb.search({
      userId: this.getUser(req).id,
      query: body.query,
      datasetIds: body.datasetIds,
      limit: body.limit,
    });
  }

  /** 构建 RAG 上下文（注入 System Prompt） */
  @Post('rag-context')
  buildRagContext(
    @Body() body: { query: string; datasetIds?: string[]; limit?: number },
    @Req() req: Request,
  ) {
    return this.kb.buildRagContext({
      userId: this.getUser(req).id,
      query: body.query,
      datasetIds: body.datasetIds,
      limit: body.limit,
    });
  }

  // ==================== 健康检查 ====================

  @Get('health')
  healthCheck() {
    return this.kb.healthCheck();
  }
}
