import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';

@ApiTags('Orders')
@Controller('orders')
export class OrdersController {
  constructor(private ordersService: OrdersService) {}

  @Post()
  @ApiOperation({
    summary: 'Create order',
    description: 'Create a new print order',
  })
  @ApiResponse({ status: 201, description: 'Order created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - invalid parameters' })
  @ApiResponse({ status: 404, description: 'Upload, printer, or filament not found' })
  async create(@Body() dto: CreateOrderDto) {
    const order = await this.ordersService.create(dto);
    return {
      orderId: order.id,
      status: order.status,
      totalCost: order.totalCost,
    };
  }

  @Get(':orderId')
  @ApiOperation({
    summary: 'Get order status',
    description: 'Get order details (participant view)',
  })
  @ApiParam({ name: 'orderId', description: 'Order ID', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Order details' })
  @ApiResponse({ status: 404, description: 'Order not found' })
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
