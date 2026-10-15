import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';

import { ValidationException } from '../../exceptions/ValidationException.js';
import { NotFoundException } from '../../exceptions/NotFoundException.js';
import { ChangesHistoryField } from '../../changesHistory/ChangesHistoryField.js';

const mockRepository = {
  create: jest.fn(),
  list: jest.fn(),
  countByRecordIds: jest.fn(),
};

jest.unstable_mockModule(
  '../../changesHistory/changesHistory.repository.js',
  () => ({
    create: mockRepository.create,
    list: mockRepository.list,
    countByRecordIds: mockRepository.countByRecordIds,
  }),
);

const repository = await import(
  '../../changesHistory/changesHistory.repository.js'
);

const service = await import(
  '../../changesHistory/changesHistory.service.js'
);

const mockFetch = jest.fn<typeof fetch>();
const originalFetch = global.fetch;

describe('Changes History Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    process.env.RECORD_SERVICE_URL = 'http://record-service.test';

    mockFetch.mockReset();
    global.fetch = mockFetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    delete process.env.RECORD_SERVICE_URL;
  });

  describe('create', () => {
    const dto = {
      recordId: 101,
      fieldName: ChangesHistoryField.QUANTITY,
      oldValue: '5',
      newValue: '10',
    };

    it('checks the related record and creates history', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
      } as Response);

      jest.mocked(repository.create).mockResolvedValue('history-id');

      const result = await service.create(dto);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://record-service.test/api/purchases/101',{
          signal: expect.any(AbortSignal),
        },
      );
      expect(repository.create).toHaveBeenCalledWith(dto);
      expect(result).toBe('history-id');
    });

    it('rejects creation when the related record does not exist', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
      } as Response);

      await expect(service.create(dto)).rejects.toThrow(NotFoundException);
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('propagates an error when the related service returns 500', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
      } as Response);

      await expect(service.create(dto)).rejects.toThrow(
        'Record service returned status 500',
      );
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('propagates network errors from the related service', async () => {
      mockFetch.mockRejectedValue(new Error('Connection refused'));

      await expect(service.create(dto)).rejects.toThrow('Connection refused');
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('fails when RECORD_SERVICE_URL is not configured', async () => {
      delete process.env.RECORD_SERVICE_URL;

      await expect(service.create(dto)).rejects.toThrow(
        'RECORD_SERVICE_URL is not configured',
      );
      expect(repository.create).not.toHaveBeenCalled();
    });
  });

  describe('list', () => {
    it('delegates pagination and maps repository records to DTOs', async () => {
      jest.mocked(repository.list).mockResolvedValue([
        {
          _id: 'history-id',
          recordId: 101,
          fieldName: 'quantity',
          oldValue: '5',
          newValue: '10',
          changedAt: new Date('2025-01-10T12:00:00.000Z'),
        },
      ] as never);

      const result = await service.list(101, 10, 0);

      expect(repository.list).toHaveBeenCalledWith(101, 10, 0);
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 'history-id',
        recordId: 101,
        fieldName: ChangesHistoryField.QUANTITY,
        oldValue: '5',
        newValue: '10',
      });
    });

    it('returns an empty array when the repository finds no records', async () => {
      jest.mocked(repository.list).mockResolvedValue([]);

      const result = await service.list(101, 10, 0);

      expect(result).toEqual([]);
    });
  });

  describe('countByRecordIds', () => {
    it('delegates counting to the repository', async () => {
      const ids = [101, 414, 999];
      const expected = { '101': 2, '414': 1, '999': 0 };

      jest.mocked(repository.countByRecordIds).mockResolvedValue(expected);

      await expect(service.countByRecordIds(ids)).resolves.toEqual(expected);
      expect(repository.countByRecordIds).toHaveBeenCalledWith(ids);
    });
  });
});