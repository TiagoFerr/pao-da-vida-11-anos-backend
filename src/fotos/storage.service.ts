import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class StorageService {
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
