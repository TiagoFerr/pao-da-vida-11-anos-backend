import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { ConvitesService } from './convites.service';
import { ConvitesController } from './convites.controller';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [ConvitesController],
  providers: [ConvitesService],
  exports: [ConvitesService],
})
export class ConvitesModule {}
