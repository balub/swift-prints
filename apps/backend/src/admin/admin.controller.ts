import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { OrdersService } from '../orders/orders.service';
import { PrintersService } from '../printers/printers.service';
import { UpdateOrderStatusDto } from '../orders/dto/update-order-status.dto';
import { CreatePrinterDto, FilamentDto } from './dto/create-printer.dto';
import { UpdatePrinterDto } from './dto/update-printer.dto';

@Controller('admin')
export class AdminController {
  constructor(
    private ordersService: OrdersService,
    private printersService: PrintersService,
  ) {}

  // ==================== ORDERS ====================

  /**
   * GET /admin/orders
   * List all orders with filters
   */
  @Get('orders')
  async listOrders(
    @Query('status') status?: OrderStatus,
    @Query('teamNumber') teamNumber?: string,
  ) {
    const orders = await this.ordersService.findAll({ status, teamNumber });
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

  /**
   * GET /admin/orders/stats
   * Get order statistics
   */
  @Get('orders/stats')
  async getOrderStats() {
    return this.ordersService.getStatistics();
  }

  /**
   * GET /admin/orders/:orderId
   * Get order details
   */
  @Get('orders/:orderId')
  async getOrder(@Param('orderId') orderId: string) {
    const order = await this.ordersService.findById(orderId);
    return {
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
    };
  }

  /**
   * PATCH /admin/orders/:orderId/status
   * Update order status
   */
  @Patch('orders/:orderId/status')
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

  /**
   * GET /admin/printers
   * List all printers (including inactive)
   */
  @Get('printers')
  async listPrinters() {
    const printers = await this.printersService.findAll();
    return printers;
  }

  /**
   * POST /admin/printers
   * Create a new printer
   */
  @Post('printers')
  async createPrinter(@Body() dto: CreatePrinterDto) {
    return this.printersService.create(dto);
  }

  /**
   * GET /admin/printers/:printerId
   * Get printer details
   */
  @Get('printers/:printerId')
  async getPrinter(@Param('printerId') printerId: string) {
    return this.printersService.findById(printerId);
  }

  /**
   * PATCH /admin/printers/:printerId
   * Update printer settings
   */
  @Patch('printers/:printerId')
  async updatePrinter(
    @Param('printerId') printerId: string,
    @Body() dto: UpdatePrinterDto,
  ) {
    return this.printersService.update(printerId, dto);
  }

  /**
   * POST /admin/printers/:printerId/filaments
   * Add filament to printer
   */
  @Post('printers/:printerId/filaments')
  async addFilament(
    @Param('printerId') printerId: string,
    @Body() dto: FilamentDto,
  ) {
    return this.printersService.addFilament(printerId, dto);
  }

  /**
   * PATCH /admin/filaments/:filamentId
   * Update filament pricing
   */
  @Patch('filaments/:filamentId')
  async updateFilament(
    @Param('filamentId') filamentId: string,
    @Body() dto: { name?: string; pricePerGram?: number; isActive?: boolean },
  ) {
    return this.printersService.updateFilament(filamentId, dto);
  }
}
