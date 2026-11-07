import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { DecisoesService } from './decisoes.service';
import { CriarDecisaoDto } from './dto/criar-decisao.dto';
import { AtualizarDiscipuladoDto } from './dto/atualizar-discipulado.dto';
import { FiltrarDecisoesDto } from './dto/filtrar-decisoes.dto';
import {
  DecisaoResponseDto,
  RelatorioDecisoesConsolidadoDto,
} from './dto/decisao-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Decisões Espirituais & Consolidação')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class DecisoesController {
  constructor(private readonly decisoesService: DecisoesService) {}

  @Post('cultos/:cultoId/decisoes')
  @Roles(Role.ADMIN, Role.PASTOR, Role.COORDENADOR, Role.LIDER)
  @ApiOperation({
    summary: 'Registrar decisão espiritual ("Aceitou a Jesus", Reconciliação ou Pedido de Oração)',
    description:
      'Registra a entrega de uma vida para Cristo ou pedido de oração no lar, gerando notificação para o acompanhamento pastoral.',
  })
  @ApiResponse({
    status: 201,
    description: 'Decisão espiritual registrada com sucesso',
    type: DecisaoResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Sem permissão para registrar decisões neste culto' })
  @ApiResponse({ status: 404, description: 'Culto não encontrado' })
  async registrarDecisao(
    @CurrentUser() user: AuthenticatedUser,
    @Param('cultoId', ParseUUIDPipe) cultoId: string,
    @Body() dto: CriarDecisaoDto,
  ): Promise<DecisaoResponseDto> {
    return this.decisoesService.registrarDecisao(cultoId, user, dto);
  }

  @Get('cultos/:cultoId/decisoes')
  @ApiOperation({
    summary: 'Listar decisões espirituais ocorridas em um culto no lar',
    description: 'Retorna a lista de pessoas que tomaram decisões durante a reunião daquele lar.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de decisões do culto',
    type: [DecisaoResponseDto],
  })
  @ApiResponse({ status: 403, description: 'Acesso negado para coordenadores de outro setor' })
  @ApiResponse({ status: 404, description: 'Culto não encontrado' })
  async listarPorCulto(
    @CurrentUser() user: AuthenticatedUser,
    @Param('cultoId', ParseUUIDPipe) cultoId: string,
  ): Promise<DecisaoResponseDto[]> {
    return this.decisoesService.listarPorCulto(cultoId, user);
  }

  @Patch('decisoes/:id/discipulado')
  @Roles(Role.ADMIN, Role.PASTOR, Role.COORDENADOR)
  @ApiOperation({
    summary: 'Atualizar status do processo de discipulado pastoral',
    description:
      'Exclusivo para Pastores e Coordenadores. Atualiza status (PENDENTE -> EM_CONTATO -> DISCIPULANDO) e adiciona notas pastorais.',
  })
  @ApiResponse({
    status: 200,
    description: 'Status de discipulado atualizado com sucesso',
    type: DecisaoResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Apenas coordenadores do setor ou pastores podem alterar' })
  @ApiResponse({ status: 404, description: 'Decisão não encontrada' })
  async atualizarDiscipulado(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AtualizarDiscipuladoDto,
  ): Promise<DecisaoResponseDto> {
    return this.decisoesService.atualizarDiscipulado(id, user, dto);
  }

  @Get('relatorios/decisoes')
  @Roles(Role.ADMIN, Role.PASTOR, Role.COORDENADOR)
  @ApiOperation({
    summary: 'Relatório consolidado de vidas ganhas para Cristo e pedidos de oração',
    description:
      'Visão consolidada para os Pastores (Mossoró inteira) e Coordenadores (seu setor), com métricas totais e lista paginada para o ministério de consolidação.',
  })
  @ApiResponse({
    status: 200,
    description: 'Relatório de consolidação obtido com sucesso',
    type: RelatorioDecisoesConsolidadoDto,
  })
  async relatorioConsolidado(
    @CurrentUser() user: AuthenticatedUser,
    @Query() filtros: FiltrarDecisoesDto,
  ): Promise<RelatorioDecisoesConsolidadoDto> {
    return this.decisoesService.relatorioConsolidado(user, filtros);
  }
}
