import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SetorResponseDto } from './dto/setor-response.dto';

@Injectable()
export class SetoresService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<SetorResponseDto[]> {
    const setores = await this.prisma.setor.findMany({
      include: {
        bairros: {
          orderBy: { nome: 'asc' },
        },
        _count: {
          select: { cultos: true },
        },
      },
      orderBy: { numero: 'asc' },
    });

    return setores.map((s) => ({
      numero: s.numero,
      nome: s.nome,
      coordenadorNome: s.coordenadorNome,
      coordenadorTelefone: s.coordenadorTelefone,
      corHex: s.corHex,
      totalCultos: s._count.cultos,
      bairros: s.bairros.map((b) => ({
        id: b.id,
        nome: b.nome,
        latitude: b.latitude ? Number(b.latitude) : null,
        longitude: b.longitude ? Number(b.longitude) : null,
      })),
    }));
  }

  async findByNumero(numero: number): Promise<SetorResponseDto> {
    const setor = await this.prisma.setor.findUnique({
      where: { numero },
      include: {
        bairros: {
          orderBy: { nome: 'asc' },
        },
        _count: {
          select: { cultos: true },
        },
      },
    });

    if (!setor) {
      throw new NotFoundException(`Setor ${numero} não foi encontrado.`);
    }

    return {
      numero: setor.numero,
      nome: setor.nome,
      coordenadorNome: setor.coordenadorNome,
      coordenadorTelefone: setor.coordenadorTelefone,
      corHex: setor.corHex,
      totalCultos: setor._count.cultos,
      bairros: setor.bairros.map((b) => ({
        id: b.id,
        nome: b.nome,
        latitude: b.latitude ? Number(b.latitude) : null,
        longitude: b.longitude ? Number(b.longitude) : null,
      })),
    };
  }

  async findAllBairros() {
    return this.prisma.bairro.findMany({
      orderBy: { nome: 'asc' },
      include: {
        setor: {
          select: {
            numero: true,
            nome: true,
            corHex: true,
          },
        },
      },
    });
  }
}
