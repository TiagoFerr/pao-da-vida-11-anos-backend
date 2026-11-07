import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StatusDiscipulado, TipoDecisao } from '@prisma/client';

export class DecisaoCultoOrigemDto {
  @ApiProperty({ example: 'c1d2e3f4-a5b6-7c8d-9e0f-1a2b3c4d5e6f' })
  id: string;

  @ApiProperty({ example: 42, nullable: true })
  numeroSequencial: number | null;

  @ApiProperty({ example: 5 })
  setorNumero: number;

  @ApiProperty({ example: 'Setor 5 - Santo Antônio' })
  setorNome: string;

  @ApiProperty({ example: 'Santo Antônio' })
  bairro: string;

  @ApiProperty({ example: 'Pb. Adriano Silva' })
  liderNome: string;

  @ApiProperty({ example: 'Irmão Antônio e Família' })
  anfitriaoNome: string;
}

export class DecisaoResponseDto {
  @ApiProperty({ example: 'd1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d' })
  id: string;

  @ApiProperty({ example: 'c1d2e3f4-a5b6-7c8d-9e0f-1a2b3c4d5e6f' })
  cultoId: string;

  @ApiProperty({ type: DecisaoCultoOrigemDto })
  culto: DecisaoCultoOrigemDto;

  @ApiPropertyOptional({
    example: 'p1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
    nullable: true,
  })
  presencaId: string | null;

  @ApiProperty({ example: 'Maria das Graças Silva' })
  nomeDecidido: string;

  @ApiPropertyOptional({ example: '84988771122', nullable: true })
  telefone: string | null;

  @ApiProperty({ enum: TipoDecisao, example: TipoDecisao.ACEITOU_JESUS })
  tipoDecisao: TipoDecisao;

  @ApiPropertyOptional({
    example: 'Oração pela restauração familiar',
    nullable: true,
  })
  pedidoOracaoDetalhe: string | null;

  @ApiProperty({
    enum: StatusDiscipulado,
    example: StatusDiscipulado.PENDENTE,
  })
  statusDiscipulado: StatusDiscipulado;

  @ApiPropertyOptional({ example: 'Pb. Adriano', nullable: true })
  registradoPorNome: string | null;

  @ApiProperty({ example: '2026-11-19T20:15:00.000Z' })
  createdAt: Date;
}

export class MetricasDecisoesDto {
  @ApiProperty({ example: 120 })
  totalGeral: number;

  @ApiProperty({ example: 75 })
  totalAceitouJesus: number;

  @ApiProperty({ example: 30 })
  totalReconciliacao: number;

  @ApiProperty({ example: 15 })
  totalPedidosOracao: number;

  @ApiProperty({ example: 40 })
  totalPendente: number;

  @ApiProperty({ example: 50 })
  totalEmContato: number;

  @ApiProperty({ example: 30 })
  totalDiscipulando: number;
}

export class RelatorioDecisoesConsolidadoDto {
  @ApiProperty({ type: MetricasDecisoesDto })
  metricas: MetricasDecisoesDto;

  @ApiProperty({ type: [DecisaoResponseDto] })
  dados: DecisaoResponseDto[];

  @ApiProperty({ example: 120 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  limit: number;

  @ApiProperty({ example: 6 })
  totalPages: number;
}
