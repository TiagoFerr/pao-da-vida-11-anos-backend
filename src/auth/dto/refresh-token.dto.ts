import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({
    description: 'Refresh token opaco emitido no login',
    example: 'd9b7f5c2-4a1e-4c7b-9e2a-1b2c3d4e5f6a',
  })
  @IsString()
  @IsNotEmpty({ message: 'O refreshToken é obrigatório' })
  refreshToken: string;
}
