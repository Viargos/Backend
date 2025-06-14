import * as crypto from 'crypto';

export class OtpHelper {
  private static readonly ALGORITHM = 'aes-256-cbc';
  private static readonly ENCRYPTION_KEY = process.env.OTP_ENCRYPTION_KEY || 'your-32-character-secret-key-here';
  private static readonly IV_LENGTH = 16;

  static encodeOtp(otp: string): string {
    const iv = crypto.randomBytes(this.IV_LENGTH);
    const cipher = crypto.createCipheriv(this.ALGORITHM, Buffer.from(this.ENCRYPTION_KEY), iv);
    
    let encrypted = cipher.update(otp);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    
    return iv.toString('hex') + ':' + encrypted.toString('hex');
  }

  static decodeOtp(encodedOtp: string): string {
    const textParts = encodedOtp.split(':');
    const iv = Buffer.from(textParts[0], 'hex');
    const encryptedText = Buffer.from(textParts[1], 'hex');
    
    const decipher = crypto.createDecipheriv(this.ALGORITHM, Buffer.from(this.ENCRYPTION_KEY), iv);
    
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    
    return decrypted.toString();
  }

  static generateOtp(length: number = 6): string {
    return Math.floor(Math.random() * Math.pow(10, length))
      .toString()
      .padStart(length, '0');
  }
} 