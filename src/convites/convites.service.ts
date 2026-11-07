import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { Role, TipoVinculo } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { CriarConviteCoordenadorDto } from './dto/criar-convite-coordenador.dto';
import { CriarConviteMembroDto } from './dto/criar-convite-membro.dto';
import { AtivarConviteDto } from './dto/ativar-convite.dto';
import {
  ConviteCriadoResponseDto,
  ValidarConviteResponseDto,
  ConviteItemDto,
} from './dto/convite-response.dto';
import { AuthResponseDto } from '../auth/dto/auth-response.dto';
import { AuthenticatedUser } from '../auth/decorators/current-user.decorator';

@Injectable()
export class ConvitesService {
  private readonly logger = new Logger(ConvitesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  private hashToken(rawToken: string): string {
    return crypto.createHash('sha256').update(rawToken).digest('hex');
  }

  private buildLink(rawToken: string): string {
    const frontendUrl = this.configService.get<string>(
      'FRONTEND_URL',
      'https://cultonolar.paodavida.com.br',
    );
    return `${frontendUrl}/convite?token=${rawToken}`;
  }

  async criarConviteCoordenador(
    criadorId: string,
    dto: CriarConviteCoordenadorDto,
  ): Promise<ConviteCriadoResponseDto> {
    const setor = await this.prisma.setor.findUnique({
      where: { numero: dto.setorNumero },
    });

    if (!setor) {
      throw new NotFoundException(`Setor ${dto.setorNumero} não encontrado.`);
    }

    const rawToken = crypto.randomBytes(24).toString('hex');
    const tokenHash = this.hashToken(rawToken);
    const expiraEm = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 dias

    const convite = await this.prisma.conviteConta.create({
      data: {
        tokenHash,
        tipoPapel: Role.COORDENADOR,
        setorNumero: dto.setorNumero,
        nomeDestinatario: dto.nomeDestinatario || setor.coordenadorNome,
        telefoneDestinatario: dto.telefoneDestinatario || setor.coordenadorTelefone,
        expiraEm,
        utilizado: false,
        criadoPorId: criadorId,
      },
    });

    return {
      id: convite.id,
      token: rawToken,
      link: this.buildLink(rawToken),
      tipoPapel: convite.tipoPapel,
      setorNumero: setor.numero,
      setorNome: setor.nome,
      expiraEm: convite.expiraEm,
    };
  }

  async criarConviteMembro(
    criador: AuthenticatedUser,
    dto: CriarConviteMembroDto,
  ): Promise<ConviteCriadoResponseDto> {
    // Coordenador só pode criar convites para seu respectivo setor
    if (
      criador.role === Role.COORDENADOR &&
      criador.setorNumero !== dto.setorNumero
    ) {
      throw new ForbiddenException(
        `Você tem permissão apenas para emitir convites para o Setor ${criador.setorNumero}.`,
      );
    }

    const setor = await this.prisma.setor.findUnique({
      where: { numero: dto.setorNumero },
    });

    if (!setor) {
      throw new NotFoundException(`Setor ${dto.setorNumero} não encontrado.`);
    }

    const rawToken = crypto.randomBytes(24).toString('hex');
    const tokenHash = this.hashToken(rawToken);
    const expiraEm = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 dias

    const convite = await this.prisma.conviteConta.create({
      data: {
        tokenHash,
        tipoPapel: dto.tipoPapel,
        setorNumero: dto.setorNumero,
        nomeDestinatario: dto.nomeDestinatario || null,
        telefoneDestinatario: dto.telefoneDestinatario || null,
        expiraEm,
        utilizado: false,
        criadoPorId: criador.id,
      },
    });

    return {
      id: convite.id,
      token: rawToken,
      link: this.buildLink(rawToken),
      tipoPapel: convite.tipoPapel,
      setorNumero: setor.numero,
      setorNome: setor.nome,
      expiraEm: convite.expiraEm,
    };
  }

  async validarConvite(token: string): Promise<ValidarConviteResponseDto> {
    const tokenHash = this.hashToken(token);

    const convite = await this.prisma.conviteConta.findUnique({
      where: { tokenHash },
      include: { setor: true },
    });

    if (!convite || convite.utilizado) {
      throw new BadRequestException('Convite inválido ou já utilizado.');
    }

    if (convite.expiraEm < new Date()) {
      throw new BadRequestException(
        'Este link de convite expirou. Solicite um novo link à liderança.',
      );
    }

    return {
      valido: true,
      tipoPapel: convite.tipoPapel,
      setorNumero: convite.setorNumero,
      setorNome: convite.setor.nome,
      nomeDestinatario: convite.nomeDestinatario,
      telefoneDestinatario: convite.telefoneDestinatario,
      expiraEm: convite.expiraEm,
    };
  }

  async ativarConvite(dto: AtivarConviteDto): Promise<AuthResponseDto> {
    const tokenHash = this.hashToken(dto.token);

    const convite = await this.prisma.conviteConta.findUnique({
      where: { tokenHash },
      include: { setor: true },
    });

    if (!convite || convite.utilizado) {
      throw new BadRequestException('Convite inválido ou já utilizado.');
    }

    if (convite.expiraEm < new Date()) {
      throw new BadRequestException('Este convite está expirado.');
    }

    const emailNormalizado = dto.email.toLowerCase().trim();
    const emailExistente = await this.prisma.usuario.findUnique({
      where: { email: emailNormalizado },
    });

    if (emailExistente) {
      throw new ConflictException(
        'Já existe um usuário cadastrado com este e-mail.',
      );
    }

    const senhaHash = await this.authService.hashPassword(dto.senha);

    const resultado = await this.prisma.$transaction(async (tx) => {
      // 1. Cria ou atualiza Pessoa
      const pessoa = await tx.pessoa.create({
        data: {
          nome: dto.nome.trim(),
          email: emailNormalizado,
          telefone: dto.telefone?.trim() || convite.telefoneDestinatario || null,
          endereco: dto.endereco?.trim() || null,
          bairro: dto.bairro?.trim() || null,
          tipoVinculo: TipoVinculo.MEMBRO_ATIVO,
        },
      });

      // 2. Cria Usuário com a role do convite e setor vinculado
      const usuario = await tx.usuario.create({
        data: {
          pessoaId: pessoa.id,
          email: emailNormalizado,
          senhaHash,
          role: convite.tipoPapel,
          setorNumero: convite.setorNumero,
          ativo: true,
        },
      });

      // 3. Marca convite como utilizado
      await tx.conviteConta.update({
        where: { id: convite.id },
        data: { utilizado: true },
      });

      return { usuario, pessoa };
    });

    this.logger.log(
      `Nova conta ativada via convite: ${resultado.usuario.email} (${convite.tipoPapel} - Setor ${convite.setorNumero})`,
    );

    // Faz login automático para entregar o token diretamente ao usuário recém-ativado
    return this.authService.login({
      email: emailNormalizado,
      senha: dto.senha,
    });
  }

  async listarConvitesPorSetor(
    solicitante: AuthenticatedUser,
    setorNumero: number,
  ): Promise<ConviteItemDto[]> {
    if (
      solicitante.role === Role.COORDENADOR &&
      solicitante.setorNumero !== setorNumero
    ) {
      throw new ForbiddenException(
        'Acesso negado: você só pode consultar os convites do seu próprio setor.',
      );
    }

    const convites = await this.prisma.conviteConta.findMany({
      where: { setorNumero },
      orderBy: { createdAt: 'desc' },
    });

    const now = new Date();

    return convites.map((c) => ({
      id: c.id,
      tipoPapel: c.tipoPapel,
      setorNumero: c.setorNumero,
      nomeDestinatario: c.nomeDestinatario,
      telefoneDestinatario: c.telefoneDestinatario,
      utilizado: c.utilizado,
      expirado: c.expiraEm < now,
      expiraEm: c.expiraEm,
      createdAt: c.createdAt,
    }));
  }
}
