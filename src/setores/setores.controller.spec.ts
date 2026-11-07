import { Test, TestingModule } from '@nestjs/testing';
import { SetoresController } from './setores.controller';
import { SetoresService } from './setores.service';

const mockSetorDto = {
  numero: 1,
  nome: 'Setor 1 - Aeroporto',
  coordenadorNome: 'Pr. Rúbens Nunes',
  coordenadorTelefone: '(84) 99999-0000',
  corHex: '#1D4225',
  totalCultos: 5,
  bairros: [
    {
      id: 1,
      nome: 'Aeroporto 1',
      latitude: -5.192574,
      longitude: -37.362968,
    },
  ],
};

const mockSetoresService = {
  findAll: jest.fn().mockResolvedValue([mockSetorDto]),
  findByNumero: jest.fn().mockResolvedValue(mockSetorDto),
  findAllBairros: jest.fn().mockResolvedValue([
    {
      id: 1,
      nome: 'Aeroporto 1',
      setor: { numero: 1, nome: 'Setor 1 - Aeroporto' },
    },
  ]),
};

describe('SetoresController', () => {
  let controller: SetoresController;
  let service: SetoresService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SetoresController],
      providers: [
        {
          provide: SetoresService,
          useValue: mockSetoresService,
        },
      ],
    }).compile();

    controller = module.get<SetoresController>(SetoresController);
    service = module.get<SetoresService>(SetoresService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return array of sectors from service.findAll', async () => {
    const result = await controller.findAll();
    expect(result).toEqual([mockSetorDto]);
    expect(service.findAll).toHaveBeenCalled();
  });

  it('should return a single sector by number from service.findByNumero', async () => {
    const result = await controller.findByNumero(1);
    expect(result).toEqual(mockSetorDto);
    expect(service.findByNumero).toHaveBeenCalledWith(1);
  });

  it('should return all neighborhoods from service.findAllBairros', async () => {
    const result = await controller.findAllBairros();
    expect(result).toHaveLength(1);
    expect(service.findAllBairros).toHaveBeenCalled();
  });
});
