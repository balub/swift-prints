import { Module, forwardRef } from '@nestjs/common';
import { EmailService } from './email.service';
import { OrdersModule } from '../orders/orders.module';

@Module({
  imports: [forwardRef(() => OrdersModule)],
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}

