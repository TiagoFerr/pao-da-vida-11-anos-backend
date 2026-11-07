import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class SolicitarPresignedUrlDto {
  @ApiProperty({
    description: 'Nome original do arquivo selecionado no celular ou computador',
    example: 'foto-culto-lar-oracao.jpg',
  })
  @IsString()
  @IsNotEmpty({ message: 'O nomeOriginal é obrigatório' })
  nomeOriginal: string;

  @ApiProperty({
    description: 'MIME Type da imagem (apenas formatos seguros são aceitos)',
    enum: ['image/jpeg', 'image/png', 'image/webp', 'image/heic'],
    example: 'image/jpeg',
  })
  @IsIn(['image/jpeg', 'image/png', 'image/webp', 'image/heic'], {
    message: 'Formato de imagem inválido. Use JPEG, PNG, WEBP ou HEIC.',
  })
  mimeType: string;

  @ApiPropertyOptional({
    description: 'Tamanho aproximado do arquivo em bytes (máximo 15MB)',
    example: 3500000,
  })
  @IsOptional()
  @IsInt()
  @Min(100, { message: 'Tamanho mínimo de 100 bytes' })
  @Max(15 * 1024 * 1024, { message: 'O arquivo não pode exceder 15MB' })
  tamanhoBytes?: number;
}
