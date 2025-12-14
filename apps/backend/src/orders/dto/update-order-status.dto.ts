import { IsIn } from 'class-validator';
import { OrderStatus } from '@prisma/client';

export class UpdateOrderStatusDto {
  @IsIn(['PLACED', 'PRINTING', 'READY', 'COMPLETED', 'CANCELLED'])
  status: OrderStatus;
}

