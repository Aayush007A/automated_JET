// import { fetchApi } from './api';
// import { ActivePageContext } from './pageContextService';

// export interface AiChatMessage {
//   id: string;
//   role: 'user' | 'assistant' | 'system';
//   content: string;
//   timestamp: string;
//   guardrailTriggered?: boolean;
//   guardrailReason?: string;
// }

// const STORAGE_KEY = 'deloitte_jet_ai_chat_history_v2';

// export const AiService = {
//   async sendMessage(
//     messages: { role: string; content: string }[],
//     context?: ActivePageContext
//   ): Promise<{
//     message: string;
//     guardrailTriggered: boolean;
//     guardrailReason?: string;
//   }> {
//     return fetchApi('/ai/chat', {
//       method: 'POST',
//       body: JSON.stringify({ messages, context }),
//     });
//   },

//   getStoredMessages(): AiChatMessage[] {
//     try {
//       const raw = localStorage.getItem(STORAGE_KEY);
//       if (raw) {
//         return JSON.parse(raw);
//       }
//     } catch (e) {
//       console.error('Failed to load chat history:', e);
//     }
//     return [];
//   },

//   saveStoredMessages(messages: AiChatMessage[]): void {
//     try {
//       const trimmed = messages.slice(-40);
//       localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
//     } catch (e) {
//       console.error('Failed to save chat history:', e);
//     }
//   },

//   clearStoredMessages(): void {
//     localStorage.removeItem(STORAGE_KEY);
//   },
// };


import { fetchApi } from './api';
import { ActivePageContext } from './pageContextService';

export interface AiChatMessage {
  id: string;

  role:
    | 'user'
    | 'assistant'
    | 'system';

  content: string;

  timestamp: string;

  guardrailTriggered?: boolean;

  guardrailReason?: string;

  agent?: {
    contextUsed?: boolean;
    degraded?: boolean;
    model?: string;
    contextSignals?: string[];
  };
}

export interface AiAgentResponse {
  message: string;

  guardrailTriggered: boolean;

  guardrailReason?: string;

  agent?: {
    contextUsed: boolean;
    degraded: boolean;
    model: string;
    contextSignals: string[];
  };
}

const STORAGE_KEY =
  'deloitte_jet_ai_chat_history_v3';

export const AiService = {
  async sendMessage(
    messages: {
      role: string;
      content: string;
    }[],
    context?: ActivePageContext
  ): Promise<AiAgentResponse> {
    return fetchApi('/ai/chat', {
      method: 'POST',
      body: JSON.stringify({
        messages,
        context,
      }),
    });
  },

  getStoredMessages(): AiChatMessage[] {
    try {
      const raw =
        localStorage.getItem(
          STORAGE_KEY
        );

      if (!raw) {
        return [];
      }

      return JSON.parse(raw);
    } catch (error) {
      console.error(
        'Failed to load AI history:',
        error
      );

      return [];
    }
  },

  saveStoredMessages(
    messages: AiChatMessage[]
  ): void {
    try {
      const trimmed =
        messages.slice(-50);

      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(trimmed)
      );
    } catch (error) {
      console.error(
        'Failed to save AI history:',
        error
      );
    }
  },

  clearStoredMessages(): void {
    localStorage.removeItem(
      STORAGE_KEY
    );
  },
};