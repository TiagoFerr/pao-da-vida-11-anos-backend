import { Test, TestingModule } from '@nestjs/testing';
import { DecisoesController } from './decisoes.controller';
import { DecisoesService } from './decisoes.service';
import { Role, StatusDiscipulado, TipoDecisao } from '@prisma/client';
import { Reflector } from '@nestjs/core';

describe('DecisoesController', () => {
  let controller: DecisoesController;
  let service: any;

  const mockUser = {
    id: 'user-coord-1',
    email: 'coord5@paodavida.com',
    role: Role.COORDENADOR,
    setorNumero: 5,
  };

  const mockDecisaoResponse = {
    id: 'd-1',
    cultoId: 'culto-1',
    culto: {
      id: 'culto-1',
      numeroSequencial: 42,
      setorNumero: 5,
      setorNome: 'Setor 5 - Santo Antônio',
      bairro: 'Santo Antônio',
      liderNome: 'Pb. Adriano',
      anfitriaoNome: 'Ir. Antônio',
    },
    presencaId: null,
    nomeDecidido: 'Maria Silva',
    telefone: '84999',
    tipoDecisao: TipoDecisao.ACEITOU_JESUS,
    pedidoOracaoDetalhe: null,
    statusDiscipulado: StatusDiscipulado.PENDENTE,
    registradoPorNome: 'Pb. Adriano',
    createdAt: new Date(),
  };

  const mockRelatorioResponse = {
    metricas: {
      totalGeral: 1,
      totalAceitouJesus: 1,
      totalReconciliacao: 0,
      totalPedidosOracao: 0,
      totalPendente: 1,
      totalEmContato: 0,
      totalDiscipulando: 0,
    },
    dados: [mockDecisaoResponse],
    total: 1,
    page: 1,
    limit: 20,
    totalPages: 1,
  };

  beforeEach(async () => {
    const mockService = {
      registrarDecisao: jest.fn().mockResolvedValue(mockDecisaoResponse),
      listarPorCulto: jest.fn().mockResolvedValue([mockDecisaoResponse]),
      atualizarDiscipulado: jest.fn().mockResolvedValue(mockDecisaoResponse),
      relatorioConsolidado: jest.fn().mockResolvedValue(mockRelatorioResponse),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DecisoesController],
      providers: [
        { provide: DecisoesService, useValue: mockService },
        Reflector,
      ],
    }).compile();

    controller = module.get<DecisoesController>(DecisoesController);
    service = module.get<DecisoesService>(DecisoesService);
  });

  it('deve estar definido', () => {
    expect(controller).toBeDefined();
  });

  it('registrarDecisao deve chamar o service', async () => {
    const dto = {
      nomeDecidido: 'Maria',
      tipoDecisao: TipoDecisao.ACEITOU_JESUS,
    };
    const res = await controller.registrarDecisao(mockUser, 'culto-1', dto);

    expect(res).toEqual(mockDecisaoResponse);
    expect(service.registrarDecisao).toHaveBeenCalledWith('culto-1', mockUser, dto);
  });

  it('listarPorCulto deve chamar o service', async () => {
    const res = await controller.listarPorCulto(mockUser, 'culto-1');

    expect(res).toEqual([mockDecisaoResponse]);
    expect(service.listarPorCulto).toHaveBeenCalledWith('culto-1', mockUser);
  });

  it('atualizarDiscipulado deve chamar o service', async () => {
    const dto = { statusDiscipulado: StatusDiscipulado.EM_CONTATO };
    const res = await controller.atualizarDiscipulado(mockUser, 'd-1', dto);

    expect(res).toEqual(mockDecisaoResponse);
    expect(service.atualizarDiscipulado).toHaveBeenCalledWith('d-1', mockUser, dto);
  });

  it('relatorioConsolidado deve chamar o service', async () => {
    const filtros = { page: 1, limit: 10 };
    const res = await controller.relatorioConsolidado(mockUser, filtros);

    expect(res).toEqual(mockRelatorioResponse);
    expect(service.relatorioConsolidado).toHaveBeenCalledWith(mockUser, filtros);
  });
});
