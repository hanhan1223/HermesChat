import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  // ★ 优雅停机：收到 SIGTERM/SIGINT 时正确关闭连接
  app.enableShutdownHooks();

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

  logger.log(`HermesChat Harness API running on port ${port}`);
  logger.log(`Environment: ${config.get('NODE_ENV', 'development')}`);
}

bootstrap().catch((error) => {
  Logger.error('Failed to start application', error, 'Bootstrap');
  process.exit(1);
});