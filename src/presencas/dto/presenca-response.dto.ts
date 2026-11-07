import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PresencaResponseDto {
  @ApiProperty({ example: 'p1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d' })
  id: string;

  @ApiProperty({ example: 'c1d2e3f4-a5b6-7c8d-9e0f-1a2b3c4d5e6f' })
  cultoId: string;

  @ApiPropertyOptional({
    example: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
    nullable: true,
  })
  pessoaId: string | null;

  @ApiProperty({ example: 'Carlos Eduardo Oliveira' })
  nomeParticipante: string;

  @ApiPropertyOptional({ example: '84988776655', nullable: true })
  telefone: string | null;

  @ApiProperty({ example: true })
  eMembro: boolean;

  @ApiProperty({ example: true })
  presente: boolean;

  @ApiProperty({ example: '2026-11-19T19:35:00.000Z' })
  checkinEm: Date;
}

export class ResumoPresencasCultoDto {
  @ApiProperty({ example: 'c1d2e3f4-a5b6-7c8d-9e0f-1a2b3c4d5e6f' })
  cultoId: string;

  @ApiProperty({ example: 42 })
  numeroSequencial: number | null;

  @ApiProperty({ example: 18 })
  totalParticipantes: number;

  @ApiProperty({ example: 12 })
  totalMembros: number;

  @ApiProperty({ example: 6 })
  totalVisitantes: number;

  @ApiProperty({ example: 17 })
  totalPresentes: number;

  @ApiProperty({ type: [PresencaResponseDto] })
  participantes: PresencaResponseDto[];
}
