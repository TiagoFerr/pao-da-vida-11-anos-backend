import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { StatusDiscipulado, TipoDecisao } from '@prisma/client';

export class FiltrarDecisoesDto {
  @ApiPropertyOptional({
    description: 'Filtrar por setor pastoral (1 a 14)',
    example: 5,
    minimum: 1,
    maximum: 14,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(14)
  setorNumero?: number;

  @ApiPropertyOptional({
    description: 'Filtrar por tipo de decisão espiritual',
    enum: TipoDecisao,
    example: TipoDecisao.ACEITOU_JESUS,
  })
  @IsOptional()
  @IsEnum(TipoDecisao)
  tipoDecisao?: TipoDecisao;

  @ApiPropertyOptional({
    description: 'Filtrar por status do discipulado',
    enum: StatusDiscipulado,
    example: StatusDiscipulado.PENDENTE,
  })
  @IsOptional()
  @IsEnum(StatusDiscipulado)
  statusDiscipulado?: StatusDiscipulado;

  @ApiPropertyOptional({
    description: 'Filtrar por ID do culto específico',
    example: 'c1d2e3f4-a5b6-7c8d-9e0f-1a2b3c4d5e6f',
  })
  @IsOptional()
  @IsUUID()
  cultoId?: string;

  @ApiPropertyOptional({
    description: 'Busca textual no nome da pessoa, telefone ou bairro',
    example: 'Maria',
  })
  @IsOptional()
  @IsString()
  busca?: string;

  @ApiPropertyOptional({
    description: 'Número da página',
    example: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Quantidade por página',
    example: 20,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
