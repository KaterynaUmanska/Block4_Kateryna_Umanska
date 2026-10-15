import * as repository from '../../changesHistory/changesHistory.repository.js';
import ChangesHistory from '../../changesHistory/changesHistory.model.js';
import { ChangesHistoryField } from '../../changesHistory/ChangesHistoryField.js';
import {
  clearDatabase,
  startMongoContainer,
  stopMongoContainer,
} from '../mongo.setup.js';

import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';

describe('Changes History Repository integration tests', () => {
  beforeAll(async () => {
    await startMongoContainer();
  }, 60_000);

  afterAll(async () => {
    await stopMongoContainer();
  }, 60_000);

  beforeEach(async () => {
    await clearDatabase();
  });

  describe('create', () => {
    it('persists a history record in MongoDB', async () => {
      const id = await repository.create({
        recordId: 101,
        fieldName: ChangesHistoryField.QUANTITY,
        oldValue: '2',
        newValue: '5',
      } as never);

      const saved = await ChangesHistory.findById(id).lean();

      expect(saved).not.toBeNull();
      expect(saved).toMatchObject({
        recordId: 101,
        fieldName: ChangesHistoryField.QUANTITY,
        oldValue: '2',
        newValue: '5',
      });
    });

    it('persists the supplied changedAt date', async () => {
      const changedAt = '2025-01-10T12:00:00.000Z';

      const id = await repository.create({
        recordId: 101,
        fieldName: ChangesHistoryField.QUANTITY,
        oldValue: '2',
        newValue: '5',
        changedAt,
      } as never);

      const saved = await ChangesHistory.findById(id).lean();

      expect(saved!.changedAt.toISOString()).toBe(changedAt);
    });

    it('uses the current date when changedAt is omitted', async () => {
      const before = new Date();

      const id = await repository.create({
        recordId: 101,
        fieldName: ChangesHistoryField.QUANTITY,
        oldValue: '2',
        newValue: '5',
      } as never);

      const after = new Date();
      const saved = await ChangesHistory.findById(id).lean();

      expect(saved!.changedAt.getTime()).toBeGreaterThanOrEqual(
        before.getTime(),
      );
      expect(saved!.changedAt.getTime()).toBeLessThanOrEqual(
        after.getTime(),
      );
    });

    it('rejects an unsupported fieldName', async () => {
      await expect(
        repository.create({
          recordId: 101,
          fieldName: 'unsupportedField',
          oldValue: '2',
          newValue: '5',
        } as never),
      ).rejects.toMatchObject({ name: 'ValidationError' });
    });

    it('rejects a missing recordId', async () => {
      await expect(
        repository.create({
          fieldName: ChangesHistoryField.QUANTITY,
          oldValue: '2',
          newValue: '5',
        } as never),
      ).rejects.toMatchObject({ name: 'ValidationError' });
    });

    it('rejects a missing oldValue', async () => {
      await expect(
        repository.create({
          recordId: 101,
          fieldName: ChangesHistoryField.QUANTITY,
          newValue: '5',
        } as never),
      ).rejects.toMatchObject({ name: 'ValidationError' });
    });

    it('rejects a missing newValue', async () => {
      await expect(
        repository.create({
          recordId: 101,
          fieldName: ChangesHistoryField.QUANTITY,
          oldValue: '2',
        } as never),
      ).rejects.toMatchObject({ name: 'ValidationError' });
    });
  });

  describe('list', () => {
    it('filters by recordId', async () => {
      await ChangesHistory.create([
        {
          recordId: 101,
          fieldName: ChangesHistoryField.QUANTITY,
          oldValue: '2',
          newValue: '5',
        },
        {
          recordId: 202,
          fieldName: ChangesHistoryField.QUANTITY,
          oldValue: '3',
          newValue: '7',
        },
      ]);

      const result = await repository.list(101, 10, 0);

      expect(result).toHaveLength(1);
      expect(result[0].recordId).toBe(101);
    });

    it('returns an empty array when no records match', async () => {
      await expect(repository.list(999, 10, 0)).resolves.toEqual([]);
    });

    it('sorts records by changedAt descending', async () => {
      await ChangesHistory.create([
        {
          recordId: 101,
          fieldName: ChangesHistoryField.QUANTITY,
          oldValue: '1',
          newValue: '2',
          changedAt: new Date('2025-01-01T00:00:00.000Z'),
        },
        {
          recordId: 101,
          fieldName: ChangesHistoryField.QUANTITY,
          oldValue: '2',
          newValue: '3',
          changedAt: new Date('2025-01-03T00:00:00.000Z'),
        },
      ]);

      const result = await repository.list(101, 10, 0);

      expect(result.map((item) => item.newValue)).toEqual(['3', '2']);
    });

    it('applies size and from pagination', async () => {
      await ChangesHistory.create(
        [1, 2, 3, 4, 5].map((number) => ({
          recordId: 101,
          fieldName: ChangesHistoryField.QUANTITY,
          oldValue: String(number),
          newValue: String(number + 1),
          changedAt: new Date(Date.UTC(2025, 0, number)),
        })),
      );

      const result = await repository.list(101, 2, 1);

      expect(result).toHaveLength(2);
      expect(result.map((item) => item.newValue)).toEqual(['5', '4']);
    });

    it('returns an empty array when from exceeds the result count', async () => {
      await ChangesHistory.create({
        recordId: 101,
        fieldName: ChangesHistoryField.QUANTITY,
        oldValue: '1',
        newValue: '2',
      });

      await expect(repository.list(101, 10, 100)).resolves.toEqual([]);
    });
  });

  describe('countByRecordIds', () => {
    it('counts records using aggregation and returns zero for missing IDs', async () => {
      await ChangesHistory.create([
        {
          recordId: 101,
          fieldName: ChangesHistoryField.QUANTITY,
          oldValue: '1',
          newValue: '2',
        },
        {
          recordId: 101,
          fieldName: ChangesHistoryField.QUANTITY,
          oldValue: '2',
          newValue: '3',
        },
        {
          recordId: 202,
          fieldName: ChangesHistoryField.MATERIAL,
          oldValue: 'Steel',
          newValue: 'Copper',
        },
      ]);

      const aggregateSpy = jest.spyOn(ChangesHistory, 'aggregate');

      const result = await repository.countByRecordIds([101, 202, 303]);

      expect(result).toEqual({
        '101': 2,
        '202': 1,
        '303': 0,
      });
      expect(aggregateSpy).toHaveBeenCalledTimes(1);

      aggregateSpy.mockRestore();
    });

    it('returns zero for all IDs when no history exists', async () => {
      await expect(
        repository.countByRecordIds([101, 202]),
      ).resolves.toEqual({
        '101': 0,
        '202': 0,
      });
    });

    it('returns an empty object for an empty ID list without querying MongoDB', async () => {
      const aggregateSpy = jest.spyOn(ChangesHistory, 'aggregate');

      await expect(repository.countByRecordIds([])).resolves.toEqual({});
      expect(aggregateSpy).not.toHaveBeenCalled();

      aggregateSpy.mockRestore();
    });
  });
});