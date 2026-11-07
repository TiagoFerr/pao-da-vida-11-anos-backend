import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { CriarPresencaDto } from './criar-presenca.dto';

export class AtualizarPresencaDto extends PartialType(CriarPresencaDto) {}
