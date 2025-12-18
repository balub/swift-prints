import { IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { OrderStatus } from '@prisma/client';

export class UpdateOrderStatusDto {
  @ApiProperty({
    description: 'New order status',
    enum: ['PLACED', 'PRINTING', 'READY', 'COMPLETED', 'CANCELLED'],
    example: 'PRINTING',
  })
  @IsIn(['PLACED', 'PRINTING', 'READY', 'COMPLETED', 'CANCELLED'])
  status: OrderStatus;
}

