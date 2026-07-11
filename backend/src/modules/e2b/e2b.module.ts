import { Module } from '@nestjs/common';
import { E2BController } from './e2b.controller';
import { E2BManagerService } from './e2b.service';

@Module({
  controllers: [E2BController],
  providers: [E2BManagerService],
})
export class E2BModule {}
