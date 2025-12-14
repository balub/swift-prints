import { Module, forwardRef } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { UploadsModule } from '../uploads/uploads.module';
import { PrintersModule } from '../printers/printers.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [UploadsModule, PrintersModule, forwardRef(() => EmailModule)],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
