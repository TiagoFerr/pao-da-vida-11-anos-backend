import { Test, TestingModule } from '@nestjs/testing';
import { FotosController } from './fotos.controller';
import { FotosService } from './fotos.service';
import { Role } from '@prisma/client';
import { Reflector } from '@nestjs/core';

describe('FotosController', () => {
  let controller: FotosController;
  let service: any;

  const mockUser = {
    id: 'user-lider-1',
    email: 'lider@paodavida.com',
    role: Role.LIDER,
    setorNumero: 5,
  };

  const mockPresignedResponse = {
    uploadUrl: 'https://minio/upload',
    s3Key: 'cultos/c1/foto.jpg',
    urlPublica: 'https://minio/cultos/c1/foto.jpg',
    expiraEmSegundos: 900,
  };

  const mockFotoResponse = {
    id: 'foto-1',
    cultoId: 'culto-1',
    s3Key: 'cultos/c1/foto.jpg',
    urlPublica: 'https://minio/cultos/c1/foto.jpg',
    nomeOriginal: 'foto.jpg',
    mimeType: 'image/jpeg',
    tamanhoBytes: 2048000,
    legenda: null,
    aprovadoParaTelao: false,
    enviadoPorNome: 'Pb. Adriano',
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const mockService = {
      solicitarPresignedUrl: jest.fn().mockResolvedValue(mockPresignedResponse),
      confirmarFoto: jest.fn().mockResolvedValue(mockFotoResponse),
      listarFotosPorCulto: jest.fn().mockResolvedValue([mockFotoResponse]),
      listarFotosTelao: jest.fn().mockResolvedValue({
        dados: [mockFotoResponse],
        total: 1,
        page: 1,
        limit: 30,
        totalPages: 1,
      }),
      atualizarAprovacaoTelao: jest.fn().mockResolvedValue(mockFotoResponse),
      removerFoto: jest.fn().mockResolvedValue({ success: true, message: 'Sucesso' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [FotosController],
      providers: [
        { provide: FotosService, useValue: mockService },
        Reflector,
      ],
    }).compile();

    controller = module.get<FotosController>(FotosController);
    service = module.get<FotosService>(FotosService);
  });

  it('deve estar definido', () => {
    expect(controller).toBeDefined();
  });

  it('solicitarPresignedUrl deve chamar o service', async () => {
    const dto = { nomeOriginal: 'foto.jpg', mimeType: 'image/jpeg' };
    const res = await controller.solicitarPresignedUrl(mockUser, 'culto-1', dto);

    expect(res).toEqual(mockPresignedResponse);
    expect(service.solicitarPresignedUrl).toHaveBeenCalledWith('culto-1', mockUser, dto);
  });

  it('confirmarFoto deve chamar o service', async () => {
    const dto = {
      s3Key: 'cultos/c1/foto.jpg',
      urlPublica: 'https://minio/cultos/c1/foto.jpg',
      nomeOriginal: 'foto.jpg',
      mimeType: 'image/jpeg',
      tamanhoBytes: 2048000,
    };
    const res = await controller.confirmarFoto(mockUser, 'culto-1', dto);

    expect(res).toEqual(mockFotoResponse);
    expect(service.confirmarFoto).toHaveBeenCalledWith('culto-1', mockUser, dto);
  });

  it('listarFotosPorCulto deve chamar o service', async () => {
    const res = await controller.listarFotosPorCulto(mockUser, 'culto-1');

    expect(res).toHaveLength(1);
    expect(service.listarFotosPorCulto).toHaveBeenCalledWith('culto-1', mockUser);
  });

  it('atualizarAprovacaoTelao deve chamar o service', async () => {
    const dto = { aprovadoParaTelao: true };
    const res = await controller.atualizarAprovacaoTelao(mockUser, 'foto-1', dto);

    expect(res).toEqual(mockFotoResponse);
    expect(service.atualizarAprovacaoTelao).toHaveBeenCalledWith('foto-1', mockUser, dto);
  });

  it('removerFoto deve chamar o service', async () => {
    const res = await controller.removerFoto(mockUser, 'foto-1');

    expect(res).toEqual({ success: true, message: 'Sucesso' });
    expect(service.removerFoto).toHaveBeenCalledWith('foto-1', mockUser);
  });
});
