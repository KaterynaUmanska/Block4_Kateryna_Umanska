
import { Expose, Transform } from 'class-transformer';

export class ChangesHistoryDto {
  @Expose()
  @Transform(({ obj }) => obj._id.toString())
  id!: string;

  @Expose()
  recordId!: number;

  @Expose()
  changedAt!: Date;

  @Expose()
  fieldName!: string;

  @Expose()
  oldValue!: string;

  @Expose()
  newValue!: string;
}
