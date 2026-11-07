import { Test, TestingModule } from '@nestjs/testing';
import { DecisoesService } from './decisoes.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { Role, StatusDiscipulado, TipoDecisao } from '@prisma/client';

describe('DecisoesService', () => {
  let service: DecisoesService;
  let prisma: any;

  const mockSetor = {
    numero: 5,
    nome: 'Setor 5 - Santo Antônio',
  };

  const mockCulto = {
    id: 'culto-1',
    numeroSequencial: 10,
    setorNumero: 5,
    bairro: 'Santo Antônio',
    liderNome: 'Pb. Adriano',
    anfitriaoNome: 'Ir. Antônio',
    liderUsuarioId: 'user-lider-1',
    criadoPorId: 'user-coord-1',
    setor: mockSetor,
  };

  const mockDecisao = {
    id: 'decisao-1',
    cultoId: 'culto-1',
    presencaId: null,
    nomeDecidido: 'Maria das Graças',
    telefone: '84988771122',
    tipoDecisao: TipoDecisao.ACEITOU_JESUS,
    pedidoOracaoDetalhe: 'Por restauração familiar',
    statusDiscipulado: StatusDiscipulado.PENDENTE,
    registradoPorId: 'user-lider-1',
    createdAt: new Date(),
    culto: mockCulto,
    registradoPor: {
      pessoa: { nome: 'Pb. Adriano' },
      email: 'lider@paodavida.com',
    },
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
      presencaCulto: {
        findUnique: jest.fn(),
      },
      decisaoEspiritual: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DecisoesService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<DecisoesService>(DecisoesService);
    prisma = module.get(PrismaService);
  });

  it('deve estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('registrarDecisao', () => {
    it('deve registrar decisão espiritual de ACEITOU_JESUS pelo líder', async () => {
      prisma.cultoNoLar.findUnique.mockResolvedValue(mockCulto);
      prisma.decisaoEspiritual.create.mockResolvedValue(mockDecisao);

      const dto = {
        nomeDecidido: 'Maria das Graças',
        telefone: '84988771122',
        tipoDecisao: TipoDecisao.ACEITOU_JESUS,
      };

      const res = await service.registrarDecisao('culto-1', mockLider, dto);

      expect(res.id).toBe('decisao-1');
      expect(res.tipoDecisao).toBe(TipoDecisao.ACEITOU_JESUS);
      expect(res.culto.setorNumero).toBe(5);
      expect(prisma.decisaoEspiritual.create).toHaveBeenCalled();
    });

    it('deve herdar o telefone da presença se não informado no DTO', async () => {
      prisma.cultoNoLar.findUnique.mockResolvedValue(mockCulto);
      prisma.presencaCulto.findUnique.mockResolvedValue({
        id: 'pres-1',
        cultoId: 'culto-1',
        telefone: '84999993333',
      });
      prisma.decisaoEspiritual.create.mockResolvedValue({
        ...mockDecisao,
        telefone: '84999993333',
      });

      const dto = {
        nomeDecidido: 'Maria das Graças',
        presencaId: 'pres-1',
        tipoDecisao: TipoDecisao.ACEITOU_JESUS,
      };

      const res = await service.registrarDecisao('culto-1', mockLider, dto);

      expect(res.telefone).toBe('84999993333');
    });

    it('deve lançar ForbiddenException se coordenador de outro setor tentar registrar decisão', async () => {
      prisma.cultoNoLar.findUnique.mockResolvedValue(mockCulto); // Setor 5

      await expect(
        service.registrarDecisao('culto-1', mockCoord8, {
          nomeDecidido: 'Maria',
          tipoDecisao: TipoDecisao.RECONCILIACAO,
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('listarPorCulto', () => {
    it('deve retornar lista de decisões espirituais do lar', async () => {
      prisma.cultoNoLar.findUnique.mockResolvedValue(mockCulto);
      prisma.decisaoEspiritual.findMany.mockResolvedValue([mockDecisao]);

      const res = await service.listarPorCulto('culto-1', mockCoord5);

      expect(res).toHaveLength(1);
      expect(res[0].tipoDecisao).toBe(TipoDecisao.ACEITOU_JESUS);
    });
  });

  describe('atualizarDiscipulado', () => {
    it('deve atualizar status de discipulado para DISCIPULANDO pelo coordenador do setor', async () => {
      prisma.decisaoEspiritual.findUnique.mockResolvedValue(mockDecisao);
      prisma.decisaoEspiritual.update.mockResolvedValue({
        ...mockDecisao,
        statusDiscipulado: StatusDiscipulado.DISCIPULANDO,
      });

      const res = await service.atualizarDiscipulado('decisao-1', mockCoord5, {
        statusDiscipulado: StatusDiscipulado.DISCIPULANDO,
        observacao: 'Primeira visita pastoral realizada',
      });

      expect(res.statusDiscipulado).toBe(StatusDiscipulado.DISCIPULANDO);
      expect(prisma.decisaoEspiritual.update).toHaveBeenCalled();
    });

    it('deve bloquear Líder tentando atualizar discipulado com ForbiddenException', async () => {
      prisma.decisaoEspiritual.findUnique.mockResolvedValue(mockDecisao);

      await expect(
        service.atualizarDiscipulado('decisao-1', mockLider, {
          statusDiscipulado: StatusDiscipulado.DISCIPULANDO,
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('relatorioConsolidado', () => {
    it('deve gerar métricas consolidadas e listagem para os Pastores', async () => {
      prisma.decisaoEspiritual.count
        .mockResolvedValueOnce(10) // totalGeral
        .mockResolvedValueOnce(6)  // aceitouJesus
        .mockResolvedValueOnce(3)  // reconciliacao
        .mockResolvedValueOnce(1)  // pedidosOracao
        .mockResolvedValueOnce(4)  // pendente
        .mockResolvedValueOnce(4)  // emContato
        .mockResolvedValueOnce(2)  // discipulando
        .mockResolvedValueOnce(10); // totalFiltrado

      prisma.decisaoEspiritual.findMany.mockResolvedValue([mockDecisao]);

      const res = await service.relatorioConsolidado(mockAdmin, { page: 1, limit: 10 });

      expect(res.metricas.totalGeral).toBe(10);
      expect(res.metricas.totalAceitouJesus).toBe(6);
      expect(res.metricas.totalReconciliacao).toBe(3);
      expect(res.metricas.totalPedidosOracao).toBe(1);
      expect(res.dados).toHaveLength(1);
      expect(res.totalPages).toBe(1);
    });
  });
});
