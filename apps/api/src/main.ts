import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  // 全局前缀
  app.setGlobalPrefix('api');

  // CORS
  app.enableCors({
    origin: config.get('CORS_ORIGINS', '*'),
    credentials: true,
  });

  // 全局验证管道
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: false,
  }));

  // WebSocket
  app.useWebSocketAdapter(new IoAdapter(app));

  const port = config.get('PORT', 4000);
  await app.listen(port);

  Logger.log(🚀 HermesChat Harness API running on port , 'Bootstrap');
}

bootstrap();