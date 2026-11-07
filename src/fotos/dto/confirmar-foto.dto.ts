import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class ConfirmarFotoDto {
  @ApiProperty({
    description: 'Chave do arquivo armazenado no MinIO/S3',
    example: 'cultos/c1d2e3f4/8a9b0c1d-2e3f-4a5b-6c7d-8e9f0a1b2c3d.jpg',
  })
  @IsString()
  @IsNotEmpty({ message: 'A s3Key é obrigatória' })
  s3Key: string;

  @ApiProperty({
    description: 'URL pública final de acesso à imagem no MinIO',
    example: 'https://minio.paodavida.com.br/cultos-fotos/cultos/c1d2e3f4/foto.jpg',
  })
  @IsString()
  @IsNotEmpty({ message: 'A urlPublica é obrigatória' })
  urlPublica: string;

  @ApiProperty({
    description: 'Nome do arquivo original enviado',
    example: 'oracao_final.jpg',
  })
  @IsString()
  @IsNotEmpty({ message: 'O nomeOriginal é obrigatório' })
  nomeOriginal: string;

  @ApiProperty({
    description: 'MIME type da imagem enviada',
    example: 'image/jpeg',
  })
  @IsString()
  @IsNotEmpty({ message: 'O mimeType é obrigatório' })
  mimeType: string;

  @ApiProperty({
    description: 'Tamanho exato do arquivo em bytes',
    example: 2450890,
  })
  @IsInt()
  @Min(1)
  tamanhoBytes: number;

  @ApiPropertyOptional({
    description: 'Legenda descritiva opcional (ex: Momento do louvor, Oração pelas famílias)',
    example: 'Oração pelas famílias no Lar do Irmão Antônio',
  })
  @IsOptional()
  @IsString()
  legenda?: string;
}
