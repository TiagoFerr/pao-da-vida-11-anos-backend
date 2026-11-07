import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { StatusCulto } from '@prisma/client';

export class FiltrarCultosDto {
  @ApiPropertyOptional({
    description: 'Filtrar por número do setor (1 a 14)',
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
    description: 'Filtrar por nome do bairro',
    example: 'Abolição',
  })
  @IsOptional()
  @IsString()
  bairro?: string;

  @ApiPropertyOptional({
    description: 'Filtrar por status do culto',
    enum: StatusCulto,
    example: StatusCulto.REALIZADO,
  })
  @IsOptional()
  @IsEnum(StatusCulto)
  status?: StatusCulto;

  @ApiPropertyOptional({
    description: 'Busca textual em líder, anfitrião, rua ou bairro',
    example: 'Adriano',
  })
  @IsOptional()
  @IsString()
  busca?: string;

  @ApiPropertyOptional({
    description: 'Filtrar por data específica (AAAA-MM-DD)',
    example: '2026-11-19',
  })
  @IsOptional()
  @IsDateString()
  dataRealizacao?: string;

  @ApiPropertyOptional({
    description: 'Número da página para paginação',
    example: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Quantidade de registros por página (máx. 100)',
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
