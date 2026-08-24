import { RunConfig, RunSummary } from '../types';
import { PythonPipelineExecutor } from './pythonPipelineExecutor';
import { ScalaPipelineExecutor } from './scalaPipelineExecutor';
import { LogService } from '../services/logService';

export class PipelineExecutor {
  public static async execute(config: RunConfig): Promise<RunSummary> {
    LogService.log('INFO', 'PIPELINE_DISPATCHER', `Selecting pipeline runner for engine: ${config.engine}`, config.runId);

    switch (config.engine) {
      case 'SCALA_SPARK':
        return ScalaPipelineExecutor.execute(config);
      case 'PYSPARK':
      case 'PYTHON':
      default:
        return PythonPipelineExecutor.execute(config);
    }
  }
}
