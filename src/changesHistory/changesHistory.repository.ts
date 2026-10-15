
import ChangesHistory, {
  ChangesHistoryData,
} from './changesHistory.model.js';
import { ChangesHistoryCreateDto } from './dto/ChangesHistoryCreateDto.js';

export const create = async (
  dto: ChangesHistoryCreateDto,
): Promise<string> => {
  const record = await ChangesHistory.create({
    recordId: dto.recordId,
    fieldName: dto.fieldName,
    oldValue: dto.oldValue,
    newValue: dto.newValue,
    changedAt: dto.changedAt
      ? new Date(dto.changedAt)
      : new Date(),
  });

  return record._id.toString();
};

export const list = async (
  recordId: number,
  size: number,
  from: number,
): Promise<ChangesHistoryData[]> => {
  return ChangesHistory.find({ recordId })
    .sort({ changedAt: -1, _id: -1 })
    .skip(from)
    .limit(size)
    .lean<ChangesHistoryData[]>();
};

export const countByRecordIds = async (
  recordIds: number[],
): Promise<Record<string, number>> => {
  const result: Record<string, number> = {};

  for (const id of recordIds) {
    result[String(id)] = 0;
  }

  if (recordIds.length === 0) {
    return result;
  }

  const counts = await ChangesHistory.aggregate<{
    _id: number;
    count: number;
  }>([
    {
      $match: {
        recordId: { $in: recordIds },
      },
    },
    {
      $group: {
        _id: '$recordId',
        count: { $sum: 1 },
      },
    },
  ]);

  for (const item of counts) {
    result[String(item._id)] = item.count;
  }

  return result;
};
