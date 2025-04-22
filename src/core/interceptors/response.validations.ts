import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  InternalServerErrorException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ValidationError, validateSync } from 'class-validator';

@Injectable()
export class ResponseValidation implements NestInterceptor {
  intercept(_: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((data) => {
        if (data && typeof data === 'object') {
          const errors = validateSync(data);
          if (errors.length > 0) {
            const messages = this.extractErrorMessages(errors);
            throw new InternalServerErrorException({
              message: 'Response validation failed',
              errors: messages,
            });
          }
        }
        return data;
      }),
    );
  }

  private extractErrorMessages(errors: ValidationError[]): string[] {
    return errors.flatMap((error) => [
      ...(error.constraints ? Object.values(error.constraints) : []),
      ...(error.children ? this.extractErrorMessages(error.children) : []),
    ]);
  }
}
