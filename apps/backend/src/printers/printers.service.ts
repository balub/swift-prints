import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PrintersService {
  private readonly logger = new Logger(PrintersService.name);

  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.printer.findMany({
      where: { isActive: true },
      include: {
        filaments: {
          where: { isActive: true },
          orderBy: { name: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findById(printerId: string) {
    const printer = await this.prisma.printer.findUnique({
      where: { id: printerId },
      include: {
        filaments: {
          where: { isActive: true },
        },
      },
    });

    if (!printer) {
      throw new NotFoundException(`Printer ${printerId} not found`);
    }

    return printer;
  }

  async getFilamentPricing(printerId: string, filamentId: string) {
    const filament = await this.prisma.filamentPricing.findFirst({
      where: {
        id: filamentId,
        printerId,
        isActive: true,
      },
      include: {
        printer: true,
      },
    });

    if (!filament) {
      throw new NotFoundException(
        `Filament ${filamentId} not found for printer ${printerId}`,
      );
    }

    return filament;
  }

  async validatePrinterFilament(
    printerId: string,
    filamentId: string,
  ): Promise<{
    printer: { id: string; name: string; hourlyRate: number; supportSurcharge: number };
    filament: { id: string; name: string; pricePerGram: number };
  }> {
    const filament = await this.getFilamentPricing(printerId, filamentId);

    return {
      printer: {
        id: filament.printer.id,
        name: filament.printer.name,
        hourlyRate: filament.printer.hourlyRate,
        supportSurcharge: filament.printer.supportSurcharge,
      },
      filament: {
        id: filament.id,
        name: filament.name,
        pricePerGram: filament.pricePerGram,
      },
    };
  }

  async create(data: {
    name: string;
    hourlyRate: number;
    supportSurcharge?: number;
    filaments?: Array<{
      filamentType: string;
      name: string;
      pricePerGram: number;
    }>;
  }) {
    return this.prisma.printer.create({
      data: {
        name: data.name,
        hourlyRate: data.hourlyRate,
        supportSurcharge: data.supportSurcharge ?? 0,
        filaments: data.filaments
          ? {
              create: data.filaments.map((f) => ({
                filamentType: f.filamentType,
                name: f.name,
                pricePerGram: f.pricePerGram,
              })),
            }
          : undefined,
      },
      include: {
        filaments: true,
      },
    });
  }

  async update(
    printerId: string,
    data: {
      name?: string;
      hourlyRate?: number;
      supportSurcharge?: number;
      isActive?: boolean;
    },
  ) {
    await this.findById(printerId);

    return this.prisma.printer.update({
      where: { id: printerId },
      data,
      include: {
        filaments: true,
      },
    });
  }

  async addFilament(
    printerId: string,
    data: {
      filamentType: string;
      name: string;
      pricePerGram: number;
    },
  ) {
    await this.findById(printerId);

    return this.prisma.filamentPricing.create({
      data: {
        printerId,
        filamentType: data.filamentType,
        name: data.name,
        pricePerGram: data.pricePerGram,
      },
    });
  }

  async updateFilament(
    filamentId: string,
    data: {
      name?: string;
      pricePerGram?: number;
      isActive?: boolean;
    },
  ) {
    return this.prisma.filamentPricing.update({
      where: { id: filamentId },
      data,
    });
  }
}
