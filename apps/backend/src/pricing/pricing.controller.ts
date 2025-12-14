import { Controller, Post, Body, Get, Query } from '@nestjs/common';
import { PricingService } from './pricing.service';
import { EstimateRequestDto } from './dto/estimate-request.dto';
import { EstimateResponseDto } from './dto/estimate-response.dto';

@Controller('pricing')
export class PricingController {
  constructor(private pricingService: PricingService) {}

  /**
   * POST /pricing/estimate
   * Get a detailed price estimate (runs slicing)
   */
  @Post('estimate')
  async getEstimate(
    @Body() dto: EstimateRequestDto,
  ): Promise<EstimateResponseDto> {
    return this.pricingService.getEstimate(dto);
  }

  /**
   * GET /pricing/quick-estimate
   * Get a quick estimate without slicing (uses base analysis)
   */
  @Get('quick-estimate')
  async getQuickEstimate(
    @Query('uploadId') uploadId: string,
    @Query('printerId') printerId: string,
    @Query('filamentId') filamentId: string,
  ): Promise<EstimateResponseDto> {
    return this.pricingService.getQuickEstimate(
      uploadId,
      printerId,
      filamentId,
    );
  }
}

