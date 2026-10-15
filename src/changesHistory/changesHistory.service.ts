import { plainToInstance } from 'class-transformer';
import { ChangesHistoryCreateDto } from './dto/ChangesHistoryCreateDto.js';
import { ChangesHistoryDto } from './dto/ChangesHistoryInfoDto.js';
import * as repository from './changesHistory.repository.js';
import { ValidationException } from '../exceptions/ValidationException.js';
import { NotFoundException } from '../exceptions/NotFoundException.js';

async function recordExists(id: number): Promise<boolean> {
  const RECORD_SERVICE_URL = process.env.RECORD_SERVICE_URL;

  if (!RECORD_SERVICE_URL) {
    throw new Error('RECORD_SERVICE_URL is not configured');
  }

  const response = await fetch(
    `${RECORD_SERVICE_URL}/api/purchases/${id}`,
    {
      signal: AbortSignal.timeout(5000),
    },
  );

  if (response.status === 404) {
    return false;
  }

  if (!response.ok) {
    throw new Error(
      `Record service returned status ${response.status}`,
    );
  }

  return true;
}

export const create = async (
  dto: ChangesHistoryCreateDto,
): Promise<string> => {
  const exists = await recordExists(dto.recordId);

  if (!exists) {
    throw new NotFoundException(
      `PurchaseRecord ${dto.recordId} does not exist`,
    );
  }

  return repository.create(dto);
};

export const list = async (
  recordId: number,
  size: number,
  from: number,
): Promise<ChangesHistoryDto[]> => {
  const records = await repository.list(recordId, size, from);

  return records.map((record) =>
    plainToInstance(ChangesHistoryDto, record, {
      excludeExtraneousValues: true,
    }),
  );
};

export const countByRecordIds = async (
  recordIds: number[],
): Promise<Record<string, number>> => {
  return repository.countByRecordIds(recordIds);
};