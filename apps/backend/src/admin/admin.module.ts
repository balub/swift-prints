import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { OrdersModule } from '../orders/orders.module';
import { PrintersModule } from '../printers/printers.module';

@Module({
  imports: [OrdersModule, PrintersModule],
  controllers: [AdminController],
})
export class AdminModule {}
