import { Router, Request, Response } from 'express';
import { aiAssistantService, AiMessage } from '../services/aiAssistantService';

const router = Router();

// POST /api/ai/chat - Process user query through guardrail and local LLM
router.post('/chat', async (req: Request, res: Response) => {
  try {
    const { messages } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        error: 'INVALID_MESSAGES',
        message: 'Request body must contain an array of messages with role and content.',
      });
    }

    const response = await aiAssistantService.processQuery(messages as AiMessage[]);
    return res.json(response);
  } catch (error: any) {
    console.error('AI Chat Error:', error);
    return res.status(500).json({
      error: 'AI_PROCESSING_ERROR',
      message: error.message || 'An unexpected error occurred while processing the query.',
    });
  }
});

// GET /api/ai/status - Test connection to local LLM daemon
router.get('/status', async (_req: Request, res: Response) => {
  try {
    const status = await aiAssistantService.checkStatus();
    return res.json(status);
  } catch (error: any) {
    return res.status(500).json({
      connected: false,
      error: error.message,
    });
  }
});

// GET /api/ai/config - Get current local LLM configuration
router.get('/config', (_req: Request, res: Response) => {
  return res.json(aiAssistantService.getConfig());
});

// POST /api/ai/config - Update local LLM configuration (endpoint, model)
router.post('/config', (req: Request, res: Response) => {
  try {
    const { localEndpoint, model, temperature } = req.body;
    const updated = aiAssistantService.setConfig({
      ...(localEndpoint && { localEndpoint }),
      ...(model && { model }),
      ...(typeof temperature === 'number' && { temperature }),
    });
    return res.json(updated);
  } catch (error: any) {
    return res.status(400).json({
      error: 'CONFIG_UPDATE_ERROR',
      message: error.message,
    });
  }
});

export default router;
