import 'reflect-metadata';
import {
  IsInt,
  Min,
  IsString,
  IsOptional,
  IsDateString,
  IsNotEmpty,
  Matches,
} from 'class-validator';
import { IsEnum } from 'class-validator';
import { ChangesHistoryField } from '../ChangesHistoryField.js';

export class ChangesHistoryCreateDto {
  @IsInt()
  @Min(1)
  recordId!: number;

  @IsEnum(ChangesHistoryField)
  fieldName!: ChangesHistoryField;

  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  oldValue!: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  newValue!: string;

  @IsOptional()
  @IsDateString()
  changedAt?: string;
}
