import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    rawBody: true,
  });
  const config = app.get(ConfigService);

  app.use(helmet());

  const domain = config.get('DOMAIN', 'localhost');
  const isDev = domain === 'localhost' || config.get('NODE_ENV') === 'development';

  const allowedOrigins = isDev
    ? ['http://localhost:3000', 'http://localhost:5173']
    : [`https://${domain}`, `https://www.${domain}`];

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = config.get('PORT', 3001);
  await app.listen(port);
  console.log(`[Vematize API] Rodando na porta ${port}`);
  console.log(`[Vematize API] CORS: ${allowedOrigins.join(', ')}`);
}

bootstrap();
