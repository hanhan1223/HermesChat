import { Controller, Get } from '@nestjs/common';
import { ModelsService } from './models.service';

@Controller('models')
export class ModelsController {
  constructor(private readonly service: ModelsService) {}

  @Get()
  list() {
    return this.service.listEnabled();
  }
}