import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StatusCulto } from '@prisma/client';

export class CultoResumoSetorDto {
  @ApiProperty({ example: 5 })
  numero: number;

  @ApiProperty({ example: 'Setor 5 - Santo Antônio' })
  nome: string;

  @ApiProperty({ example: '#10B981', nullable: true })
  corHex: string | null;

  @ApiProperty({ example: 'Pb. Adriano', nullable: true })
  coordenadorNome: string | null;
}

export class CultoResponseDto {
  @ApiProperty({ example: 'c1d2e3f4-a5b6-7c8d-9e0f-1a2b3c4d5e6f' })
  id: string;

  @ApiProperty({
    description: 'Número sequencial do culto na contagem oficial (1 a 120)',
    example: 42,
    nullable: true,
  })
  numeroSequencial: number | null;

  @ApiProperty({ example: '11 Anos - 120 Cultos nos Lares' })
  campanha: string;

  @ApiProperty({ example: 5 })
  setorNumero: number;

  @ApiProperty({ type: CultoResumoSetorDto })
  setor: CultoResumoSetorDto;

  @ApiProperty({ example: 'Santo Antônio' })
  bairro: string;

  @ApiProperty({ example: 'Rua Frei Miguelinho' })
  rua: string;

  @ApiProperty({ example: '142' })
  numero: string;

  @ApiProperty({ example: 'Próximo à Praça', nullable: true })
  pontoReferencia: string | null;

  @ApiProperty({ example: -5.1878, nullable: true })
  latitude: number | null;

  @ApiProperty({ example: -37.3442, nullable: true })
  longitude: number | null;

  @ApiProperty({ example: 450.5, nullable: true })
  mapaX: number | null;

  @ApiProperty({ example: 320.0, nullable: true })
  mapaY: number | null;

  @ApiProperty({ example: 'Pb. Adriano Silva' })
  liderNome: string;

  @ApiProperty({ example: '84999990005' })
  liderTelefone: string;

  @ApiPropertyOptional({ example: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', nullable: true })
  liderUsuarioId: string | null;

  @ApiProperty({ example: 'Irmão Antônio e Família' })
  anfitriaoNome: string;

  @ApiProperty({ example: '84988880005' })
  anfitriaoTelefone: string;

  @ApiPropertyOptional({ example: 'b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e', nullable: true })
  anfitriaoUsuarioId: string | null;

  @ApiProperty({ example: '19:30' })
  horarioInicio: string;

  @ApiProperty({ example: '2026-11-19' })
  dataRealizacao: string;

  @ApiProperty({ enum: StatusCulto, example: StatusCulto.CONFIRMADO })
  status: StatusCulto;

  @ApiProperty({ example: 'Trazer cadeiras extras', nullable: true })
  observacoes: string | null;

  @ApiProperty({ example: 1 })
  versao: number;

  @ApiProperty({ example: 15 })
  totalPresencas: number;

  @ApiProperty({ example: 2 })
  totalDecisoes: number;

  @ApiProperty({ example: 4 })
  totalFotos: number;

  @ApiProperty({ example: '2026-11-07T12:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-11-07T12:00:00.000Z' })
  updatedAt: Date;
}

export class CultosPaginadosResponseDto {
  @ApiProperty({ type: [CultoResponseDto] })
  dados: CultoResponseDto[];

  @ApiProperty({ example: 120 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  limit: number;

  @ApiProperty({ example: 6 })
  totalPages: number;
}
