import { Controller, Post, Body, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { PricingService } from './pricing.service';
import { EstimateRequestDto } from './dto/estimate-request.dto';
import { EstimateResponseDto } from './dto/estimate-response.dto';

@ApiTags('Pricing')
@Controller('pricing')
export class PricingController {
  constructor(private pricingService: PricingService) {}

  @Post('estimate')
  @ApiOperation({
    summary: 'Get detailed price estimate',
    description: 'Get a detailed price estimate by running the slicer with specific settings',
  })
  @ApiResponse({ status: 201, description: 'Price estimate', type: EstimateResponseDto })
  @ApiResponse({ status: 400, description: 'Bad request - invalid parameters' })
  @ApiResponse({ status: 404, description: 'Upload, printer, or filament not found' })
  async getEstimate(
    @Body() dto: EstimateRequestDto,
  ): Promise<EstimateResponseDto> {
    return this.pricingService.getEstimate(dto);
  }

  @Get('quick-estimate')
  @ApiOperation({
    summary: 'Get quick price estimate',
    description: 'Get a quick price estimate without running the slicer (uses base analysis)',
  })
  @ApiQuery({ name: 'uploadId', description: 'Upload ID (UUID)', required: true })
  @ApiQuery({ name: 'printerId', description: 'Printer ID (UUID)', required: true })
  @ApiQuery({ name: 'filamentId', description: 'Filament ID (UUID)', required: true })
  @ApiResponse({ status: 200, description: 'Quick price estimate', type: EstimateResponseDto })
  @ApiResponse({ status: 404, description: 'Upload, printer, or filament not found' })
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

