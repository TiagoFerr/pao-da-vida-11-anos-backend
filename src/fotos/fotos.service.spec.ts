import { Test, TestingModule } from '@nestjs/testing';
import { FotosService } from './fotos.service';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from './storage.service';
import { SseService } from '../sse/sse.service';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { Role } from '@prisma/client';

describe('FotosService', () => {
  let service: FotosService;
  let prisma: any;
  let storageService: any;
  let sseService: any;

  const mockCulto = {
    id: 'culto-1',
    numeroSequencial: 10,
    setorNumero: 5,
    bairro: 'Santo Antônio',
    liderNome: 'Pb. Adriano',
    liderUsuarioId: 'user-lider-1',
    criadoPorId: 'user-coord-1',
    setor: { numero: 5, nome: 'Setor 5' },
  };

  const mockFoto = {
    id: 'foto-1',
    cultoId: 'culto-1',
    s3Key: 'cultos/culto-1/foto.jpg',
    urlPublica: 'https://minio/cultos/culto-1/foto.jpg',
    nomeOriginal: 'foto.jpg',
    mimeType: 'image/jpeg',
    tamanhoBytes: BigInt(2048000),
    legenda: 'Oração',
    aprovadoParaTelao: false,
    enviadoPorId: 'user-lider-1',
    createdAt: new Date(),
    culto: mockCulto,
    enviadoPor: { pessoa: { nome: 'Pb. Adriano' }, email: 'lider@paodavida.com' },
  };

  const mockAdmin = {
    id: 'admin-1',
    email: 'pastor@paodavida.com',
    role: Role.ADMIN,
    setorNumero: null,
  };

  const mockCoord5 = {
    id: 'coord-5',
    email: 'coord5@paodavida.com',
    role: Role.COORDENADOR,
    setorNumero: 5,
  };

  const mockCoord8 = {
    id: 'coord-8',
    email: 'coord8@paodavida.com',
    role: Role.COORDENADOR,
    setorNumero: 8,
  };

  const mockLider = {
    id: 'user-lider-1',
    email: 'lider@paodavida.com',
    role: Role.LIDER,
    setorNumero: 5,
  };

  beforeEach(async () => {
    const mockPrisma = {
      cultoNoLar: {
        findUnique: jest.fn(),
      },
      fotoCulto: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
    };

    const mockStorage = {
      gerarPresignedUploadUrl: jest.fn().mockResolvedValue({
        uploadUrl: 'https://minio/upload',
        urlPublica: 'https://minio/public/foto.jpg',
      }),
      deletarObjeto: jest.fn().mockResolvedValue(undefined),
    };

    const mockSse = {
      publicarEvento: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FotosService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: StorageService, useValue: mockStorage },
        { provide: SseService, useValue: mockSse },
      ],
    }).compile();

    service = module.get<FotosService>(FotosService);
    prisma = module.get(PrismaService);
    storageService = module.get(StorageService);
    sseService = module.get(SseService);
  });

  it('deve estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('solicitarPresignedUrl', () => {
    it('deve gerar url pré-assinada para o líder do culto', async () => {
      prisma.cultoNoLar.findUnique.mockResolvedValue(mockCulto);

      const res = await service.solicitarPresignedUrl('culto-1', mockLider, {
        nomeOriginal: 'foto.jpg',
        mimeType: 'image/jpeg',
      });

      expect(res.uploadUrl).toBe('https://minio/upload');
      expect(res.s3Key).toContain('cultos/culto-1/');
      expect(storageService.gerarPresignedUploadUrl).toHaveBeenCalled();
    });

    it('deve lançar ForbiddenException se coordenador de outro setor solicitar url', async () => {
      prisma.cultoNoLar.findUnique.mockResolvedValue(mockCulto); // Setor 5

      await expect(
        service.solicitarPresignedUrl('culto-1', mockCoord8, {
          nomeOriginal: 'foto.jpg',
          mimeType: 'image/jpeg',
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('confirmarFoto', () => {
    it('deve salvar metadados e emitir notificação SSE', async () => {
      prisma.cultoNoLar.findUnique.mockResolvedValue(mockCulto);
      prisma.fotoCulto.create.mockResolvedValue(mockFoto);

      const res = await service.confirmarFoto('culto-1', mockLider, {
        s3Key: 'cultos/culto-1/foto.jpg',
        urlPublica: 'https://minio/cultos/culto-1/foto.jpg',
        nomeOriginal: 'foto.jpg',
        mimeType: 'image/jpeg',
        tamanhoBytes: 2048000,
      });

      expect(res.id).toBe('foto-1');
      expect(res.tamanhoBytes).toBe(2048000); // BigInt convertido para number
      expect(sseService.publicarEvento).toHaveBeenCalled();
    });
  });

  describe('listarFotosPorCulto', () => {
    it('deve retornar lista de fotos do culto', async () => {
      prisma.cultoNoLar.findUnique.mockResolvedValue(mockCulto);
      prisma.fotoCulto.findMany.mockResolvedValue([mockFoto]);

      const res = await service.listarFotosPorCulto('culto-1', mockCoord5);

      expect(res).toHaveLength(1);
      expect(res[0].id).toBe('foto-1');
    });
  });

  describe('atualizarAprovacaoTelao', () => {
    it('deve permitir aprovação de foto por Pastor ou Admin', async () => {
      prisma.fotoCulto.findUnique.mockResolvedValue(mockFoto);
      prisma.fotoCulto.update.mockResolvedValue({
        ...mockFoto,
        aprovadoParaTelao: true,
      });

      const res = await service.atualizarAprovacaoTelao('foto-1', mockAdmin, {
        aprovadoParaTelao: true,
      });

      expect(res.aprovadoParaTelao).toBe(true);
      expect(prisma.fotoCulto.update).toHaveBeenCalledWith({
        where: { id: 'foto-1' },
        data: { aprovadoParaTelao: true },
        include: expect.any(Object),
      });
    });

    it('deve bloquear Coordenador tentando aprovar foto para o telão', async () => {
      await expect(
        service.atualizarAprovacaoTelao('foto-1', mockCoord5, {
          aprovadoParaTelao: true,
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('removerFoto', () => {
    it('deve remover foto do MinIO e do banco com sucesso', async () => {
      prisma.fotoCulto.findUnique.mockResolvedValue(mockFoto);
      prisma.fotoCulto.delete.mockResolvedValue(mockFoto);

      const res = await service.removerFoto('foto-1', mockLider);

      expect(res.success).toBe(true);
      expect(storageService.deletarObjeto).toHaveBeenCalledWith(mockFoto.s3Key);
      expect(prisma.fotoCulto.delete).toHaveBeenCalledWith({
        where: { id: 'foto-1' },
      });
    });
  });
});
