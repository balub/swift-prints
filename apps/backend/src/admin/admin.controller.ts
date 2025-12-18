import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { OrderStatus } from '@prisma/client';
import { OrdersService } from '../orders/orders.service';
import { PrintersService } from '../printers/printers.service';
import { UpdateOrderStatusDto } from '../orders/dto/update-order-status.dto';
import { CreatePrinterDto, FilamentDto } from './dto/create-printer.dto';
import { UpdatePrinterDto } from './dto/update-printer.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('admin')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AdminController {
  constructor(
    private ordersService: OrdersService,
    private printersService: PrintersService,
  ) {}

  // ==================== ORDERS ====================

  @Get('orders')
  @ApiTags('Admin - Orders')
  @ApiOperation({
    summary: 'List all orders',
    description: 'Get a list of all orders with optional filters',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['PLACED', 'PRINTING', 'READY', 'COMPLETED', 'CANCELLED'],
    description: 'Filter by order status',
  })
  @ApiQuery({
    name: 'teamNumber',
    required: false,
    description: 'Filter by team number',
  })
  @ApiResponse({ status: 200, description: 'List of orders' })
  async listOrders(
    @Query('status') status?: string,
    @Query('teamNumber') teamNumber?: string,
  ) {
    const orders = await this.ordersService.findAll({
      status:
        status && Object.values(OrderStatus).includes(status as OrderStatus)
          ? (status as OrderStatus)
          : undefined,
      teamNumber: teamNumber || undefined,
    });
    return orders.map((order) => ({
      orderId: order.id,
      status: order.status,
      teamNumber: order.teamNumber,
      participantName: order.participantName,
      participantEmail: order.participantEmail,
      filename: order.upload.filename,
      printerName: order.printer.name,
      filamentName: order.filament.name,
      totalCost: order.totalCost,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    }));
  }

  @Get('orders/stats')
  @ApiTags('Admin - Orders')
  @ApiOperation({
    summary: 'Get order statistics',
    description: 'Get statistics about orders',
  })
  @ApiResponse({ status: 200, description: 'Order statistics' })
  async getOrderStats() {
    return this.ordersService.getStatistics();
  }

  @Get('orders/:orderId')
  @ApiTags('Admin - Orders')
  @ApiOperation({
    summary: 'Get order details',
    description: 'Get full order details (admin view)',
  })
  @ApiParam({ name: 'orderId', description: 'Order ID', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Order details' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async getOrder(@Param('orderId') orderId: string) {
    const order = await this.ordersService.findById(orderId);
    return {
      orderId: order.id,
      uploadId: order.uploadId,
      status: order.status,
      teamNumber: order.teamNumber,
      participantName: order.participantName,
      participantEmail: order.participantEmail,
      filename: order.upload.filename,
      printerName: order.printer.name,
      filamentName: order.filament.name,
      totalCost: order.totalCost,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  }

  @Patch('orders/:orderId/status')
  @ApiTags('Admin - Orders')
  @ApiOperation({
    summary: 'Update order status',
    description: 'Update the status of an order',
  })
  @ApiParam({ name: 'orderId', description: 'Order ID', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Order status updated' })
  @ApiResponse({ status: 400, description: 'Bad request - invalid status' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async updateOrderStatus(
    @Param('orderId') orderId: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    const order = await this.ordersService.updateStatus(orderId, dto.status);
    return {
      orderId: order.id,
      status: order.status,
      updatedAt: order.updatedAt,
    };
  }

  // ==================== PRINTERS ====================

  @Get('printers')
  @ApiTags('Admin - Printers')
  @ApiOperation({
    summary: 'List all printers',
    description: 'Get a list of all printers (including inactive)',
  })
  @ApiResponse({ status: 200, description: 'List of printers' })
  async listPrinters() {
    const printers = await this.printersService.findAll();
    return printers;
  }

  @Post('printers')
  @ApiTags('Admin - Printers')
  @ApiOperation({
    summary: 'Create printer',
    description: 'Create a new printer with optional filaments',
  })
  @ApiResponse({ status: 201, description: 'Printer created' })
  @ApiResponse({ status: 400, description: 'Bad request - invalid parameters' })
  async createPrinter(@Body() dto: CreatePrinterDto) {
    return this.printersService.create(dto);
  }

  @Get('printers/:printerId')
  @ApiTags('Admin - Printers')
  @ApiOperation({
    summary: 'Get printer details',
    description: 'Get full printer details (admin view)',
  })
  @ApiParam({ name: 'printerId', description: 'Printer ID', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Printer details' })
  @ApiResponse({ status: 404, description: 'Printer not found' })
  async getPrinter(@Param('printerId') printerId: string) {
    return this.printersService.findById(printerId);
  }

  @Patch('printers/:printerId')
  @ApiTags('Admin - Printers')
  @ApiOperation({
    summary: 'Update printer',
    description: 'Update printer settings',
  })
  @ApiParam({ name: 'printerId', description: 'Printer ID', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Printer updated' })
  @ApiResponse({ status: 400, description: 'Bad request - invalid parameters' })
  @ApiResponse({ status: 404, description: 'Printer not found' })
  async updatePrinter(
    @Param('printerId') printerId: string,
    @Body() dto: UpdatePrinterDto,
  ) {
    return this.printersService.update(printerId, dto);
  }

  @Post('printers/:printerId/filaments')
  @ApiTags('Admin - Printers')
  @ApiOperation({
    summary: 'Add filament to printer',
    description: 'Add a new filament option to a printer',
  })
  @ApiParam({ name: 'printerId', description: 'Printer ID', format: 'uuid' })
  @ApiResponse({ status: 201, description: 'Filament added' })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid parameters or duplicate filament type',
  })
  @ApiResponse({ status: 404, description: 'Printer not found' })
  async addFilament(
    @Param('printerId') printerId: string,
    @Body() dto: FilamentDto,
  ) {
    return this.printersService.addFilament(printerId, dto);
  }

  @Patch('filaments/:filamentId')
  @ApiTags('Admin - Printers')
  @ApiOperation({
    summary: 'Update filament',
    description: 'Update filament pricing or status',
  })
  @ApiParam({ name: 'filamentId', description: 'Filament ID', format: 'uuid' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Display name' },
        pricePerGram: {
          type: 'number',
          minimum: 0,
          description: 'Price per gram',
        },
        isActive: {
          type: 'boolean',
          description: 'Whether the filament is active',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Filament updated' })
  @ApiResponse({ status: 400, description: 'Bad request - invalid parameters' })
  @ApiResponse({ status: 404, description: 'Filament not found' })
  async updateFilament(
    @Param('filamentId') filamentId: string,
    @Body() dto: { name?: string; pricePerGram?: number; isActive?: boolean },
  ) {
    return this.printersService.updateFilament(filamentId, dto);
  }
}
