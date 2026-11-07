import { ApiProperty } from '@nestjs/swagger';

export type SseTipoEvento =
  | 'vida.para.cristo'
  | 'culto.cadastrado'
  | 'culto.status_alterado'
  | 'meta.progresso'
  | 'comunicado.pastoral'
  | 'ping';

export interface SsePayloadEnvelope<T = any> {
  tipo: SseTipoEvento;
  setorNumero?: number | null;
  isBroadcast?: boolean;
  timestamp: string;
  payload: T;
}

export class ComunicadoEmitidoResponseDto {
  @ApiProperty({ example: true })
  enviado: boolean;

  @ApiProperty({ example: 'Comunicado pastoral transmitido com sucesso via SSE.' })
  mensagem: string;

  @ApiProperty({ example: '2026-11-07T12:00:00.000Z' })
  timestamp: string;
}
