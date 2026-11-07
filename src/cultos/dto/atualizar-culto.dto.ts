import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { CriarCultoDto } from './criar-culto.dto';
import { IsInt, IsOptional, Min } from 'class-validator';

export class AtualizarCultoDto extends PartialType(CriarCultoDto) {
  @ApiPropertyOptional({
    description: 'Versão do registro para controle de concorrência otimista',
    example: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  versao?: number;
}
