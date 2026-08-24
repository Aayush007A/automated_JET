import { Request, Response } from 'express';
import { LogService, LogLevel } from '../services/logService';
import { AuthenticatedRequest } from '../middleware/auth';

export class LogController {
  public static async getLogs(req: AuthenticatedRequest, res: Response): Promise<void> {
    const runId = req.query.runId as string | undefined;
    const level = req.query.level as LogLevel | undefined;
    const search = req.query.search as string | undefined;
    const limit = parseInt(req.query.limit as string || '500', 10);

    const logs = LogService.getLogs(runId, level, search, limit);
    res.json({
      success: true,
      count: logs.length,
      logs,
    });
  }

  public static async downloadLogFile(req: Request, res: Response): Promise<void> {
    const { runId } = req.params;
    const logType = (req.query.type as any) || 'execution';
    const content = LogService.getRawLogFile(runId, logType);

    if (!content) {
      res.status(404).send('Log file not found.');
      return;
    }

    const fileName = `${runId}_${logType}_log.txt`;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(content);
  }
}
