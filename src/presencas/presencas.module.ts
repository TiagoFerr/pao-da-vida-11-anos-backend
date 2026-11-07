import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { PresencasService } from './presencas.service';
import { PresencasController } from './presencas.controller';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [PresencasController],
  providers: [PresencasService],
  exports: [PresencasService],
})
export class PresencasModule {}
