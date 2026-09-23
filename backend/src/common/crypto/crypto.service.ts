import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class CryptoService {
  private readonly key: Buffer;
  private readonly salt: string;

  constructor(private readonly config: ConfigService) {
    const keyString = this.config.get<string>('ENCRYPTION_KEY');
    if (!keyString) {
      throw new InternalServerErrorException('ENCRYPTION_KEY is not defined in environment');
    }
    this.key = Buffer.from(keyString, 'base64');
    if (this.key.length !== 32) {
      throw new InternalServerErrorException('ENCRYPTION_KEY must be 32 bytes (base64 encoded)');
    }

    const saltString = this.config.get<string>('HASH_SALT');
    if (!saltString) {
      throw new InternalServerErrorException('HASH_SALT is not defined in environment');
    }
    this.salt = saltString;
  }

  /**
   * Encrypts a plain-text string using AES-256-GCM.
   * Returns a base64 encoded string containing the IV, Auth Tag, and Ciphertext.
   */
  encrypt(text: string): string {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.key, iv);
    
    let encrypted = cipher.update(text, 'utf8');
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    const authTag = cipher.getAuthTag();

    // Payload format: [IV (12 bytes)][AuthTag (16 bytes)][Ciphertext]
    const payload = Buffer.concat([iv, authTag, encrypted]);
    return payload.toString('base64');
  }

  /**
   * Decrypts a base64 payload created by `encrypt()`.
   */
  decrypt(payloadBase64: string): string {
    try {
      const payload = Buffer.from(payloadBase64, 'base64');
      // Minimum length is 12 (IV) + 16 (AuthTag) = 28 bytes
      if (payload.length < 28) {
        throw new Error('Payload too short');
      }

      const iv = payload.subarray(0, 12);
      const authTag = payload.subarray(12, 28);
      const encrypted = payload.subarray(28);

      const decipher = crypto.createDecipheriv('aes-256-gcm', this.key, iv);
      decipher.setAuthTag(authTag);
      
      let decrypted = decipher.update(encrypted);
      decrypted = Buffer.concat([decrypted, decipher.final()]);

      return decrypted.toString('utf8');
    } catch (err) {
      console.error('Decryption error:', err);
      throw new InternalServerErrorException('Failed to decrypt sensitive data');
    }
  }

  /**
   * Creates a deterministic HMAC-SHA256 hash using the configured salt.
   * This is used for fields that require exact matching (like normalizedDocument)
   * without storing them in plain text.
   */
  hashDeterministic(text: string): string {
    return crypto.createHmac('sha256', this.salt).update(text).digest('hex');
  }
}
