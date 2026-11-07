import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { FotosService } from './fotos.service';
import { SolicitarPresignedUrlDto } from './dto/solicitar-presigned-url.dto';
import { ConfirmarFotoDto } from './dto/confirmar-foto.dto';
import { AtualizarFotoTelaoDto } from './dto/atualizar-foto-telao.dto';
import { FiltrarFotosTelaoDto } from './dto/filtrar-fotos-telao.dto';
import {
  FotoResponseDto,
  PresignedUploadResponseDto,
  FotosTelaoPaginadasResponseDto,
} from './dto/foto-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Fotos & Galeria do Lar (MinIO S3)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class FotosController {
  constructor(private readonly fotosService: FotosService) {}

  @Post('cultos/:cultoId/fotos/presigned-url')
  @Roles(Role.ADMIN, Role.PASTOR, Role.COORDENADOR, Role.LIDER)
  @ApiOperation({
    summary: 'Solicitar URL pré-assinada para upload direto de foto no MinIO S3',
    description:
      'Gera uma URL temporária pré-assinada (PUT) para que o celular do líder faça upload direto no bucket MinIO sem sobrecarregar a memória do backend.',
  })
  @ApiResponse({
    status: 201,
    description: 'URL pré-assinada gerada com sucesso',
    type: PresignedUploadResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Sem permissão para enviar fotos neste culto' })
  @ApiResponse({ status: 404, description: 'Culto não encontrado' })
  async solicitarPresignedUrl(
    @CurrentUser() user: AuthenticatedUser,
    @Param('cultoId', ParseUUIDPipe) cultoId: string,
    @Body() dto: SolicitarPresignedUrlDto,
  ): Promise<PresignedUploadResponseDto> {
    return this.fotosService.solicitarPresignedUrl(cultoId, user, dto);
  }

  @Post('cultos/:cultoId/fotos/confirmar')
  @Roles(Role.ADMIN, Role.PASTOR, Role.COORDENADOR, Role.LIDER)
  @ApiOperation({
    summary: 'Confirmar envio da foto e salvar metadados no banco',
    description:
      'Chamado após o upload HTTP PUT ser concluído no MinIO. Registra a foto no culto no lar e dispara notificação em tempo real via SSE.',
  })
  @ApiResponse({
    status: 201,
    description: 'Foto registrada com sucesso',
    type: FotoResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Culto não encontrado' })
  async confirmarFoto(
    @CurrentUser() user: AuthenticatedUser,
    @Param('cultoId', ParseUUIDPipe) cultoId: string,
    @Body() dto: ConfirmarFotoDto,
  ): Promise<FotoResponseDto> {
    return this.fotosService.confirmarFoto(cultoId, user, dto);
  }

  @Get('cultos/:cultoId/fotos')
  @ApiOperation({
    summary: 'Listar fotos da galeria de um culto no lar',
    description: 'Retorna a lista de fotos registradas da reunião daquele lar.',
  })
  @ApiResponse({
    status: 200,
    description: 'Galeria de fotos do lar',
    type: [FotoResponseDto],
  })
  @ApiResponse({ status: 403, description: 'Acesso negado para coordenadores de outro setor' })
  async listarFotosPorCulto(
    @CurrentUser() user: AuthenticatedUser,
    @Param('cultoId', ParseUUIDPipe) cultoId: string,
  ): Promise<FotoResponseDto[]> {
    return this.fotosService.listarFotosPorCulto(cultoId, user);
  }

  @Get('fotos/telao')
  @Roles(Role.ADMIN, Role.PASTOR, Role.COORDENADOR)
  @ApiOperation({
    summary: 'Listar fotos aprovadas para projeção no telão da igreja',
    description:
      'Retorna galeria de fotos aprovadas pela curadoria pastoral para passar durante a celebração.',
  })
  @ApiResponse({
    status: 200,
    description: 'Galeria do telão',
    type: FotosTelaoPaginadasResponseDto,
  })
  async listarFotosTelao(
    @CurrentUser() user: AuthenticatedUser,
    @Query() filtros: FiltrarFotosTelaoDto,
  ): Promise<FotosTelaoPaginadasResponseDto> {
    return this.fotosService.listarFotosTelao(user, filtros);
  }

  @Patch('fotos/:id/telao')
  @Roles(Role.ADMIN, Role.PASTOR)
  @ApiOperation({
    summary: 'Aprovar ou reprovar foto para exibição no telão da igreja',
    description: 'Exclusivo para Pastores e equipe de Mídia/Admin.',
  })
  @ApiResponse({
    status: 200,
    description: 'Status para o telão atualizado',
    type: FotoResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Apenas pastores ou administradores podem aprovar' })
  @ApiResponse({ status: 404, description: 'Foto não encontrada' })
  async atualizarAprovacaoTelao(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AtualizarFotoTelaoDto,
  ): Promise<FotoResponseDto> {
    return this.fotosService.atualizarAprovacaoTelao(id, user, dto);
  }

  @Delete('fotos/:id')
  @Roles(Role.ADMIN, Role.PASTOR, Role.COORDENADOR, Role.LIDER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Excluir foto do MinIO S3 e do banco de dados',
    description: 'Remove o arquivo do bucket S3 e o registro correspondente no banco.',
  })
  @ApiResponse({ status: 200, description: 'Foto excluída com sucesso' })
  @ApiResponse({ status: 403, description: 'Sem permissão para excluir esta foto' })
  @ApiResponse({ status: 404, description: 'Foto não encontrada' })
  async removerFoto(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ success: boolean; message: string }> {
    return this.fotosService.removerFoto(id, user);
  }
}
