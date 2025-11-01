import { Module, Global } from '@nestjs/common';
import { AuditService } from './services/audit.service';
import { WinstonModule } from 'nest-winston';
import { winstonConfig } from '../logger/logger.config';

@Global()
@Module({
  imports: [WinstonModule.forRoot(winstonConfig)],
  providers: [AuditService],
  exports: [AuditService],
})
export class CommonModule {}
