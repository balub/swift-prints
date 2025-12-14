import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';

@Controller('orders')
export class OrdersController {
  constructor(private ordersService: OrdersService) {}

  /**
   * POST /orders
   * Create a new order
   */
  @Post()
  async create(@Body() dto: CreateOrderDto) {
    const order = await this.ordersService.create(dto);
    return {
      orderId: order.id,
      status: order.status,
      totalCost: order.totalCost,
    };
  }

  /**
   * GET /orders/:orderId
   * Get order status (participant view)
   */
  @Get(':orderId')
  async findOne(@Param('orderId') orderId: string) {
    const order = await this.ordersService.findById(orderId);
    return {
      orderId: order.id,
      status: order.status,
      teamNumber: order.teamNumber,
      participantName: order.participantName,
      filename: order.upload.filename,
      printerName: order.printer.name,
      filamentName: order.filament.name,
      totalCost: order.totalCost,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  }
}
