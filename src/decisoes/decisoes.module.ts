import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { DecisoesService } from './decisoes.service';
import { DecisoesController } from './decisoes.controller';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [DecisoesController],
  providers: [DecisoesService],
  exports: [DecisoesService],
})
export class DecisoesModule {}
