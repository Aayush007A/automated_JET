import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  AnimatePresence,
  motion,
} from 'motion/react';

import {
  X,
  Send,
  Copy,
  Check,
  Sparkles,
  ShieldCheck,
  ChevronRight,
  Trash2,
} from 'lucide-react';

import {
  AiService,
  AiChatMessage,
} from '../../services/aiService';

import {
  PageContextService,
  ActivePageContext,
} from '../../services/pageContextService';

import {
  collectVisiblePageContext,
  buildContextSummary,
} from '../../services/pageContextCollector';

import {
  AgentBootSequence,
} from './AgentBootSequence';

import {
  AgentScanState,
  AgentProcessingStage,
} from './AgentScanState';

import {
  ChatMarkdown,
} from './ChatMarkdown';

import './ai-agent.css';

interface AiAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DEFAULT_WELCOME = `
## JET Copilot

I'm connected to the workspace you're currently reviewing.

I can explain the information on this screen, help you understand the active workflow, interpret validation results, and guide you through the JET process.

**Ask me anything about what you're looking at.**
`;

function nowLabel(): string {
  return new Date().toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function createWelcomeMessage(): AiChatMessage {
  return {
    id: `welcome-${Date.now()}`,
    role: 'assistant',
    content: DEFAULT_WELCOME,
    timestamp: nowLabel(),
    agent: {
      contextUsed: true,
      degraded: false,
      model: 'JET Copilot',
    },
  };
}

const BOOT_SEQUENCE_STORAGE_KEY = 'deloitte_jet_ai_last_boot_date';

function shouldShowDailyBootSequence(): boolean {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const lastBoot = localStorage.getItem(BOOT_SEQUENCE_STORAGE_KEY);
    return lastBoot !== today;
  } catch {
    return false;
  }
}

function markBootSequenceShownToday(): void {
  try {
    const today = new Date().toISOString().slice(0, 10);
    localStorage.setItem(BOOT_SEQUENCE_STORAGE_KEY, today);
  } catch {
    // Ignore storage errors
  }
}

export const AiAssistantModal: React.FC<
  AiAssistantModalProps
