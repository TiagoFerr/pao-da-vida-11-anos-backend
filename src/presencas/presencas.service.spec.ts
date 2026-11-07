import { Test, TestingModule } from '@nestjs/testing';
import { PresencasService } from './presencas.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { Role } from '@prisma/client';

describe('PresencasService', () => {
  let service: PresencasService;
  let prisma: any;

  const mockCulto = {
    id: 'culto-1',
    numeroSequencial: 10,
    setorNumero: 5,
    liderUsuarioId: 'user-lider-1',
    criadoPorId: 'user-coord-1',
  };

  const mockPresenca = {
    id: 'presenca-1',
    cultoId: 'culto-1',
    pessoaId: null,
    nomeParticipante: 'Carlos Eduardo',
    telefone: '84999991111',
    eMembro: true,
    presente: true,
    checkinEm: new Date(),
    culto: mockCulto,
  };

  const mockAdmin = {
    id: 'admin-1',
    email: 'pastor@paodavida.com',
    role: Role.ADMIN,
    setorNumero: null,
  };

  const mockCoord5 = {
    id: 'coord-5',
    email: 'coord5@paodavida.com',
    role: Role.COORDENADOR,
    setorNumero: 5,
  };

  const mockCoord8 = {
    id: 'coord-8',
    email: 'coord8@paodavida.com',
    role: Role.COORDENADOR,
    setorNumero: 8,
  };

  const mockLider = {
    id: 'user-lider-1',
    email: 'lider@paodavida.com',
    role: Role.LIDER,
    setorNumero: 5,
  };

  beforeEach(async () => {
    const mockPrisma = {
      cultoNoLar: {
        findUnique: jest.fn(),
      },
      pessoa: {
        findUnique: jest.fn(),
      },
      presencaCulto: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PresencasService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<PresencasService>(PresencasService);
    prisma = module.get(PrismaService);
  });

  it('deve estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('adicionarPresenca', () => {
    it('deve registrar presença de membro com sucesso pelo líder do culto', async () => {
      prisma.cultoNoLar.findUnique.mockResolvedValue(mockCulto);
      prisma.presencaCulto.create.mockResolvedValue(mockPresenca);

      const dto = {
        nomeParticipante: 'Carlos Eduardo',
        telefone: '84999991111',
        eMembro: true,
      };

      const res = await service.adicionarPresenca('culto-1', mockLider, dto);

      expect(res.id).toBe('presenca-1');
      expect(res.nomeParticipante).toBe('Carlos Eduardo');
      expect(prisma.presencaCulto.create).toHaveBeenCalled();
    });

    it('deve lançar NotFoundException se o culto não for encontrado', async () => {
      prisma.cultoNoLar.findUnique.mockResolvedValue(null);

      await expect(
        service.adicionarPresenca('inexistente', mockAdmin, {
          nomeParticipante: 'Ana',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('deve lançar ForbiddenException se coordenador de outro setor tentar adicionar presença', async () => {
      prisma.cultoNoLar.findUnique.mockResolvedValue(mockCulto); // Setor 5

      await expect(
        service.adicionarPresenca('culto-1', mockCoord8, {
          nomeParticipante: 'Ana',
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('listarPresencas', () => {
    it('deve retornar resumo com totalizadores de membros e visitantes', async () => {
      prisma.cultoNoLar.findUnique.mockResolvedValue({
        ...mockCulto,
        presencas: [
          mockPresenca,
          { ...mockPresenca, id: 'presenca-2', eMembro: false },
        ],
      });

      const res = await service.listarPresencas('culto-1', mockAdmin);

      expect(res.totalParticipantes).toBe(2);
      expect(res.totalMembros).toBe(1);
      expect(res.totalVisitantes).toBe(1);
      expect(res.totalPresentes).toBe(2);
      expect(res.participantes).toHaveLength(2);
    });

    it('deve bloquear Coordenador de outro setor com ForbiddenException', async () => {
      prisma.cultoNoLar.findUnique.mockResolvedValue(mockCulto); // Setor 5

      await expect(service.listarPresencas('culto-1', mockCoord8)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('atualizarPresenca', () => {
    it('deve atualizar presença com sucesso', async () => {
      prisma.presencaCulto.findUnique.mockResolvedValue(mockPresenca);
      prisma.presencaCulto.update.mockResolvedValue({
        ...mockPresenca,
        presente: false,
      });

      const res = await service.atualizarPresenca('culto-1', 'presenca-1', mockLider, {
        presente: false,
      });

      expect(res.presente).toBe(false);
      expect(prisma.presencaCulto.update).toHaveBeenCalled();
    });

    it('deve lançar NotFoundException se a presença não pertencer ao culto', async () => {
      prisma.presencaCulto.findUnique.mockResolvedValue({
        ...mockPresenca,
        cultoId: 'outro-culto',
      });

      await expect(
        service.atualizarPresenca('culto-1', 'presenca-1', mockAdmin, { presente: true }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('removerPresenca', () => {
    it('deve excluir presença com sucesso', async () => {
      prisma.presencaCulto.findUnique.mockResolvedValue(mockPresenca);
      prisma.presencaCulto.delete.mockResolvedValue(mockPresenca);

      const res = await service.removerPresenca('culto-1', 'presenca-1', mockLider);

      expect(res.success).toBe(true);
      expect(prisma.presencaCulto.delete).toHaveBeenCalledWith({
        where: { id: 'presenca-1' },
      });
    });
  });
});
