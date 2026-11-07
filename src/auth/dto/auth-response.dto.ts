import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';

export class UsuarioAuthInfo {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d' })
  id: string;

  @ApiProperty({ example: 'pastor.gabriel@paodavida.com.br' })
  email: string;

  @ApiProperty({ enum: Role, example: Role.ADMIN })
  role: Role;

  @ApiProperty({ example: null, nullable: true })
  setorNumero: number | null;

  @ApiProperty({ example: 'Pr. Gabriel Ferreira', nullable: true })
  nome: string | null;
}

export class AuthResponseDto {
  @ApiProperty({
    description: 'Token JWT de curta duração (1h) para autorização Bearer',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken: string;

  @ApiProperty({
    description: 'Token de atualização de longa duração (7 dias)',
    example: 'e5b7f5c2-4a1e-4c7b-9e2a-1b2c3d4e5f6a',
  })
  refreshToken: string;

  @ApiProperty({ type: UsuarioAuthInfo })
  usuario: UsuarioAuthInfo;
}
