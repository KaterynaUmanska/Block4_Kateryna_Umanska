export class ValidationException extends Error {
  errors: string[];

  constructor(errors: string[] | string) {
    const errorMessages = Array.isArray(errors) ? errors : [errors];
    super(errorMessages.join(', '));
    this.name = 'ValidationException';
    this.errors = errorMessages;
  }
}