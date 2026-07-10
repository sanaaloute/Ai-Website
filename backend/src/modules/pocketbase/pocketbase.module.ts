import { Module } from '@nestjs/common';
import { PocketbaseController } from './pocketbase.controller';
import { PocketbaseService } from '@/lib/pocketbase.service';
import { E2BService } from '@/lib/e2b.service';

@Module({
  controllers: [PocketbaseController],
  providers: [PocketbaseService, E2BService],
  exports: [PocketbaseService],
})
export class PocketbaseModule {}
