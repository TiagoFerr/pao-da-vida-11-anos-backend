import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';

export class ConviteCriadoResponseDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d' })
  id: string;

  @ApiProperty({
    description: 'Token plano gerado para o link',
    example: 'd9b7f5c24a1e4c7b9e2a1b2c3d4e5f6a',
  })
  token: string;

  @ApiProperty({
    description: 'Link completo pronto para envio no WhatsApp',
    example: 'https://cultonolar.paodavida.com.br/convite?token=d9b7f5c24a1e4c7b9e2a1b2c3d4e5f6a',
  })
  link: string;

  @ApiProperty({ enum: Role, example: Role.COORDENADOR })
  tipoPapel: Role;

  @ApiProperty({ example: 1 })
  setorNumero: number;

  @ApiProperty({ example: 'Setor 1 - Abolição' })
  setorNome: string;

  @ApiProperty({ example: '2026-11-14T12:00:00.000Z' })
  expiraEm: Date;
}

export class ValidarConviteResponseDto {
  @ApiProperty({ example: true })
  valido: boolean;

  @ApiProperty({ enum: Role, example: Role.LIDER })
  tipoPapel: Role;

  @ApiProperty({ example: 5 })
  setorNumero: number;

  @ApiProperty({ example: 'Setor 5 - Santo Antônio' })
  setorNome: string;

  @ApiProperty({ example: 'João da Silva', nullable: true })
  nomeDestinatario: string | null;

  @ApiProperty({ example: '84988887777', nullable: true })
  telefoneDestinatario: string | null;

  @ApiProperty({ example: '2026-11-14T12:00:00.000Z' })
  expiraEm: Date;
}

export class ConviteItemDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d' })
  id: string;

  @ApiProperty({ enum: Role, example: Role.LIDER })
  tipoPapel: Role;

  @ApiProperty({ example: 5 })
  setorNumero: number;

  @ApiProperty({ example: 'João da Silva', nullable: true })
  nomeDestinatario: string | null;

  @ApiProperty({ example: '84988887777', nullable: true })
  telefoneDestinatario: string | null;

  @ApiProperty({ example: false })
  utilizado: boolean;

  @ApiProperty({ example: false })
  expirado: boolean;

  @ApiProperty({ example: '2026-11-14T12:00:00.000Z' })
  expiraEm: Date;

  @ApiProperty({ example: '2026-11-07T12:00:00.000Z' })
  createdAt: Date;
}
