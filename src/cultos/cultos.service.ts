import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  Logger,
  Optional,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SseService } from '../sse/sse.service';
import { CriarCultoDto } from './dto/criar-culto.dto';
import { AtualizarCultoDto } from './dto/atualizar-culto.dto';
import { AtualizarStatusCultoDto } from './dto/atualizar-status-culto.dto';
import { FiltrarCultosDto } from './dto/filtrar-cultos.dto';
import {
  CultoResponseDto,
  CultosPaginadosResponseDto,
} from './dto/culto-response.dto';
import { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { Role } from '@prisma/client';
import { Prisma } from '@prisma/client';

@Injectable()
export class CultosService {
  private readonly logger = new Logger(CultosService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly sseService?: SseService,
  ) {}

  async criar(
    autor: AuthenticatedUser,
    dto: CriarCultoDto,
  ): Promise<CultoResponseDto> {
    // 1. Validação territorial de Coordenador e Líder
    if (
      autor.role === Role.COORDENADOR &&
      autor.setorNumero !== dto.setorNumero
    ) {
      throw new ForbiddenException(
        `Coordenadores só podem cadastrar cultos no seu respectivo setor (${autor.setorNumero}).`,
      );
    }

    if (
      autor.role === Role.LIDER &&
      autor.setorNumero &&
      autor.setorNumero !== dto.setorNumero
    ) {
      throw new ForbiddenException(
        `Líder vinculado ao Setor ${autor.setorNumero} não pode cadastrar cultos no Setor ${dto.setorNumero}.`,
      );
    }

    // 2. Valida existência do Setor
    const setor = await this.prisma.setor.findUnique({
      where: { numero: dto.setorNumero },
    });

    if (!setor) {
      throw new NotFoundException(`Setor ${dto.setorNumero} não encontrado.`);
    }

    // 3. Cálculo do próximo número sequencial oficial (1 a 120)
    const maxSequencial = await this.prisma.cultoNoLar.aggregate({
      _max: { numeroSequencial: true },
    });
    const proximoSequencial = (maxSequencial._max.numeroSequencial || 0) + 1;

    // 4. Coordenadas padrão se ausentes
    let latitude = dto.latitude;
    let longitude = dto.longitude;

    if (!latitude || !longitude) {
      const bairroRef = await this.prisma.bairro.findFirst({
        where: {
          setorNumero: dto.setorNumero,
          nome: { equals: dto.bairro.trim(), mode: 'insensitive' },
        },
      });

      if (bairroRef?.latitude && bairroRef?.longitude) {
        latitude = Number(bairroRef.latitude);
        longitude = Number(bairroRef.longitude);
      }
    }

    // 5. Determinação do líder vinculado
    const liderUsuarioId =
      dto.liderUsuarioId || (autor.role === Role.LIDER ? autor.id : null);

    const dataCulto = new Date(dto.dataRealizacao);

    const culto = await this.prisma.cultoNoLar.create({
      data: {
        numeroSequencial: proximoSequencial,
        setorNumero: dto.setorNumero,
        bairro: dto.bairro.trim(),
        rua: dto.rua.trim(),
        numero: dto.numero.trim(),
        pontoReferencia: dto.pontoReferencia?.trim() || null,
        latitude: latitude ? new Prisma.Decimal(latitude) : null,
        longitude: longitude ? new Prisma.Decimal(longitude) : null,
        mapaX: dto.mapaX ? new Prisma.Decimal(dto.mapaX) : null,
        mapaY: dto.mapaY ? new Prisma.Decimal(dto.mapaY) : null,
        liderNome: dto.liderNome.trim(),
        liderTelefone: dto.liderTelefone.trim(),
        liderUsuarioId,
        anfitriaoNome: dto.anfitriaoNome.trim(),
        anfitriaoTelefone: dto.anfitriaoTelefone.trim(),
        anfitriaoUsuarioId: dto.anfitriaoUsuarioId || null,
        horarioInicio: dto.horarioInicio || '19:30',
        dataRealizacao: dataCulto,
        observacoes: dto.observacoes?.trim() || null,
        criadoPorId: autor.id,
      },
      include: {
        setor: true,
        _count: {
          select: {
            presencas: true,
            decisoes: true,
            fotos: true,
          },
        },
      },
    });

    this.logger.log(
      `Novo Culto no Lar cadastrado: #${culto.numeroSequencial} em ${culto.bairro} (Setor ${culto.setorNumero}) por ${autor.email}`,
    );

    this.sseService?.emitirCultoCadastrado({
      cultoId: culto.id,
      numeroSequencial: culto.numeroSequencial,
      setorNumero: culto.setorNumero,
      setorNome: culto.setor.nome,
      bairro: culto.bairro,
      rua: culto.rua,
      numero: culto.numero,
      liderNome: culto.liderNome,
      anfitriaoNome: culto.anfitriaoNome,
    });

    return this.mapToResponse(culto);
  }

  async listar(
    solicitante: AuthenticatedUser,
    filtros: FiltrarCultosDto,
  ): Promise<CultosPaginadosResponseDto> {
    const where: Prisma.CultoNoLarWhereInput = {};

    // Coordenador consulta restrita ao seu setor por padrão
    if (solicitante.role === Role.COORDENADOR) {
      if (
        filtros.setorNumero &&
        filtros.setorNumero !== solicitante.setorNumero
      ) {
        throw new ForbiddenException(
          `Coordenadores só podem visualizar cultos do seu Setor (${solicitante.setorNumero}).`,
        );
      }
      where.setorNumero = solicitante.setorNumero;
    } else if (filtros.setorNumero) {
      where.setorNumero = filtros.setorNumero;
    }

    if (filtros.bairro) {
      where.bairro = { contains: filtros.bairro.trim(), mode: 'insensitive' };
    }

    if (filtros.status) {
      where.status = filtros.status;
    }

    if (filtros.dataRealizacao) {
      where.dataRealizacao = new Date(filtros.dataRealizacao);
    }

    if (filtros.busca) {
      const termo = filtros.busca.trim();
      where.OR = [
        { liderNome: { contains: termo, mode: 'insensitive' } },
        { anfitriaoNome: { contains: termo, mode: 'insensitive' } },
        { rua: { contains: termo, mode: 'insensitive' } },
        { bairro: { contains: termo, mode: 'insensitive' } },
      ];
    }

    const page = filtros.page || 1;
    const limit = filtros.limit || 20;
    const skip = (page - 1) * limit;

    const [dados, total] = await Promise.all([
      this.prisma.cultoNoLar.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ numeroSequencial: 'asc' }, { createdAt: 'desc' }],
        include: {
          setor: true,
          _count: {
            select: {
              presencas: true,
              decisoes: true,
              fotos: true,
            },
          },
        },
      }),
      this.prisma.cultoNoLar.count({ where }),
    ]);

    return {
      dados: dados.map((culto) => this.mapToResponse(culto)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async buscarPorId(
    id: string,
    solicitante?: AuthenticatedUser,
  ): Promise<CultoResponseDto> {
    const culto = await this.prisma.cultoNoLar.findUnique({
      where: { id },
      include: {
        setor: true,
        _count: {
          select: {
            presencas: true,
            decisoes: true,
            fotos: true,
          },
        },
      },
    });

    if (!culto) {
      throw new NotFoundException(`Culto no lar com ID ${id} não encontrado.`);
    }

    if (
      solicitante &&
      solicitante.role === Role.COORDENADOR &&
      culto.setorNumero !== solicitante.setorNumero
    ) {
      throw new ForbiddenException(
        `Acesso restrito ao Coordenador do Setor ${culto.setorNumero}.`,
      );
    }

    return this.mapToResponse(culto);
  }

  async atualizar(
    id: string,
    autor: AuthenticatedUser,
    dto: AtualizarCultoDto,
  ): Promise<CultoResponseDto> {
    const existente = await this.prisma.cultoNoLar.findUnique({
      where: { id },
    });

    if (!existente) {
      throw new NotFoundException(`Culto no lar com ID ${id} não encontrado.`);
    }

    // Permissões
    this.validarPermissaoEdicao(autor, existente);

    // Controle de concorrência otimista
    if (dto.versao !== undefined && dto.versao !== existente.versao) {
      throw new ConflictException(
        'Este culto foi modificado simultaneamente por outro usuário. Recarregue os dados e tente novamente.',
      );
    }

    if (dto.setorNumero && dto.setorNumero !== existente.setorNumero) {
      if (autor.role === Role.COORDENADOR) {
        throw new ForbiddenException(
          'Coordenadores não podem alterar o setor de um culto.',
        );
      }
      const setorNovo = await this.prisma.setor.findUnique({
        where: { numero: dto.setorNumero },
      });
      if (!setorNovo) {
        throw new NotFoundException(`Setor ${dto.setorNumero} não encontrado.`);
      }
    }

    const dataAtualizada: Prisma.CultoNoLarUpdateInput = {
      versao: { increment: 1 },
    };

    if (dto.setorNumero) {
      dataAtualizada.setor = { connect: { numero: dto.setorNumero } };
    }
    if (dto.bairro) dataAtualizada.bairro = dto.bairro.trim();
    if (dto.rua) dataAtualizada.rua = dto.rua.trim();
    if (dto.numero) dataAtualizada.numero = dto.numero.trim();
    if (dto.pontoReferencia !== undefined) {
      dataAtualizada.pontoReferencia = dto.pontoReferencia?.trim() || null;
    }
    if (dto.latitude !== undefined) {
      dataAtualizada.latitude = dto.latitude
        ? new Prisma.Decimal(dto.latitude)
        : null;
    }
    if (dto.longitude !== undefined) {
      dataAtualizada.longitude = dto.longitude
        ? new Prisma.Decimal(dto.longitude)
        : null;
    }
    if (dto.mapaX !== undefined) {
      dataAtualizada.mapaX = dto.mapaX ? new Prisma.Decimal(dto.mapaX) : null;
    }
    if (dto.mapaY !== undefined) {
      dataAtualizada.mapaY = dto.mapaY ? new Prisma.Decimal(dto.mapaY) : null;
    }
    if (dto.liderNome) dataAtualizada.liderNome = dto.liderNome.trim();
    if (dto.liderTelefone) {
      dataAtualizada.liderTelefone = dto.liderTelefone.trim();
    }
    if (dto.liderUsuarioId !== undefined) {
      dataAtualizada.liderUsuario = dto.liderUsuarioId
        ? { connect: { id: dto.liderUsuarioId } }
        : { disconnect: true };
    }
    if (dto.anfitriaoNome) {
      dataAtualizada.anfitriaoNome = dto.anfitriaoNome.trim();
    }
    if (dto.anfitriaoTelefone) {
      dataAtualizada.anfitriaoTelefone = dto.anfitriaoTelefone.trim();
    }
    if (dto.anfitriaoUsuarioId !== undefined) {
      dataAtualizada.anfitriaoUsuarioId = dto.anfitriaoUsuarioId || null;
    }
    if (dto.horarioInicio) dataAtualizada.horarioInicio = dto.horarioInicio;
    if (dto.dataRealizacao) {
      dataAtualizada.dataRealizacao = new Date(dto.dataRealizacao);
    }
    if (dto.observacoes !== undefined) {
      dataAtualizada.observacoes = dto.observacoes?.trim() || null;
    }

    const atualizado = await this.prisma.cultoNoLar.update({
      where: { id },
      data: dataAtualizada,
      include: {
        setor: true,
        _count: {
          select: {
            presencas: true,
            decisoes: true,
            fotos: true,
          },
        },
      },
    });

    return this.mapToResponse(atualizado);
  }

  async atualizarStatus(
    id: string,
    autor: AuthenticatedUser,
    dto: AtualizarStatusCultoDto,
  ): Promise<CultoResponseDto> {
    const existente = await this.prisma.cultoNoLar.findUnique({
      where: { id },
    });

    if (!existente) {
      throw new NotFoundException(`Culto no lar com ID ${id} não encontrado.`);
    }

    this.validarPermissaoEdicao(autor, existente);

    let novasObservacoes = existente.observacoes;
    if (dto.motivo) {
      const dataHora = new Date().toLocaleString('pt-BR');
      const notaStatus = `[Status para ${dto.status} em ${dataHora}]: ${dto.motivo}`;
      novasObservacoes = novasObservacoes
        ? `${novasObservacoes}\n${notaStatus}`
        : notaStatus;
    }

    const atualizado = await this.prisma.cultoNoLar.update({
      where: { id },
      data: {
        status: dto.status,
        observacoes: novasObservacoes,
        versao: { increment: 1 },
      },
      include: {
        setor: true,
        _count: {
          select: {
            presencas: true,
            decisoes: true,
            fotos: true,
          },
        },
      },
    });

    this.logger.log(
      `Status do Culto #${atualizado.numeroSequencial} alterado para ${dto.status} por ${autor.email}`,
    );

    this.sseService?.emitirStatusCultoAlterado({
      cultoId: atualizado.id,
      numeroSequencial: atualizado.numeroSequencial,
      setorNumero: atualizado.setorNumero,
      status: atualizado.status,
      liderNome: atualizado.liderNome,
    });

    return this.mapToResponse(atualizado);
  }

  async remover(
    id: string,
    autor: AuthenticatedUser,
  ): Promise<{ success: boolean; message: string }> {
    const existente = await this.prisma.cultoNoLar.findUnique({
      where: { id },
    });

    if (!existente) {
      throw new NotFoundException(`Culto no lar com ID ${id} não encontrado.`);
    }

    if (
      autor.role !== Role.ADMIN &&
      autor.role !== Role.PASTOR &&
      !(
        autor.role === Role.COORDENADOR &&
        autor.setorNumero === existente.setorNumero
      )
    ) {
      throw new ForbiddenException(
        'Apenas Administradores, Pastores ou o Coordenador do Setor podem excluir um culto.',
      );
    }

    await this.prisma.cultoNoLar.delete({
      where: { id },
    });

    return {
      success: true,
      message: `Culto no Lar #${existente.numeroSequencial} excluído com sucesso.`,
    };
  }

  private validarPermissaoEdicao(
    autor: AuthenticatedUser,
    culto: {
      setorNumero: number;
      criadoPorId: string | null;
      liderUsuarioId: string | null;
    },
  ) {
    if (autor.role === Role.ADMIN || autor.role === Role.PASTOR) {
      return;
    }

    if (autor.role === Role.COORDENADOR) {
      if (autor.setorNumero === culto.setorNumero) {
        return;
      }
      throw new ForbiddenException(
        'Coordenadores só podem editar cultos pertencentes ao seu setor.',
      );
    }

    if (autor.role === Role.LIDER) {
      if (
        culto.liderUsuarioId === autor.id ||
        culto.criadoPorId === autor.id
      ) {
        return;
      }
      throw new ForbiddenException(
        'Líderes só podem editar o culto sob sua responsabilidade.',
      );
    }

    throw new ForbiddenException('Você não tem permissão para editar este culto.');
  }

  private mapToResponse(culto: any): CultoResponseDto {
    const dataRealizacaoStr =
      culto.dataRealizacao instanceof Date
        ? culto.dataRealizacao.toISOString().split('T')[0]
        : String(culto.dataRealizacao).split('T')[0];

    return {
      id: culto.id,
      numeroSequencial: culto.numeroSequencial,
      campanha: culto.campanha,
      setorNumero: culto.setorNumero,
      setor: {
        numero: culto.setor.numero,
        nome: culto.setor.nome,
        corHex: culto.setor.corHex,
        coordenadorNome: culto.setor.coordenadorNome,
      },
      bairro: culto.bairro,
      rua: culto.rua,
      numero: culto.numero,
      pontoReferencia: culto.pontoReferencia,
      latitude: culto.latitude ? Number(culto.latitude) : null,
      longitude: culto.longitude ? Number(culto.longitude) : null,
      mapaX: culto.mapaX ? Number(culto.mapaX) : null,
      mapaY: culto.mapaY ? Number(culto.mapaY) : null,
      liderNome: culto.liderNome,
      liderTelefone: culto.liderTelefone,
      liderUsuarioId: culto.liderUsuarioId,
      anfitriaoNome: culto.anfitriaoNome,
      anfitriaoTelefone: culto.anfitriaoTelefone,
      anfitriaoUsuarioId: culto.anfitriaoUsuarioId,
      horarioInicio: culto.horarioInicio,
      dataRealizacao: dataRealizacaoStr,
      status: culto.status,
      observacoes: culto.observacoes,
      versao: culto.versao,
      totalPresencas: culto._count?.presencas || 0,
      totalDecisoes: culto._count?.decisoes || 0,
      totalFotos: culto._count?.fotos || 0,
      createdAt: culto.createdAt,
      updatedAt: culto.updatedAt,
    };
  }
}
