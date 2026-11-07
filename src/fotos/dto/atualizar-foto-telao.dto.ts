import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class AtualizarFotoTelaoDto {
  @ApiProperty({
    description: 'Aprovação para exibição no telão da igreja durante o culto de celebração',
    example: true,
  })
  @IsBoolean({ message: 'aprovadoParaTelao deve ser um valor booleano' })
  aprovadoParaTelao: boolean;
}
