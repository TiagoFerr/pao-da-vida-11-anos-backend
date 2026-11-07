import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { CultosService } from './cultos.service';
import { CultosController } from './cultos.controller';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [CultosController],
  providers: [CultosService],
  exports: [CultosService],
})
export class CultosModule {}
