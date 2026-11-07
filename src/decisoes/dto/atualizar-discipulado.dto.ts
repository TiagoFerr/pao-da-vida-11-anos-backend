import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { StatusDiscipulado } from '@prisma/client';

export class AtualizarDiscipuladoDto {
  @ApiProperty({
    description: 'Status atual do processo de integração e discipulado pastoral',
    enum: StatusDiscipulado,
    example: StatusDiscipulado.DISCIPULANDO,
  })
  @IsEnum(StatusDiscipulado, {
    message: 'Status deve ser PENDENTE, EM_CONTATO ou DISCIPULANDO',
  })
  statusDiscipulado: StatusDiscipulado;

  @ApiPropertyOptional({
    description: 'Notas de acompanhamento ou atualização do pedido de oração',
    example: 'Entrado em contato via WhatsApp. Visitou o culto de celebração no domingo.',
  })
  @IsOptional()
  @IsString()
  observacao?: string;
}
