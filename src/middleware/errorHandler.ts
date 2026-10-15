import { Request, Response, NextFunction } from 'express';
import { getReasonPhrase, StatusCodes } from 'http-status-codes';
import { ValidationException } from '../exceptions/ValidationException.js';
import { NotFoundException } from '../exceptions/NotFoundException.js';
import log4js from 'log4js';

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof ValidationException) {
    res.status(StatusCodes.BAD_REQUEST).json({ errors: err.errors });
    return; 
  }

  if (err instanceof NotFoundException) {
    res.status(StatusCodes.NOT_FOUND).json({ errors: err.message });
    return;
  }

  if (!res.headersSent) {
    log4js.getLogger().error(err.stack);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: getReasonPhrase(StatusCodes.INTERNAL_SERVER_ERROR) });
  }
}