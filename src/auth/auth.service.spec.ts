import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException, NotFoundException } from '@nestjs/common';
import { Role, TipoVinculo } from '@prisma/client';
import * as argon2 from 'argon2';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: any;
  let jwtService: any;

  const mockUsuario = {
    id: 'user-uuid-1',
    email: 'pastor@paodavida.com.br',
    senhaHash: '',
    role: Role.ADMIN,
    setorNumero: null,
    ativo: true,
    createdAt: new Date(),
    pessoa: {
      id: 'pessoa-uuid-1',
      nome: 'Pr. Gabriel Ferreira',
      telefone: '84999998888',
      email: 'pastor@paodavida.com.br',
      tipoVinculo: TipoVinculo.MEMBRO_ATIVO,
      endereco: 'Rua Principal',
      bairro: 'Abolição',
    },
    setor: null,
  };

  beforeAll(async () => {
    mockUsuario.senhaHash = await argon2.hash('SenhaCorreta123!');
  });

  beforeEach(async () => {
    const mockPrisma = {
      usuario: {
        findUnique: jest.fn(),
      },
      refreshToken: {
        create: jest.fn().mockResolvedValue({ id: 'ref-1' }),
        findUnique: jest.fn(),
        update: jest.fn().mockResolvedValue({ id: 'ref-1', revogado: true }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };

    const mockJwtService = {
      signAsync: jest.fn().mockResolvedValue('jwt-mock-token'),
    };

    const mockConfigService = {
      get: jest.fn().mockReturnValue('mock-secret'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get(PrismaService);
    jwtService = module.get(JwtService);
  });

  it('deve estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('hashPassword & verifyPassword', () => {
    it('deve gerar e verificar o hash de uma senha corretamente com Argon2id', async () => {
      const senha = 'TesteSeguranca2026!';
      const hash = await service.hashPassword(senha);

      expect(hash).toBeDefined();
      expect(hash).toContain('$argon2id$');

      const valido = await service.verifyPassword(hash, senha);
      expect(valido).toBe(true);

      const invalido = await service.verifyPassword(hash, 'SenhaErrada');
      expect(invalido).toBe(false);
    });
  });

  describe('login', () => {
    it('deve autenticar usuário ativo com credenciais válidas e retornar tokens', async () => {
      prisma.usuario.findUnique.mockResolvedValue(mockUsuario);

      const result = await service.login({
        email: 'pastor@paodavida.com.br',
        senha: 'SenhaCorreta123!',
      });

      expect(result).toHaveProperty('accessToken', 'jwt-mock-token');
      expect(result).toHaveProperty('refreshToken');
      expect(result.usuario.email).toBe('pastor@paodavida.com.br');
      expect(result.usuario.role).toBe(Role.ADMIN);
      expect(prisma.refreshToken.create).toHaveBeenCalled();
    });

    it('deve lançar UnauthorizedException se o e-mail não existir', async () => {
      prisma.usuario.findUnique.mockResolvedValue(null);

      await expect(
        service.login({ email: 'inexistente@paodavida.com.br', senha: '123' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('deve lançar UnauthorizedException se a senha for incorreta', async () => {
      prisma.usuario.findUnique.mockResolvedValue(mockUsuario);

      await expect(
        service.login({
          email: 'pastor@paodavida.com.br',
          senha: 'SenhaErrada123!',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('deve lançar UnauthorizedException se o usuário estiver desativado', async () => {
      prisma.usuario.findUnique.mockResolvedValue({
        ...mockUsuario,
        ativo: false,
      });

      await expect(
        service.login({
          email: 'pastor@paodavida.com.br',
          senha: 'SenhaCorreta123!',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refreshToken', () => {
    it('deve rotacionar refresh token válido e emitir novos tokens', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'ref-1',
        tokenHash: 'somehash',
        usuarioId: mockUsuario.id,
        revogado: false,
        expiresAt: new Date(Date.now() + 100000),
        usuario: mockUsuario,
      });

      const result = await service.refreshToken('valid-token-str');

      expect(result).toHaveProperty('accessToken', 'jwt-mock-token');
      expect(result).toHaveProperty('refreshToken');
      expect(prisma.refreshToken.update).toHaveBeenCalledWith({
        where: { id: 'ref-1' },
        data: { revogado: true },
      });
      expect(prisma.refreshToken.create).toHaveBeenCalled();
    });

    it('deve lançar UnauthorizedException e revogar todas as sessões se detectar token já revogado', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'ref-compromised',
        tokenHash: 'somehash',
        usuarioId: mockUsuario.id,
        revogado: true,
        expiresAt: new Date(Date.now() + 100000),
        usuario: mockUsuario,
      });

      await expect(service.refreshToken('reused-token')).rejects.toThrow(
        UnauthorizedException,
      );
      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { usuarioId: mockUsuario.id },
        data: { revogado: true },
      });
    });

    it('deve lançar UnauthorizedException se o token estiver expirado', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'ref-expired',
        tokenHash: 'somehash',
        usuarioId: mockUsuario.id,
        revogado: false,
        expiresAt: new Date(Date.now() - 100000),
        usuario: mockUsuario,
      });

      await expect(service.refreshToken('expired-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('logout', () => {
    it('deve revogar refresh tokens no banco', async () => {
      const res = await service.logout(mockUsuario.id, 'specific-token');
      expect(res).toEqual({ success: true });
      expect(prisma.refreshToken.updateMany).toHaveBeenCalled();
    });
  });

  describe('getMe', () => {
    it('deve retornar perfil completo do usuário', async () => {
      prisma.usuario.findUnique.mockResolvedValue(mockUsuario);

      const perfil = await service.getMe(mockUsuario.id);

      expect(perfil.id).toBe(mockUsuario.id);
      expect(perfil.email).toBe(mockUsuario.email);
      expect(perfil.pessoa?.nome).toBe('Pr. Gabriel Ferreira');
    });

    it('deve lançar NotFoundException se o usuário não for encontrado', async () => {
      prisma.usuario.findUnique.mockResolvedValue(null);

      await expect(service.getMe('uuid-inexistente')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
