import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CriarPresencaDto {
  @ApiProperty({
    description: 'Nome completo do participante (membro ou visitante)',
    example: 'Carlos Eduardo Oliveira',
  })
  @IsString()
  @IsNotEmpty({ message: 'O nome do participante é obrigatório' })
  nomeParticipante: string;

  @ApiPropertyOptional({
    description: 'Telefone ou WhatsApp para contato e acompanhamento',
    example: '84988776655',
  })
  @IsOptional()
  @IsString()
  telefone?: string;

  @ApiPropertyOptional({
    description: 'Indica se a pessoa é membro da Igreja Pão da Vida (true) ou visitante (false)',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  eMembro?: boolean;

  @ApiPropertyOptional({
    description: 'ID de cadastro prévio na tabela pessoas, se houver',
    example: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
  })
  @IsOptional()
  @IsUUID()
  pessoaId?: string;

  @ApiPropertyOptional({
    description: 'Check-in confirmado de presença no culto',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  presente?: boolean;
}
