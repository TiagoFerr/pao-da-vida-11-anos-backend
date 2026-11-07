import {
  Injectable,
  ForbiddenException,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
  MessageEvent,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Subject, Observable, interval, merge } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { Role } from '@prisma/client';
import Redis from 'ioredis';
import * as crypto from 'crypto';
import { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { SsePayloadEnvelope } from './dto/sse-event.dto';

@Injectable()
export class SseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SseService.name);
  private readonly eventBus$ = new Subject<SsePayloadEnvelope>();

  private redisPublisher: Redis | null = null;
  private redisSubscriber: Redis | null = null;
  private isRedisConnected = false;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    this.inicializarRedis();
  }

  onModuleDestroy() {
    if (this.redisPublisher) {
      this.redisPublisher.disconnect();
    }
    if (this.redisSubscriber) {
      this.redisSubscriber.disconnect();
    }
  }

  private inicializarRedis() {
    const redisHost = this.configService.get<string>('REDIS_HOST');
    const redisPort = this.configService.get<number>('REDIS_PORT', 6379);
    const redisPassword = this.configService.get<string>('REDIS_PASSWORD');

    if (!redisHost) {
      this.logger.log(
        'REDIS_HOST não configurado. Utilizando Barramento de Eventos In-Memory RxJS para SSE.',
      );
      return;
    }

    try {
      const redisOptions = {
        host: redisHost,
        port: Number(redisPort),
        password: redisPassword || undefined,
        retryStrategy: (times: number) => {
          if (times > 3) {
            this.logger.warn('Falha ao conectar no Redis após 3 tentativas. Mantendo fallback In-Memory.');
            return null; // desiste de reconectar para não travar
          }
          return Math.min(times * 1000, 3000);
        },
      };

      this.redisPublisher = new Redis(redisOptions);
      this.redisSubscriber = new Redis(redisOptions);

      this.redisSubscriber.subscribe('pao-da-vida-sse-channel', (err) => {
        if (err) {
          this.logger.warn(`Erro ao subscrever no canal Redis SSE: ${err.message}`);
          return;
        }
        this.isRedisConnected = true;
        this.logger.log('Conectado ao Redis Pub/Sub com sucesso para distribuição SSE!');
      });

      this.redisSubscriber.on('message', (_channel, message) => {
        try {
          const envelope: SsePayloadEnvelope = JSON.parse(message);
          this.eventBus$.next(envelope);
        } catch (e) {
          this.logger.error(`Erro ao desserializar evento SSE do Redis: ${e}`);
        }
      });

      this.redisPublisher.on('error', (err) => {
        this.logger.debug(`Redis Publisher Notice: ${err.message}`);
      });
      this.redisSubscriber.on('error', (err) => {
        this.logger.debug(`Redis Subscriber Notice: ${err.message}`);
      });
    } catch (e) {
      this.logger.warn(`Não foi possível iniciar clientes Redis. Operando via In-Memory Bus: ${e}`);
    }
  }

  public publicarEvento(envelope: SsePayloadEnvelope) {
    if (this.isRedisConnected && this.redisPublisher) {
      this.redisPublisher.publish(
        'pao-da-vida-sse-channel',
        JSON.stringify(envelope),
      );
    } else {
      // Fallback In-Memory nativo
      this.eventBus$.next(envelope);
    }
  }

  emitirVidaParaCristo(dados: {
    decisaoId: string;
    cultoId: string;
    numeroSequencial: number | null;
    setorNumero: number;
    setorNome: string;
    bairro: string;
    nomeDecidido: string;
    tipoDecisao: string;
    liderNome: string;
  }) {
    const envelope: SsePayloadEnvelope = {
      tipo: 'vida.para.cristo',
      setorNumero: dados.setorNumero,
      isBroadcast: false,
      timestamp: new Date().toISOString(),
      payload: dados,
    };
    this.publicarEvento(envelope);
    this.logger.log(
      `[SSE ALERTA TELÃO] Vida para Cristo: ${dados.nomeDecidido} no Culto #${dados.numeroSequencial} (Setor ${dados.setorNumero})!`,
    );
  }

  emitirCultoCadastrado(dados: {
    cultoId: string;
    numeroSequencial: number | null;
    setorNumero: number;
    setorNome: string;
    bairro: string;
    rua: string;
    numero: string;
    liderNome: string;
    anfitriaoNome: string;
  }) {
    const envelope: SsePayloadEnvelope = {
      tipo: 'culto.cadastrado',
      setorNumero: dados.setorNumero,
      isBroadcast: false,
      timestamp: new Date().toISOString(),
      payload: dados,
    };
    this.publicarEvento(envelope);
  }

  emitirStatusCultoAlterado(dados: {
    cultoId: string;
    numeroSequencial: number | null;
    setorNumero: number;
    status: string;
    liderNome: string;
  }) {
    const envelope: SsePayloadEnvelope = {
      tipo: 'culto.status_alterado',
      setorNumero: dados.setorNumero,
      isBroadcast: false,
      timestamp: new Date().toISOString(),
      payload: dados,
    };
    this.publicarEvento(envelope);
  }

  emitirComunicadoPastoral(dados: {
    titulo: string;
    mensagem: string;
    urgente?: boolean;
    autorNome: string;
  }) {
    const envelope: SsePayloadEnvelope = {
      tipo: 'comunicado.pastoral',
      setorNumero: null,
      isBroadcast: true,
      timestamp: new Date().toISOString(),
      payload: {
        id: crypto.randomUUID(),
        ...dados,
      },
    };
    this.publicarEvento(envelope);
    this.logger.log(`[SSE BROADCAST] Comunicado Pastoral: "${dados.titulo}"`);
  }

  conectarStream(usuario: AuthenticatedUser): Observable<MessageEvent> {
    if (
      usuario.role !== Role.ADMIN &&
      usuario.role !== Role.PASTOR &&
      usuario.role !== Role.COORDENADOR
    ) {
      throw new ForbiddenException(
        'Acesso ao stream em tempo real restrito aos Pastores e Coordenadores de Setor.',
      );
    }

    // 1. Filtragem de segurança e escopo do usuário
    const streamEventos$ = this.eventBus$.asObservable().pipe(
      filter((envelope) => {
        // Pastores e Admins recebem TODOS os eventos de Mossoró (Telão Geral)
        if (usuario.role === Role.ADMIN || usuario.role === Role.PASTOR) {
          return true;
        }

        // Coordenadores recebem avisos gerais (broadcast) E eventos do seu respectivo setor
        if (usuario.role === Role.COORDENADOR) {
          return (
            envelope.isBroadcast === true ||
            envelope.setorNumero === usuario.setorNumero
          );
        }

        return false;
      }),
      map((envelope) => ({
        id: crypto.randomUUID(),
        type: envelope.tipo,
        data: envelope,
      } as MessageEvent)),
    );

    // 2. Heartbeat Ping a cada 15 segundos para manter a conexão viva em Proxies reversos / Nginx
    const heartbeatPing$ = interval(15000).pipe(
      map(
        () =>
          ({
            id: crypto.randomUUID(),
            type: 'ping',
            data: {
              tipo: 'ping',
              timestamp: new Date().toISOString(),
            },
          } as MessageEvent),
      ),
    );

    return merge(streamEventos$, heartbeatPing$);
  }
}
