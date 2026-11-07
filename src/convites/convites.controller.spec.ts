import { Test, TestingModule } from '@nestjs/testing';
import { ConvitesController } from './convites.controller';
import { ConvitesService } from './convites.service';
import { Role } from '@prisma/client';
import { Reflector } from '@nestjs/core';

describe('ConvitesController', () => {
  let controller: ConvitesController;
  let service: any;

  const mockUser = {
    id: 'user-1',
    email: 'pastor@paodavida.com',
    role: Role.ADMIN,
    setorNumero: null,
  };

  const mockConviteCriado = {
    id: 'conv-1',
    token: 'token-abc',
    link: 'https://cultonolar.paodavida.com.br/convite?token=token-abc',
    tipoPapel: Role.COORDENADOR,
    setorNumero: 1,
    setorNome: 'Setor 1 - Abolição',
    expiraEm: new Date(),
  };

  beforeEach(async () => {
    const mockService = {
      criarConviteCoordenador: jest.fn().mockResolvedValue(mockConviteCriado),
      criarConviteMembro: jest.fn().mockResolvedValue(mockConviteCriado),
      validarConvite: jest.fn().mockResolvedValue({ valido: true }),
      ativarConvite: jest.fn().mockResolvedValue({ accessToken: 'mock-jwt' }),
      listarConvitesPorSetor: jest.fn().mockResolvedValue([mockConviteCriado]),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ConvitesController],
      providers: [
        { provide: ConvitesService, useValue: mockService },
        Reflector,
      ],
    }).compile();

    controller = module.get<ConvitesController>(ConvitesController);
    service = module.get<ConvitesService>(ConvitesService);
  });

  it('deve estar definido', () => {
    expect(controller).toBeDefined();
  });

  it('criarConviteCoordenador deve chamar o service com o userId', async () => {
    const dto = { setorNumero: 1 };
    const res = await controller.criarConviteCoordenador(mockUser, dto);

    expect(res).toEqual(mockConviteCriado);
    expect(service.criarConviteCoordenador).toHaveBeenCalledWith('user-1', dto);
  });

  it('criarConviteMembro deve chamar o service com o usuário autenticado', async () => {
    const dto = { setorNumero: 1, tipoPapel: Role.LIDER };
    const res = await controller.criarConviteMembro(mockUser, dto);

    expect(res).toEqual(mockConviteCriado);
    expect(service.criarConviteMembro).toHaveBeenCalledWith(mockUser, dto);
  });

  it('validarConvite deve chamar o service com o token', async () => {
    const res = await controller.validarConvite('token-abc');

    expect(res).toEqual({ valido: true });
    expect(service.validarConvite).toHaveBeenCalledWith('token-abc');
  });

  it('ativarConvite deve chamar o service com o dto', async () => {
    const dto = {
      token: 'token-abc',
      nome: 'Membro',
      email: 'membro@test.com',
      senha: '123',
    };
    const res = await controller.ativarConvite(dto);

    expect(res).toEqual({ accessToken: 'mock-jwt' });
    expect(service.ativarConvite).toHaveBeenCalledWith(dto);
  });

  it('listarConvitesPorSetor deve chamar o service com o setor informado', async () => {
    const res = await controller.listarConvitesPorSetor(mockUser, 1);

    expect(res).toEqual([mockConviteCriado]);
    expect(service.listarConvitesPorSetor).toHaveBeenCalledWith(mockUser, 1);
  });
});
