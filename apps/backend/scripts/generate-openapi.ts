import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { writeFileSync } from 'fs';
import { join } from 'path';
import * as yaml from 'yaml';
import { AppModule } from '../src/app.module';

async function generateOpenApiSpec() {
  const app = await NestFactory.create(AppModule, { logger: false });

  // Set global prefix to match main.ts
  app.setGlobalPrefix('v1/api');

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

  const outputDir = join(__dirname, '..');
  const format = process.argv[2] || 'json';

  if (format === 'yaml' || format === 'yml') {
    const yamlString = yaml.stringify(document);
    writeFileSync(join(outputDir, 'openapi.yaml'), yamlString);
    console.log('✅ Generated openapi.yaml');
  } else {
    writeFileSync(
      join(outputDir, 'openapi.json'),
      JSON.stringify(document, null, 2),
    );
    console.log('✅ Generated openapi.json');
  }

  await app.close();
}

generateOpenApiSpec().catch((err) => {
  console.error('Failed to generate OpenAPI spec:', err);
  process.exit(1);
});

