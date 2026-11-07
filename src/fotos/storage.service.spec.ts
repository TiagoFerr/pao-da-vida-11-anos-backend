import { Test, TestingModule } from '@nestjs/testing';
import { StorageService } from './storage.service';
import { ConfigService } from '@nestjs/config';

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn().mockResolvedValue('https://mock-minio/presigned-url'),
}));

jest.mock('@aws-sdk/client-s3', () => {
  const original = jest.requireActual('@aws-sdk/client-s3');
  return {
    ...original,
    S3Client: jest.fn().mockImplementation(() => ({
      send: jest.fn().mockResolvedValue({}),
    })),
  };
});

describe('StorageService', () => {
  let service: StorageService;

  beforeEach(async () => {
    const mockConfigService = {
      get: jest.fn((key: string, defaultValue?: any) => {
        if (key === 'MINIO_ENDPOINT') return 'http://localhost:9000';
        if (key === 'MINIO_BUCKET') return 'cultos-fotos';
        return defaultValue;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StorageService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<StorageService>(StorageService);
  });

  it('deve estar definido', () => {
    expect(service).toBeDefined();
  });

  it('gerarPresignedUploadUrl deve retornar uploadUrl e urlPublica', async () => {
    const res = await service.gerarPresignedUploadUrl('cultos/c1/foto.jpg', 'image/jpeg');

    expect(res.uploadUrl).toBe('https://mock-minio/presigned-url');
    expect(res.urlPublica).toContain('/cultos-fotos/cultos/c1/foto.jpg');
  });

  it('deletarObjeto deve executar sem lançar exceções', async () => {
    await expect(service.deletarObjeto('cultos/c1/foto.jpg')).resolves.not.toThrow();
  });
});
