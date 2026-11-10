import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadBucketCommand,
  CreateBucketCommand,
  PutBucketPolicyCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private readonly s3Client: S3Client;
  private readonly bucket: string;
  private readonly publicBaseUrl: string;

  constructor(private readonly configService: ConfigService) {
    const endpoint = this.configService.get<string>(
      'MINIO_ENDPOINT',
      'http://localhost:9000',
    );
    const region = this.configService.get<string>('MINIO_REGION', 'us-east-1');
    const accessKeyId = this.configService.get<string>(
      'MINIO_ACCESS_KEY',
      'minioadmin',
    );
    const secretAccessKey = this.configService.get<string>(
      'MINIO_SECRET_KEY',
      'minioadmin',
    );
    this.bucket = this.configService.get<string>(
      'MINIO_BUCKET',
      'cultos-fotos',
    );

    const customPublicUrl = this.configService.get<string>('MINIO_PUBLIC_URL');
    this.publicBaseUrl = customPublicUrl
      ? customPublicUrl.replace(/\/$/, '')
      : `${endpoint.replace(/\/$/, '')}/${this.bucket}`;

    this.s3Client = new S3Client({
      endpoint,
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      forcePathStyle: true, // Obrigatório para MinIO compatível com S3
    });
  }

  async onModuleInit() {
    await this.garantirBucketExiste();
  }

  private async garantirBucketExiste() {
    try {
      const head = new HeadBucketCommand({ Bucket: this.bucket });
      await this.s3Client.send(head);
      this.logger.log(`Bucket MinIO "${this.bucket}" verificado com sucesso.`);
    } catch {
      try {
        const create = new CreateBucketCommand({ Bucket: this.bucket });
        await this.s3Client.send(create);
        this.logger.log(`Bucket MinIO "${this.bucket}" criado automaticamente com sucesso!`);

        // Define política pública de leitura (download anônimo) para o bucket de fotos
        const publicReadPolicy = {
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Principal: '*',
              Action: ['s3:GetObject'],
              Resource: [`arn:aws:s3:::${this.bucket}/*`],
            },
          ],
        };

        const policyCommand = new PutBucketPolicyCommand({
          Bucket: this.bucket,
          Policy: JSON.stringify(publicReadPolicy),
        });
        await this.s3Client.send(policyCommand);
        this.logger.log(`Política pública de download aplicada ao bucket "${this.bucket}".`);
      } catch (err: any) {
        this.logger.warn(`Tentativa de inicializar bucket "${this.bucket}": ${err.message}`);
      }
    }
  }

  async gerarPresignedUploadUrl(
    s3Key: string,
    mimeType: string,
    expiresInSeconds: number = 900,
  ): Promise<{ uploadUrl: string; urlPublica: string }> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: s3Key,
      ContentType: mimeType,
    });

    const uploadUrl = await getSignedUrl(this.s3Client, command, {
      expiresIn: expiresInSeconds,
    });

    const urlPublica = `${this.publicBaseUrl}/${s3Key}`;

    return { uploadUrl, urlPublica };
  }

  async deletarObjeto(s3Key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: s3Key,
      });
      await this.s3Client.send(command);
    } catch (error) {
      this.logger.warn(`Erro ao excluir objeto ${s3Key} do MinIO/S3: ${error}`);
    }
  }
}
