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
  const isDev = config.get('NODE_ENV') === 'development';

  const allowedOrigins = [
    `https://${domain}`,
    `https://www.${domain}`,
    `http://${domain}`,
    `http://www.${domain}`,
  ];

  if (isDev || domain === 'localhost') {
    allowedOrigins.push('http://localhost:3000');
    allowedOrigins.push('http://localhost:5173');
  }

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
