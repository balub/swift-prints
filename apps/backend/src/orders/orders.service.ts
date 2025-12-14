import {
  Injectable,
  Logger,
  NotFoundException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UploadsService } from '../uploads/uploads.service';
import { PrintersService } from '../printers/printers.service';
import { EmailService } from '../email/email.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private prisma: PrismaService,
    private uploads: UploadsService,
    private printers: PrintersService,
    @Inject(forwardRef(() => EmailService))
    private email: EmailService,
  ) {}

  /**
   * Create a new order
   */
  async create(dto: CreateOrderDto) {
    const orderId = uuidv4();

    this.logger.log(`Creating order ${orderId} for team ${dto.teamNumber}`);

    // Get upload data for base estimates
    const upload = await this.uploads.getById(dto.uploadId);

    // Validate printer and filament
    const { printer, filament } = await this.printers.validatePrinterFilament(
      dto.printerId,
      dto.filamentId,
    );

    // Calculate cost from base estimates
    const materialCost = upload.baseFilamentEstimateG * filament.pricePerGram;
    const machineTimeCost = upload.basePrintTimeHours * printer.hourlyRate;
    const totalCost = Math.round((materialCost + machineTimeCost) * 100) / 100;

    // Create order in database
    const order = await this.prisma.order.create({
      data: {
        id: orderId,
        uploadId: dto.uploadId,
        printerId: dto.printerId,
        filamentId: dto.filamentId,
        teamNumber: dto.teamNumber,
        participantName: dto.participantName,
        participantEmail: dto.participantEmail,
        totalCost,
        status: OrderStatus.PLACED,
      },
      include: {
        upload: true,
        printer: true,
        filament: true,
      },
    });

    this.logger.log(`Order ${orderId} created: ₹${totalCost}`);

    // Send confirmation email
    await this.email.sendOrderConfirmation(order);

    return order;
  }

  /**
   * Get order by ID
   */
  async findById(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        upload: true,
        printer: true,
        filament: true,
      },
    });

    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    return order;
  }

  /**
   * Get all orders (for admin)
   */
  async findAll(filters?: { status?: OrderStatus; teamNumber?: string }) {
    return this.prisma.order.findMany({
      where: {
        ...(filters?.status && { status: filters.status }),
        ...(filters?.teamNumber && { teamNumber: filters.teamNumber }),
      },
      include: {
        upload: true,
        printer: true,
        filament: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Update order status (admin only)
   */
  async updateStatus(orderId: string, status: OrderStatus) {
    const order = await this.findById(orderId);
    const previousStatus = order.status;

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: { status },
      include: {
        upload: true,
        printer: true,
        filament: true,
      },
    });

    this.logger.log(
      `Order ${orderId} status updated: ${previousStatus} -> ${status}`,
    );

    // Send status update email
    await this.email.sendStatusUpdate(updated, previousStatus);

    return updated;
  }

  /**
   * Get order statistics (for admin dashboard)
   */
  async getStatistics() {
    const [total, byStatus, revenueResult] = await Promise.all([
      this.prisma.order.count(),
      this.prisma.order.groupBy({
        by: ['status'],
        _count: true,
      }),
      this.prisma.order.aggregate({
        _sum: {
          totalCost: true,
        },
      }),
    ]);

    const statusCounts = byStatus.reduce(
      (acc, item) => {
        acc[item.status] = item._count;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      totalOrders: total,
      placedOrders: statusCounts[OrderStatus.PLACED] || 0,
      printingOrders: statusCounts[OrderStatus.PRINTING] || 0,
      readyOrders: statusCounts[OrderStatus.READY] || 0,
      completedOrders: statusCounts[OrderStatus.COMPLETED] || 0,
      cancelledOrders: statusCounts[OrderStatus.CANCELLED] || 0,
      totalRevenue: revenueResult._sum.totalCost || 0,
    };
  }
}
