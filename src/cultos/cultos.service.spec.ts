import { Test, TestingModule } from '@nestjs/testing';
import { CultosService } from './cultos.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { Role, StatusCulto } from '@prisma/client';
import { Prisma } from '@prisma/client';

describe('CultosService', () => {
  let service: CultosService;
  let prisma: any;

  const mockSetor = {
    numero: 5,
    nome: 'Setor 5 - Santo Antônio',
    corHex: '#10B981',
    coordenadorNome: 'Pb. Adriano',
  };

  const mockCulto = {
    id: 'culto-uuid-1',
    numeroSequencial: 1,
    campanha: '11 Anos - 120 Cultos nos Lares',
    setorNumero: 5,
    bairro: 'Santo Antônio',
    rua: 'Rua Frei Miguelinho',
    numero: '142',
    pontoReferencia: 'Perto da igreja',
    latitude: new Prisma.Decimal(-5.1878),
    longitude: new Prisma.Decimal(-37.3442),
    mapaX: new Prisma.Decimal(450.5),
    mapaY: new Prisma.Decimal(320.0),
    liderNome: 'Pb. Adriano',
    liderTelefone: '84999990005',
    liderUsuarioId: 'user-lider-1',
    anfitriaoNome: 'Ir. Antônio',
    anfitriaoTelefone: '84988880005',
    anfitriaoUsuarioId: null,
    horarioInicio: '19:30',
    dataRealizacao: new Date('2026-11-19T00:00:00.000Z'),
    status: StatusCulto.PLANEJADO,
    observacoes: 'Levar cadeiras',
    versao: 1,
    criadoPorId: 'user-coord-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    setor: mockSetor,
    _count: {
      presencas: 10,
      decisoes: 2,
      fotos: 3,
    },
  };

  const mockAdminUser = {
    id: 'user-admin-1',
    email: 'pastor@paodavida.com',
    role: Role.ADMIN,
    setorNumero: null,
  };

  const mockCoordUser = {
    id: 'user-coord-1',
    email: 'coord5@paodavida.com',
    role: Role.COORDENADOR,
    setorNumero: 5,
  };

  const mockLiderUser = {
    id: 'user-lider-1',
    email: 'lider@paodavida.com',
    role: Role.LIDER,
    setorNumero: 5,
  };

  beforeEach(async () => {
    const mockPrisma = {
      setor: {
        findUnique: jest.fn(),
      },
      bairro: {
        findFirst: jest.fn(),
      },
      cultoNoLar: {
        aggregate: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CultosService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<CultosService>(CultosService);
    prisma = module.get(PrismaService);
  });

  it('deve estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('criar', () => {
    it('deve cadastrar um novo culto e atribuir o próximo número sequencial (1..120)', async () => {
      prisma.setor.findUnique.mockResolvedValue(mockSetor);
      prisma.cultoNoLar.aggregate.mockResolvedValue({
        _max: { numeroSequencial: 41 },
      });
      prisma.cultoNoLar.create.mockResolvedValue({
        ...mockCulto,
        numeroSequencial: 42,
      });

      const dto = {
        setorNumero: 5,
        bairro: 'Santo Antônio',
        rua: 'Rua Frei Miguelinho',
        numero: '142',
        liderNome: 'Pb. Adriano',
        liderTelefone: '84999990005',
        anfitriaoNome: 'Ir. Antônio',
        anfitriaoTelefone: '84988880005',
        dataRealizacao: '2026-11-19',
      };

      const res = await service.criar(mockAdminUser, dto);

      expect(res.numeroSequencial).toBe(42);
      expect(res.setorNumero).toBe(5);
      expect(res.setor.nome).toBe('Setor 5 - Santo Antônio');
      expect(prisma.cultoNoLar.create).toHaveBeenCalled();
    });

    it('deve impedir que Coordenador cadastre culto em outro setor com ForbiddenException', async () => {
      const dto = {
        setorNumero: 8, // diferente do setor 5 do coordenador
        bairro: 'Centro',
        rua: 'Rua Principal',
        numero: '10',
        liderNome: 'Líder',
        liderTelefone: '8499999',
        anfitriaoNome: 'Anfitrião',
        anfitriaoTelefone: '8498888',
        dataRealizacao: '2026-11-19',
      };

      await expect(service.criar(mockCoordUser, dto)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('deve lançar NotFoundException se o setor informado não existir', async () => {
      prisma.setor.findUnique.mockResolvedValue(null);

      const dto = {
        setorNumero: 99,
        bairro: 'Inexistente',
        rua: 'Rua',
        numero: '1',
        liderNome: 'Líder',
        liderTelefone: '123',
        anfitriaoNome: 'Anfitrião',
        anfitriaoTelefone: '456',
        dataRealizacao: '2026-11-19',
      };

      await expect(service.criar(mockAdminUser, dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('deve utilizar coordenadas padrão do bairro caso latitude/longitude não sejam informadas', async () => {
      prisma.setor.findUnique.mockResolvedValue(mockSetor);
      prisma.cultoNoLar.aggregate.mockResolvedValue({
        _max: { numeroSequencial: 0 },
      });
      prisma.bairro.findFirst.mockResolvedValue({
        latitude: new Prisma.Decimal(-5.18),
        longitude: new Prisma.Decimal(-37.34),
      });
      prisma.cultoNoLar.create.mockResolvedValue(mockCulto);

      const dto = {
        setorNumero: 5,
        bairro: 'Santo Antônio',
        rua: 'Rua Teste',
        numero: '10',
        liderNome: 'Líder',
        liderTelefone: '123',
        anfitriaoNome: 'Anfitrião',
        anfitriaoTelefone: '456',
        dataRealizacao: '2026-11-19',
      };

      await service.criar(mockCoordUser, dto);

      expect(prisma.bairro.findFirst).toHaveBeenCalledWith({
        where: {
          setorNumero: 5,
          nome: { equals: 'Santo Antônio', mode: 'insensitive' },
        },
      });
    });
  });

  describe('listar', () => {
    it('deve retornar lista paginada de cultos para o Administrador', async () => {
      prisma.cultoNoLar.findMany.mockResolvedValue([mockCulto]);
      prisma.cultoNoLar.count.mockResolvedValue(1);

      const res = await service.listar(mockAdminUser, { page: 1, limit: 10 });

      expect(res.dados).toHaveLength(1);
      expect(res.total).toBe(1);
      expect(res.totalPages).toBe(1);
    });

    it('deve restringir listagem de Coordenador automaticamente ao seu setor', async () => {
      prisma.cultoNoLar.findMany.mockResolvedValue([mockCulto]);
      prisma.cultoNoLar.count.mockResolvedValue(1);

      await service.listar(mockCoordUser, {});

      expect(prisma.cultoNoLar.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ setorNumero: 5 }),
        }),
      );
    });

    it('deve lançar ForbiddenException se Coordenador tentar consultar outro setor', async () => {
      await expect(
        service.listar(mockCoordUser, { setorNumero: 8 }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('buscarPorId', () => {
    it('deve retornar dados completos de um culto existente', async () => {
      prisma.cultoNoLar.findUnique.mockResolvedValue(mockCulto);

      const res = await service.buscarPorId('culto-uuid-1', mockAdminUser);

      expect(res.id).toBe('culto-uuid-1');
      expect(res.totalPresencas).toBe(10);
      expect(res.totalDecisoes).toBe(2);
    });

    it('deve lançar NotFoundException se o culto não for encontrado', async () => {
      prisma.cultoNoLar.findUnique.mockResolvedValue(null);

      await expect(
        service.buscarPorId('inexistente', mockAdminUser),
      ).rejects.toThrow(NotFoundException);
    });

    it('deve lançar ForbiddenException se Coordenador acessar culto de outro setor', async () => {
      prisma.cultoNoLar.findUnique.mockResolvedValue({
        ...mockCulto,
        setorNumero: 10,
      });

      await expect(
        service.buscarPorId('culto-uuid-1', mockCoordUser),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('atualizar', () => {
    it('deve atualizar dados e incrementar versao para concorrência otimista', async () => {
      prisma.cultoNoLar.findUnique.mockResolvedValue(mockCulto);
      prisma.cultoNoLar.update.mockResolvedValue({
        ...mockCulto,
        rua: 'Rua Nova',
        versao: 2,
      });

      const res = await service.atualizar('culto-uuid-1', mockCoordUser, {
        rua: 'Rua Nova',
        versao: 1,
      });

      expect(res.versao).toBe(2);
      expect(prisma.cultoNoLar.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            versao: { increment: 1 },
          }),
        }),
      );
    });

    it('deve lançar ConflictException se a versão informada for diferente da versão atual', async () => {
      prisma.cultoNoLar.findUnique.mockResolvedValue(mockCulto); // versao: 1

      await expect(
        service.atualizar('culto-uuid-1', mockCoordUser, {
          rua: 'Rua Nova',
          versao: 99, // versao incompatível
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('deve impedir Líder de editar culto de outro líder com ForbiddenException', async () => {
      prisma.cultoNoLar.findUnique.mockResolvedValue({
        ...mockCulto,
        liderUsuarioId: 'outro-lider',
        criadoPorId: 'outro-lider',
      });

      await expect(
        service.atualizar('culto-uuid-1', mockLiderUser, { rua: 'Rua' }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('atualizarStatus', () => {
    it('deve alterar status para CONFIRMADO e anexar observação com sucesso', async () => {
      prisma.cultoNoLar.findUnique.mockResolvedValue(mockCulto);
      prisma.cultoNoLar.update.mockResolvedValue({
        ...mockCulto,
        status: StatusCulto.CONFIRMADO,
      });

      const res = await service.atualizarStatus('culto-uuid-1', mockCoordUser, {
        status: StatusCulto.CONFIRMADO,
        motivo: 'Confirmado com o anfitrião',
      });

      expect(res.status).toBe(StatusCulto.CONFIRMADO);
      expect(prisma.cultoNoLar.update).toHaveBeenCalled();
    });
  });

  describe('remover', () => {
    it('deve permitir exclusão por Admin ou Coordenador do Setor', async () => {
      prisma.cultoNoLar.findUnique.mockResolvedValue(mockCulto);
      prisma.cultoNoLar.delete.mockResolvedValue(mockCulto);

      const res = await service.remover('culto-uuid-1', mockCoordUser);

      expect(res.success).toBe(true);
      expect(prisma.cultoNoLar.delete).toHaveBeenCalledWith({
        where: { id: 'culto-uuid-1' },
      });
    });

    it('deve bloquear exclusão por Líder com ForbiddenException', async () => {
      prisma.cultoNoLar.findUnique.mockResolvedValue(mockCulto);

      await expect(
        service.remover('culto-uuid-1', mockLiderUser),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
