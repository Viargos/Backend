/**
 * String manipulation utility functions
 */

export class StringUtil {
  /**
   * Convert string to slug format
   */
  static slugify(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  /**
   * Truncate string to specified length
   */
  static truncate(text: string, length: number, suffix: string = '...'): string {
    if (text.length <= length) return text;
    return text.substring(0, length).trim() + suffix;
  }

  /**
   * Capitalize first letter of string
   */
  static capitalize(text: string): string {
    if (!text) return '';
    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
  }

  /**
   * Capitalize first letter of each word
   */
  static capitalizeWords(text: string): string {
    return text
      .split(' ')
      .map(word => this.capitalize(word))
      .join(' ');
  }

  /**
   * Generate random string
   */
  static generateRandomString(length: number = 32): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Generate random alphanumeric code
   */
  static generateCode(length: number = 6): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Extract hashtags from text
   */
  static extractHashtags(text: string): string[] {
    const hashtagRegex = /#[\w]+/g;
    return text.match(hashtagRegex) || [];
  }

  /**
   * Extract mentions from text
   */
  static extractMentions(text: string): string[] {
    const mentionRegex = /@[\w]+/g;
    return text.match(mentionRegex) || [];
  }

  /**
   * Remove HTML tags from string
   */
  static stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '');
  }

  /**
   * Format number with commas
   */
  static formatNumber(num: number): string {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  }

  /**
   * Check if string is empty or whitespace
   */
  static isEmpty(text: string): boolean {
    return !text || text.trim().length === 0;
  }

  /**
   * Mask email address
   */
  static maskEmail(email: string): string {
    const [username, domain] = email.split('@');
    if (username.length <= 2) {
      return `${username}***@${domain}`;
    }
    return `${username.substring(0, 2)}***@${domain}`;
  }

  /**
   * Mask phone number
   */
  static maskPhone(phone: string): string {
    if (phone.length <= 4) return '***' + phone;
    return '***' + phone.substring(phone.length - 4);
  }

  /**
   * Remove special characters except allowed ones
   */
  static removeSpecialCharacters(
    text: string,
    allowed: string = '',
  ): string {
    const regex = new RegExp(`[^a-zA-Z0-9${allowed}]`, 'g');
    return text.replace(regex, '');
  }

  /**
   * Check if string contains only numbers
   */
  static isNumeric(text: string): boolean {
    return /^\d+$/.test(text);
  }

  /**
   * Check if string contains only alphabets
   */
  static isAlpha(text: string): boolean {
    return /^[a-zA-Z]+$/.test(text);
  }

  /**
   * Check if string contains only alphanumeric characters
   */
  static isAlphanumeric(text: string): boolean {
    return /^[a-zA-Z0-9]+$/.test(text);
  }
}
