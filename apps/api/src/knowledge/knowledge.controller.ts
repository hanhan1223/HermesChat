import { Controller, Get, Post, Delete, Body, Param, Query, Req, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { KnowledgeBaseService } from './knowledge-base.service';

/**
 * 知识库管理 API — Dify 式
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

  @Delete('documents/:id')
  deleteDocument(@Param('id') id: string, @Req() req: Request) {
    return this.kb.deleteDocument(id, this.getUser(req).id);
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
}
