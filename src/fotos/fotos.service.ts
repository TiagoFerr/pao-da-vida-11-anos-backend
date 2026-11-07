import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
  Optional,
} from '@nestjs/common';
import * as path from 'path';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from './storage.service';
import { SseService } from '../sse/sse.service';
import { SolicitarPresignedUrlDto } from './dto/solicitar-presigned-url.dto';
import { ConfirmarFotoDto } from './dto/confirmar-foto.dto';
import { AtualizarFotoTelaoDto } from './dto/atualizar-foto-telao.dto';
import { FiltrarFotosTelaoDto } from './dto/filtrar-fotos-telao.dto';
import {
  FotoResponseDto,
  PresignedUploadResponseDto,
  FotosTelaoPaginadasResponseDto,
} from './dto/foto-response.dto';
import { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { Role, Prisma } from '@prisma/client';

@Injectable()
export class FotosService {
  private readonly logger = new Logger(FotosService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
    @Optional() private readonly sseService?: SseService,
  ) {}

  async solicitarPresignedUrl(
    cultoId: string,
    autor: AuthenticatedUser,
    dto: SolicitarPresignedUrlDto,
  ): Promise<PresignedUploadResponseDto> {
    const culto = await this.prisma.cultoNoLar.findUnique({
      where: { id: cultoId },
    });

    if (!culto) {
      throw new NotFoundException(`Culto no lar com ID ${cultoId} não encontrado.`);
    }

    this.validarPermissaoCulto(autor, culto);

    const extOriginal = path.extname(dto.nomeOriginal).toLowerCase();
    const ext = extOriginal || (dto.mimeType.includes('png') ? '.png' : '.jpg');
    const s3Key = `cultos/${cultoId}/${crypto.randomUUID()}${ext}`;

    const { uploadUrl, urlPublica } =
      await this.storageService.gerarPresignedUploadUrl(s3Key, dto.mimeType, 900);

    return {
      uploadUrl,
      s3Key,
      urlPublica,
      expiraEmSegundos: 900,
    };
  }

  async confirmarFoto(
    cultoId: string,
    autor: AuthenticatedUser,
    dto: ConfirmarFotoDto,
  ): Promise<FotoResponseDto> {
    const culto = await this.prisma.cultoNoLar.findUnique({
      where: { id: cultoId },
      include: { setor: true },
    });

    if (!culto) {
      throw new NotFoundException(`Culto no lar com ID ${cultoId} não encontrado.`);
    }

    this.validarPermissaoCulto(autor, culto);

    const foto = await this.prisma.fotoCulto.create({
      data: {
        cultoId,
        s3Key: dto.s3Key,
        urlPublica: dto.urlPublica,
        nomeOriginal: dto.nomeOriginal.trim(),
        mimeType: dto.mimeType,
        tamanhoBytes: BigInt(dto.tamanhoBytes),
        legenda: dto.legenda?.trim() || null,
        aprovadoParaTelao: false,
        enviadoPorId: autor.id,
      },
      include: {
        culto: true,
        enviadoPor: {
          include: { pessoa: true },
        },
      },
    });

    this.logger.log(
      `Nova foto registrada: ${foto.id} no Culto #${culto.numeroSequencial || culto.id} por ${autor.email}`,
    );

    // Notifica via SSE que uma nova foto foi enviada do lar
    this.sseService?.publicarEvento({
      tipo: 'culto.status_alterado',
      setorNumero: culto.setorNumero,
      isBroadcast: false,
      timestamp: new Date().toISOString(),
      payload: {
        cultoId: culto.id,
        numeroSequencial: culto.numeroSequencial,
        setorNumero: culto.setorNumero,
        status: `Nova foto enviada: ${foto.nomeOriginal}`,
        liderNome: culto.liderNome,
      },
    });

    return this.mapToResponse(foto);
  }

  async listarFotosPorCulto(
    cultoId: string,
    solicitante: AuthenticatedUser,
  ): Promise<FotoResponseDto[]> {
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
        `Coordenadores só podem visualizar fotos dos cultos do seu respectivo Setor (${solicitante.setorNumero}).`,
      );
    }

    const fotos = await this.prisma.fotoCulto.findMany({
      where: { cultoId },
      orderBy: { createdAt: 'desc' },
      include: {
        culto: true,
        enviadoPor: {
          include: { pessoa: true },
        },
      },
    });

    return fotos.map((f) => this.mapToResponse(f));
  }

  async listarFotosTelao(
    solicitante: AuthenticatedUser,
    filtros: FiltrarFotosTelaoDto,
  ): Promise<FotosTelaoPaginadasResponseDto> {
    const where: Prisma.FotoCultoWhereInput = {
      aprovadoParaTelao: true,
    };

    if (solicitante.role === Role.COORDENADOR) {
      where.culto = { setorNumero: solicitante.setorNumero };
    } else if (filtros.setorNumero) {
      where.culto = { setorNumero: filtros.setorNumero };
    }

    const page = filtros.page || 1;
    const limit = filtros.limit || 30;
    const skip = (page - 1) * limit;

    const [dados, total] = await Promise.all([
      this.prisma.fotoCulto.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          culto: true,
          enviadoPor: {
            include: { pessoa: true },
          },
        },
      }),
      this.prisma.fotoCulto.count({ where }),
    ]);

    return {
      dados: dados.map((f) => this.mapToResponse(f)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async atualizarAprovacaoTelao(
    id: string,
    autor: AuthenticatedUser,
    dto: AtualizarFotoTelaoDto,
  ): Promise<FotoResponseDto> {
    if (autor.role !== Role.ADMIN && autor.role !== Role.PASTOR) {
      throw new ForbiddenException(
        'Apenas Administradores e Pastores têm permissão para aprovar fotos para o telão.',
      );
    }

    const foto = await this.prisma.fotoCulto.findUnique({
      where: { id },
    });

    if (!foto) {
      throw new NotFoundException(`Foto com ID ${id} não encontrada.`);
    }

    const atualizada = await this.prisma.fotoCulto.update({
      where: { id },
      data: {
        aprovadoParaTelao: dto.aprovadoParaTelao,
      },
      include: {
        culto: true,
        enviadoPor: {
          include: { pessoa: true },
        },
      },
    });

    this.logger.log(
      `Foto ${id} ${dto.aprovadoParaTelao ? 'aprovada' : 'reprovada'} para o telão por ${autor.email}`,
    );

    return this.mapToResponse(atualizada);
  }

  async removerFoto(
    id: string,
    autor: AuthenticatedUser,
  ): Promise<{ success: boolean; message: string }> {
    const foto = await this.prisma.fotoCulto.findUnique({
      where: { id },
      include: { culto: true },
    });

    if (!foto) {
      throw new NotFoundException(`Foto com ID ${id} não encontrada.`);
    }

    // Permissão de exclusão
    const ehAdmin = autor.role === Role.ADMIN || autor.role === Role.PASTOR;
    const ehCoordSetor =
      autor.role === Role.COORDENADOR &&
      autor.setorNumero === foto.culto.setorNumero;
    const ehAutorEnvio = foto.enviadoPorId === autor.id;

    if (!ehAdmin && !ehCoordSetor && !ehAutorEnvio) {
      throw new ForbiddenException('Sem permissão para excluir esta foto.');
    }

    // 1. Exclui arquivo no MinIO / S3
    await this.storageService.deletarObjeto(foto.s3Key);

    // 2. Exclui registro no PostgreSQL
    await this.prisma.fotoCulto.delete({
      where: { id },
    });

    return {
      success: true,
      message: 'Foto excluída com sucesso do MinIO e do banco de dados.',
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
        'Coordenadores só podem gerenciar fotos nos cultos do seu respectivo setor.',
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
        'Líderes só podem enviar fotos para o culto sob sua responsabilidade.',
      );
    }

    throw new ForbiddenException('Sem permissão para enviar fotos neste culto.');
  }

  private mapToResponse(foto: any): FotoResponseDto {
    return {
      id: foto.id,
      cultoId: foto.cultoId,
      culto: foto.culto
        ? {
            numeroSequencial: foto.culto.numeroSequencial,
            setorNumero: foto.culto.setorNumero,
            bairro: foto.culto.bairro,
            liderNome: foto.culto.liderNome,
          }
        : undefined,
      s3Key: foto.s3Key,
      urlPublica: foto.urlPublica,
      nomeOriginal: foto.nomeOriginal,
      mimeType: foto.mimeType,
      tamanhoBytes: Number(foto.tamanhoBytes), // Converte BigInt para Number nativo
      legenda: foto.legenda,
      aprovadoParaTelao: foto.aprovadoParaTelao,
      enviadoPorNome:
        foto.enviadoPor?.pessoa?.nome || foto.enviadoPor?.email || null,
      createdAt: foto.createdAt,
    };
  }
}
