import { Response } from 'express';
import { RunProgressEvent } from '../types';
import { LogService } from '../services/logService';

export class SSEManager {
  private static clients: Map<string, Set<Response>> = new Map();
  private static pingInterval: NodeJS.Timeout | null = null;

  private static ensureHeartbeat(): void {
    if (!this.pingInterval) {
      this.pingInterval = setInterval(() => {
        for (const [runId, set] of this.clients.entries()) {
          for (const res of Array.from(set)) {
            try {
              res.write(': keepalive\n\n');
            } catch (err) {
              set.delete(res);
            }
          }
          if (set.size === 0) {
            this.clients.delete(runId);
          }
        }
        if (this.clients.size === 0 && this.pingInterval) {
          clearInterval(this.pingInterval);
          this.pingInterval = null;
        }
      }, 15000);

      // Unref so it doesn't prevent Node process from exiting
      if (this.pingInterval && typeof this.pingInterval.unref === 'function') {
        this.pingInterval.unref();
      }
    }
  }

  public static addClient(runId: string, res: Response): void {
    if (!this.clients.has(runId)) {
      this.clients.set(runId, new Set());
    }
    this.clients.get(runId)!.add(res);
    this.ensureHeartbeat();

    // Remove client on connection close
    res.on('close', () => {
      const set = this.clients.get(runId);
      if (set) {
        set.delete(res);
        if (set.size === 0) {
          this.clients.delete(runId);
        }
      }
      if (this.clients.size === 0 && this.pingInterval) {
        clearInterval(this.pingInterval);
        this.pingInterval = null;
      }
    });
  }

  public static emitProgress(event: RunProgressEvent): void {
    const clients = this.clients.get(event.runId);
    const data = `data: ${JSON.stringify(event)}\n\n`;

    LogService.log('INFO', 'PIPELINE_SSE', `[${event.stage}] ${event.progress}% - ${event.message}`, event.runId);

    if (clients && clients.size > 0) {
      for (const client of Array.from(clients)) {
        try {
          client.write(data);
        } catch (err) {
          clients.delete(client);
        }
      }
    }
  }

  public static getClientCount(runId?: string): number {
    if (runId) {
      return this.clients.get(runId)?.size || 0;
    }
    let total = 0;
    for (const set of this.clients.values()) {
      total += set.size;
    }
    return total;
  }

  public static reset(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    this.clients.clear();
  }
}
