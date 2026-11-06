import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BairroResponseDto {
  @ApiProperty({ example: 1, description: 'ID do bairro' })
  id: number;

  @ApiProperty({ example: 'Abolição', description: 'Nome do bairro' })
  nome: string;

  @ApiPropertyOptional({ example: -5.158089, description: 'Latitude decimal' })
  latitude?: number | null;

  @ApiPropertyOptional({ example: -37.364025, description: 'Longitude decimal' })
  longitude?: number | null;
}

export class SetorResponseDto {
  @ApiProperty({ example: 1, description: 'Número do setor (1 a 14)' })
  numero: number;

  @ApiProperty({ example: 'Setor 1 - Aeroporto', description: 'Nome descritivo do setor' })
  nome: string;

  @ApiPropertyOptional({ example: 'Pr. Rúbens Nunes', description: 'Nome do coordenador pastoral' })
  coordenadorNome?: string | null;

  @ApiPropertyOptional({ example: '(84) 99999-0000', description: 'Telefone para contato' })
  coordenadorTelefone?: string | null;

  @ApiPropertyOptional({ example: '#1D4225', description: 'Cor em formato HEX' })
  corHex?: string | null;

  @ApiProperty({ example: 8, description: 'Total de cultos nos lares cadastrados neste setor' })
  totalCultos: number;

  @ApiProperty({ type: [BairroResponseDto], description: 'Lista de bairros vinculados ao setor' })
  bairros: BairroResponseDto[];
}
