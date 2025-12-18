import { Module } from '@nestjs/common';
import { PricingController } from './pricing.controller';
import { PricingService } from './pricing.service';
import { UploadsModule } from '../uploads/uploads.module';
import { PrintersModule } from '../printers/printers.module';
import { SlicingModule } from '../slicing/slicing.module';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [UploadsModule, PrintersModule, SlicingModule, StorageModule],
  controllers: [PricingController],
  providers: [PricingService],
  exports: [PricingService],
})
export class PricingModule {}

