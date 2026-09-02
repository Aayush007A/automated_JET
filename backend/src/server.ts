import express from 'express';
import cors from 'cors';
import { ENV } from './config/env';
import { LogService } from './services/logService';
import { errorHandler } from './middleware/errorHandler';
import authRoutes from './routes/authRoutes';
import runRoutes from './routes/runRoutes';
import logRoutes from './routes/logRoutes';
import aiRoutes from './routes/aiRoutes';

// Global uncaught handlers to guarantee high availability and prevent crashes
process.on('uncaughtException', (err) => {
  LogService.log('ERROR', 'SYSTEM_UNCAUGHT', `Uncaught Exception: ${err.message}\n${err.stack}`);
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  LogService.log('ERROR', 'SYSTEM_UNHANDLED_REJECTION', `Unhandled Rejection at: ${promise} reason: ${reason}`);
  console.error('Unhandled Rejection:', reason);
});

const app = express();

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// Request logger
app.use((req, res, next) => {
  if (!req.path.includes('/progress')) {
    LogService.log('DEBUG', 'HTTP', `${req.method} ${req.path}`);
  }
  next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'HEALTHY',
    service: 'JET Automation Platform API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    sparkMode: ENV.SPARK_MODE,
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/runs', runRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/ai', aiRoutes);

// Global Error Handler
app.use(errorHandler);

// Start server if run directly
if (process.env.NODE_ENV !== 'test') {
  const server = app.listen(ENV.PORT, () => {
    LogService.log('INFO', 'SERVER', `JET Automation Backend started on port ${ENV.PORT}`);
    LogService.log('INFO', 'SERVER', `Environment: ${ENV.NODE_ENV} | Spark Mode: ${ENV.SPARK_MODE}`);
    LogService.log('INFO', 'SERVER', `Workspace Root: ${ENV.WORKSPACE_ROOT}`);
  });

  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      LogService.log('ERROR', 'SERVER', `Port ${ENV.PORT} already in use. Please terminate the conflicting process.`);
    } else {
      LogService.log('ERROR', 'SERVER', `Server error: ${err.message}`);
    }
  });
}

export default app;
