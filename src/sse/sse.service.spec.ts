import { Test, TestingModule } from '@nestjs/testing';
import { SseService } from './sse.service';
import { ConfigService } from '@nestjs/config';
import { ForbiddenException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { firstValueFrom } from 'rxjs';
import { take } from 'rxjs/operators';

describe('SseService', () => {
  let service: SseService;

  const mockAdminUser = {
    id: 'user-admin',
    email: 'pastor@paodavida.com',
    role: Role.ADMIN,
    setorNumero: null,
  };

  const mockCoord5 = {
    id: 'user-coord-5',
    email: 'coord5@paodavida.com',
    role: Role.COORDENADOR,
    setorNumero: 5,
  };

  const mockLider = {
    id: 'user-lider',
    email: 'lider@paodavida.com',
    role: Role.LIDER,
    setorNumero: 5,
  };

  beforeEach(async () => {
    const mockConfigService = {
      get: jest.fn((key: string, defaultValue?: any) => {
        if (key === 'REDIS_HOST') return null; // In-Memory fallback para testes
        return defaultValue;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SseService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<SseService>(SseService);
    service.onModuleInit();
  });

  afterEach(() => {
    service.onModuleDestroy();
  });

  it('deve estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('conectarStream & autorizacao por papel', () => {
    it('deve bloquear usuários com role LIDER com ForbiddenException', () => {
      expect(() => service.conectarStream(mockLider)).toThrow(
        ForbiddenException,
      );
    });

    it('deve permitir conexão de Administrador e transmitir todos os eventos', async () => {
      const stream$ = service.conectarStream(mockAdminUser);

      const promiseEvent = firstValueFrom(stream$.pipe(take(1)));

      service.emitirVidaParaCristo({
        decisaoId: 'dec-1',
        cultoId: 'culto-1',
        numeroSequencial: 10,
        setorNumero: 8, // Setor 8
        setorNome: 'Setor 8 - Centro',
        bairro: 'Centro',
        nomeDecidido: 'João Paulo',
        tipoDecisao: 'ACEITOU_JESUS',
        liderNome: 'Líder Centro',
      });

      const event = await promiseEvent;
      expect(event.type).toBe('vida.para.cristo');
      expect((event.data as any).payload.nomeDecidido).toBe('João Paulo');
    });

    it('deve filtrar eventos para o Coordenador apenas do seu setor ou broadcasts', async () => {
      const stream$ = service.conectarStream(mockCoord5);

      const promiseEvent = firstValueFrom(stream$.pipe(take(1)));

      // Emite evento de outro setor (Setor 2) -> Coordenador do Setor 5 NÃO deve receber
      service.emitirCultoCadastrado({
        cultoId: 'culto-2',
        numeroSequencial: 2,
        setorNumero: 2,
        setorNome: 'Setor 2',
        bairro: 'Abolição',
        rua: 'Rua 2',
        numero: '20',
        liderNome: 'Líder 2',
        anfitriaoNome: 'Anfitrião 2',
      });

      // Emite comunicado pastoral (Broadcast) -> Coordenador DEVE receber
      service.emitirComunicadoPastoral({
        titulo: 'Aviso Geral aos 14 Setores',
        mensagem: 'Reunião geral às 18h',
        urgente: true,
        autorNome: 'Pr. Gabriel',
      });

      const event = await promiseEvent;
      expect(event.type).toBe('comunicado.pastoral');
      expect((event.data as any).payload.titulo).toBe(
        'Aviso Geral aos 14 Setores',
      );
    });

    it('deve entregar eventos do próprio setor para o Coordenador', async () => {
      const stream$ = service.conectarStream(mockCoord5);

      const promiseEvent = firstValueFrom(stream$.pipe(take(1)));

      service.emitirVidaParaCristo({
        decisaoId: 'dec-5',
        cultoId: 'culto-5',
        numeroSequencial: 45,
        setorNumero: 5, // Mesmo setor do coordenador!
        setorNome: 'Setor 5 - Santo Antônio',
        bairro: 'Santo Antônio',
        nomeDecidido: 'Maria Helena',
        tipoDecisao: 'ACEITOU_JESUS',
        liderNome: 'Pb. Adriano',
      });

      const event = await promiseEvent;
      expect(event.type).toBe('vida.para.cristo');
      expect((event.data as any).payload.nomeDecidido).toBe('Maria Helena');
    });
  });
});
