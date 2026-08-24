import { Router } from 'express';
import { RunController } from '../controllers/runController';
import { FileController } from '../controllers/fileController';
import { requireAuth } from '../middleware/auth';
import { uploadMiddleware } from '../middleware/upload';

const router = Router();

// Run management
router.post('/', requireAuth, RunController.createRun);
router.get('/', requireAuth, RunController.listRuns);
router.get('/:runId', requireAuth, RunController.getRun);
router.delete('/:runId', requireAuth, RunController.deleteRun);
router.put('/:runId/config', requireAuth, RunController.updateConfig);
router.post('/:runId/start', requireAuth, RunController.startPipeline);

// Progress SSE stream
router.get('/:runId/progress', RunController.streamProgress);

// Results & Outputs
router.get('/:runId/results', requireAuth, RunController.getResults);
router.get('/:runId/outputs', requireAuth, RunController.getOutputs);
router.get('/:runId/output/:fileName/preview', RunController.previewOutput);
router.get('/:runId/output/:fileName', RunController.downloadOutput);
router.get('/:runId/download-all', RunController.downloadAllZip);

// File management & auto-cleaning for specific run
router.post('/:runId/upload', requireAuth, uploadMiddleware.array('files'), FileController.uploadFiles);
router.get('/:runId/files/:fileId/preview', requireAuth, FileController.previewInputFile);
router.post('/:runId/auto-clean', requireAuth, FileController.autoCleanData);
router.delete('/:runId/files/:fileId', requireAuth, FileController.removeFile);
router.post('/:runId/mapping/auto', requireAuth, FileController.autoMapFields);
router.put('/:runId/mapping', requireAuth, FileController.updateFieldMappings);

export default router;
