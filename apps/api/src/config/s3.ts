import { S3Client } from '@aws-sdk/client-s3';
import { env } from './env';

export const s3Client = new S3Client({
  region: env.AWS_REGION,
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  },
  ...(env.AWS_S3_ENDPOINT
    ? {
        endpoint: env.AWS_S3_ENDPOINT,
        forcePathStyle: true, // necessário para MinIO
      }
    : {}),
});
