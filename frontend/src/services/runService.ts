import { fetchApi, getToken } from './api';
import { RunConfig, RunSummary, WorkflowType, PipelineEngine, FieldMappingItem, LogEntry } from '../types';

export class RunService {
  public static async createRun(workflow: WorkflowType = 'JET', engine: PipelineEngine = 'PYTHON'): Promise<{ runId: string; config: RunConfig }> {
    return fetchApi('/runs', {
      method: 'POST',
      body: JSON.stringify({ workflow, engine }),
    });
  }

  public static async listRuns(): Promise<RunSummary[]> {
    const data = await fetchApi('/runs');
    return data.runs || [];
  }

  public static async getRun(runId: string): Promise<{ runId: string; config: RunConfig; status: RunSummary }> {
    return fetchApi(`/runs/${runId}`);
  }

  public static async deleteRun(runId: string): Promise<any> {
    return fetchApi(`/runs/${runId}`, {
      method: 'DELETE',
    });
  }

  public static async uploadFiles(runId: string, files: File[]): Promise<any> {
    const formData = new FormData();
    for (const file of files) {
      formData.append('files', file);
    }
    return fetchApi(`/runs/${runId}/upload`, {
      method: 'POST',
      body: formData,
    });
  }

  public static async previewInputFile(runId: string, fileId: string, sheetName?: string, maxRows: number = 50): Promise<{
    fileName: string;
    sheetName?: string;
    headers: string[];
    rows: Record<string, any>[];
    totalRows: number;
  }> {
    const params = new URLSearchParams();
    if (sheetName) params.append('sheetName', sheetName);
    params.append('maxRows', String(maxRows));
    return fetchApi(`/runs/${runId}/files/${encodeURIComponent(fileId)}/preview?${params.toString()}`);
  }

  public static async autoCleanData(runId: string): Promise<{
    success: boolean;
    message: string;
    report: {
      tbRowsCleaned: number;
      glRowsCleaned: number;
      datesStandardized: number;
      numbersConverted: number;
      constraintsPassed: boolean;
      warnings: string[];
      status: string;
    };
  }> {
    return fetchApi(`/runs/${runId}/auto-clean`, {
      method: 'POST',
    });
  }

  public static async removeFile(runId: string, fileId: string): Promise<any> {
    return fetchApi(`/runs/${runId}/files/${fileId}`, {
      method: 'DELETE',
    });
  }

  public static async updateFieldMappings(runId: string, datasetType: string, mappings: FieldMappingItem[]): Promise<any> {
    return fetchApi(`/runs/${runId}/mapping`, {
      method: 'PUT',
      body: JSON.stringify({ datasetType, mappings }),
    });
  }

  public static async updateConfig(runId: string, updates: Partial<RunConfig>): Promise<any> {
    return fetchApi(`/runs/${runId}/config`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  public static async startPipeline(runId: string): Promise<any> {
    return fetchApi(`/runs/${runId}/start`, {
      method: 'POST',
    });
  }

  public static async getResults(runId: string): Promise<{ summary: RunSummary; config: RunConfig; outputs: any[] }> {
    return fetchApi(`/runs/${runId}/results`);
  }

  public static async previewOutput(runId: string, fileName: string, maxRows: number = 50): Promise<{ headers: string[]; rows: Record<string, any>[]; totalRows: number }> {
    return fetchApi(`/runs/${runId}/output/${encodeURIComponent(fileName)}/preview?maxRows=${maxRows}`);
  }

  public static getDownloadOutputUrl(runId: string, fileName: string): string {
    return `/api/runs/${runId}/output/${encodeURIComponent(fileName)}`;
  }

  public static getDownloadAllZipUrl(runId: string): string {
    return `/api/runs/${runId}/download-all`;
  }

  public static async getLogs(runId?: string, level?: string, search?: string): Promise<LogEntry[]> {
    const params = new URLSearchParams();
    if (runId) params.append('runId', runId);
    if (level) params.append('level', level);
    if (search) params.append('search', search);

    const data = await fetchApi(`/logs?${params.toString()}`);
    return data.logs || [];
  }

  public static getDownloadLogUrl(runId: string, type: string = 'execution'): string {
    return `/api/logs/${runId}/download?type=${type}`;
  }

  public static subscribeProgress(runId: string, onMessage: (event: any) => void): () => void {
    const sse = new EventSource(`/api/runs/${runId}/progress`);
    sse.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        onMessage(data);
      } catch (err) {
        // ignore
      }
    };
    return () => {
      sse.close();
    };
  }
}
