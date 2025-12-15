import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { PrismaModule } from './prisma/prisma.module';
import { StorageModule } from './storage/storage.module';
import { UploadsModule } from './uploads/uploads.module';
import { PrintersModule } from './printers/printers.module';
import { SlicingModule } from './slicing/slicing.module';
import { PricingModule } from './pricing/pricing.module';
import { OrdersModule } from './orders/orders.module';
import { AdminModule } from './admin/admin.module';
import { EmailModule } from './email/email.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
    }),
    PrismaModule,
    StorageModule,
    UploadsModule,
    PrintersModule,
    SlicingModule,
    PricingModule,
    OrdersModule,
    AdminModule,
    EmailModule,
    AuthModule,
  ],
  controllers: [AppController],
})
export class AppModule {}

