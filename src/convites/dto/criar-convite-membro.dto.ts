import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Role } from '@prisma/client';

export class CriarConviteMembroDto {
  @ApiProperty({
    description: 'Número do setor pastoral (1 a 14)',
    example: 5,
    minimum: 1,
    maximum: 14,
  })
  @IsInt({ message: 'O número do setor deve ser um número inteiro' })
  @Min(1, { message: 'O número do setor deve ser no mínimo 1' })
  @Max(14, { message: 'O número do setor deve ser no máximo 14' })
  setorNumero: number;

  @ApiProperty({
    description: 'Papel do membro convidado no Culto no Lar',
    enum: [Role.LIDER, Role.ANFITRIAO],
    example: Role.LIDER,
  })
  @IsIn([Role.LIDER, Role.ANFITRIAO], {
    message: 'O tipoPapel para membro deve ser LIDER ou ANFITRIAO',
  })
  tipoPapel: Role;

  @ApiPropertyOptional({
    description: 'Nome do membro ou anfitrião',
    example: 'João da Silva',
  })
  @IsOptional()
  @IsString()
  nomeDestinatario?: string;

  @ApiPropertyOptional({
    description: 'Telefone/WhatsApp do destinatário',
    example: '84988887777',
  })
  @IsOptional()
  @IsString()
  telefoneDestinatario?: string;
}
