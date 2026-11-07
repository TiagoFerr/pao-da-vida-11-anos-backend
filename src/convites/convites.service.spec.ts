import { Test, TestingModule } from '@nestjs/testing';
import { ConvitesService } from './convites.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { ConfigService } from '@nestjs/config';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { Role } from '@prisma/client';

describe('ConvitesService', () => {
  let service: ConvitesService;
  let prisma: any;
  let authService: any;

  const mockSetor = {
    numero: 5,
    nome: 'Setor 5 - Santo Antônio',
    coordenadorNome: 'Pb. Adriano',
    coordenadorTelefone: '84999990005',
    corHex: '#10B981',
  };

  const mockConvite = {
    id: 'conv-1',
    tokenHash: 'token-hash-mock',
    tipoPapel: Role.LIDER,
    setorNumero: 5,
    nomeDestinatario: 'Maria Silva',
    telefoneDestinatario: '84988887777',
    expiraEm: new Date(Date.now() + 1000000),
    utilizado: false,
    criadoPorId: 'user-admin-1',
    createdAt: new Date(),
    setor: mockSetor,
  };

  beforeEach(async () => {
    const mockPrisma = {
      setor: {
        findUnique: jest.fn(),
      },
      conviteConta: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      usuario: {
        findUnique: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    const mockAuthService = {
      hashPassword: jest.fn().mockResolvedValue('hashed-pass'),
      login: jest.fn().mockResolvedValue({
        accessToken: 'mock-jwt',
        refreshToken: 'mock-ref',
        usuario: { email: 'maria@test.com' },
      }),
    };

    const mockConfigService = {
      get: jest.fn().mockReturnValue('https://cultonolar.paodavida.com.br'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConvitesService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuthService, useValue: mockAuthService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<ConvitesService>(ConvitesService);
    prisma = module.get(PrismaService);
    authService = module.get(AuthService);
  });

  it('deve estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('criarConviteCoordenador', () => {
    it('deve gerar convite para coordenador com token seguro e link do whatsapp', async () => {
      prisma.setor.findUnique.mockResolvedValue(mockSetor);
      prisma.conviteConta.create.mockResolvedValue({
        ...mockConvite,
        tipoPapel: Role.COORDENADOR,
      });

      const res = await service.criarConviteCoordenador('admin-1', {
        setorNumero: 5,
      });

      expect(res).toHaveProperty('token');
      expect(res.link).toContain('/convite?token=');
      expect(res.tipoPapel).toBe(Role.COORDENADOR);
      expect(res.setorNumero).toBe(5);
      expect(prisma.conviteConta.create).toHaveBeenCalled();
    });

    it('deve lançar NotFoundException se o setor não existir', async () => {
      prisma.setor.findUnique.mockResolvedValue(null);

      await expect(
        service.criarConviteCoordenador('admin-1', { setorNumero: 99 }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('criarConviteMembro', () => {
    it('deve permitir que o Coordenador crie convite de Líder para o seu setor', async () => {
      prisma.setor.findUnique.mockResolvedValue(mockSetor);
      prisma.conviteConta.create.mockResolvedValue(mockConvite);

      const coordenadorUser = {
        id: 'coord-5',
        email: 'coord5@paodavida.com',
        role: Role.COORDENADOR,
        setorNumero: 5,
      };

      const res = await service.criarConviteMembro(coordenadorUser, {
        setorNumero: 5,
        tipoPapel: Role.LIDER,
        nomeDestinatario: 'Maria Silva',
      });

      expect(res.tipoPapel).toBe(Role.LIDER);
      expect(res.setorNumero).toBe(5);
    });

    it('deve bloquear Coordenador tentando criar convite para outro setor com ForbiddenException', async () => {
      const coordenadorUser = {
        id: 'coord-5',
        email: 'coord5@paodavida.com',
        role: Role.COORDENADOR,
        setorNumero: 5,
      };

      await expect(
        service.criarConviteMembro(coordenadorUser, {
          setorNumero: 8,
          tipoPapel: Role.LIDER,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('deve permitir que Admin/Pastor crie convite de membro para qualquer setor', async () => {
      prisma.setor.findUnique.mockResolvedValue(mockSetor);
      prisma.conviteConta.create.mockResolvedValue(mockConvite);

      const adminUser = {
        id: 'admin-1',
        email: 'pastor@paodavida.com',
        role: Role.ADMIN,
        setorNumero: null,
      };

      const res = await service.criarConviteMembro(adminUser, {
        setorNumero: 5,
        tipoPapel: Role.LIDER,
      });

      expect(res.tipoPapel).toBe(Role.LIDER);
    });
  });

  describe('validarConvite', () => {
    it('deve validar com sucesso um token válido e não utilizado', async () => {
      prisma.conviteConta.findUnique.mockResolvedValue(mockConvite);

      const res = await service.validarConvite('token-valido');

      expect(res.valido).toBe(true);
      expect(res.tipoPapel).toBe(Role.LIDER);
      expect(res.setorNumero).toBe(5);
    });

    it('deve lançar BadRequestException se o convite já foi utilizado', async () => {
      prisma.conviteConta.findUnique.mockResolvedValue({
        ...mockConvite,
        utilizado: true,
      });

      await expect(service.validarConvite('token-usado')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('deve lançar BadRequestException se o convite expirou', async () => {
      prisma.conviteConta.findUnique.mockResolvedValue({
        ...mockConvite,
        expiraEm: new Date(Date.now() - 10000),
      });

      await expect(service.validarConvite('token-expirado')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('ativarConvite', () => {
    it('deve cadastrar Pessoa, Usuario e retornar sessão logada', async () => {
      prisma.conviteConta.findUnique.mockResolvedValue(mockConvite);
      prisma.usuario.findUnique.mockResolvedValue(null);
      prisma.$transaction.mockImplementation(async (cb: any) => {
        return cb({
          pessoa: { create: jest.fn().mockResolvedValue({ id: 'p-1' }) },
          usuario: {
            create: jest.fn().mockResolvedValue({
              id: 'u-1',
              email: 'maria@test.com',
            }),
          },
          conviteConta: { update: jest.fn().mockResolvedValue({}) },
        });
      });

      const res = await service.ativarConvite({
        token: 'token-valido',
        nome: 'Maria Silva',
        email: 'maria@test.com',
        senha: 'MinhaSenha123!',
      });

      expect(res).toHaveProperty('accessToken');
      expect(authService.login).toHaveBeenCalledWith({
        email: 'maria@test.com',
        senha: 'MinhaSenha123!',
      });
    });

    it('deve lançar ConflictException se o e-mail já estiver cadastrado', async () => {
      prisma.conviteConta.findUnique.mockResolvedValue(mockConvite);
      prisma.usuario.findUnique.mockResolvedValue({ id: 'existing-u' });

      await expect(
        service.ativarConvite({
          token: 'token-valido',
          nome: 'Maria Silva',
          email: 'existente@test.com',
          senha: 'MinhaSenha123!',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('listarConvitesPorSetor', () => {
    it('deve listar convites do setor para o Coordenador responsável', async () => {
      prisma.conviteConta.findMany.mockResolvedValue([mockConvite]);

      const coordUser = {
        id: 'coord-5',
        email: 'coord5@paodavida.com',
        role: Role.COORDENADOR,
        setorNumero: 5,
      };

      const res = await service.listarConvitesPorSetor(coordUser, 5);

      expect(res).toHaveLength(1);
      expect(res[0].setorNumero).toBe(5);
      expect(res[0].expirado).toBe(false);
    });

    it('deve impedir Coordenador de acessar convites de outro setor', async () => {
      const coordUser = {
        id: 'coord-5',
        email: 'coord5@paodavida.com',
        role: Role.COORDENADOR,
        setorNumero: 5,
      };

      await expect(service.listarConvitesPorSetor(coordUser, 10)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
