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
import { plainToClass } from 'class-transformer';

@Injectable()
export class ResponseValidation implements NestInterceptor {
  intercept(_: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((data) => {
        // Only validate if data has a constructor (is a class instance)
        // and skip plain objects like { message: '...' }
        if (data && typeof data === 'object' && data.constructor && data.constructor !== Object) {
          console.log('Validating class instance:', data.constructor.name);
          const errors = validateSync(data);

          if (errors.length > 0) {
            const messages = this.extractErrorMessages(errors);
            console.log('Validation errors:', messages);

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
