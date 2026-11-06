import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { SetoresService } from './setores.service';
import { PrismaService } from '../prisma/prisma.service';

const mockSetor = {
  numero: 1,
  nome: 'Setor 1 - Aeroporto',
  coordenadorNome: 'Pr. Rúbens Nunes',
  coordenadorTelefone: '(84) 99999-0000',
  corHex: '#1D4225',
  bairros: [
    {
      id: 1,
      nome: 'Aeroporto 1',
      latitude: -5.192574,
      longitude: -37.362968,
    },
  ],
  _count: {
    cultos: 5,
  },
};

const mockPrismaService = {
  setor: {
    findMany: jest.fn().mockResolvedValue([mockSetor]),
    findUnique: jest.fn().mockImplementation(({ where }) => {
      if (where.numero === 1) return Promise.resolve(mockSetor);
      return Promise.resolve(null);
    }),
  },
  bairro: {
    findMany: jest.fn().mockResolvedValue([
      {
        id: 1,
        nome: 'Aeroporto 1',
        setor: { numero: 1, nome: 'Setor 1 - Aeroporto', corHex: '#1D4225' },
      },
    ]),
  },
};

describe('SetoresService', () => {
  let service: SetoresService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SetoresService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<SetoresService>(SetoresService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return all 14 sectors with their neighborhoods and cultos count', async () => {
    const result = await service.findAll();
    expect(result).toHaveLength(1);
    expect(result[0].numero).toBe(1);
    expect(result[0].totalCultos).toBe(5);
    expect(result[0].bairros).toHaveLength(1);
    expect(result[0].bairros[0].nome).toBe('Aeroporto 1');
  });

  it('should return a specific sector by number', async () => {
    const result = await service.findByNumero(1);
    expect(result).toBeDefined();
    expect(result.numero).toBe(1);
    expect(result.nome).toBe('Setor 1 - Aeroporto');
  });

  it('should throw NotFoundException when sector number does not exist', async () => {
    await expect(service.findByNumero(99)).rejects.toThrow(NotFoundException);
  });

  it('should return all neighborhoods with their sector info', async () => {
    const result = await service.findAllBairros();
    expect(result).toHaveLength(1);
    expect(result[0].nome).toBe('Aeroporto 1');
  });
});
