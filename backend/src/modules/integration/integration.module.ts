import { Module } from '@nestjs/common';
import { ProjectModule } from '@/modules/project/project.module';
import { IntegrationController } from './integration.controller';
import { IntegrationService } from './integration.service';

@Module({
  imports: [ProjectModule],
  controllers: [IntegrationController],
  providers: [IntegrationService],
})
export class IntegrationModule {}
