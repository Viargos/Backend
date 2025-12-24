/**
 * Date and time utility functions
 */

import { TIME } from '../constants';

export class DateUtil {
  /**
   * Add minutes to a date
   */
  static addMinutes(date: Date, minutes: number): Date {
    return new Date(date.getTime() + minutes * 60000);
  }

  /**
   * Add hours to a date
   */
  static addHours(date: Date, hours: number): Date {
    return new Date(date.getTime() + hours * 3600000);
  }

  /**
   * Add days to a date
   */
  static addDays(date: Date, days: number): Date {
    return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
  }

  /**
   * Check if a date has expired
   */
  static isExpired(expiryDate: Date): boolean {
    return new Date() > expiryDate;
  }

  /**
   * Check if a date is in the past
   */
  static isPast(date: Date): boolean {
    return date < new Date();
  }

  /**
   * Check if a date is in the future
   */
  static isFuture(date: Date): boolean {
    return date > new Date();
  }

  /**
   * Format date to ISO string
   */
  static formatToISO(date: Date): string {
    return date.toISOString();
  }

  /**
   * Get date only (without time)
   */
  static getDateOnly(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  /**
   * Get OTP expiry date
   */
  static getOtpExpiryDate(): Date {
    return this.addMinutes(new Date(), TIME.OTP_EXPIRY_MINUTES);
  }

  /**
   * Calculate difference in minutes between two dates
   */
  static getDifferenceInMinutes(date1: Date, date2: Date): number {
    return Math.floor((date1.getTime() - date2.getTime()) / 60000);
  }

  /**
   * Calculate difference in days between two dates
   */
  static getDifferenceInDays(date1: Date, date2: Date): number {
    const diffTime = Math.abs(date1.getTime() - date2.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Check if two dates are on the same day
   */
  static isSameDay(date1: Date, date2: Date): boolean {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  }

  /**
   * Get start of day
   */
  static startOfDay(date: Date): Date {
    const newDate = new Date(date);
    newDate.setHours(0, 0, 0, 0);
    return newDate;
  }

  /**
   * Get end of day
   */
  static endOfDay(date: Date): Date {
    const newDate = new Date(date);
    newDate.setHours(23, 59, 59, 999);
    return newDate;
  }
}
