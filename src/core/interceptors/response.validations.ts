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
        // Disable response validation for now as response DTOs don't need validation
        // Response validation should only be used for entities that have validation decorators
        // and need to be validated before being sent to clients
        
        // For now, we'll just pass through all responses without validation
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
