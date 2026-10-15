
import express from 'express';
import changesHistory from '../changesHistory/changesHistory.router.js';

const router = express.Router();

router.use('/api/changes-history', changesHistory);

export default router;