> = ({
  isOpen,
  onClose,
}) => {
  const [
    messages,
    setMessages,
  ] = useState<AiChatMessage[]>([]);

  const [
    inputValue,
    setInputValue,
  ] = useState('');

  const [
    isLoading,
    setIsLoading,
  ] = useState(false);

  const [
    booting,
    setBooting,
  ] = useState(false);

  const [
    processingStage,
    setProcessingStage,
  ] =
    useState<AgentProcessingStage>(
      'context'
    );

  const [
    pageContext,
    setPageContext,
  ] =
    useState<ActivePageContext>(
      PageContextService.getContext()
    );

  const [
    copiedId,
    setCopiedId,
  ] =
    useState<string | null>(null);

  const [
    contextExpanded,
    setContextExpanded,
  ] = useState(false);

  const [
    showThinking,
    setShowThinking,
  ] = useState(false);

  const messagesEndRef =
    useRef<HTMLDivElement>(null);

  const inputRef =
    useRef<HTMLTextAreaElement>(null);

  const stageTimersRef =
    useRef<number[]>([]);

  const thinkingTimerRef =
    useRef<number | null>(null);

  /*
   * ----------------------------------------------------------
   * OPEN / CLOSE
   * ----------------------------------------------------------
   */

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    /*
     * Run the boot sequence only once per day.
     * Subsequent opens on the same day open immediately.
     */
    const needsDailyBoot = shouldShowDailyBootSequence();
    setBooting(needsDailyBoot);
    setContextExpanded(false);
    setInputValue('');
    setShowThinking(false);

    /*
     * Capture the screen immediately.
     * The boot sequence therefore represents
     * actual context collection.
     */
    const screen =
      collectVisiblePageContext();

    const context =
      PageContextService.refreshScreenContext(
        screen
      );

    setPageContext(context);
  }, [isOpen]);

  /*
   * ----------------------------------------------------------
   * CLEAN UP TIMERS
   * ----------------------------------------------------------
   */

  useEffect(() => {
    return () => {
      stageTimersRef.current.forEach(
        (timer) =>
          window.clearTimeout(timer)
      );

      if (
        thinkingTimerRef.current !== null
      ) {
        window.clearTimeout(
          thinkingTimerRef.current
        );
      }
    };
  }, []);

  /*
   * ----------------------------------------------------------
   * PAGE CONTEXT
   * ----------------------------------------------------------
   */

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const refreshContext = () => {
      const screen =
        collectVisiblePageContext();

      const context =
        PageContextService.refreshScreenContext(
          screen
        );

      setPageContext(context);
    };

    refreshContext();

    const unsubscribe =
      PageContextService.subscribe(
        setPageContext
      );

    return unsubscribe;
  }, [isOpen]);

  /*
   * ----------------------------------------------------------
   * LOAD HISTORY
   * ----------------------------------------------------------
   */

  useEffect(() => {
    let cleared = false;

    try {
      cleared =
        localStorage.getItem(
          'deloitte_jet_ai_chat_cleared'
        ) === 'true';
    } catch {
      cleared = false;
    }

    if (cleared) {
      setMessages([]);
      return;
    }

    const history =
      AiService.getStoredMessages();

    if (history.length > 0) {
      setMessages(history);
    } else {
      setMessages([
        createWelcomeMessage(),
      ]);
    }
  }, []);

  /*
   * ----------------------------------------------------------
   * SAVE HISTORY
   * ----------------------------------------------------------
   */

  useEffect(() => {
    if (messages.length > 0) {
      AiService.saveStoredMessages(
        messages
      );
    }
  }, [messages]);

  /*
   * ----------------------------------------------------------
   * AUTO SCROLL
   * ----------------------------------------------------------
   */

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const timer =
      window.setTimeout(() => {
        messagesEndRef.current?.scrollIntoView(
          {
            behavior: 'smooth',
            block: 'end',
          }
        );
      }, 80);

    return () =>
      window.clearTimeout(timer);
  }, [
    messages,
    isLoading,
    showThinking,
    isOpen,
  ]);

  /*
   * ----------------------------------------------------------
   * FOCUS
   * ----------------------------------------------------------
   */

  useEffect(() => {
    if (
      isOpen &&
      !booting &&
      !isLoading
    ) {
      const timer =
        window.setTimeout(() => {
          inputRef.current?.focus();
        }, 180);

      return () =>
        window.clearTimeout(timer);
    }
  }, [
    isOpen,
    booting,
    isLoading,
  ]);

  /*
   * ----------------------------------------------------------
   * CONTEXT SIGNALS
   * ----------------------------------------------------------
   */

  const contextSignals =
    useMemo(() => {
      const source =
        buildContextSummary(
          pageContext
        );

      const unique: string[] = [];

      source.forEach((item) => {
        const value =
          item?.trim();

        if (!value) {
          return;
        }

        const duplicate =
          unique.some(
            (existing) =>
              existing.toLowerCase() ===
              value.toLowerCase()
          );

        if (!duplicate) {
          unique.push(value);
        }
      });

      return unique.slice(0, 6);
    }, [pageContext]);

  /*
   * ----------------------------------------------------------
   * CONTEXTUAL PROMPTS
   * ----------------------------------------------------------
   */

  const contextualPrompts =
    useMemo(() => {
      const prompts: Array<{
        label: string;
        query: string;
      }> = [];

      if (
        pageContext.currentStep
      ) {
        prompts.push({
          label: 'Explain this step',
          query:
            'What is this current step doing, what should I review here, and what should I do next?',
        });
      }

      if (
        pageContext.visibleContent
      ) {
        prompts.push({
          label: 'Read this screen',
          query:
            'What am I looking at on this screen? Identify the most important information and explain what matters.',
        });
      }

      if (
        pageContext.activeTab
      ) {
        prompts.push({
          label: 'Explain this section',
          query:
            `Explain the current "${pageContext.activeTab}" section and what I should pay attention to.`,
        });
      }

      prompts.push({
        label: 'What can you help with?',
        query:
          'What can you help me with in the current JET workflow?',
      });

      return prompts.slice(0, 4);
    }, [
      pageContext,
    ]);

  /*
   * ----------------------------------------------------------
   * PROCESSING ANIMATION
   * ----------------------------------------------------------
   */

  const startProcessingAnimation =
    () => {
      stageTimersRef.current.forEach(
        (timer) =>
          window.clearTimeout(timer)
      );

      stageTimersRef.current = [];

      if (
        thinkingTimerRef.current !== null
      ) {
        window.clearTimeout(
          thinkingTimerRef.current
        );
      }

      setShowThinking(false);
      setProcessingStage('context');

      /*
       * Tiny delay before showing the thinking
       * surface. This prevents the interface
       * from feeling slower than it is.
       */
      thinkingTimerRef.current =
        window.setTimeout(() => {
          setShowThinking(true);
        }, 150);

      stageTimersRef.current.push(
        window.setTimeout(() => {
          setProcessingStage(
            'scan'
          );
        }, 650)
      );

      stageTimersRef.current.push(
        window.setTimeout(() => {
          setProcessingStage(
            'reason'
          );
        }, 1150)
      );

      stageTimersRef.current.push(
        window.setTimeout(() => {
          setProcessingStage(
            'response'
          );
        }, 1650)
      );
    };

  /*
   * ----------------------------------------------------------
   * CAPTURE CURRENT CONTEXT
   * ----------------------------------------------------------
   */

  const captureCurrentContext =
    (): ActivePageContext => {
      const visible =
        collectVisiblePageContext();

      return PageContextService.refreshScreenContext(
        visible
      );
    };

  /*
   * ----------------------------------------------------------
   * SEND
   * ----------------------------------------------------------
   */

  const handleSend = async (
    suppliedText?: string
  ) => {
    const query = (
      suppliedText !== undefined
        ? suppliedText
        : inputValue
    ).trim();

    if (
      !query ||
      isLoading ||
      booting
    ) {
      return;
    }

    const currentContext =
      captureCurrentContext();

    setPageContext(
      currentContext
    );

    const userMessage: AiChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: query,
      timestamp: nowLabel(),
    };

    const updatedHistory = [
      ...messages,
      userMessage,
    ];

    setMessages(
      updatedHistory
    );

    setInputValue('');
    setIsLoading(true);

    try {
      localStorage.removeItem(
        'deloitte_jet_ai_chat_cleared'
      );
    } catch {
      // Ignore storage errors.
    }

    startProcessingAnimation();

    try {
      const response =
        await AiService.sendMessage(
          updatedHistory.map(
            (message) => ({
              role:
                message.role,
              content:
                message.content,
            })
          ),
          currentContext
        );

      const assistantMessage:
        AiChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content:
          response.message,
        timestamp: nowLabel(),
        guardrailTriggered:
          response.guardrailTriggered,
        guardrailReason:
          response.guardrailReason,
        agent: response.agent,
      };

      setProcessingStage(
        'response'
      );

      setMessages(
        (previous) => [
          ...previous,
          assistantMessage,
        ]
      );
    } catch (error: any) {
      setMessages(
        (previous) => [
          ...previous,
          {
            id: `error-${Date.now()}`,
            role: 'assistant',
            content: `
## Connection unavailable

The local JET intelligence service could not be reached.

I have intentionally **not generated a fabricated answer**.

Please verify that your local Qwen service is running on port **5005**, then try again.
`,
            timestamp: nowLabel(),
            agent: {
              contextUsed: true,
              degraded: true,
              model: 'Unavailable',
            },
          },
        ]
      );
    } finally {
      stageTimersRef.current.forEach(
        (timer) =>
          window.clearTimeout(timer)
      );

      if (
        thinkingTimerRef.current !== null
      ) {
        window.clearTimeout(
          thinkingTimerRef.current
        );
      }

      setShowThinking(false);
      setIsLoading(false);
    }
  };

  /*
   * ----------------------------------------------------------
   * CLEAR HISTORY
   * ----------------------------------------------------------
   */

  const handleClearHistory =
    () => {
      AiService.clearStoredMessages();

      try {
        localStorage.setItem(
          'deloitte_jet_ai_chat_cleared',
          'true'
        );
      } catch {
        // Ignore storage errors.
      }

      setMessages([]);
    };

  /*
   * ----------------------------------------------------------
   * COPY
   * ----------------------------------------------------------
   */

  const handleCopy = async (
    content: string,
    id: string
  ) => {
    try {
      await navigator.clipboard.writeText(
        content
      );

      setCopiedId(id);

      const timer =
        window.setTimeout(() => {
          setCopiedId(null);
        }, 1600);

      return () =>
        window.clearTimeout(timer);
    } catch {
      // Clipboard unavailable.
    }
  };

  /*
   * ----------------------------------------------------------
   * KEYBOARD
   * ----------------------------------------------------------
   */

  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLTextAreaElement>
  ) => {
    if (
      event.key === 'Enter' &&
      !event.shiftKey
    ) {
      event.preventDefault();
      void handleSend();
    }
  };

  /*
   * ----------------------------------------------------------
   * BOOT COMPLETE
   * ----------------------------------------------------------
   */

  const handleBootComplete =
    () => {
      markBootSequenceShownToday();
      setBooting(false);

      /*
       * Refresh once more immediately before
       * revealing the chat surface.
       */
      const screen =
        collectVisiblePageContext();

      const context =
        PageContextService.refreshScreenContext(
          screen
        );

      setPageContext(context);
    };

  /*
   * ----------------------------------------------------------
   * RENDER
   * ----------------------------------------------------------
   */

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="jet-ai-backdrop"
            data-ai-ignore="true"
            initial={{
              opacity: 0,
              backdropFilter:
                'blur(0px)',
            }}
            animate={{
              opacity: 1,
              backdropFilter:
                'blur(6px)',
            }}
            exit={{
              opacity: 0,
              backdropFilter:
                'blur(0px)',
            }}
            transition={{
              duration: 0.34,
              ease: [
                0.22,
                1,
                0.36,
                1,
              ],
            }}
            onClick={
              isLoading
                ? undefined
                : onClose
            }
          />

          <motion.section
            className="jet-ai-modal"
            data-ai-ignore="true"
            initial={{
              opacity: 0,
              y: 18,
              scale: 0.965,
              filter:
                'blur(10px)',
            }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
              filter:
                'blur(0px)',
            }}
            exit={{
              opacity: 0,
              y: 12,
              scale: 0.975,
              filter:
                'blur(8px)',
            }}
            transition={{
              type: 'spring',
              stiffness: 285,
              damping: 27,
              mass: 0.72,
            }}
          >
            <AnimatePresence mode="wait">
              {booting ? (
                <AgentBootSequence
                  key="boot"
                  onComplete={
                    handleBootComplete
                  }
                  pageTitle={
                    pageContext.pageTitle
                  }
                  stepTitle={
                    pageContext.stepTitle
                  }
                />
              ) : (
                <motion.div
                  key="chat"
                  className="jet-ai-shell"
                  initial={{
                    opacity: 0,
                    y: 5,
                  }}
                  animate={{
                    opacity: 1,
                    y: 0,
                  }}
                  transition={{
                    duration: 0.3,
                    ease: [
                      0.22,
                      1,
                      0.36,
                      1,
                    ],
                  }}
                >
                  {/* HEADER */}

                  <header className="jet-ai-header">
                    <div className="jet-ai-header-left">
                      <motion.div
                        className="jet-ai-header-avatar"
                        layoutId="jet-ai-avatar"
                      >
                        <img
                          src="/ai-agent-avatar.png"
                          alt=""
                        />
                      </motion.div>

                      <div className="jet-ai-header-copy">
                        <div className="jet-ai-title-row">
                          <h2>
                            JET Copilot
                          </h2>

                          <span className="jet-ai-live-pill">
                            <span />
                            LIVE
                          </span>
                        </div>

                        <div className="jet-ai-header-subtitle">
                          <span className="jet-ai-header-subtitle-dot" />
                          Context-aware audit intelligence
                        </div>
                      </div>
                    </div>

                    <div className="jet-ai-header-actions">
                      <button
                        type="button"
                        className="jet-ai-clear-history-button"
                        onClick={
                          handleClearHistory
                        }
                        title="Clear conversation history"
                      >
                        <Trash2
                          size={13}
                        />

                        <span>
                          Clear History
                        </span>
                      </button>

                      <button
                        type="button"
                        className="jet-ai-icon-button"
                        onClick={
                          onClose
                        }
                        title="Close JET Copilot"
                        aria-label="Close JET Copilot"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  </header>

                  {/* MESSAGE STREAM */}

                  <main className="jet-ai-messages">
                    {messages.length === 0 && (
                      <motion.div
                        className="jet-ai-empty-state"
                        initial={{
                          opacity: 0,
                          y: 8,
                        }}
                        animate={{
                          opacity: 1,
                          y: 0,
                        }}
                      >
                        <div className="jet-ai-empty-illustration">
                          <img
                            src="/Empty-bro.png"
                            alt="JET Workspace Empty State"
                          />
                        </div>

                        <div className="jet-ai-empty-title">
                          Ready when you are.
                        </div>

                        <div className="jet-ai-empty-text">
                          Ask about anything you're currently reviewing in JET.
                        </div>
                      </motion.div>
                    )}

                    {messages.length === 1 &&
                      messages[0]?.id.startsWith(
                        'welcome'
                      ) && (
                        <motion.div
                          className="jet-ai-welcome-banner"
                          initial={{
                            opacity: 0,
                            y: 8,
                          }}
                          animate={{
                            opacity: 1,
                            y: 0,
                          }}
                          transition={{
                            duration: 0.35,
                          }}
                        >
                          <div className="jet-ai-welcome-eyebrow">
                            <Sparkles
                              size={12}
                            />

                            READY TO ASSIST
                          </div>

                          <div className="jet-ai-welcome-title">
                            Your screen is part of the conversation.
                          </div>

                          <div className="jet-ai-welcome-text">
                            Ask about what you are currently reviewing and JET Copilot will use the active screen context alongside your conversation.
                          </div>
                        </motion.div>
                      )}

                    {messages.map(
                      (
                        message
                      ) => {
                        const isUser =
                          message.role ===
                          'user';

                        return (
                          <motion.div
                            key={
                              message.id
                            }
                            className={`jet-ai-message-row ${
                              isUser
                                ? 'jet-ai-message-user'
                                : 'jet-ai-message-assistant'
                            }`}
                            layout
                            initial={{
                              opacity: 0,
                              y: 10,
                              scale: 0.99,
                            }}
                            animate={{
                              opacity: 1,
                              y: 0,
                              scale: 1,
                            }}
                            transition={{
                              duration: 0.24,
                              ease: [
                                0.22,
                                1,
                                0.36,
                                1,
                              ],
                            }}
                          >
                            {!isUser && (
                              <div className="jet-ai-message-avatar">
                                <img
                                  src="/ai-agent-avatar.png"
                                  alt=""
                                />
                              </div>
                            )}

                            <div
                              className={`jet-ai-message ${
                                isUser
                                  ? 'jet-ai-message-user-bubble'
                                  : 'jet-ai-message-ai-bubble'
                              }`}
                            >
                              {!isUser && (
                                <div className="jet-ai-message-meta">
                                  <span className="jet-ai-message-author">
                                    JET Copilot
                                  </span>

                                  {message.agent?.contextUsed && (
                                    <span className="jet-ai-message-context">
                                      <span />
                                      Context aware
                                    </span>
                                  )}
                                </div>
                              )}

                              {message.guardrailTriggered && (
                                <div className="jet-ai-guardrail">
                                  <ShieldCheck
                                    size={14}
                                  />

                                  <span>
                                    Domain guardrail activated
                                  </span>
                                </div>
                              )}

                              <ChatMarkdown
                                content={
                                  message.content
                                }
                              />

                              {!isUser && (
                                <div className="jet-ai-message-footer">
                                  {message.agent
                                    ?.degraded ? (
                                    <span className="jet-ai-degraded">
                                      Local model unavailable
                                    </span>
                                  ) : (
                                    <span className="jet-ai-message-source">
                                      JET Copilot
                                    </span>
                                  )}

                                  <button
                                    type="button"
                                    className="jet-ai-copy-button"
                                    onClick={() =>
                                      void handleCopy(
                                        message.content,
                                        message.id
                                      )
                                    }
                                  >
                                    {copiedId ===
                                    message.id ? (
                                      <>
                                        <Check
                                          size={12}
                                        />
                                        Copied
                                      </>
                                    ) : (
                                      <>
                                        <Copy
                                          size={12}
                                        />
                                        Copy
                                      </>
                                    )}
                                  </button>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        );
                      }
                    )}

                    {/* THINKING STATE */}

                    <AnimatePresence>
                      {isLoading &&
                        showThinking && (
                          <motion.div
                            className="jet-ai-processing-row"
                            initial={{
                              opacity: 0,
                              y: 10,
                            }}
                            animate={{
                              opacity: 1,
                              y: 0,
                            }}
                            exit={{
                              opacity: 0,
                              y: 6,
                            }}
                          >
                            <div className="jet-ai-message-avatar">
                              <img
                                src="/ai-agent-avatar.png"
                                alt=""
                              />
                            </div>

                            <AgentScanState
                              stage={
                                processingStage
                              }
                              pageTitle={
                                pageContext.pageTitle
                              }
                              stepTitle={
                                pageContext.stepTitle
                              }
                              signals={
                                contextSignals
                              }
                            />
                          </motion.div>
                        )}
                    </AnimatePresence>

                    <div
                      ref={
                        messagesEndRef
                      }
                    />
                  </main>

                  {/* SUGGESTIONS */}

                  {!isLoading &&
                    contextualPrompts.length >
                      0 && (
                      <div className="jet-ai-suggestions">
                        <div className="jet-ai-suggestion-list">
                          {contextualPrompts.map(
                            (
                              prompt
                            ) => (
                              <button
                                type="button"
                                className="jet-ai-suggestion"
                                key={
                                  prompt.label
                                }
                                onClick={() =>
                                  void handleSend(
                                    prompt.query
                                  )
                                }
                              >
                                <span>
                                  {
                                    prompt.label
                                  }
                                </span>

                                <ChevronRight
                                  size={
                                    13
                                  }
                                />
                              </button>
                            )
                          )}
                        </div>
                      </div>
                    )}

                  {/* COMPOSER */}

                  <footer className="jet-ai-composer">
                    <div className="jet-ai-composer-shell">
                      <textarea
                        ref={
                          inputRef
                        }
                        value={
                          inputValue
                        }
                        onChange={(
                          event
                        ) =>
                          setInputValue(
                            event
                              .target
                              .value
                          )
                        }
                        onKeyDown={
                          handleKeyDown
                        }
                        placeholder={
                          pageContext.activeTab
                            ? `Ask about ${pageContext.activeTab}...`
                            : 'Ask about the current JET workspace...'
                        }
                        rows={1}
                        disabled={
                          isLoading
                        }
                      />

                      <motion.button
                        type="button"
                        className="jet-ai-send-button"
                        onClick={() =>
                          void handleSend()
                        }
                        disabled={
                          !inputValue.trim() ||
                          isLoading
                        }
                        whileHover={{
                          scale: 1.035,
                        }}
                        whileTap={{
                          scale: 0.94,
                        }}
                        aria-label="Send message"
                      >
                        <Send size={17} />
                      </motion.button>
                    </div>

                    <div className="jet-ai-composer-footer">
                      <span>
                        Screen context enabled
                      </span>

                      <span>
                        Enter to send · Shift + Enter for new line
                      </span>
                    </div>
                  </footer>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.section>
        </>
      )}
    </AnimatePresence>
  );
};