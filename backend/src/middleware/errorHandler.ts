import { Request, Response, NextFunction } from 'express';
import { LogService } from '../services/logService';

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';
  const code = err.code || 'SERVER_ERROR';

  LogService.log('ERROR', 'SERVER', `${req.method} ${req.originalUrl} - [${code}] ${message}: ${err.stack || ''}`);

  res.status(status).json({
    success: false,
    code,
    message,
    details: err.details || null,
  });
};
