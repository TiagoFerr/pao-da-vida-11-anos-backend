import { Test, TestingModule } from '@nestjs/testing';
import { CultosController } from './cultos.controller';
import { CultosService } from './cultos.service';
import { Role, StatusCulto } from '@prisma/client';
import { Reflector } from '@nestjs/core';

describe('CultosController', () => {
  let controller: CultosController;
  let service: any;

  const mockUser = {
    id: 'user-coord-1',
    email: 'coord5@paodavida.com',
    role: Role.COORDENADOR,
    setorNumero: 5,
  };

  const mockCultoResponse = {
    id: 'culto-uuid-1',
    numeroSequencial: 42,
    campanha: '11 Anos - 120 Cultos nos Lares',
    setorNumero: 5,
    setor: {
      numero: 5,
      nome: 'Setor 5 - Santo Antônio',
      corHex: '#10B981',
      coordenadorNome: 'Pb. Adriano',
    },
    bairro: 'Santo Antônio',
    rua: 'Rua Frei Miguelinho',
    numero: '142',
    pontoReferencia: null,
    latitude: -5.1878,
    longitude: -37.3442,
    mapaX: null,
    mapaY: null,
    liderNome: 'Pb. Adriano',
    liderTelefone: '84999990005',
    liderUsuarioId: null,
    anfitriaoNome: 'Ir. Antônio',
    anfitriaoTelefone: '84988880005',
    anfitriaoUsuarioId: null,
    horarioInicio: '19:30',
    dataRealizacao: '2026-11-19',
    status: StatusCulto.PLANEJADO,
    observacoes: null,
    versao: 1,
    totalPresencas: 0,
    totalDecisoes: 0,
    totalFotos: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockService = {
      criar: jest.fn().mockResolvedValue(mockCultoResponse),
      listar: jest.fn().mockResolvedValue({
        dados: [mockCultoResponse],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      }),
      buscarPorId: jest.fn().mockResolvedValue(mockCultoResponse),
      atualizar: jest.fn().mockResolvedValue(mockCultoResponse),
      atualizarStatus: jest.fn().mockResolvedValue(mockCultoResponse),
      remover: jest.fn().mockResolvedValue({ success: true, message: 'Sucesso' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CultosController],
      providers: [
        { provide: CultosService, useValue: mockService },
        Reflector,
      ],
    }).compile();

    controller = module.get<CultosController>(CultosController);
    service = module.get<CultosService>(CultosService);
  });

  it('deve estar definido', () => {
    expect(controller).toBeDefined();
  });

  it('criar deve repassar dados ao cultosService', async () => {
    const dto = {
      setorNumero: 5,
      bairro: 'Santo Antônio',
      rua: 'Rua Frei',
      numero: '142',
      liderNome: 'Pb. Adriano',
      liderTelefone: '84999',
      anfitriaoNome: 'Ir. Antônio',
      anfitriaoTelefone: '84988',
      dataRealizacao: '2026-11-19',
    };

    const res = await controller.criar(mockUser, dto);

    expect(res).toEqual(mockCultoResponse);
    expect(service.criar).toHaveBeenCalledWith(mockUser, dto);
  });

  it('listar deve chamar cultosService.listar com filtros', async () => {
    const filtros = { page: 1, limit: 10 };
    const res = await controller.listar(mockUser, filtros);

    expect(res.dados).toHaveLength(1);
    expect(service.listar).toHaveBeenCalledWith(mockUser, filtros);
  });

  it('buscarPorId deve chamar cultosService.buscarPorId', async () => {
    const res = await controller.buscarPorId(mockUser, 'culto-uuid-1');

    expect(res).toEqual(mockCultoResponse);
    expect(service.buscarPorId).toHaveBeenCalledWith('culto-uuid-1', mockUser);
  });

  it('atualizar deve chamar cultosService.atualizar', async () => {
    const dto = { rua: 'Nova Rua' };
    const res = await controller.atualizar(mockUser, 'culto-uuid-1', dto);

    expect(res).toEqual(mockCultoResponse);
    expect(service.atualizar).toHaveBeenCalledWith('culto-uuid-1', mockUser, dto);
  });

  it('atualizarStatus deve chamar cultosService.atualizarStatus', async () => {
    const dto = { status: StatusCulto.CONFIRMADO };
    const res = await controller.atualizarStatus(mockUser, 'culto-uuid-1', dto);

    expect(res).toEqual(mockCultoResponse);
    expect(service.atualizarStatus).toHaveBeenCalledWith('culto-uuid-1', mockUser, dto);
  });

  it('remover deve chamar cultosService.remover', async () => {
    const res = await controller.remover(mockUser, 'culto-uuid-1');

    expect(res).toEqual({ success: true, message: 'Sucesso' });
    expect(service.remover).toHaveBeenCalledWith('culto-uuid-1', mockUser);
  });
});
