import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { TokenExpiredError } from '@nestjs/jwt';
import { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { StatusCode } from '../http/response';
import { ServerConfig, ServerConfigName } from '../../config/server.config';
import { WinstonLogger } from '../../setup/winston.logger';

@Catch()
export class ExceptionHandler implements ExceptionFilter {
  constructor(
    private readonly configService: ConfigService,
    private readonly logger: WinstonLogger,
  ) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let statusCode = StatusCode.FAILURE;
    let message = 'Something went wrong';
    let errors: string[] | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      const responseMessage =
        typeof exceptionResponse === 'string'
          ? exceptionResponse
          : exceptionResponse['message'];

      const responseErrors =
        typeof exceptionResponse === 'string'
          ? exceptionResponse
          : exceptionResponse['errors'];

      if (Array.isArray(responseMessage) && responseMessage.length > 0) {
        message = responseMessage[0];
        errors = responseErrors;
      } else if (typeof responseMessage === 'string') {
        message = responseMessage;
        errors = responseErrors;
      }

      if (
        exception instanceof UnauthorizedException &&
        message.toLowerCase().includes('invalid access token')
      ) {
        statusCode = StatusCode.INVALID_ACCESS_TOKEN;
        response.setHeader('instruction', 'logout');
      }

      if (status === HttpStatus.INTERNAL_SERVER_ERROR) {
        this.logger.error(exception.message, exception.stack);
      }
    } else if (exception instanceof TokenExpiredError) {
      status = HttpStatus.UNAUTHORIZED;
      statusCode = StatusCode.INVALID_ACCESS_TOKEN;
      message = 'Token Expired';
      response.setHeader('instruction', 'refresh_token');
    } else {
      const serverConfig =
        this.configService.getOrThrow<ServerConfig>(ServerConfigName);
      message =
        serverConfig.nodeEnv === 'development'
          ? (exception as Error).message
          : message;

      this.logger.error(
        (exception as Error).message,
        (exception as Error).stack,
      );
    }

    response.status(status).json({
      statusCode,
      message,
      errors,
      url: request.url,
    });
  }
}
