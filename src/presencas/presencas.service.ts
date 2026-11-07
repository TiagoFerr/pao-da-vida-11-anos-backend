import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CriarPresencaDto } from './dto/criar-presenca.dto';
import { AtualizarPresencaDto } from './dto/atualizar-presenca.dto';
import {
  PresencaResponseDto,
  ResumoPresencasCultoDto,
} from './dto/presenca-response.dto';
import { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@Injectable()
export class PresencasService {
  private readonly logger = new Logger(PresencasService.name);

  constructor(private readonly prisma: PrismaService) {}

  async adicionarPresenca(
    cultoId: string,
    autor: AuthenticatedUser,
    dto: CriarPresencaDto,
  ): Promise<PresencaResponseDto> {
    const culto = await this.prisma.cultoNoLar.findUnique({
      where: { id: cultoId },
    });

    if (!culto) {
      throw new NotFoundException(`Culto no lar com ID ${cultoId} não encontrado.`);
    }

    this.validarPermissaoCulto(autor, culto);

    if (dto.pessoaId) {
      const pessoa = await this.prisma.pessoa.findUnique({
        where: { id: dto.pessoaId },
      });
      if (!pessoa) {
        throw new NotFoundException(`Pessoa com ID ${dto.pessoaId} não encontrada.`);
      }
    }

    const presenca = await this.prisma.presencaCulto.create({
      data: {
        cultoId,
        pessoaId: dto.pessoaId || null,
        nomeParticipante: dto.nomeParticipante.trim(),
        telefone: dto.telefone?.trim() || null,
        eMembro: dto.eMembro !== undefined ? dto.eMembro : true,
        presente: dto.presente !== undefined ? dto.presente : true,
      },
    });

    this.logger.log(
      `Check-in de presença realizado: ${presenca.nomeParticipante} (${presenca.eMembro ? 'Membro' : 'Visitante'}) no Culto #${culto.numeroSequencial || culto.id}`,
    );

    return this.mapToResponse(presenca);
  }

  async listarPresencas(
    cultoId: string,
    solicitante: AuthenticatedUser,
  ): Promise<ResumoPresencasCultoDto> {
    const culto = await this.prisma.cultoNoLar.findUnique({
      where: { id: cultoId },
      include: {
        presencas: {
          orderBy: { checkinEm: 'asc' },
        },
      },
    });

    if (!culto) {
      throw new NotFoundException(`Culto no lar com ID ${cultoId} não encontrado.`);
    }

    if (
      solicitante.role === Role.COORDENADOR &&
      culto.setorNumero !== solicitante.setorNumero
    ) {
      throw new ForbiddenException(
        `Coordenadores só podem consultar presenças de cultos do seu Setor (${solicitante.setorNumero}).`,
      );
    }

    const totalParticipantes = culto.presencas.length;
    const totalMembros = culto.presencas.filter((p) => p.eMembro).length;
    const totalVisitantes = culto.presencas.filter((p) => !p.eMembro).length;
    const totalPresentes = culto.presencas.filter((p) => p.presente).length;

    return {
      cultoId: culto.id,
      numeroSequencial: culto.numeroSequencial,
      totalParticipantes,
      totalMembros,
      totalVisitantes,
      totalPresentes,
      participantes: culto.presencas.map((p) => this.mapToResponse(p)),
    };
  }

  async atualizarPresenca(
    cultoId: string,
    presencaId: string,
    autor: AuthenticatedUser,
    dto: AtualizarPresencaDto,
  ): Promise<PresencaResponseDto> {
    const presenca = await this.prisma.presencaCulto.findUnique({
      where: { id: presencaId },
      include: { culto: true },
    });

    if (!presenca || presenca.cultoId !== cultoId) {
      throw new NotFoundException('Registro de presença não encontrado para este culto.');
    }

    this.validarPermissaoCulto(autor, presenca.culto);

    const data: any = {};
    if (dto.nomeParticipante) data.nomeParticipante = dto.nomeParticipante.trim();
    if (dto.telefone !== undefined) data.telefone = dto.telefone?.trim() || null;
    if (dto.eMembro !== undefined) data.eMembro = dto.eMembro;
    if (dto.presente !== undefined) data.presente = dto.presente;
    if (dto.pessoaId !== undefined) data.pessoaId = dto.pessoaId || null;

    const atualizada = await this.prisma.presencaCulto.update({
      where: { id: presencaId },
      data,
    });

    return this.mapToResponse(atualizada);
  }

  async removerPresenca(
    cultoId: string,
    presencaId: string,
    autor: AuthenticatedUser,
  ): Promise<{ success: boolean; message: string }> {
    const presenca = await this.prisma.presencaCulto.findUnique({
      where: { id: presencaId },
      include: { culto: true },
    });

    if (!presenca || presenca.cultoId !== cultoId) {
      throw new NotFoundException('Registro de presença não encontrado para este culto.');
    }

    this.validarPermissaoCulto(autor, presenca.culto);

    await this.prisma.presencaCulto.delete({
      where: { id: presencaId },
    });

    return {
      success: true,
      message: 'Presença removida com sucesso.',
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
        'Coordenadores só podem gerenciar presenças nos cultos do seu respectivo setor.',
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
        'Líderes só podem gerenciar a lista de presença do culto sob sua responsabilidade.',
      );
    }

    throw new ForbiddenException('Sem permissão para gerenciar a lista de presença deste culto.');
  }

  private mapToResponse(presenca: any): PresencaResponseDto {
    return {
      id: presenca.id,
      cultoId: presenca.cultoId,
      pessoaId: presenca.pessoaId,
      nomeParticipante: presenca.nomeParticipante,
      telefone: presenca.telefone,
      eMembro: presenca.eMembro,
      presente: presenca.presente,
      checkinEm: presenca.checkinEm,
    };
  }
}
