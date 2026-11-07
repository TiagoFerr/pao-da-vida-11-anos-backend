import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PresignedUploadResponseDto {
  @ApiProperty({
    description: 'URL temporária pré-assinada para upload via HTTP PUT direto no MinIO',
    example: 'https://minio.paodavida.com.br/cultos-fotos/cultos/c1d2e3f4/foto.jpg?X-Amz-Algorithm=...',
  })
  uploadUrl: string;

  @ApiProperty({
    description: 'Chave exclusiva do objeto no S3/MinIO',
    example: 'cultos/c1d2e3f4/a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d.jpg',
  })
  s3Key: string;

  @ApiProperty({
    description: 'URL pública de leitura direta da imagem após o upload',
    example: 'https://minio.paodavida.com.br/cultos-fotos/cultos/c1d2e3f4/a1b2c3d4.jpg',
  })
  urlPublica: string;

  @ApiProperty({
    description: 'Tempo de expiração da URL em segundos (padrão: 900s = 15 minutos)',
    example: 900,
  })
  expiraEmSegundos: number;
}

export class FotoCultoResumoDto {
  @ApiProperty({ example: 42, nullable: true })
  numeroSequencial: number | null;

  @ApiProperty({ example: 5 })
  setorNumero: number;

  @ApiProperty({ example: 'Santo Antônio' })
  bairro: string;

  @ApiProperty({ example: 'Pb. Adriano Silva' })
  liderNome: string;
}

export class FotoResponseDto {
  @ApiProperty({ example: 'f1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d' })
  id: string;

  @ApiProperty({ example: 'c1d2e3f4-a5b6-7c8d-9e0f-1a2b3c4d5e6f' })
  cultoId: string;

  @ApiPropertyOptional({ type: FotoCultoResumoDto })
  culto?: FotoCultoResumoDto;

  @ApiProperty({ example: 'cultos/c1d2e3f4/foto.jpg' })
  s3Key: string;

  @ApiProperty({ example: 'https://minio.paodavida.com.br/cultos-fotos/cultos/c1d2e3f4/foto.jpg' })
  urlPublica: string;

  @ApiProperty({ example: 'momento_louvor.jpg' })
  nomeOriginal: string;

  @ApiProperty({ example: 'image/jpeg' })
  mimeType: string;

  @ApiProperty({
    description: 'Tamanho em bytes convertido para number',
    example: 2450890,
  })
  tamanhoBytes: number;

  @ApiPropertyOptional({ example: 'Momento de intercessão pelas famílias', nullable: true })
  legenda: string | null;

  @ApiProperty({ example: false })
  aprovadoParaTelao: boolean;

  @ApiPropertyOptional({ example: 'Pb. Adriano', nullable: true })
  enviadoPorNome: string | null;

  @ApiProperty({ example: '2026-11-19T20:45:00.000Z' })
  createdAt: Date;
}

export class FotosTelaoPaginadasResponseDto {
  @ApiProperty({ type: [FotoResponseDto] })
  dados: FotoResponseDto[];

  @ApiProperty({ example: 45 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 30 })
  limit: number;

  @ApiProperty({ example: 2 })
  totalPages: number;
}
