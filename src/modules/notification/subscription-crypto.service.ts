import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'crypto';
import {
  NotificationConfig,
  NotificationConfigName,
} from '../../config/notification.config';

@Injectable()
export class SubscriptionCryptoService {
  constructor(private readonly configService: ConfigService) {}

  hashEndpoint(endpoint: string): string {
    return createHash('sha256').update(endpoint).digest('hex');
  }

  encrypt(value: string): string {
    const key = this.getEncryptionKey();
    const initializationVector = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', key, initializationVector);
    const encrypted = Buffer.concat([
      cipher.update(value, 'utf8'),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();

    return [
      initializationVector.toString('base64url'),
      authTag.toString('base64url'),
      encrypted.toString('base64url'),
    ].join('.');
  }

  decrypt(value: string): string {
    const [initializationVector, authTag, encrypted] = value.split('.');
    if (!initializationVector || !authTag || !encrypted) {
      throw new ServiceUnavailableException(
        'Stored push subscription credentials are invalid',
      );
    }

    const decipher = createDecipheriv(
      'aes-256-gcm',
      this.getEncryptionKey(),
      Buffer.from(initializationVector, 'base64url'),
    );
    decipher.setAuthTag(Buffer.from(authTag, 'base64url'));

    return Buffer.concat([
      decipher.update(Buffer.from(encrypted, 'base64url')),
      decipher.final(),
    ]).toString('utf8');
  }

  private getEncryptionKey(): Buffer {
    const config =
      this.configService.get<NotificationConfig>(NotificationConfigName);
    const material =
      config?.subscriptionEncryptionKey || config?.vapidPrivateKey;

    if (!material) {
      throw new ServiceUnavailableException(
        'Browser notifications are not configured',
      );
    }

    return createHash('sha256').update(material).digest();
  }
}
