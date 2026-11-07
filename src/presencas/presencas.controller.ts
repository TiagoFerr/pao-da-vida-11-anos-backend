import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
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
import { PresencasService } from './presencas.service';
import { CriarPresencaDto } from './dto/criar-presenca.dto';
import { AtualizarPresencaDto } from './dto/atualizar-presenca.dto';
import {
  PresencaResponseDto,
  ResumoPresencasCultoDto,
} from './dto/presenca-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Presenças & Check-in')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('cultos/:cultoId/presencas')
export class PresencasController {
  constructor(private readonly presencasService: PresencasService) {}

  @Post()
  @Roles(Role.ADMIN, Role.PASTOR, Role.COORDENADOR, Role.LIDER)
  @ApiOperation({
    summary: 'Registrar presença de membro ou visitante no culto',
    description:
      'Realiza check-in no culto no lar. Permite identificar se o participante é membro da igreja ou visitante.',
  })
  @ApiResponse({
    status: 201,
    description: 'Presença registrada com sucesso',
    type: PresencaResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Sem permissão para registrar presença neste culto' })
  @ApiResponse({ status: 404, description: 'Culto não encontrado' })
  async adicionarPresenca(
    @CurrentUser() user: AuthenticatedUser,
    @Param('cultoId', ParseUUIDPipe) cultoId: string,
    @Body() dto: CriarPresencaDto,
  ): Promise<PresencaResponseDto> {
    return this.presencasService.adicionarPresenca(cultoId, user, dto);
  }

  @Get()
  @ApiOperation({
    summary: 'Listar participantes e resumo de presença do culto no lar',
    description:
      'Retorna a lista de pessoas presentes, com contadores separados de membros e visitantes.',
  })
  @ApiResponse({
    status: 200,
    description: 'Resumo e lista de presença',
    type: ResumoPresencasCultoDto,
  })
  @ApiResponse({ status: 403, description: 'Acesso negado para coordenadores de outro setor' })
  @ApiResponse({ status: 404, description: 'Culto não encontrado' })
  async listarPresencas(
    @CurrentUser() user: AuthenticatedUser,
    @Param('cultoId', ParseUUIDPipe) cultoId: string,
  ): Promise<ResumoPresencasCultoDto> {
    return this.presencasService.listarPresencas(cultoId, user);
  }

  @Patch(':presencaId')
  @Roles(Role.ADMIN, Role.PASTOR, Role.COORDENADOR, Role.LIDER)
  @ApiOperation({
    summary: 'Atualizar dados ou alternar status de presença',
    description: 'Permite alterar se o participante esteve presente ou corrigir dados de contato.',
  })
  @ApiResponse({
    status: 200,
    description: 'Presença atualizada com sucesso',
    type: PresencaResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Presença ou culto não encontrado' })
  async atualizarPresenca(
    @CurrentUser() user: AuthenticatedUser,
    @Param('cultoId', ParseUUIDPipe) cultoId: string,
    @Param('presencaId', ParseUUIDPipe) presencaId: string,
    @Body() dto: AtualizarPresencaDto,
  ): Promise<PresencaResponseDto> {
    return this.presencasService.atualizarPresenca(cultoId, presencaId, user, dto);
  }

  @Delete(':presencaId')
  @Roles(Role.ADMIN, Role.PASTOR, Role.COORDENADOR, Role.LIDER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Remover participante da lista de presença',
    description: 'Remove o registro de check-in do participante do culto no lar.',
  })
  @ApiResponse({ status: 200, description: 'Presença removida com sucesso' })
  @ApiResponse({ status: 404, description: 'Presença não encontrada' })
  async removerPresenca(
    @CurrentUser() user: AuthenticatedUser,
    @Param('cultoId', ParseUUIDPipe) cultoId: string,
    @Param('presencaId', ParseUUIDPipe) presencaId: string,
  ): Promise<{ success: boolean; message: string }> {
    return this.presencasService.removerPresenca(cultoId, presencaId, user);
  }
}
