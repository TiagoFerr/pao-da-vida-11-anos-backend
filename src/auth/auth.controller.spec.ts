import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { Role } from '@prisma/client';
import { Reflector } from '@nestjs/core';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: any;

  const mockAuthResponse = {
    accessToken: 'mock-jwt-token',
    refreshToken: 'mock-refresh-token',
    usuario: {
      id: 'usr-1',
      email: 'pastor@paodavida.com.br',
      role: Role.ADMIN,
      setorNumero: null,
      nome: 'Gabriel',
    },
  };

  const mockPerfilResponse = {
    id: 'usr-1',
    email: 'pastor@paodavida.com.br',
    role: Role.ADMIN,
    setorNumero: null,
    ativo: true,
    createdAt: new Date(),
    pessoa: null,
    setor: null,
  };

  beforeEach(async () => {
    const mockService = {
      login: jest.fn().mockResolvedValue(mockAuthResponse),
      refreshToken: jest.fn().mockResolvedValue(mockAuthResponse),
      logout: jest.fn().mockResolvedValue({ success: true }),
      getMe: jest.fn().mockResolvedValue(mockPerfilResponse),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockService },
        Reflector,
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
  });

  it('deve estar definido', () => {
    expect(controller).toBeDefined();
  });

  it('login deve chamar authService.login', async () => {
    const dto = { email: 'pastor@paodavida.com.br', senha: '123' };
    const res = await controller.login(dto);

    expect(res).toEqual(mockAuthResponse);
    expect(authService.login).toHaveBeenCalledWith(dto);
  });

  it('refresh deve chamar authService.refreshToken', async () => {
    const res = await controller.refresh({ refreshToken: 'mock-ref' });

    expect(res).toEqual(mockAuthResponse);
    expect(authService.refreshToken).toHaveBeenCalledWith('mock-ref');
  });

  it('logout deve chamar authService.logout', async () => {
    const user = { id: 'usr-1', email: 'test@test.com', role: Role.ADMIN, setorNumero: null };
    const res = await controller.logout(user, { refreshToken: 'mock-ref' });

    expect(res).toEqual({ success: true });
    expect(authService.logout).toHaveBeenCalledWith('usr-1', 'mock-ref');
  });

  it('getMe deve chamar authService.getMe', async () => {
    const user = { id: 'usr-1', email: 'test@test.com', role: Role.ADMIN, setorNumero: null };
    const res = await controller.getMe(user);

    expect(res).toEqual(mockPerfilResponse);
    expect(authService.getMe).toHaveBeenCalledWith('usr-1');
  });
});
