import { Injectable, Logger } from '@nestjs/common';
import { UploadsService } from '../uploads/uploads.service';
import { PrintersService } from '../printers/printers.service';
import { SlicingService, SliceOptions } from '../slicing/slicing.service';
import { EstimateRequestDto } from './dto/estimate-request.dto';
import { EstimateResponseDto } from './dto/estimate-response.dto';

export interface PriceCalculation {
  filamentUsedGrams: number;
  printTimeHours: number;
  materialCost: number;
  machineTimeCost: number;
  totalCost: number;
}

@Injectable()
export class PricingService {
  private readonly logger = new Logger(PricingService.name);

  constructor(
    private uploadsService: UploadsService,
    private printersService: PrintersService,
    private slicingService: SlicingService,
  ) {}

  /**
   * Get a detailed price estimate by slicing the model
   */
  async getEstimate(dto: EstimateRequestDto): Promise<EstimateResponseDto> {
    // Validate printer and filament
    const { printer, filament } =
      await this.printersService.validatePrinterFilament(
        dto.printerId,
        dto.filamentId,
      );

    // Download the STL file
    const stlBuffer = await this.uploadsService.downloadStl(dto.uploadId);

    // Slice the model
    const sliceOptions: SliceOptions = {
      layerHeight: dto.layerHeight || 0.2,
      infill: dto.infill || 20,
      supports: dto.supports || 'auto',
    };

    const sliceResult = await this.slicingService.slice(stlBuffer, sliceOptions);

    // Calculate costs
    const materialCost = sliceResult.filamentUsedGrams * filament.pricePerGram;
    const machineTimeCost = sliceResult.printTimeHours * printer.hourlyRate;
    const totalCost = materialCost + machineTimeCost;

    this.logger.log(
      `Estimate for ${dto.uploadId}: ${sliceResult.filamentUsedGrams}g, ${sliceResult.printTimeHours}h, ₹${totalCost}`,
    );

    return {
      filamentUsedGrams: sliceResult.filamentUsedGrams,
      printTimeHours: sliceResult.printTimeHours,
      costBreakdown: {
        material: Math.round(materialCost * 100) / 100,
        machineTime: Math.round(machineTimeCost * 100) / 100,
        total: Math.round(totalCost * 100) / 100,
      },
      printerName: printer.name,
      filamentName: filament.name,
    };
  }

  /**
   * Calculate pricing from existing slice data (no slicing)
   */
  calculatePrice(
    filamentUsedGrams: number,
    printTimeHours: number,
    pricePerGram: number,
    hourlyRate: number,
  ): PriceCalculation {
    const materialCost = filamentUsedGrams * pricePerGram;
    const machineTimeCost = printTimeHours * hourlyRate;
    const totalCost = materialCost + machineTimeCost;

    return {
      filamentUsedGrams,
      printTimeHours,
      materialCost: Math.round(materialCost * 100) / 100,
      machineTimeCost: Math.round(machineTimeCost * 100) / 100,
      totalCost: Math.round(totalCost * 100) / 100,
    };
  }

  /**
   * Get a quick estimate using base analysis (no slicing)
   */
  async getQuickEstimate(
    uploadId: string,
    printerId: string,
    filamentId: string,
  ): Promise<EstimateResponseDto> {
    // Get upload data
    const upload = await this.uploadsService.getById(uploadId);

    // Validate printer and filament
    const { printer, filament } =
      await this.printersService.validatePrinterFilament(printerId, filamentId);

    // Use base estimates from upload analysis
    const price = this.calculatePrice(
      upload.baseFilamentEstimateG,
      upload.basePrintTimeHours,
      filament.pricePerGram,
      printer.hourlyRate,
    );

    return {
      filamentUsedGrams: price.filamentUsedGrams,
      printTimeHours: price.printTimeHours,
      costBreakdown: {
        material: price.materialCost,
        machineTime: price.machineTimeCost,
        total: price.totalCost,
      },
      printerName: printer.name,
      filamentName: filament.name,
    };
  }
}

