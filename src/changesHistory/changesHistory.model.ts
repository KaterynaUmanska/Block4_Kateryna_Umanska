
import mongoose, { Document, Schema } from 'mongoose';
import { ChangesHistoryField } from './ChangesHistoryField.js';

export interface ChangesHistoryData {
  _id: mongoose.Types.ObjectId;
  recordId: number;
  changedAt: Date;
  fieldName: string;
  oldValue: string;
  newValue: string;
}

const changesHistorySchema = new Schema<ChangesHistoryDocument>({
  recordId: {
    type: Number,
    required: true,
    index: true,
  },
  changedAt: {
    type: Date,
    required: true,
    default: Date.now,
    index: true,
  },
  fieldName: {
    type: String,
    enum: Object.values(ChangesHistoryField),
    required: true,
  },
  oldValue: {
    type: String,
    required: true,
  },
  newValue: {
    type: String,
    required: true,
  },
});

changesHistorySchema.index({ recordId: 1, changedAt: -1 });

type ChangesHistoryDocument = ChangesHistoryData & Document;

const ChangesHistory = mongoose.model<ChangesHistoryDocument>('ChangesHistory', changesHistorySchema,'changes_history');

export default ChangesHistory;
