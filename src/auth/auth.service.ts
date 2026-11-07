import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { UsuarioPerfilResponseDto } from './dto/usuario-perfil-response.dto';
import { JwtPayload } from './strategies/jwt.strategy';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async hashPassword(password: string): Promise<string> {
    return argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 2 ** 16,
      timeCost: 3,
      parallelism: 1,
    });
  }

  async verifyPassword(hash: string, password: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, password);
    } catch {
      return false;
    }
  }

  private hashToken(rawToken: string): string {
    return crypto.createHash('sha256').update(rawToken).digest('hex');
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const emailNormalizado = dto.email.toLowerCase().trim();

    const usuario = await this.prisma.usuario.findUnique({
      where: { email: emailNormalizado },
      include: {
        pessoa: true,
        setor: true,
      },
    });

    if (!usuario) {
      throw new UnauthorizedException('Credenciais inválidas.');
    }

    const senhaValida = await this.verifyPassword(usuario.senhaHash, dto.senha);
    if (!senhaValida) {
      throw new UnauthorizedException('Credenciais inválidas.');
    }

    if (!usuario.ativo) {
      throw new UnauthorizedException(
        'Conta de usuário inativa. Contate a liderança pastoral.',
      );
    }

    return this.gerarSessaoTokens(usuario);
  }

  async refreshToken(refreshTokenRaw: string): Promise<AuthResponseDto> {
    const tokenHash = this.hashToken(refreshTokenRaw);

    const tokenRegistro = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: {
        usuario: {
          include: {
            pessoa: true,
            setor: true,
          },
        },
      },
    });

    if (!tokenRegistro) {
      throw new UnauthorizedException('Refresh token inválido ou não encontrado.');
    }

    if (tokenRegistro.revogado) {
      this.logger.warn(
        `Tentativa de reuso de token revogado detectada para o usuário ${tokenRegistro.usuarioId}`,
      );
      // Detecção de anomalia: revoga todas as sessões do usuário por segurança
      await this.prisma.refreshToken.updateMany({
        where: { usuarioId: tokenRegistro.usuarioId },
        data: { revogado: true },
      });
      throw new UnauthorizedException(
        'Refresh token revogado. Por favor, autentique-se novamente.',
      );
    }

    if (tokenRegistro.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token expirado.');
    }

    if (!tokenRegistro.usuario.ativo) {
      throw new UnauthorizedException('Conta de usuário inativa.');
    }

    // Invalida o token anterior (Rotação de Refresh Tokens)
    await this.prisma.refreshToken.update({
      where: { id: tokenRegistro.id },
      data: { revogado: true },
    });

    return this.gerarSessaoTokens(tokenRegistro.usuario);
  }

  async logout(
    userId: string,
    refreshTokenRaw?: string,
  ): Promise<{ success: boolean }> {
    if (refreshTokenRaw) {
      const tokenHash = this.hashToken(refreshTokenRaw);
      await this.prisma.refreshToken.updateMany({
        where: { tokenHash, usuarioId: userId },
        data: { revogado: true },
      });
    } else {
      await this.prisma.refreshToken.updateMany({
        where: { usuarioId: userId, revogado: false },
        data: { revogado: true },
      });
    }

    return { success: true };
  }

  async getMe(userId: string): Promise<UsuarioPerfilResponseDto> {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: userId },
      include: {
        pessoa: true,
        setor: true,
      },
    });

    if (!usuario) {
      throw new NotFoundException('Perfil de usuário não encontrado.');
    }

    return {
      id: usuario.id,
      email: usuario.email,
      role: usuario.role,
      setorNumero: usuario.setorNumero,
      ativo: usuario.ativo,
      createdAt: usuario.createdAt,
      pessoa: usuario.pessoa
        ? {
            id: usuario.pessoa.id,
            nome: usuario.pessoa.nome,
            telefone: usuario.pessoa.telefone,
            email: usuario.pessoa.email,
            tipoVinculo: usuario.pessoa.tipoVinculo,
            endereco: usuario.pessoa.endereco,
            bairro: usuario.pessoa.bairro,
          }
        : null,
      setor: usuario.setor
        ? {
            numero: usuario.setor.numero,
            nome: usuario.setor.nome,
            coordenadorNome: usuario.setor.coordenadorNome,
            corHex: usuario.setor.corHex,
          }
        : null,
    };
  }

  private async gerarSessaoTokens(usuario: {
    id: string;
    email: string;
    role: any;
    setorNumero: number | null;
    pessoa?: { nome: string } | null;
  }): Promise<AuthResponseDto> {
    const payload: JwtPayload = {
      sub: usuario.id,
      email: usuario.email,
      role: usuario.role,
      setorNumero: usuario.setorNumero,
    };

    const accessToken = await this.jwtService.signAsync(payload);

    // Gera refresh token opaco com 32 bytes aleatórios
    const rawRefreshToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(rawRefreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 dias

    await this.prisma.refreshToken.create({
      data: {
        usuarioId: usuario.id,
        tokenHash,
        expiresAt,
        revogado: false,
      },
    });

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      usuario: {
        id: usuario.id,
        email: usuario.email,
        role: usuario.role,
        setorNumero: usuario.setorNumero,
        nome: usuario.pessoa?.nome || null,
      },
    };
  }
}
