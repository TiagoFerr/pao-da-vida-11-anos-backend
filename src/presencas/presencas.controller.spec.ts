import { Test, TestingModule } from '@nestjs/testing';
import { PresencasController } from './presencas.controller';
import { PresencasService } from './presencas.service';
import { Role } from '@prisma/client';
import { Reflector } from '@nestjs/core';

describe('PresencasController', () => {
  let controller: PresencasController;
  let service: any;

  const mockUser = {
    id: 'user-lider-1',
    email: 'lider@paodavida.com',
    role: Role.LIDER,
    setorNumero: 5,
  };

  const mockPresencaResponse = {
    id: 'p-1',
    cultoId: 'culto-1',
    pessoaId: null,
    nomeParticipante: 'Carlos',
    telefone: '84999',
    eMembro: true,
    presente: true,
    checkinEm: new Date(),
  };

  beforeEach(async () => {
    const mockService = {
      adicionarPresenca: jest.fn().mockResolvedValue(mockPresencaResponse),
      listarPresencas: jest.fn().mockResolvedValue({
        cultoId: 'culto-1',
        totalParticipantes: 1,
        participantes: [mockPresencaResponse],
      }),
      atualizarPresenca: jest.fn().mockResolvedValue(mockPresencaResponse),
      removerPresenca: jest.fn().mockResolvedValue({ success: true, message: 'Sucesso' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PresencasController],
      providers: [
        { provide: PresencasService, useValue: mockService },
        Reflector,
      ],
    }).compile();

    controller = module.get<PresencasController>(PresencasController);
    service = module.get<PresencasService>(PresencasService);
  });

  it('deve estar definido', () => {
    expect(controller).toBeDefined();
  });

  it('adicionarPresenca deve chamar o service', async () => {
    const dto = { nomeParticipante: 'Carlos' };
    const res = await controller.adicionarPresenca(mockUser, 'culto-1', dto);

    expect(res).toEqual(mockPresencaResponse);
    expect(service.adicionarPresenca).toHaveBeenCalledWith('culto-1', mockUser, dto);
  });

  it('listarPresencas deve chamar o service', async () => {
    const res = await controller.listarPresencas(mockUser, 'culto-1');

    expect(res.totalParticipantes).toBe(1);
    expect(service.listarPresencas).toHaveBeenCalledWith('culto-1', mockUser);
  });

  it('atualizarPresenca deve chamar o service', async () => {
    const dto = { presente: false };
    const res = await controller.atualizarPresenca(mockUser, 'culto-1', 'p-1', dto);

    expect(res).toEqual(mockPresencaResponse);
    expect(service.atualizarPresenca).toHaveBeenCalledWith('culto-1', 'p-1', mockUser, dto);
  });

  it('removerPresenca deve chamar o service', async () => {
    const res = await controller.removerPresenca(mockUser, 'culto-1', 'p-1');

    expect(res).toEqual({ success: true, message: 'Sucesso' });
    expect(service.removerPresenca).toHaveBeenCalledWith('culto-1', 'p-1', mockUser);
  });
});
