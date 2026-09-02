import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Todas las rutas arrancan con /api  ->  /api/habits, /api/auth/login
  app.setGlobalPrefix('api');

  // Permite que el frontend (puerto 3000) le pida datos a esta API (puerto 3001)
  app.enableCors({ origin: 'http://localhost:3000' });

  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
