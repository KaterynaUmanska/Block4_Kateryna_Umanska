import request from 'supertest';

import {
  afterAll,
  beforeEach,
  beforeAll,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';

import app from '../../app.js';
import ChangesHistory from '../../changesHistory/changesHistory.model.js';
import { ChangesHistoryField } from '../../changesHistory/ChangesHistoryField.js';
import {
  startMongoContainer,
  stopMongoContainer,
  clearDatabase,
} from '../mongo.setup.js';

describe('Changes History API integration tests', () => {
  const originalFetch = global.fetch;
  const mockFetch = jest.fn<typeof fetch>();

  beforeAll(async () => {
    await startMongoContainer();
  }, 60_000);

  beforeEach(async () => {
    await clearDatabase();

    mockFetch.mockReset();
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
    } as Response);

    global.fetch = mockFetch;
    process.env.RECORD_SERVICE_URL = 'http://record-service.test';
  });

  afterAll(async () => {
    global.fetch = originalFetch;

    delete process.env.RECORD_SERVICE_URL;

    await stopMongoContainer();
  }, 60_000);

  describe('POST /api/changes-history', () => {
    it('creates a history record and persists it in MongoDB', async () => {
      const response = await request(app)
        .post('/api/changes-history')
        .send({
          recordId: 101,
          fieldName: ChangesHistoryField.QUANTITY,
          oldValue: '5',
          newValue: '10',
        });

      expect(response.status).toBe(201);
      expect(response.body.id).toBeDefined();

      const saved = await ChangesHistory.findById(response.body.id).lean();

      expect(saved).not.toBeNull();
      expect(saved).toMatchObject({
        recordId: 101,
        fieldName: ChangesHistoryField.QUANTITY,
        oldValue: '5',
        newValue: '10',
      });
      expect(saved!.changedAt).toBeInstanceOf(Date);

      expect(fetch).toHaveBeenCalledWith(
        'http://record-service.test/api/purchases/101',
        {
          signal: expect.any(AbortSignal),
        },
      );
    });

    it('uses the supplied changedAt date', async () => {
      const changedAt = '2025-01-10T12:00:00.000Z';

      const response = await request(app)
        .post('/api/changes-history')
        .send({
          recordId: 101,
          fieldName: ChangesHistoryField.QUANTITY,
          oldValue: '5',
          newValue: '10',
          changedAt,
        });

      expect(response.status).toBe(201);

      const saved = await ChangesHistory.findById(response.body.id).lean();

      expect(saved!.changedAt.toISOString()).toBe(changedAt);
    });

    it('returns 400 when required fields are missing', async () => {
      const response = await request(app)
        .post('/api/changes-history')
        .send({
          recordId: 101,
          fieldName: ChangesHistoryField.QUANTITY,
        });

      expect(response.status).toBe(400);
      expect(response.body.errors).toBeDefined();

      expect(await ChangesHistory.countDocuments()).toBe(0);
    });

    it('returns 400 when recordId is not a positive integer', async () => {
      const response = await request(app)
        .post('/api/changes-history')
        .send({
          recordId: -1,
          fieldName: ChangesHistoryField.QUANTITY,
          oldValue: '5',
          newValue: '10',
        });

      expect(response.status).toBe(400);
      expect(await ChangesHistory.countDocuments()).toBe(0);
    });

    it('returns 400 when fieldName is invalid', async () => {
      const response = await request(app)
        .post('/api/changes-history')
        .send({
          recordId: 101,
          fieldName: 'unsupportedField',
          oldValue: '5',
          newValue: '10',
        });

      expect(response.status).toBe(400);
      expect(await ChangesHistory.countDocuments()).toBe(0);
    });

    it('returns 400 when changedAt is not a valid date', async () => {
      const response = await request(app)
        .post('/api/changes-history')
        .send({
          recordId: 101,
          fieldName: ChangesHistoryField.QUANTITY,
          oldValue: '5',
          newValue: '10',
          changedAt: 'not-a-date',
        });

      expect(response.status).toBe(400);
      expect(await ChangesHistory.countDocuments()).toBe(0);
    });

    it('returns 404 when the related PurchaseRecord does not exist', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
      } as Response);

      const response = await request(app)
        .post('/api/changes-history')
        .send({
          recordId: 999,
          fieldName: ChangesHistoryField.QUANTITY,
          oldValue: '5',
          newValue: '10',
        });

      expect(response.status).toBe(404);
      expect(await ChangesHistory.countDocuments()).toBe(0);
    });

    it('returns 500 when the related service is unavailable', async () => {
      mockFetch.mockRejectedValue(new Error('Connection refused'));

      const response = await request(app)
        .post('/api/changes-history')
        .send({
          recordId: 101,
          fieldName: ChangesHistoryField.QUANTITY,
          oldValue: '5',
          newValue: '10',
        });

      expect(response.status).toBe(500);
      expect(await ChangesHistory.countDocuments()).toBe(0);
    });

    it.each([
      {
        description: 'recordId is a string',
        overrides: { recordId: '101' },
      },
      {
        description: 'recordId is a fractional number',
        overrides: { recordId: 1.5 },
      },
      {
        description: 'oldValue is empty',
        overrides: { oldValue: '' },
      },
      {
        description: 'oldValue contains only whitespace',
        overrides: { oldValue: '   ' },
      },
      {
        description: 'newValue is empty',
        overrides: { newValue: '' },
      },
      {
        description: 'newValue contains only whitespace',
        overrides: { newValue: '   ' },
      },
      {
        description: 'oldValue is not a string',
        overrides: { oldValue: 123 },
      },
      {
        description: 'newValue is not a string',
        overrides: { newValue: 123 },
      },
    ])('returns 400 when $description', async ({ overrides }) => {
      const response = await request(app)
        .post('/api/changes-history')
        .send({
          recordId: 101,
          fieldName: ChangesHistoryField.QUANTITY,
          oldValue: '5',
          newValue: '10',
          ...overrides,
        });

      expect(response.status).toBe(400);
      expect(response.body.errors).toBeDefined();
      expect(await ChangesHistory.countDocuments()).toBe(0);
    });

    it('does not create a record when changedAt is an invalid date', async () => {
      const response = await request(app)
        .post('/api/changes-history')
        .send({
          recordId: 101,
          fieldName: ChangesHistoryField.QUANTITY,
          oldValue: '5',
          newValue: '10',
          changedAt: '2025-99-99',
        });

      expect(response.status).toBe(400);
      expect(await ChangesHistory.countDocuments()).toBe(0);
    });

    it('returns 400 when the request body is an array', async () => {
      const response = await request(app)
        .post('/api/changes-history')
        .send([
          {
            recordId: 417,
            fieldName: ChangesHistoryField.QUANTITY,
            oldValue: '5',
            newValue: '10',
          },
        ]);

      expect(response.status).toBe(400);
      expect(await ChangesHistory.countDocuments()).toBe(0);
    });
  });

  describe('GET /api/changes-history', () => {
    it('returns records belonging to the requested PurchaseRecord', async () => {
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
        {
          recordId: 202,
          fieldName: ChangesHistoryField.QUANTITY,
          oldValue: '4',
          newValue: '5',
          changedAt: new Date('2025-01-04T00:00:00.000Z'),
        },
      ]);

      const response = await request(app)
        .get('/api/changes-history')
        .query({ recordId: 101 });

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
      expect(
        response.body.every(
          (item: { recordId: number }) => item.recordId === 101,
        ),
      ).toBe(true);
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
        {
          recordId: 101,
          fieldName: ChangesHistoryField.QUANTITY,
          oldValue: '3',
          newValue: '4',
          changedAt: new Date('2025-01-02T00:00:00.000Z'),
        },
      ]);

      const response = await request(app)
        .get('/api/changes-history')
        .query({ recordId: 101 });

      expect(response.status).toBe(200);
      expect(
        response.body.map((item: { newValue: string }) => item.newValue),
      ).toEqual(['3', '4', '2']);
    });

    it('supports size and from pagination', async () => {
      await ChangesHistory.create(
        [1, 2, 3, 4, 5].map((number) => ({
          recordId: 101,
          fieldName: ChangesHistoryField.QUANTITY,
          oldValue: String(number),
          newValue: String(number + 1),
          changedAt: new Date(Date.UTC(2025, 0, number)),
        })),
      );

      const response = await request(app)
        .get('/api/changes-history')
        .query({ recordId: 101, size: 2, from: 1 });

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
      expect(
        response.body.map((item: { newValue: string }) => item.newValue),
      ).toEqual(['5', '4']);
    });

    it('returns an empty array when no records match', async () => {
      const response = await request(app)
        .get('/api/changes-history')
        .query({ recordId: 999 });

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    it('returns 400 when recordId is missing', async () => {
      const response = await request(app).get('/api/changes-history');

      expect(response.status).toBe(400);
    });

    it.each([
      { recordId: 'abc' },
      { recordId: '0' },
      { recordId: '101', size: '0' },
      { recordId: '101', size: '101' },
      { recordId: '101', from: '-1' },
      { recordId: '101', from: '1.5' },
    ])('returns 400 for invalid query parameters: %o', async (query) => {
      const response = await request(app)
        .get('/api/changes-history')
        .query(query);

      expect(response.status).toBe(400);
    });

    it.each([
      { recordId: '1.5' },
      { recordId: '101', size: 'abc' },
      { recordId: '101', from: 'abc' },
      { recordId: '101', size: '1.5' },
      { recordId: '101', from: '-10' },
    ])(
      'returns 400 for malformed numeric query parameters: %o',
      async (query) => {
        const response = await request(app)
          .get('/api/changes-history')
          .query(query);

        expect(response.status).toBe(400);
      },
    );

    it('uses the default size of 10 and default offset of 0', async () => {
      await ChangesHistory.create(
        Array.from({ length: 12 }, (_, index) => ({
          recordId: 101,
          fieldName: ChangesHistoryField.QUANTITY,
          oldValue: String(index),
          newValue: String(index + 1),
          changedAt: new Date(Date.UTC(2025, 0, index + 1)),
        })),
      );

      const response = await request(app)
        .get('/api/changes-history')
        .query({ recordId: 101 });

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(10);
      expect(response.body[0].newValue).toBe('12');
      expect(response.body[9].newValue).toBe('3');
    });

    it('returns only the public DTO fields without MongoDB internals', async () => {
      await ChangesHistory.create({
        recordId: 101,
        fieldName: ChangesHistoryField.QUANTITY,
        oldValue: '5',
        newValue: '10',
        changedAt: new Date('2025-01-10T12:00:00.000Z'),
      });

      const response = await request(app)
        .get('/api/changes-history')
        .query({ recordId: 101 });

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);

      expect(response.body[0]).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          recordId: 101,
          fieldName: ChangesHistoryField.QUANTITY,
          oldValue: '5',
          newValue: '10',
          changedAt: expect.any(String),
        }),
      );

      expect(response.body[0]).not.toHaveProperty('_id');
      expect(response.body[0]).not.toHaveProperty('__v');
    });

    it('accepts the maximum allowed page size of 100', async () => {
      const response = await request(app)
        .get('/api/changes-history')
        .query({ recordId: 101, size: 100, from: 0 });

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });
  });

  describe('POST /api/changes-history/_counts', () => {
    it('returns counts for every requested ID, including zero counts', async () => {
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
          recordId: 414,
          fieldName: ChangesHistoryField.MATERIAL,
          oldValue: 'Steel',
          newValue: 'Copper',
        },
      ]);

      const response = await request(app)
        .post('/api/changes-history/_counts')
        .send({ recordIds: [101, 414, 999] });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        '101': 2,
        '414': 1,
        '999': 0,
      });
    });

    it('returns an empty object for an empty ID array', async () => {
      const response = await request(app)
        .post('/api/changes-history/_counts')
        .send({ recordIds: [] });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({});
    });

    it('returns 400 when recordIds is missing', async () => {
      const response = await request(app)
        .post('/api/changes-history/_counts')
        .send({});

      expect(response.status).toBe(400);
    });

    it.each([
      { recordIds: '101' },
      { recordIds: [0] },
      { recordIds: [-1] },
      { recordIds: [1.5] },
      { recordIds: ['invalid'] },
      { recordIds: [null] },
    ])('returns 400 for invalid recordIds: %o', async (body) => {
      const response = await request(app)
        .post('/api/changes-history/_counts')
        .send(body);

      expect(response.status).toBe(400);
    });

    it('counts records using the database aggregation pipeline', async () => {
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
      ]);

      const aggregateSpy = jest.spyOn(ChangesHistory, 'aggregate');

      const response = await request(app)
        .post('/api/changes-history/_counts')
        .send({ recordIds: [101, 202] });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        '101': 2,
        '202': 0,
      });
      expect(aggregateSpy).toHaveBeenCalledTimes(1);
      expect(aggregateSpy).toHaveBeenCalledWith([
        {
          $match: {
            recordId: { $in: [101, 202] },
          },
        },
        {
          $group: {
            _id: '$recordId',
            count: { $sum: 1 },
          },
        },
      ]);

      aggregateSpy.mockRestore();
    });

    it.each([
      { recordIds: null },
      { recordIds: {} },
      { recordIds: [1, '2'] },
      { recordIds: [Number.MAX_SAFE_INTEGER + 1] },
    ])('returns 400 for invalid recordIds payload: %o', async (body) => {
      const response = await request(app)
        .post('/api/changes-history/_counts')
        .send(body);

      expect(response.status).toBe(400);
    });

    it('returns one count per unique ID when the request contains duplicates', async () => {
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
      ]);

      const response = await request(app)
        .post('/api/changes-history/_counts')
        .send({ recordIds: [101, 101, 202] });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        '101': 2,
        '202': 0,
      });
      expect(Object.keys(response.body)).toHaveLength(2);
    });

    it('returns zero for all requested IDs when the collection is empty', async () => {
      const response = await request(app)
        .post('/api/changes-history/_counts')
        .send({ recordIds: [101, 202, 303] });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        '101': 0,
        '202': 0,
        '303': 0,
      });
    });
  });
});