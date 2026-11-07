import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { SetoresModule } from './setores/setores.module';
import { AuthModule } from './auth/auth.module';
import { ConvitesModule } from './convites/convites.module';
import { CultosModule } from './cultos/cultos.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    SetoresModule,
    AuthModule,
    ConvitesModule,
    CultosModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
