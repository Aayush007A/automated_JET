import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { RunManager } from '../services/runManager';
import { PipelineExecutor } from '../executors/pipelineExecutor';
import { OutputService } from '../services/outputService';
import { SSEManager } from '../utils/sseHelper';
import { LogService } from '../services/logService';
import { WorkflowType, PipelineEngine } from '../types';

export class RunController {
  public static async createRun(req: AuthenticatedRequest, res: Response): Promise<void> {
    let { workflow, engine } = req.body;
    if (!workflow) {
      workflow = 'JET';
    }
    if (!['JET', 'SPARK_JET', 'OMNIA_JET'].includes(workflow)) {
      res.status(400).json({ success: false, message: 'Invalid workflow type (JET, SPARK_JET, or OMNIA_JET required)' });
      return;
    }

    const selectedEngine: PipelineEngine = engine || 'PYTHON';
    const userId = req.user?.id || 'usr_unknown';
    const userName = req.user?.fullName || req.user?.username || 'Audit Practitioner';

    const { runId, config } = RunManager.initializeRun(workflow as WorkflowType, userId, userName, selectedEngine);

    res.json({
      success: true,
      message: `Run ${runId} created successfully for ${workflow}`,
      runId,
      config,
    });
  }

  public static async listRuns(req: AuthenticatedRequest, res: Response): Promise<void> {
    const runs = RunManager.listAllRuns();
    res.json({ success: true, runs });
  }

  public static async getRun(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { runId } = req.params;
    const config = RunManager.getRunConfig(runId);
    const status = RunManager.getRunStatus(runId);

    if (!config || !status) {
      res.status(404).json({ success: false, message: `Run ${runId} not found` });
      return;
    }

    res.json({
      success: true,
      runId,
      config,
      status,
    });
  }

  public static async deleteRun(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { runId } = req.params;
    const deleted = RunManager.deleteRun(runId);

    if (!deleted) {
      res.status(404).json({ success: false, message: `Run ${runId} not found or could not be deleted` });
      return;
    }

    res.json({
      success: true,
      message: `Run ${runId} deleted successfully`,
    });
  }

  public static async updateConfig(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { runId } = req.params;
    const { sparkParameters, omniaParameters, datasetMap, engine } = req.body;

    const config = RunManager.getRunConfig(runId);
    if (!config) {
      res.status(404).json({ success: false, message: `Run ${runId} not found` });
      return;
    }

    if (sparkParameters) config.sparkParameters = { ...config.sparkParameters, ...sparkParameters };
    if (omniaParameters) config.omniaParameters = { ...config.omniaParameters, ...omniaParameters };
    if (datasetMap) config.datasetMap = { ...config.datasetMap, ...datasetMap };
    if (engine) config.engine = engine;

    RunManager.saveRunConfig(runId, config);
    LogService.log('INFO', 'RUN_CONFIG', `Updated configuration for run ${runId}`, runId);

    res.json({
      success: true,
      message: 'Run configuration updated successfully',
      config,
    });
  }

  public static async startPipeline(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { runId } = req.params;
    const config = RunManager.getRunConfig(runId);

    if (!config) {
      res.status(404).json({ success: false, message: `Run ${runId} not found` });
      return;
    }

    // Check if TB and GL files are mapped
    if (!config.datasetMap.tbFileId && !config.files.some((f) => f.detectedDataset === 'TRIAL_BALANCE' || f.sheets?.some(s => s.detectedDataset === 'TRIAL_BALANCE'))) {
      res.status(400).json({ success: false, message: 'Trial Balance dataset must be mapped before running pipeline.' });
      return;
    }
    if (!config.datasetMap.glFileId && !config.files.some((f) => f.detectedDataset === 'GENERAL_LEDGER' || f.detectedDataset === 'POPULATION' || f.sheets?.some(s => s.detectedDataset === 'GENERAL_LEDGER' || s.detectedDataset === 'POPULATION'))) {
      res.status(400).json({ success: false, message: 'General Ledger / Population dataset must be mapped before running pipeline.' });
      return;
    }

    // Launch pipeline execution asynchronously
    LogService.log('INFO', 'RUN_CONTROLLER', `Initiating asynchronous pipeline execution for run ${runId}`, runId);

    res.json({
      success: true,
      message: `Pipeline execution started for run ${runId}`,
      runId,
      status: 'RUNNING',
    });

    // Execute in background
    PipelineExecutor.execute(config).catch((err) => {
      LogService.log('ERROR', 'PIPELINE_ERROR', `Pipeline error: ${err.message}`, runId);
    });
  }

  public static async streamProgress(req: Request, res: Response): Promise<void> {
    const { runId } = req.params;

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
      'Access-Control-Allow-Origin': '*',
    });

    // Send initial status
    const status = RunManager.getRunStatus(runId);
    if (status) {
      res.write(`data: ${JSON.stringify({
        runId,
        workflow: status.workflow,
        stage: status.currentStage || status.status,
        progress: status.progress || 0,
        message: `Current status: ${status.status}`,
        timestamp: new Date().toISOString(),
      })}\n\n`);
    }

    SSEManager.addClient(runId, res);
  }

  public static async getResults(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { runId } = req.params;
    const status = RunManager.getRunStatus(runId);
    const config = RunManager.getRunConfig(runId);

    if (!status) {
      res.status(404).json({ success: false, message: `Results for run ${runId} not found` });
      return;
    }

    const outputs = OutputService.getOutputsForRun(runId);
    res.json({
      success: true,
      summary: status,
      config,
      outputs,
    });
  }

  public static async getOutputs(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { runId } = req.params;
    const outputs = OutputService.getOutputsForRun(runId);
    res.json({ success: true, outputs });
  }

  public static async previewOutput(req: Request, res: Response): Promise<void> {
    const { runId, fileName } = req.params;
    const maxRows = parseInt(req.query.maxRows as string, 10) || 50;
    const preview = await OutputService.previewOutputFile(runId, fileName, maxRows);

    if (!preview) {
      res.status(404).json({ success: false, message: `Output file "${fileName}" could not be previewed.` });
      return;
    }

    res.json({
      success: true,
      runId,
      fileName,
      ...preview,
    });
  }

  public static async downloadOutput(req: Request, res: Response): Promise<void> {
    const { runId, fileName } = req.params;
    OutputService.downloadOutputFile(runId, fileName, res);
  }

  public static async downloadAllZip(req: Request, res: Response): Promise<void> {
    const { runId } = req.params;
    OutputService.downloadAllOutputsZip(runId, res);
  }
}
