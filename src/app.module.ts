import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { SetoresModule } from './setores/setores.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    SetoresModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
