import { Router } from 'express';
import { LogController } from '../controllers/logController';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.get('/', requireAuth, LogController.getLogs);
router.get('/:runId/download', LogController.downloadLogFile);

export default router;
