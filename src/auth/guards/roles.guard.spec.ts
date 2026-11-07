import { Reflector } from '@nestjs/core';
import { ExecutionContext } from '@nestjs/common';
import { RolesGuard } from './roles.guard';
import { Role } from '@prisma/client';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  const createMockContext = (user?: any): ExecutionContext => {
    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({ user }),
      }),
    } as unknown as ExecutionContext;
  };

  it('deve permitir acesso se não houver roles configuradas na rota', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

    const context = createMockContext({ role: Role.LIDER });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('deve negar acesso se a rota exige role e o usuário não estiver autenticado', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.COORDENADOR]);

    const context = createMockContext(undefined);
    expect(guard.canActivate(context)).toBe(false);
  });

  it('deve sempre permitir acesso para ADMIN e PASTOR independente das roles exigidas', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.LIDER]);

    const adminContext = createMockContext({ role: Role.ADMIN });
    expect(guard.canActivate(adminContext)).toBe(true);

    const pastorContext = createMockContext({ role: Role.PASTOR });
    expect(guard.canActivate(pastorContext)).toBe(true);
  });

  it('deve permitir acesso se o usuário possuir uma das roles exigidas', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([
      Role.COORDENADOR,
      Role.LIDER,
    ]);

    const context = createMockContext({ role: Role.COORDENADOR });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('deve negar acesso se o usuário não possuir a role exigida', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.COORDENADOR]);

    const context = createMockContext({ role: Role.ANFITRIAO });
    expect(guard.canActivate(context)).toBe(false);
  });
});
