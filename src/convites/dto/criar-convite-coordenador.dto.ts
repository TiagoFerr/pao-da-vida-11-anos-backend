import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class CriarConviteCoordenadorDto {
  @ApiProperty({
    description: 'Número do setor pastoral (1 a 14)',
    example: 1,
    minimum: 1,
    maximum: 14,
  })
  @IsInt({ message: 'O número do setor deve ser um número inteiro' })
  @Min(1, { message: 'O número do setor deve ser no mínimo 1' })
  @Max(14, { message: 'O número do setor deve ser no máximo 14' })
  setorNumero: number;

  @ApiPropertyOptional({
    description: 'Nome do coordenador a ser convidado',
    example: 'Pr. Rúbens Nunes',
  })
  @IsOptional()
  @IsString()
  nomeDestinatario?: string;

  @ApiPropertyOptional({
    description: 'Telefone/WhatsApp do destinatário para envio do link',
    example: '84999998888',
  })
  @IsOptional()
  @IsString()
  telefoneDestinatario?: string;
}
