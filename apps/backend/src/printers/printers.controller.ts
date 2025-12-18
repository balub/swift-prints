import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { PrintersService } from './printers.service';

@ApiTags('Printers')
@Controller('printers')
export class PrintersController {
  constructor(private printersService: PrintersService) {}

  @Get()
  @ApiOperation({
    summary: 'List active printers',
    description: 'Get a list of all active printers with their filament pricing',
  })
  @ApiResponse({ status: 200, description: 'List of printers' })
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

  @Get(':printerId')
  @ApiOperation({
    summary: 'Get printer details',
    description: 'Get details of a specific printer with filament pricing',
  })
  @ApiParam({ name: 'printerId', description: 'Printer ID', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Printer details' })
  @ApiResponse({ status: 404, description: 'Printer not found' })
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

