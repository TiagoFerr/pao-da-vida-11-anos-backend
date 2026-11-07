import {
  Controller,
  Post,
  Get,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CultosService } from './cultos.service';
import { CriarCultoDto } from './dto/criar-culto.dto';
import { AtualizarCultoDto } from './dto/atualizar-culto.dto';
import { AtualizarStatusCultoDto } from './dto/atualizar-status-culto.dto';
import { FiltrarCultosDto } from './dto/filtrar-cultos.dto';
import {
  CultoResponseDto,
  CultosPaginadosResponseDto,
} from './dto/culto-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Cultos nos Lares')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('cultos')
export class CultosController {
  constructor(private readonly cultosService: CultosService) {}

  @Post()
  @Roles(Role.ADMIN, Role.PASTOR, Role.COORDENADOR, Role.LIDER)
  @ApiOperation({
    summary: 'Cadastrar novo Culto no Lar',
    description:
      'Cria um novo culto atrelado a um dos 14 setores pastorais de Mossoró, calculando automaticamente o número sequencial oficial dos 120 Lares.',
  })
  @ApiResponse({
    status: 201,
    description: 'Culto no Lar cadastrado com sucesso',
    type: CultoResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Dados inválidos ou campos obrigatórios ausentes' })
  @ApiResponse({ status: 403, description: 'Usuário sem permissão para cadastrar no setor informado' })
  @ApiResponse({ status: 404, description: 'Setor não encontrado' })
  async criar(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CriarCultoDto,
  ): Promise<CultoResponseDto> {
    return this.cultosService.criar(user, dto);
  }

  @Get()
  @ApiOperation({
    summary: 'Listar cultos nos lares com paginação e filtros',
    description:
      'Retorna lista paginada de cultos. Coordenadores visualizam automaticamente apenas os cultos do seu respectivo setor.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista paginada de cultos obtida com sucesso',
    type: CultosPaginadosResponseDto,
  })
  async listar(
    @CurrentUser() user: AuthenticatedUser,
    @Query() filtros: FiltrarCultosDto,
  ): Promise<CultosPaginadosResponseDto> {
    return this.cultosService.listar(user, filtros);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Obter detalhes de um culto no lar por ID',
    description:
      'Retorna informações completas do lar, anfitrião, líder responsável e totalizadores de presenças e decisões.',
  })
  @ApiResponse({
    status: 200,
    description: 'Detalhes do culto',
    type: CultoResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Culto não encontrado' })
  async buscarPorId(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<CultoResponseDto> {
    return this.cultosService.buscarPorId(id, user);
  }

  @Put(':id')
  @Roles(Role.ADMIN, Role.PASTOR, Role.COORDENADOR, Role.LIDER)
  @ApiOperation({
    summary: 'Atualizar informações cadastrais do culto no lar',
    description:
      'Atualiza dados do lar, anfitrião, líder ou endereço com verificação de concorrência otimista (versao).',
  })
  @ApiResponse({
    status: 200,
    description: 'Culto atualizado com sucesso',
    type: CultoResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Sem permissão para editar este culto' })
  @ApiResponse({ status: 404, description: 'Culto não encontrado' })
  @ApiResponse({ status: 409, description: 'Conflito de versão (concorrência otimista)' })
  async atualizar(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AtualizarCultoDto,
  ): Promise<CultoResponseDto> {
    return this.cultosService.atualizar(id, user, dto);
  }

  @Patch(':id/status')
  @Roles(Role.ADMIN, Role.PASTOR, Role.COORDENADOR, Role.LIDER)
  @ApiOperation({
    summary: 'Alterar status operacional do culto no lar',
    description:
      'Transição de máquina de estados: PLANEJADO -> CONFIRMADO -> EM_ANDAMENTO -> REALIZADO / CANCELADO.',
  })
  @ApiResponse({
    status: 200,
    description: 'Status atualizado com sucesso',
    type: CultoResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Sem permissão para alterar o status' })
  async atualizarStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AtualizarStatusCultoDto,
  ): Promise<CultoResponseDto> {
    return this.cultosService.atualizarStatus(id, user, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.PASTOR, Role.COORDENADOR)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Excluir um culto no lar',
    description:
      'Apenas Administradores, Pastores ou o Coordenador do setor responsável podem remover um culto cadastrado.',
  })
  @ApiResponse({ status: 200, description: 'Culto excluído com sucesso' })
  @ApiResponse({ status: 403, description: 'Apenas coordenadores do setor ou pastores podem excluir' })
  async remover(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ success: boolean; message: string }> {
    return this.cultosService.remover(id, user);
  }
}
