import { Test } from '@nestjs/testing';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable, of, lastValueFrom } from 'rxjs';
import { ResponseValidation } from './response.validations';
import * as classValidator from 'class-validator';

class MockCallHandler implements CallHandler {
  handle(): Observable<any> {
    return of({});
  }
}

jest.mock('class-validator', () => ({
  ...jest.requireActual('class-validator'),
  validateSync: jest.fn(),
}));

describe('ResponseValidationInterceptor', () => {
  let interceptor: ResponseValidation;
  const context = {} as ExecutionContext;
  const mockCallHandler = new MockCallHandler();

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [ResponseValidation],
    }).compile();

    interceptor = module.get(ResponseValidation);
  });

  it('should pass responses through without validation', async () => {
    const responsePayload = { id: 'response-1' };
    jest.spyOn(mockCallHandler, 'handle').mockReturnValue(of(responsePayload));

    const result = await lastValueFrom(interceptor.intercept(context, mockCallHandler));

    expect(result).toBe(responsePayload);
    expect(classValidator.validateSync).not.toHaveBeenCalled();
  });

  it('should extract error messages correctly', () => {
    const errors = [
      {
        property: 'property1',
        constraints: { exampleConstraint1: 'Error message 1' },
      } as classValidator.ValidationError,
      {
        property: 'property1',
        constraints: { exampleConstraint2: 'Error message 2' },
      } as classValidator.ValidationError,
    ];

    const result = interceptor['extractErrorMessages'](errors);

    expect(result).toEqual(['Error message 1', 'Error message 2']);
  });
});
