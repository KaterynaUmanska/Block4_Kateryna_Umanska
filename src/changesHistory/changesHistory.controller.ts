import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import { plainToInstance } from 'class-transformer';
import { ChangesHistoryCreateDto } from './dto/ChangesHistoryCreateDto.js';
import * as service from './changesHistory.service.js';
import { ValidationException } from '../exceptions/ValidationException.js';

function parseInteger(
  value: unknown,
  name: string,
  defaultValue?: number,
): number {
  if (value === undefined && defaultValue !== undefined) {
    return defaultValue;
  }

  const parsed = Number(value);

  if (!Number.isSafeInteger(parsed)) {
    throw new ValidationException(`${name} must be an integer`);
  }

  return parsed;
}

export const create = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const dto = plainToInstance(
      ChangesHistoryCreateDto,
      req.body,
    );

    const id = await service.create(dto);

    res.status(StatusCodes.CREATED).json({ id });
  } catch (error) {
    next(error);
  }
};

export const list = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const recordId = parseInteger(req.query.recordId, 'recordId');
    const size = parseInteger(req.query.size, 'size', 10);
    const from = parseInteger(req.query.from, 'from', 0);

    if (recordId < 1 || size < 1 || size > 100 || from < 0) {
      throw new ValidationException(
        'recordId must be positive, size must be 1-100, and from must be non-negative',
      );
    }

    const result = await service.list(recordId, size, from);

    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const counts = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const recordIds = req.body?.recordIds;

    if (
      !Array.isArray(recordIds) ||
      recordIds.length > 1000 ||
      !recordIds.every(
        (id: unknown) =>
          typeof id === 'number' &&
          Number.isSafeInteger(id) &&
          id > 0,
      )
    ) {
      throw new ValidationException(
        'recordIds must be an array of at most 1000 positive integers',
      );
    }

    const result = await service.countByRecordIds(recordIds);

    res.json(result);
  } catch (error) {
    next(error);
  }
};