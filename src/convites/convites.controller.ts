import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Param,
  ParseIntPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { ConvitesService } from './convites.service';
import { CriarConviteCoordenadorDto } from './dto/criar-convite-coordenador.dto';
import { CriarConviteMembroDto } from './dto/criar-convite-membro.dto';
import { AtivarConviteDto } from './dto/ativar-convite.dto';
import {
  ConviteCriadoResponseDto,
  ValidarConviteResponseDto,
  ConviteItemDto,
} from './dto/convite-response.dto';
import { AuthResponseDto } from '../auth/dto/auth-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('Convites & Onboarding')
@Controller('convites')
export class ConvitesController {
  constructor(private readonly convitesService: ConvitesService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.PASTOR)
  @ApiBearerAuth()
  @Post('coordenador')
  @ApiOperation({
    summary: 'Gerar link de convite para Coordenador de Setor',
    description:
      'Exclusivo para Pastores/Admins. Cria token criptográfico atrelado a um dos 14 setores para envio via WhatsApp.',
  })
  @ApiResponse({
    status: 201,
    description: 'Link de convite gerado com sucesso',
    type: ConviteCriadoResponseDto,
  })
  async criarConviteCoordenador(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CriarConviteCoordenadorDto,
  ): Promise<ConviteCriadoResponseDto> {
    return this.convitesService.criarConviteCoordenador(user.id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.PASTOR, Role.COORDENADOR)
  @ApiBearerAuth()
  @Post('membro')
  @ApiOperation({
    summary: 'Gerar link de convite para Líder de Culto ou Anfitrião',
    description:
      'Coordenadores e Pastores geram links compartilháveis para membros do setor criarem suas contas com os papéis LIDER ou ANFITRIAO.',
  })
  @ApiResponse({
    status: 201,
    description: 'Link de convite gerado com sucesso',
    type: ConviteCriadoResponseDto,
  })
  async criarConviteMembro(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CriarConviteMembroDto,
  ): Promise<ConviteCriadoResponseDto> {
    return this.convitesService.criarConviteMembro(user, dto);
  }

  @Public()
  @Get('validar')
  @ApiOperation({
    summary: 'Validar token de convite recebido pelo link',
    description:
      'Rota pública que valida a autenticidade e validade do token antes de exibir o formulário de cadastro.',
  })
  @ApiQuery({ name: 'token', description: 'Token de convite recebido no WhatsApp' })
  @ApiResponse({
    status: 200,
    description: 'Convite válido',
    type: ValidarConviteResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Convite inválido ou expirado' })
  async validarConvite(
    @Query('token') token: string,
  ): Promise<ValidarConviteResponseDto> {
    return this.convitesService.validarConvite(token);
  }

  @Public()
  @Post('ativar')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Ativar conta e definir senha a partir de link de convite',
    description:
      'Cria o cadastro da Pessoa, a conta de Usuário com a role definida no convite, vincula ao Setor e retorna os tokens de sessão já autenticados.',
  })
  @ApiResponse({
    status: 200,
    description: 'Conta ativada com sucesso',
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Dados inválidos ou convite expirado' })
  @ApiResponse({ status: 409, description: 'E-mail já utilizado por outro usuário' })
  async ativarConvite(@Body() dto: AtivarConviteDto): Promise<AuthResponseDto> {
    return this.convitesService.ativarConvite(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.PASTOR, Role.COORDENADOR)
  @ApiBearerAuth()
  @Get('setor/:setorNumero')
  @ApiOperation({
    summary: 'Listar convites emitidos para um setor',
    description:
      'Permite ao Coordenador ou Admin verificar status (pendente/utilizado/expirado) dos convites do setor.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de convites do setor',
    type: [ConviteItemDto],
  })
  async listarConvitesPorSetor(
    @CurrentUser() user: AuthenticatedUser,
    @Param('setorNumero', ParseIntPipe) setorNumero: number,
  ): Promise<ConviteItemDto[]> {
    return this.convitesService.listarConvitesPorSetor(user, setorNumero);
  }
}
