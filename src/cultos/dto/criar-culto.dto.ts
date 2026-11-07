import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class CriarCultoDto {
  @ApiProperty({
    description: 'Número do setor territorial (1 a 14)',
    example: 5,
    minimum: 1,
    maximum: 14,
  })
  @IsInt({ message: 'O setorNumero deve ser um número inteiro' })
  @Min(1, { message: 'O setorNumero deve ser no mínimo 1' })
  @Max(14, { message: 'O setorNumero deve ser no máximo 14' })
  setorNumero: number;

  @ApiProperty({
    description: 'Nome do bairro em Mossoró',
    example: 'Santo Antônio',
  })
  @IsString()
  @IsNotEmpty({ message: 'O bairro é obrigatório' })
  bairro: string;

  @ApiProperty({
    description: 'Nome da rua/avenida do lar',
    example: 'Rua Frei Miguelinho',
  })
  @IsString()
  @IsNotEmpty({ message: 'A rua é obrigatória' })
  rua: string;

  @ApiProperty({
    description: 'Número da residência',
    example: '142',
  })
  @IsString()
  @IsNotEmpty({ message: 'O número da residência é obrigatório' })
  numero: string;

  @ApiPropertyOptional({
    description: 'Ponto de referência para facilitar localização',
    example: 'Próximo à Praça da Convivência',
  })
  @IsOptional()
  @IsString()
  pontoReferencia?: string;

  @ApiPropertyOptional({
    description: 'Latitude decimal WGS84',
    example: -5.1878,
  })
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional({
    description: 'Longitude decimal WGS84',
    example: -37.3442,
  })
  @IsOptional()
  @IsNumber()
  longitude?: number;

  @ApiPropertyOptional({
    description: 'Coordenada X relativa no mapa estilizado',
    example: 450.5,
  })
  @IsOptional()
  @IsNumber()
  mapaX?: number;

  @ApiPropertyOptional({
    description: 'Coordenada Y relativa no mapa estilizado',
    example: 320.0,
  })
  @IsOptional()
  @IsNumber()
  mapaY?: number;

  @ApiProperty({
    description: 'Nome do líder do culto',
    example: 'Pb. Adriano Silva',
  })
  @IsString()
  @IsNotEmpty({ message: 'O nome do líder é obrigatório' })
  liderNome: string;

  @ApiProperty({
    description: 'Telefone/WhatsApp de contato do líder',
    example: '84999990005',
  })
  @IsString()
  @IsNotEmpty({ message: 'O telefone do líder é obrigatório' })
  liderTelefone: string;

  @ApiPropertyOptional({
    description: 'ID da conta de usuário do líder, se já cadastrado',
    example: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
  })
  @IsOptional()
  @IsUUID()
  liderUsuarioId?: string;

  @ApiProperty({
    description: 'Nome do anfitrião (dono da casa)',
    example: 'Irmão Antônio e Família',
  })
  @IsString()
  @IsNotEmpty({ message: 'O nome do anfitrião é obrigatório' })
  anfitriaoNome: string;

  @ApiProperty({
    description: 'Telefone/WhatsApp do anfitrião',
    example: '84988880005',
  })
  @IsString()
  @IsNotEmpty({ message: 'O telefone do anfitrião é obrigatório' })
  anfitriaoTelefone: string;

  @ApiPropertyOptional({
    description: 'ID da conta de usuário do anfitrião, se cadastrado',
    example: 'b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e',
  })
  @IsOptional()
  @IsUUID()
  anfitriaoUsuarioId?: string;

  @ApiPropertyOptional({
    description: 'Horário de início da reunião',
    example: '19:30',
    default: '19:30',
  })
  @IsOptional()
  @IsString()
  horarioInicio?: string;

  @ApiProperty({
    description: 'Data de realização do culto no lar (AAAA-MM-DD)',
    example: '2026-11-19',
  })
  @IsDateString({}, { message: 'A dataRealizacao deve estar no formato ISO (AAAA-MM-DD)' })
  dataRealizacao: string;

  @ApiPropertyOptional({
    description: 'Observações pastorais ou orientações para os participantes',
    example: 'Trazer cadeiras extras para a calçada',
  })
  @IsOptional()
  @IsString()
  observacoes?: string;
}
