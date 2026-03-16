import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Включаем CORS
  app.enableCors({
    origin: 'http://localhost:5173', // разрешаем только фронтенд
    credentials: true,
  });
  
  await app.listen(3000);
  console.log('Backend запущен на http://localhost:3000');
}
bootstrap();