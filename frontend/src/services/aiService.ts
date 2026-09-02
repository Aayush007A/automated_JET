import { fetchApi } from './api';

export interface AiChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  guardrailTriggered?: boolean;
  guardrailReason?: string;
  modelUsed?: string;
  source?: 'local-llm' | 'built-in-engine';
}

export interface AiStatus {
  connected: boolean;
  model: string;
  endpoint: string;
  details?: string;
}

export interface AiConfig {
  localEndpoint: string;
  model: string;
  temperature?: number;
  timeoutMs?: number;
}

const STORAGE_KEY = 'jet_ai_chat_history_v1';

export const AiService = {
  async sendMessage(messages: { role: string; content: string }[]): Promise<{
    message: string;
    guardrailTriggered: boolean;
    guardrailReason?: string;
    modelUsed: string;
    source: 'local-llm' | 'built-in-engine';
  }> {
    return fetchApi('/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ messages }),
    });
  },

  async getStatus(): Promise<AiStatus> {
    try {
      return await fetchApi('/ai/status', { method: 'GET' });
    } catch {
      return {
        connected: false,
        model: 'llama3.2:1b',
        endpoint: 'http://localhost:11434',
        details: 'Local daemon unreachable (using Built-in JET Expert Engine)',
      };
    }
  },

  async getConfig(): Promise<AiConfig> {
    return fetchApi('/ai/config', { method: 'GET' });
  },

  async updateConfig(config: Partial<AiConfig>): Promise<AiConfig> {
    return fetchApi('/ai/config', {
      method: 'POST',
      body: JSON.stringify(config),
    });
  },

  getStoredMessages(): AiChatMessage[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (e) {
      console.error('Failed to load chat history:', e);
    }
    return [];
  },

  saveStoredMessages(messages: AiChatMessage[]): void {
    try {
      // Keep up to last 40 messages to avoid localStorage quota issues
      const trimmed = messages.slice(-40);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    } catch (e) {
      console.error('Failed to save chat history:', e);
    }
  },

  clearStoredMessages(): void {
    localStorage.removeItem(STORAGE_KEY);
  },
};
