/**
 * Cryptography and hashing utility functions
 */

import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';

export class CryptoUtil {
  private static readonly SALT_ROUNDS = 12;
  private static readonly ALGORITHM = 'aes-256-cbc';

  /**
   * Hash password using bcrypt
   */
  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.SALT_ROUNDS);
  }

  /**
   * Compare password with hash
   */
  static async comparePassword(
    password: string,
    hash: string,
  ): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Generate secure random token
   */
  static generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Generate secure random bytes
   */
  static generateSecureBytes(length: number = 32): Buffer {
    return crypto.randomBytes(length);
  }

  /**
   * Generate UUID v4
   */
  static generateUUID(): string {
    return crypto.randomUUID();
  }

  /**
   * Hash data using SHA256
   */
  static hashSHA256(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Hash data using MD5 (use only for non-security purposes)
   */
  static hashMD5(data: string): string {
    return crypto.createHash('md5').update(data).digest('hex');
  }

  /**
   * Encrypt text using AES-256-CBC
   */
  static encrypt(text: string, key: string): string {
    // Ensure key is 32 bytes for AES-256
    const keyBuffer = Buffer.from(key.padEnd(32, '0').substring(0, 32));
    const iv = crypto.randomBytes(16);

    const cipher = crypto.createCipheriv(this.ALGORITHM, keyBuffer, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // Return IV + encrypted text
    return iv.toString('hex') + ':' + encrypted;
  }

  /**
   * Decrypt text using AES-256-CBC
   */
  static decrypt(encryptedText: string, key: string): string {
    // Ensure key is 32 bytes for AES-256
    const keyBuffer = Buffer.from(key.padEnd(32, '0').substring(0, 32));

    // Split IV and encrypted text
    const parts = encryptedText.split(':');
    const iv = Buffer.from(parts.shift()!, 'hex');
    const encrypted = parts.join(':');

    const decipher = crypto.createDecipheriv(this.ALGORITHM, keyBuffer, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Generate HMAC signature
   */
  static generateHMAC(data: string, secret: string): string {
    return crypto.createHmac('sha256', secret).update(data).digest('hex');
  }

  /**
   * Verify HMAC signature
   */
  static verifyHMAC(data: string, secret: string, signature: string): boolean {
    const expectedSignature = this.generateHMAC(data, secret);
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature),
    );
  }

  /**
   * Generate random number between min and max (inclusive)
   */
  static generateRandomNumber(min: number, max: number): number {
    return crypto.randomInt(min, max + 1);
  }

  /**
   * Generate numeric OTP
   */
  static generateOTP(length: number = 6): string {
    let otp = '';
    for (let i = 0; i < length; i++) {
      otp += this.generateRandomNumber(0, 9).toString();
    }
    return otp;
  }

  /**
   * Constant-time string comparison to prevent timing attacks
   */
  static secureCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
  }
}
