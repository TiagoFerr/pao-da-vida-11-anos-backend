import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { TipoDecisao } from '@prisma/client';

export class CriarDecisaoDto {
  @ApiProperty({
    description: 'Nome da pessoa que tomou a decisão espiritual',
    example: 'Maria das Graças Silva',
  })
  @IsString()
  @IsNotEmpty({ message: 'O nome da pessoa é obrigatório' })
  nomeDecidido: string;

  @ApiPropertyOptional({
    description: 'Telefone ou WhatsApp para contato do ministério de consolidação e discipulado',
    example: '84988771122',
  })
  @IsOptional()
  @IsString()
  telefone?: string;

  @ApiProperty({
    description: 'Tipo de decisão espiritual tomada na reunião do lar',
    enum: TipoDecisao,
    example: TipoDecisao.ACEITOU_JESUS,
  })
  @IsEnum(TipoDecisao, {
    message: 'O tipoDecisao deve ser ACEITOU_JESUS, RECONCILIACAO ou PEDIDO_ORACAO',
  })
  tipoDecisao: TipoDecisao;

  @ApiPropertyOptional({
    description: 'ID da presença na lista de check-in, se vinculado',
    example: 'p1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
  })
  @IsOptional()
  @IsUUID()
  presencaId?: string;

  @ApiPropertyOptional({
    description: 'Detalhes ou motivo específico do pedido de oração',
    example: 'Oração pela restauração familiar e saúde do filho',
  })
  @IsOptional()
  @IsString()
  pedidoOracaoDetalhe?: string;
}
