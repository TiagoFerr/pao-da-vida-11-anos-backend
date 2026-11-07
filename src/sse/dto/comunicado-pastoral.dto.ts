import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ComunicadoPastoralDto {
  @ApiProperty({
    description: 'Título do comunicado pastoral',
    example: 'Atenção Líderes e Coordenadores dos 120 Lares',
  })
  @IsString()
  @IsNotEmpty({ message: 'O título é obrigatório' })
  titulo: string;

  @ApiProperty({
    description: 'Mensagem transmitida em tempo real para os painéis de coordenação',
    example: 'Celebração hoje às 19:30 em todos os 14 setores de Mossoró. Não esqueçam de registrar as decisões espirituais!',
  })
  @IsString()
  @IsNotEmpty({ message: 'A mensagem é obrigatória' })
  mensagem: string;

  @ApiPropertyOptional({
    description: 'Indica se a mensagem é um alerta urgente com destaque visual',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  urgente?: boolean;
}
