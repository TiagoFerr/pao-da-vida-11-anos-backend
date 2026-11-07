import {
  Controller,
  Sse,
  Post,
  Body,
  UseGuards,
  MessageEvent,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { Observable } from 'rxjs';
import { Role } from '@prisma/client';
import { SseService } from './sse.service';
import {
  ComunicadoPastoralDto,
} from './dto/comunicado-pastoral.dto';
import { ComunicadoEmitidoResponseDto } from './dto/sse-event.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../auth/decorators/current-user.decorator';

@ApiTags('SSE — Stream em Tempo Real')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('sse')
export class SseController {
  constructor(private readonly sseService: SseService) {}

  @Sse('stream')
  @Roles(Role.ADMIN, Role.PASTOR, Role.COORDENADOR)
  @ApiOperation({
    summary: 'Conectar ao stream de eventos em tempo real (Server-Sent Events)',
    description:
      'Mantém uma conexão HTTP unidirecional persistente (text/event-stream). Admins/Pastores recebem todos os eventos de Mossoró (incluindo alertas para o telão). Coordenadores recebem eventos do seu setor e comunicados.',
  })
  @ApiQuery({
    name: 'token',
    required: false,
    description:
      'Token JWT passado na Query String (útil para EventSource padrão de navegadores que não suportam Headers customizados).',
  })
  @ApiResponse({
    status: 200,
    description: 'Stream SSE estabelecido com sucesso (text/event-stream)',
  })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  @ApiResponse({ status: 403, description: 'Acesso restrito à liderança pastoral e coordenadores' })
  stream(@CurrentUser() user: AuthenticatedUser): Observable<MessageEvent> {
    return this.sseService.conectarStream(user);
  }

  @Post('comunicado')
  @Roles(Role.ADMIN, Role.PASTOR)
  @ApiOperation({
    summary: 'Transmitir comunicado pastoral em tempo real para a liderança',
    description:
      'Exclusivo para Pastores e Administradores. Dispara notificação push em tempo real para os painéis de todos os 14 coordenadores de setor.',
  })
  @ApiResponse({
    status: 201,
    description: 'Comunicado pastoral transmitido com sucesso',
    type: ComunicadoEmitidoResponseDto,
  })
  async emitirComunicado(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ComunicadoPastoralDto,
  ): Promise<ComunicadoEmitidoResponseDto> {
    this.sseService.emitirComunicadoPastoral({
      titulo: dto.titulo,
      mensagem: dto.mensagem,
      urgente: dto.urgente || false,
      autorNome: user.email,
    });

    return {
      enviado: true,
      mensagem: 'Comunicado pastoral transmitido com sucesso via SSE.',
      timestamp: new Date().toISOString(),
    };
  }
}
