/**
 * Centralized logging utility using Winston
 * This provides a single point for all application logging
 */

import * as winston from 'winston';
import * as DailyRotateFile from 'winston-daily-rotate-file';
import { StringUtil } from './string.util';

export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  HTTP = 'http',
  DEBUG = 'debug',
}

export interface LogContext {
  userId?: string;
  requestId?: string;
  method?: string;
  url?: string;
  statusCode?: number;
  duration?: string;
  [key: string]: any;
}

class LoggerService {
  private static instance: LoggerService;
  private logger: winston.Logger;
  private sensitiveFields = ['password', 'token', 'accessToken', 'refreshToken', 'secret', 'apiKey', 'otp'];

  private constructor() {
    const logDir = process.env.LOG_DIR || 'logs';
    const nodeEnv = process.env.NODE_ENV || 'development';

    // Custom format for log messages
    const logFormat = winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.errors({ stack: true }),
      winston.format.printf(({ timestamp, level, message, ...meta }) => {
        const metaString = Object.keys(meta).length ? JSON.stringify(this.maskSensitiveData(meta), null, 2) : '';
        return `[${timestamp}] ${level.toUpperCase()}: ${message} ${metaString}`;
      }),
    );

    // JSON format for production
    const jsonFormat = winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json(),
    );

    // Create logger
    this.logger = winston.createLogger({
      level: nodeEnv === 'production' ? LogLevel.INFO : LogLevel.DEBUG,
      format: nodeEnv === 'production' ? jsonFormat : logFormat,
      defaultMeta: { service: 'viargos-api' },
      transports: [
        // Error logs
        new DailyRotateFile({
          filename: `${logDir}/error-%DATE%.log`,
          datePattern: 'YYYY-MM-DD',
          level: LogLevel.ERROR,
          maxFiles: '30d',
          maxSize: '20m',
          zippedArchive: true,
        }),

        // Combined logs
        new DailyRotateFile({
          filename: `${logDir}/combined-%DATE%.log`,
          datePattern: 'YYYY-MM-DD',
          maxFiles: '30d',
          maxSize: '20m',
          zippedArchive: true,
        }),

        // HTTP logs
        new DailyRotateFile({
          filename: `${logDir}/http-%DATE%.log`,
          datePattern: 'YYYY-MM-DD',
          level: LogLevel.HTTP,
          maxFiles: '7d',
          maxSize: '20m',
          zippedArchive: true,
        }),
      ],
    });

    // Console logging for development
    if (nodeEnv !== 'production') {
      this.logger.add(
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple(),
          ),
        }),
      );
    }
  }

  static getInstance(): LoggerService {
    if (!LoggerService.instance) {
      LoggerService.instance = new LoggerService();
    }
    return LoggerService.instance;
  }

  /**
   * Mask sensitive data in logs
   */
  private maskSensitiveData(data: any): any {
    if (typeof data !== 'object' || data === null) {
      return data;
    }

    if (Array.isArray(data)) {
      return data.map(item => this.maskSensitiveData(item));
    }

    const masked = { ...data };
    for (const key in masked) {
      const lowerKey = key.toLowerCase();
      if (this.sensitiveFields.some(field => lowerKey.includes(field))) {
        if (typeof masked[key] === 'string') {
          masked[key] = '***REDACTED***';
        }
      } else if (typeof masked[key] === 'object') {
        masked[key] = this.maskSensitiveData(masked[key]);
      }
    }

    return masked;
  }

  /**
   * Log error message
   */
  error(message: string, context?: LogContext): void {
    this.logger.error(message, this.maskSensitiveData(context || {}));
  }

  /**
   * Log warning message
   */
  warn(message: string, context?: LogContext): void {
    this.logger.warn(message, this.maskSensitiveData(context || {}));
  }

  /**
   * Log info message
   */
  info(message: string, context?: LogContext): void {
    this.logger.info(message, this.maskSensitiveData(context || {}));
  }

  /**
   * Log HTTP request
   */
  http(message: string, context?: LogContext): void {
    this.logger.http(message, this.maskSensitiveData(context || {}));
  }

  /**
   * Log debug message
   */
  debug(message: string, context?: LogContext): void {
    this.logger.debug(message, this.maskSensitiveData(context || {}));
  }

  /**
   * Log exception with stack trace
   */
  exception(error: Error, context?: LogContext): void {
    this.logger.error(error.message, {
      ...this.maskSensitiveData(context || {}),
      stack: error.stack,
      name: error.name,
    });
  }

  /**
   * Create a child logger with context
   */
  child(defaultContext: LogContext): ChildLogger {
    return new ChildLogger(this, defaultContext);
  }
}

/**
 * Child logger with default context
 */
class ChildLogger {
  constructor(
    private parent: LoggerService,
    private defaultContext: LogContext,
  ) {}

  error(message: string, context?: LogContext): void {
    this.parent.error(message, { ...this.defaultContext, ...context });
  }

  warn(message: string, context?: LogContext): void {
    this.parent.warn(message, { ...this.defaultContext, ...context });
  }

  info(message: string, context?: LogContext): void {
    this.parent.info(message, { ...this.defaultContext, ...context });
  }

  http(message: string, context?: LogContext): void {
    this.parent.http(message, { ...this.defaultContext, ...context });
  }

  debug(message: string, context?: LogContext): void {
    this.parent.debug(message, { ...this.defaultContext, ...context });
  }

  exception(error: Error, context?: LogContext): void {
    this.parent.exception(error, { ...this.defaultContext, ...context });
  }
}

// Export singleton instance
export const Logger = LoggerService.getInstance();

// Export child logger class for typing
export { ChildLogger };
