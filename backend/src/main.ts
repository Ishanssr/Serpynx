import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger, Controller, Get } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { join } from 'path';
import * as fs from 'fs';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/all-exceptions.filter';

// Ensure upload directories exist
['uploads', 'uploads/chat-files', 'uploads/work-files'].forEach(dir => {
  const p = join(process.cwd(), dir);
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
});

@Controller()
class AppController {
  @Get()
  getRoot() {
    return {
      message: 'Serpynx API is running',
      version: '1.0.0',
      status: 'healthy'
    };
  }
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  // Serve uploaded files
  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads' });

  // CORS — must be before Helmet
  const allowedOrigins: string[] = [];
  if (process.env.NODE_ENV !== 'production') {
    allowedOrigins.push('http://localhost:5173', 'http://localhost:3000');
  }
  if (process.env.FRONTEND_URL) {
    allowedOrigins.push(process.env.FRONTEND_URL);
  }
  // Add frontend URL for production
  if (process.env.NODE_ENV === 'production') {
    allowedOrigins.push('https://serpynx-frontend.onrender.com');
  }
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  // Security headers — configured to allow cross-origin API calls
  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }));

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Global exception filter — clean error responses, no stack traces leaked
  app.useGlobalFilters(new AllExceptionsFilter());

  const PORT = process.env.PORT || 3001;
  await app.listen(PORT, '0.0.0.0');
  Logger.log(`🚀 Serpynx API running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`, 'Bootstrap');
}
bootstrap();
