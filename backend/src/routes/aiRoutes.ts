// import { Router, Request, Response } from 'express';
// import { aiAssistantService, AiMessage, ActivePageContext } from '../services/aiAssistantService';

// const router = Router();

// // POST /api/ai/chat - Process user query with active page & step context
// router.post('/chat', async (req: Request, res: Response) => {
//   try {
//     const { messages, context } = req.body;

//     if (!Array.isArray(messages) || messages.length === 0) {
//       return res.status(400).json({
//         error: 'INVALID_MESSAGES',
//         message: 'Request body must contain an array of messages with role and content.',
//       });
//     }

//     const response = await aiAssistantService.processQuery(
//       messages as AiMessage[],
//       context as ActivePageContext | undefined
//     );
//     return res.json(response);
//   } catch (error: any) {
//     console.error('AI Chat Error:', error);
//     return res.status(500).json({
//       error: 'AI_PROCESSING_ERROR',
//       message: error.message || 'An unexpected error occurred while processing the query.',
//     });
//   }
// });

// // GET /api/ai/status - Simple ping for health check
// router.get('/status', async (_req: Request, res: Response) => {
//   return res.json({ status: 'operational', active: true });
// });

// export default router;

import {
  Router,
  Request,
  Response,
} from 'express';

import {
  aiAssistantService,
  AiMessage,
  ActivePageContext,
} from '../services/aiAssistantService';

const router =
  Router();

/**
 * POST /api/ai/chat
 */
router.post(
  '/chat',
  async (
    req: Request,
    res: Response
  ) => {
    try {
      const {
        messages,
        context,
      } = req.body;

      if (
        !Array.isArray(messages) ||
        messages.length === 0
      ) {
        return res.status(400).json({
          error:
            'INVALID_MESSAGES',
          message:
            'Request body must contain an array of messages.',
        });
      }

      const response =
        await aiAssistantService.processQuery(
          messages as AiMessage[],
          context as
            | ActivePageContext
            | undefined
        );

      return res.json(
        response
      );
    } catch (error: any) {
      console.error(
        'AI Chat Error:',
        error
      );

      return res.status(500).json({
        error:
          'AI_PROCESSING_ERROR',
        message:
          error?.message ||
          'Unable to process AI request.',
      });
    }
  }
);

/**
 * GET /api/ai/status
 */
router.get(
  '/status',
  async (
    _req: Request,
    res: Response
  ) => {
    return res.json({
      status:
        'operational',
      model:
        process.env.LOCAL_AI_MODEL ||
        'Qwen',
      localAiUrl:
        process.env.LOCAL_AI_URL ||
        'http://127.0.0.1:5005/chat',
    });
  }
);

export default router;