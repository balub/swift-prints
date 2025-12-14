import { Controller, Get, Param } from '@nestjs/common';
import { PrintersService } from './printers.service';

@Controller('printers')
export class PrintersController {
  constructor(private printersService: PrintersService) {}

  /**
   * GET /printers
   * List all active printers with their filament pricing
   */
  @Get()
  async findAll() {
    const printers = await this.printersService.findAll();
    return printers.map((printer) => ({
      id: printer.id,
      name: printer.name,
      hourlyRate: printer.hourlyRate,
      filaments: printer.filaments.map((f) => ({
        id: f.id,
        type: f.filamentType,
        name: f.name,
        pricePerGram: f.pricePerGram,
      })),
    }));
  }

  /**
   * GET /printers/:printerId
   * Get a specific printer with filament pricing
   */
  @Get(':printerId')
  async findOne(@Param('printerId') printerId: string) {
    const printer = await this.printersService.findById(printerId);
    return {
      id: printer.id,
      name: printer.name,
      hourlyRate: printer.hourlyRate,
      filaments: printer.filaments.map((f) => ({
        id: f.id,
        type: f.filamentType,
        name: f.name,
        pricePerGram: f.pricePerGram,
      })),
    };
  }
}

