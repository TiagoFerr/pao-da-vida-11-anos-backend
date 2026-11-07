import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class AtivarConviteDto {
  @ApiProperty({
    description: 'Token criptográfico recebido no link de convite',
    example: 'd9b7f5c24a1e4c7b9e2a1b2c3d4e5f6a',
  })
  @IsString()
  @IsNotEmpty({ message: 'O token de convite é obrigatório' })
  token: string;

  @ApiProperty({
    description: 'Nome completo do usuário/membro',
    example: 'João da Silva',
  })
  @IsString()
  @IsNotEmpty({ message: 'O nome é obrigatório' })
  nome: string;

  @ApiProperty({
    description: 'E-mail para acesso ao sistema',
    example: 'joao.silva@gmail.com',
  })
  @IsEmail({}, { message: 'Forneça um e-mail válido' })
  @IsNotEmpty({ message: 'O e-mail é obrigatório' })
  email: string;

  @ApiProperty({
    description: 'Senha de acesso',
    example: 'MinhaSenhaForte2026!',
    minLength: 6,
  })
  @IsString()
  @MinLength(6, { message: 'A senha deve ter no mínimo 6 caracteres' })
  senha: string;

  @ApiPropertyOptional({
    description: 'Telefone ou WhatsApp para contato',
    example: '84988887777',
  })
  @IsOptional()
  @IsString()
  telefone?: string;

  @ApiPropertyOptional({
    description: 'Endereço residencial',
    example: 'Rua das Flores, 123',
  })
  @IsOptional()
  @IsString()
  endereco?: string;

  @ApiPropertyOptional({
    description: 'Bairro de residência',
    example: 'Nova Betânia',
  })
  @IsOptional()
  @IsString()
  bairro?: string;
}
