import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { StorageService } from './storage.service';
import { FotosService } from './fotos.service';
import { FotosController } from './fotos.controller';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [FotosController],
  providers: [StorageService, FotosService],
  exports: [FotosService, StorageService],
})
export class FotosModule {}
