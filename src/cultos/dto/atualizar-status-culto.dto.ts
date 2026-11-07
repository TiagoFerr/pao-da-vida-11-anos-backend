import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { StatusCulto } from '@prisma/client';

export class AtualizarStatusCultoDto {
  @ApiProperty({
    description: 'Novo status do culto no lar',
    enum: StatusCulto,
    example: StatusCulto.CONFIRMADO,
  })
  @IsEnum(StatusCulto, {
    message: 'Status deve ser PLANEJADO, CONFIRMADO, EM_ANDAMENTO, REALIZADO ou CANCELADO',
  })
  status: StatusCulto;

  @ApiPropertyOptional({
    description: 'Motivo ou observação sobre a mudança de status',
    example: 'Visita da liderança confirmada na residência',
  })
  @IsOptional()
  @IsString()
  motivo?: string;
}
