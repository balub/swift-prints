import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS for frontend
  const corsOrigins = process.env.CORS_ORIGIN?.split(',') || [
    'http://localhost:5173',
    'http://localhost:8080',
    'http://localhost:8081',
  ];
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });

  // Global API prefix with version
  app.setGlobalPrefix('v1/api');

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Swagger/OpenAPI setup
  const config = new DocumentBuilder()
    .setTitle('Swift Prints API')
    .setDescription(
      'API for 3D printing order management - upload STL files, get pricing estimates, and manage print orders',
    )
    .setVersion('1.0.0')
    .addServer('/v1/api', 'API v1')
    .addTag('Health', 'Health check endpoints')
    .addTag('Uploads', 'STL file upload and analysis')
    .addTag('Pricing', 'Price estimation endpoints')
    .addTag('Printers', 'Printer and filament information (public)')
    .addTag('Orders', 'Order management (participant)')
    .addTag('Admin - Orders', 'Order management (admin)')
    .addTag('Admin - Printers', 'Printer and filament management (admin)')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('v1/api/docs', app, document, {
    jsonDocumentUrl: '/v1/api/docs/openapi.json',
    useGlobalPrefix: false,
  });

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`🚀 Swift Prints backend running on http://localhost:${port}`);
  console.log(
    `📚 Swagger UI available at http://localhost:${port}/v1/api/docs`,
  );
  console.log(
    `📄 OpenAPI JSON available at http://localhost:${port}/v1/api/docs/openapi.json`,
  );
}

bootstrap();
