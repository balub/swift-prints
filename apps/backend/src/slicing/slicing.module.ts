import { Module } from '@nestjs/common';
import { SlicingService } from './slicing.service';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [StorageModule],
  providers: [SlicingService],
  exports: [SlicingService],
})
export class SlicingModule {}

