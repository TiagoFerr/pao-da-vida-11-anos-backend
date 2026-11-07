import { ApiProperty } from '@nestjs/swagger';
import { Role, TipoVinculo } from '@prisma/client';

export class PessoaPerfilDto {
  @ApiProperty({ example: 'f3b2c1d0-e5f6-7a8b-9c0d-1e2f3a4b5c6d' })
  id: string;

  @ApiProperty({ example: 'Gabriel Ferreira' })
  nome: string;

  @ApiProperty({ example: '84999998888', nullable: true })
  telefone: string | null;

  @ApiProperty({ example: 'pastor.gabriel@paodavida.com.br', nullable: true })
  email: string | null;

  @ApiProperty({ enum: TipoVinculo, example: TipoVinculo.MEMBRO_ATIVO })
  tipoVinculo: TipoVinculo;

  @ApiProperty({ example: 'Rua Principal, 120', nullable: true })
  endereco: string | null;

  @ApiProperty({ example: 'Abolição', nullable: true })
  bairro: string | null;
}

export class SetorPerfilDto {
  @ApiProperty({ example: 1 })
  numero: number;

  @ApiProperty({ example: 'Setor 1 - Abolição' })
  nome: string;

  @ApiProperty({ example: 'Pr. Rúbens Nunes', nullable: true })
  coordenadorNome: string | null;

  @ApiProperty({ example: '#3B82F6', nullable: true })
  corHex: string | null;
}

export class UsuarioPerfilResponseDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d' })
  id: string;

  @ApiProperty({ example: 'pastor.gabriel@paodavida.com.br' })
  email: string;

  @ApiProperty({ enum: Role, example: Role.ADMIN })
  role: Role;

  @ApiProperty({ example: null, nullable: true })
  setorNumero: number | null;

  @ApiProperty({ example: true })
  ativo: boolean;

  @ApiProperty({ example: '2026-11-06T12:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ type: PessoaPerfilDto, nullable: true })
  pessoa: PessoaPerfilDto | null;

  @ApiProperty({ type: SetorPerfilDto, nullable: true })
  setor: SetorPerfilDto | null;
}
