import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
  Optional,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SseService } from '../sse/sse.service';
import { CriarDecisaoDto } from './dto/criar-decisao.dto';
import { AtualizarDiscipuladoDto } from './dto/atualizar-discipulado.dto';
import { FiltrarDecisoesDto } from './dto/filtrar-decisoes.dto';
import {
  DecisaoResponseDto,
  RelatorioDecisoesConsolidadoDto,
  MetricasDecisoesDto,
} from './dto/decisao-response.dto';
import { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { Role, StatusDiscipulado, TipoDecisao, Prisma } from '@prisma/client';

@Injectable()
export class DecisoesService {
  private readonly logger = new Logger(DecisoesService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly sseService?: SseService,
  ) {}

  async registrarDecisao(
    cultoId: string,
    autor: AuthenticatedUser,
    dto: CriarDecisaoDto,
  ): Promise<DecisaoResponseDto> {
    const culto = await this.prisma.cultoNoLar.findUnique({
      where: { id: cultoId },
      include: { setor: true },
    });

    if (!culto) {
      throw new NotFoundException(`Culto no lar com ID ${cultoId} não encontrado.`);
    }

    this.validarPermissaoCulto(autor, culto);

    let telefone = dto.telefone?.trim() || null;

    if (dto.presencaId) {
      const presenca = await this.prisma.presencaCulto.findUnique({
        where: { id: dto.presencaId },
      });
      if (!presenca || presenca.cultoId !== cultoId) {
        throw new NotFoundException(
          'Registro de presença informado não pertence a este culto.',
        );
      }
      if (!telefone && presenca.telefone) {
        telefone = presenca.telefone;
      }
    }

    const decisao = await this.prisma.decisaoEspiritual.create({
      data: {
        cultoId,
        presencaId: dto.presencaId || null,
        nomeDecidido: dto.nomeDecidido.trim(),
        telefone,
        tipoDecisao: dto.tipoDecisao,
        pedidoOracaoDetalhe: dto.pedidoOracaoDetalhe?.trim() || null,
        statusDiscipulado: StatusDiscipulado.PENDENTE,
        registradoPorId: autor.id,
      },
      include: {
        culto: {
          include: { setor: true },
        },
        registradoPor: {
          include: { pessoa: true },
        },
      },
    });

    this.logger.log(
      `Decisão espiritual registrada: ${decisao.nomeDecidido} (${decisao.tipoDecisao}) no Culto #${culto.numeroSequencial || culto.id} por ${autor.email}`,
    );

    this.sseService?.emitirVidaParaCristo({
      decisaoId: decisao.id,
      cultoId: decisao.cultoId,
      numeroSequencial: decisao.culto.numeroSequencial,
      setorNumero: decisao.culto.setorNumero,
      setorNome: decisao.culto.setor.nome,
      bairro: decisao.culto.bairro,
      nomeDecidido: decisao.nomeDecidido,
      tipoDecisao: decisao.tipoDecisao,
      liderNome: decisao.culto.liderNome,
    });

    return this.mapToResponse(decisao);
  }

  async listarPorCulto(
    cultoId: string,
    solicitante: AuthenticatedUser,
  ): Promise<DecisaoResponseDto[]> {
    const culto = await this.prisma.cultoNoLar.findUnique({
      where: { id: cultoId },
    });

    if (!culto) {
      throw new NotFoundException(`Culto no lar com ID ${cultoId} não encontrado.`);
    }

    if (
      solicitante.role === Role.COORDENADOR &&
      culto.setorNumero !== solicitante.setorNumero
    ) {
      throw new ForbiddenException(
        `Coordenadores só podem consultar decisões do seu Setor (${solicitante.setorNumero}).`,
      );
    }

    const decisoes = await this.prisma.decisaoEspiritual.findMany({
      where: { cultoId },
      orderBy: { createdAt: 'desc' },
      include: {
        culto: {
          include: { setor: true },
        },
        registradoPor: {
          include: { pessoa: true },
        },
      },
    });

    return decisoes.map((d) => this.mapToResponse(d));
  }

  async atualizarDiscipulado(
    id: string,
    autor: AuthenticatedUser,
    dto: AtualizarDiscipuladoDto,
  ): Promise<DecisaoResponseDto> {
    const decisao = await this.prisma.decisaoEspiritual.findUnique({
      where: { id },
      include: {
        culto: {
          include: { setor: true },
        },
      },
    });

    if (!decisao) {
      throw new NotFoundException(`Decisão espiritual com ID ${id} não encontrada.`);
    }

    if (
      autor.role !== Role.ADMIN &&
      autor.role !== Role.PASTOR &&
      !(
        autor.role === Role.COORDENADOR &&
        autor.setorNumero === decisao.culto.setorNumero
      )
    ) {
      throw new ForbiddenException(
        'Apenas Administradores, Pastores ou o Coordenador do setor podem atualizar o discipulado.',
      );
    }

    let detalheAtualizado = decisao.pedidoOracaoDetalhe;
    if (dto.observacao) {
      const dataHora = new Date().toLocaleString('pt-BR');
      const nota = `[Acompanhamento ${dto.statusDiscipulado} em ${dataHora}]: ${dto.observacao}`;
      detalheAtualizado = detalheAtualizado ? `${detalheAtualizado}\n${nota}` : nota;
    }

    const atualizada = await this.prisma.decisaoEspiritual.update({
      where: { id },
      data: {
        statusDiscipulado: dto.statusDiscipulado,
        pedidoOracaoDetalhe: detalheAtualizado,
      },
      include: {
        culto: {
          include: { setor: true },
        },
        registradoPor: {
          include: { pessoa: true },
        },
      },
    });

    this.logger.log(
      `Status de discipulado da decisão de ${atualizada.nomeDecidido} alterado para ${dto.statusDiscipulado} por ${autor.email}`,
    );

    return this.mapToResponse(atualizada);
  }

  async relatorioConsolidado(
    solicitante: AuthenticatedUser,
    filtros: FiltrarDecisoesDto,
  ): Promise<RelatorioDecisoesConsolidadoDto> {
    const where: Prisma.DecisaoEspiritualWhereInput = {};

    if (solicitante.role === Role.COORDENADOR) {
      if (
        filtros.setorNumero &&
        filtros.setorNumero !== solicitante.setorNumero
      ) {
        throw new ForbiddenException(
          `Coordenadores só podem visualizar decisões do seu respectivo Setor (${solicitante.setorNumero}).`,
        );
      }
      where.culto = { setorNumero: solicitante.setorNumero };
    } else if (filtros.setorNumero) {
      where.culto = { setorNumero: filtros.setorNumero };
    }

    if (filtros.tipoDecisao) {
      where.tipoDecisao = filtros.tipoDecisao;
    }

    if (filtros.statusDiscipulado) {
      where.statusDiscipulado = filtros.statusDiscipulado;
    }

    if (filtros.cultoId) {
      where.cultoId = filtros.cultoId;
    }

    if (filtros.busca) {
      const termo = filtros.busca.trim();
      where.OR = [
        { nomeDecidido: { contains: termo, mode: 'insensitive' } },
        { telefone: { contains: termo, mode: 'insensitive' } },
        { culto: { bairro: { contains: termo, mode: 'insensitive' } } },
      ];
    }

    const page = filtros.page || 1;
    const limit = filtros.limit || 20;
    const skip = (page - 1) * limit;

    // Métricas consolidadas com base no filtro territorial do usuário
    const baseWhereMetricas: Prisma.DecisaoEspiritualWhereInput = solicitante.role === Role.COORDENADOR
      ? { culto: { setorNumero: solicitante.setorNumero } }
      : filtros.setorNumero
        ? { culto: { setorNumero: filtros.setorNumero } }
        : {};

    const [
      totalGeral,
      totalAceitouJesus,
      totalReconciliacao,
      totalPedidosOracao,
      totalPendente,
      totalEmContato,
      totalDiscipulando,
      dados,
      totalFiltrado,
    ] = await Promise.all([
      this.prisma.decisaoEspiritual.count({ where: baseWhereMetricas }),
      this.prisma.decisaoEspiritual.count({
        where: { ...baseWhereMetricas, tipoDecisao: TipoDecisao.ACEITOU_JESUS },
      }),
      this.prisma.decisaoEspiritual.count({
        where: { ...baseWhereMetricas, tipoDecisao: TipoDecisao.RECONCILIACAO },
      }),
      this.prisma.decisaoEspiritual.count({
        where: { ...baseWhereMetricas, tipoDecisao: TipoDecisao.PEDIDO_ORACAO },
      }),
      this.prisma.decisaoEspiritual.count({
        where: { ...baseWhereMetricas, statusDiscipulado: StatusDiscipulado.PENDENTE },
      }),
      this.prisma.decisaoEspiritual.count({
        where: { ...baseWhereMetricas, statusDiscipulado: StatusDiscipulado.EM_CONTATO },
      }),
      this.prisma.decisaoEspiritual.count({
        where: { ...baseWhereMetricas, statusDiscipulado: StatusDiscipulado.DISCIPULANDO },
      }),
      this.prisma.decisaoEspiritual.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          culto: {
            include: { setor: true },
          },
          registradoPor: {
            include: { pessoa: true },
          },
        },
      }),
      this.prisma.decisaoEspiritual.count({ where }),
    ]);

    const metricas: MetricasDecisoesDto = {
      totalGeral,
      totalAceitouJesus,
      totalReconciliacao,
      totalPedidosOracao,
      totalPendente,
      totalEmContato,
      totalDiscipulando,
    };

    return {
      metricas,
      dados: dados.map((d) => this.mapToResponse(d)),
      total: totalFiltrado,
      page,
      limit,
      totalPages: Math.ceil(totalFiltrado / limit) || 1,
    };
  }

  private validarPermissaoCulto(
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
        'Coordenadores só podem registrar decisões espirituais no seu setor.',
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
        'Líderes só podem registrar decisões no culto sob sua responsabilidade.',
      );
    }

    throw new ForbiddenException(
      'Sem permissão para registrar decisões espirituais neste culto.',
    );
  }

  private mapToResponse(decisao: any): DecisaoResponseDto {
    return {
      id: decisao.id,
      cultoId: decisao.cultoId,
      culto: {
        id: decisao.culto.id,
        numeroSequencial: decisao.culto.numeroSequencial,
        setorNumero: decisao.culto.setorNumero,
        setorNome: decisao.culto.setor.nome,
        bairro: decisao.culto.bairro,
        liderNome: decisao.culto.liderNome,
        anfitriaoNome: decisao.culto.anfitriaoNome,
      },
      presencaId: decisao.presencaId,
      nomeDecidido: decisao.nomeDecidido,
      telefone: decisao.telefone,
      tipoDecisao: decisao.tipoDecisao,
      pedidoOracaoDetalhe: decisao.pedidoOracaoDetalhe,
      statusDiscipulado: decisao.statusDiscipulado,
      registradoPorNome:
        decisao.registradoPor?.pessoa?.nome ||
        decisao.registradoPor?.email ||
        null,
      createdAt: decisao.createdAt,
    };
  }
}
