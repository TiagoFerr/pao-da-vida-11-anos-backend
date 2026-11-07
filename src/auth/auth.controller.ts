import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { UsuarioPerfilResponseDto } from './dto/usuario-perfil-response.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';

@ApiTags('Autenticação & Sessão')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Autenticar usuário e obter tokens de sessão',
    description:
      'Valida credenciais (e-mail e senha) e retorna o token JWT de acesso e refresh token de 7 dias.',
  })
  @ApiResponse({
    status: 200,
    description: 'Login realizado com sucesso',
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Credenciais inválidas ou conta inativa' })
  async login(@Body() dto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(dto);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Renovar Access Token através do Refresh Token',
    description:
      'Realiza rotação de refresh token: invalida o anterior e emite um novo par de tokens.',
  })
  @ApiResponse({
    status: 200,
    description: 'Novo par de tokens emitido com sucesso',
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Refresh token expirado ou inválido' })
  async refresh(@Body() dto: RefreshTokenDto): Promise<AuthResponseDto> {
    return this.authService.refreshToken(dto.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Encerrar sessão ativa e revogar refresh tokens',
    description: 'Revoga o refresh token informado ou todas as sessões ativas do usuário logado.',
  })
  @ApiResponse({ status: 200, description: 'Sessão encerrada com sucesso' })
  async logout(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto?: RefreshTokenDto,
  ): Promise<{ success: boolean }> {
    return this.authService.logout(user.id, dto?.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('me')
  @ApiOperation({
    summary: 'Consultar perfil da conta autenticada',
    description:
      'Retorna detalhes do usuário conectado, sua role, setor vinculado e cadastro de pessoa associada.',
  })
  @ApiResponse({
    status: 200,
    description: 'Perfil obtido com sucesso',
    type: UsuarioPerfilResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Token JWT ausente ou inválido' })
  async getMe(@CurrentUser() user: AuthenticatedUser): Promise<UsuarioPerfilResponseDto> {
    return this.authService.getMe(user.id);
  }
}
