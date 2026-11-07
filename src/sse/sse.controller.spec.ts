import { Test, TestingModule } from '@nestjs/testing';
import { SseController } from './sse.controller';
import { SseService } from './sse.service';
import { Role } from '@prisma/client';
import { of } from 'rxjs';
import { Reflector } from '@nestjs/core';

describe('SseController', () => {
  let controller: SseController;
  let service: any;

  const mockAdminUser = {
    id: 'user-admin',
    email: 'pastor@paodavida.com',
    role: Role.ADMIN,
    setorNumero: null,
  };

  beforeEach(async () => {
    const mockService = {
      conectarStream: jest.fn().mockReturnValue(of({ type: 'ping', data: {} })),
      emitirComunicadoPastoral: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SseController],
      providers: [
        { provide: SseService, useValue: mockService },
        Reflector,
      ],
    }).compile();

    controller = module.get<SseController>(SseController);
    service = module.get<SseService>(SseService);
  });

  it('deve estar definido', () => {
    expect(controller).toBeDefined();
  });

  it('stream deve invocar sseService.conectarStream com o usuário autenticado', () => {
    const stream$ = controller.stream(mockAdminUser);
    expect(stream$).toBeDefined();
    expect(service.conectarStream).toHaveBeenCalledWith(mockAdminUser);
  });

  it('emitirComunicado deve chamar sseService.emitirComunicadoPastoral', async () => {
    const dto = {
      titulo: 'Aviso Importante',
      mensagem: 'Texto do comunicado',
      urgente: true,
    };

    const res = await controller.emitirComunicado(mockAdminUser, dto);

    expect(res.enviado).toBe(true);
    expect(service.emitirComunicadoPastoral).toHaveBeenCalledWith({
      titulo: 'Aviso Importante',
      mensagem: 'Texto do comunicado',
      urgente: true,
      autorNome: 'pastor@paodavida.com',
    });
  });
});
