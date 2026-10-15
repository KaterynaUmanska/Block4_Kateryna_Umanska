
import express from 'express';
import { create, list, counts } from './changesHistory.controller.js';
import validateDto from '../middleware/validateDto.js';
import { ChangesHistoryCreateDto } from './dto/ChangesHistoryCreateDto.js';

const router = express.Router();

router.post('/_counts', counts);
router.post('', validateDto(ChangesHistoryCreateDto), create);
router.get('', list);

export default router;
