import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Send,
  Trash2,
  Copy,
  Check,
  ChevronRight,
  ShieldCheck,
  BookOpen
} from 'lucide-react';
import { AiService, AiChatMessage } from '../../services/aiService';
import { PageContextService, ActivePageContext } from '../../services/pageContextService';

interface AiAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AiAssistantModal: React.FC<AiAssistantModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [messages, setMessages] = useState<AiChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [pageContext, setPageContext] = useState<ActivePageContext>(PageContextService.getContext());

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Subscribe to real-time page and step context
  useEffect(() => {
    setPageContext(PageContextService.getContext());
    const unsubscribe = PageContextService.subscribe((ctx) => {
      setPageContext(ctx);
    });
    return unsubscribe;
  }, []);

  // Load chat history
  useEffect(() => {
    const history = AiService.getStoredMessages();
    if (history.length > 0) {
      setMessages(history);
    } else {
      setMessages([
        {
          id: 'welcome-init',
          role: 'assistant',
          content: `### Deloitte JET AI Copilot

I am your dedicated enterprise audit copilot, specialized in **Journal Entry Testing (JET)**, forensic analytics, and audit data preparation.

I am connected to your current screen and can guide you step-by-step through data ingestion, schema validation, column health, and the 12 audit risk tests.

How can I assist you with your current audit task?`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }
  }, []);

  // Save history on changes
  useEffect(() => {
    if (messages.length > 0) {
      AiService.saveStoredMessages(messages);
    }
  }, [messages]);

  // Auto-scroll
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isLoading]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend !== undefined ? textToSend : inputValue).trim();
    if (!query || isLoading) return;

    const userMsg: AiChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const updatedHistory = [...messages, userMsg];
    setMessages(updatedHistory);
    setInputValue('');
    setIsLoading(true);

    try {
      const currentCtx = PageContextService.getContext();
      const response = await AiService.sendMessage(
        updatedHistory.map((m) => ({ role: m.role, content: m.content })),
        currentCtx
      );

      const assistantMsg: AiChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: response.message,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        guardrailTriggered: response.guardrailTriggered,
        guardrailReason: response.guardrailReason,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      const errorMsg: AiChatMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: `**Connection Notice**: Unable to complete request (${err.message || 'Service Unavailable'}). Operating in local offline mode.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClearHistory = () => {
    AiService.clearStoredMessages();
    setMessages([
      {
        id: 'welcome-reset',
        role: 'assistant',
        content: `### Conversation Cleared\n\nReady for your next Journal Entry Testing inquiry.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  const handleShowPromptCatalog = () => {
    handleSend('/questions');
  };

  // Dynamic starter prompt chips based on current step
  const getContextualPrompts = () => {
    const step = pageContext.currentStep;
    if (step === 1) {
      return [
        { label: 'What files do I need to upload here?', query: 'What files do I need to upload on Step 1, and what are the required formats?' },
        { label: 'What GL columns are mandatory?', query: 'What are the mandatory general ledger columns required for ingestion?' },
        { label: 'Explain this current step', query: 'What is this current step all about and what do I need to do?' },
      ];
    }
    if (step === 2) {
      return [
        { label: 'What is File Preparation?', query: 'What is File Preparation on Step 2 and how do I inspect the detected sheets?' },
        { label: 'Explain this current step', query: 'What is this current step all about and what do I need to do?' },
      ];
    }
    if (step === 3) {
      return [
        { label: 'What data cleaning rules are applied?', query: 'What data cleansing rules are applied on Step 3 and how are constraints validated?' },
        { label: 'Explain Column Health visualizer', query: 'Explain how the Column Health visualizer analyzes my dataset and renders grouped bars.' },
        { label: 'What should I do on this step?', query: 'What is this current step all about and what do I need to do next?' },
      ];
    }
    if (step === 4) {
      return [
        { label: 'What canonical fields must be mapped?', query: 'What canonical CDM fields must be mapped on Step 4 for Trial Balance and General Ledger?' },
        { label: 'How does Trial Balance balance check work?', query: 'How does the platform verify that debits equal credits in the Trial Balance?' },
        { label: 'Explain this current step', query: 'What is this current step all about and what do I need to do?' },
      ];
    }
    if (step === 5) {
      return [
        { label: 'What tests are executed in this pipeline?', query: 'What tests are executed during pipeline integrity testing on Step 5?' },
        { label: 'How do I monitor live test progress?', query: 'How do I monitor real-time test progress and audit logs?' },
      ];
    }
    if (step === 6) {
      return [
        { label: 'Explain the summary reconciliation', query: 'Explain how to review the executive summary reconciliation and download audit workpapers.' },
        { label: 'What do the 12 risk tests indicate?', query: 'Provide an overview of the 12 forensic risk tests in this platform.' },
        { label: 'Explain Benford conformity scoring', query: 'How is the Benford conformity score calculated and what does MAD indicate?' },
      ];
    }
    // Default (Dashboard / General)
    return [
      { label: 'How do I start a new JET audit workflow?', query: 'How do I start a new Journal Entry Testing audit workflow?' },
      { label: 'What do the 12 forensic risk tests cover?', query: 'Provide an overview of the 12 forensic risk tests in this platform.' },
      { label: 'Explain Benford Law conformity', query: 'How does Benford Law analysis detect accounting anomalies in general ledger populations?' },
    ];
  };

  const currentPrompts = getContextualPrompts();

  // Clean step subtitle
  const cleanStepTitle = pageContext.currentStep
    ? `Step ${pageContext.currentStep}: ${pageContext.stepTitle?.split('&')[0]?.trim() || 'Workflow'}`
    : 'Dashboard • Engagement Overview';

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.96 }}
          transition={{ type: 'spring', damping: 28, stiffness: 350 }}
          style={{
            position: 'fixed',
            bottom: '96px',
            right: '24px',
            width: '540px',
            maxWidth: 'calc(100vw - 32px)',
            height: '710px',
            maxHeight: 'calc(100vh - 110px)',
            background: '#FFFFFF',
            borderRadius: '16px',
            border: '1px solid #CBD5E1',
            boxShadow: '0 20px 50px -10px rgba(0, 118, 128, 0.15), 0 10px 25px -5px rgba(15, 23, 42, 0.08)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            zIndex: 9999,
            fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
          }}
        >
          {/* COMPACT, CLEAN EXECUTIVE HEADER (NO TEXT WRAP) */}
          <div
            style={{
              padding: '12px 16px',
              background: '#FFFFFF',
              borderBottom: '1px solid #E2E8F0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              minHeight: '56px',
              boxSizing: 'border-box',
            }}
          >
            {/* Left: Avatar & Title (Single Line) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
              <div
                style={{
                  position: 'relative',
                  width: '34px',
                  height: '34px',
                  borderRadius: '50%',
                  overflow: 'hidden',
                  background: '#090D16',
                  boxShadow: '0 0 12px rgba(0, 118, 128, 0.35)',
                  flexShrink: 0,
                  border: '1.5px solid #CCFBF1',
                }}
              >
                <img
                  src="/ai-agent-avatar.png"
                  alt="Deloitte AI"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '0.90rem', fontWeight: 800, color: '#0F172A', whiteSpace: 'nowrap' }}>
                    Deloitte JET AI
                  </span>
                  <span
                    style={{
                      fontSize: '0.60rem',
                      fontWeight: 750,
                      color: '#059669',
                      background: '#ECFDF5',
                      border: '1px solid #A7F3D0',
                      padding: '1px 6px',
                      borderRadius: '10px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '3px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#10B981' }} />
                    Active
                  </span>
                </div>
                <div
                  style={{
                    fontSize: '0.68rem',
                    color: '#64748B',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <ShieldCheck size={11} color="#007680" />
                  <span>Enterprise Audit Intelligence</span>
                </div>
              </div>
            </div>

            {/* Right: Actions (Single Line, Compact) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
              <button
                type="button"
                onClick={handleShowPromptCatalog}
                title="Browse Sample Questions (/questions)"
                style={{
                  background: '#F0FDFA',
                  border: '1px solid #99F6E4',
                  color: '#007680',
                  padding: '5px 10px',
                  borderRadius: '14px',
                  cursor: 'pointer',
                  fontSize: '0.70rem',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#CCFBF1';
                  e.currentTarget.style.borderColor = '#5EEAD4';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#F0FDFA';
                  e.currentTarget.style.borderColor = '#99F6E4';
                }}
              >
                <BookOpen size={12} />
                <span>Questions</span>
              </button>

              <button
                type="button"
                onClick={handleClearHistory}
                title="Clear Conversation"
                style={{
                  background: 'transparent',
                  border: '1px solid #E2E8F0',
                  color: '#64748B',
                  padding: '5px 7px',
                  borderRadius: '7px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#F1F5F9')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <Trash2 size={14} />
              </button>

              <button
                type="button"
                onClick={onClose}
                title="Close Assistant"
                style={{
                  background: 'transparent',
                  border: '1px solid #E2E8F0',
                  color: '#64748B',
                  padding: '5px 7px',
                  borderRadius: '7px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#F1F5F9')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* COMPACT CONTEXT TELEMETRY BAR */}
          <div
            style={{
              background: '#F0FDFA',
              borderBottom: '1px solid #CCFBF1',
              padding: '6px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.72rem',
              color: '#0F766E',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              <span style={{ fontWeight: 800, color: '#007680' }}>
                {cleanStepTitle}
              </span>
            </div>
            <span
              style={{
                fontSize: '0.62rem',
                fontWeight: 700,
                color: '#007680',
                background: '#FFFFFF',
                border: '1px solid #99F6E4',
                padding: '1px 6px',
                borderRadius: '8px',
                whiteSpace: 'nowrap',
              }}
            >
              Synced
            </span>
          </div>

          {/* MESSAGE STREAM (CLEAN SPACING, PROPORTIONATE BUBBLES) */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '14px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              background: '#F8FAFC',
            }}
          >
            {messages.map((msg) => (
              <div
                key={msg.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
                }}
              >
                {/* Message Header Info */}
                <div
                  style={{
                    fontSize: '0.65rem',
                    color: '#94A3B8',
                    marginBottom: '2px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    fontWeight: 600,
                  }}
                >
                  {msg.role === 'user' ? 'You' : 'Deloitte JET AI'}
                  <span>•</span>
                  <span>{msg.timestamp}</span>
                  {msg.guardrailTriggered && (
                    <span
                      style={{
                        background: '#FEF2F2',
                        color: '#DC2626',
                        padding: '1px 5px',
                        borderRadius: '4px',
                        fontWeight: 750,
                        fontSize: '0.60rem',
                      }}
                    >
                      Protected
                    </span>
                  )}
                </div>

                {/* Message Bubble Card */}
                <div
                  style={{
                    maxWidth: msg.role === 'user' ? '82%' : '94%',
                    padding: msg.role === 'user' ? '8px 13px' : '12px 15px',
                    borderRadius: msg.role === 'user' ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                    background: msg.role === 'user' ? 'linear-gradient(135deg, #007680 0%, #0369A1 100%)' : '#FFFFFF',
                    color: msg.role === 'user' ? '#FFFFFF' : '#0F172A',
                    border: msg.role === 'user' ? 'none' : '1px solid #E2E8F0',
                    boxShadow: msg.role === 'user' ? '0 2px 6px rgba(0, 118, 128, 0.16)' : '0 1px 4px rgba(15, 23, 42, 0.04)',
                    fontSize: '0.80rem',
                    lineHeight: msg.role === 'user' ? 1.45 : 1.55,
                    position: 'relative',
                    wordBreak: 'break-word',
                  }}
                >
                  <div
                    onClick={(e) => {
                      const target = e.target as HTMLElement;
                      const query = target.getAttribute('data-query');
                      if (query) {
                        handleSend(query);
                      }
                    }}
                    dangerouslySetInnerHTML={{
                      __html: renderBeautifulMarkdown(msg.content),
                    }}
                  />

                  {msg.role === 'assistant' && (
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'flex-end',
                        marginTop: '6px',
                        borderTop: '1px solid #F1F5F9',
                        paddingTop: '4px',
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => handleCopy(msg.content, msg.id)}
                        title="Copy Response"
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: copiedId === msg.id ? '#16A34A' : '#94A3B8',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '3px',
                          fontSize: '0.65rem',
                          fontWeight: 650,
                          padding: '2px 4px',
                          borderRadius: '4px',
                        }}
                      >
                        {copiedId === msg.id ? <Check size={12} /> : <Copy size={12} />}
                        {copiedId === msg.id ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Thinking / Neural Generation Animation */}
            {isLoading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 10px' }}>
                <div
                  style={{
                    width: '26px',
                    height: '26px',
                    borderRadius: '50%',
                    overflow: 'hidden',
                    background: '#090D16',
                    flexShrink: 0,
                    boxShadow: '0 0 8px rgba(0, 118, 128, 0.3)',
                  }}
                >
                  <img
                    src="/ai-agent-avatar.png"
                    alt="Thinking"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>
                <div
                  style={{
                    background: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    padding: '7px 14px',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 1px 4px rgba(0, 0, 0, 0.02)',
                  }}
                >
                  <motion.span
                    animate={{ scale: [1, 1.4, 1] }}
                    transition={{ repeat: Infinity, duration: 0.8, delay: 0 }}
                    style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#007680' }}
                  />
                  <motion.span
                    animate={{ scale: [1, 1.4, 1] }}
                    transition={{ repeat: Infinity, duration: 0.8, delay: 0.2 }}
                    style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#0284C7' }}
                  />
                  <motion.span
                    animate={{ scale: [1, 1.4, 1] }}
                    transition={{ repeat: Infinity, duration: 0.8, delay: 0.4 }}
                    style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#6366F1' }}
                  />
                  <span style={{ fontSize: '0.72rem', color: '#475569', marginLeft: '3px', fontWeight: 650 }}>
                    Evaluating audit context...
                  </span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* COMPACT SUGGESTED INQUIRIES */}
          {!isLoading && currentPrompts.length > 0 && (
            <div
              style={{
                padding: '8px 14px',
                background: '#FFFFFF',
                borderTop: '1px solid #F1F5F9',
                display: 'flex',
                flexDirection: 'column',
                gap: '5px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.64rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Recommended Inquiries
                </span>
                <span style={{ fontSize: '0.62rem', color: '#94A3B8' }}>
                  Type <code style={{ color: '#007680' }}>/questions</code> for full list
                </span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                {currentPrompts.map((chip, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSend(chip.query)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '12px',
                      background: '#F8FAFC',
                      border: '1px solid #E2E8F0',
                      color: '#334155',
                      fontSize: '0.70rem',
                      fontWeight: 650,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      transition: 'all 0.15s ease',
                      textAlign: 'left',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#F0FDFA';
                      e.currentTarget.style.borderColor = '#99F6E4';
                      e.currentTarget.style.color = '#007680';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#F8FAFC';
                      e.currentTarget.style.borderColor = '#E2E8F0';
                      e.currentTarget.style.color = '#334155';
                    }}
                  >
                    <span>{chip.label}</span>
                    <ChevronRight size={11} />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* INPUT & SEND BAR */}
          <div
            style={{
              padding: '10px 14px',
              background: '#FFFFFF',
              borderTop: '1px solid #E2E8F0',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={pageContext.currentStep ? `Ask about Step ${pageContext.currentStep} or type /questions...` : "Ask about audit tests, column health, or type /questions..."}
              rows={1}
              style={{
                flex: 1,
                padding: '9px 13px',
                borderRadius: '10px',
                border: '1.5px solid #E2E8F0',
                background: '#F8FAFC',
                color: '#0F172A',
                fontSize: '0.80rem',
                fontFamily: 'inherit',
                outline: 'none',
                resize: 'none',
                maxHeight: '80px',
                boxSizing: 'border-box',
                transition: 'border-color 0.15s ease, background 0.15s ease',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#007680';
                e.target.style.background = '#FFFFFF';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#E2E8F0';
                e.target.style.background = '#F8FAFC';
              }}
            />

            <button
              type="button"
              onClick={() => handleSend()}
              disabled={!inputValue.trim() || isLoading}
              aria-label="Send Message"
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: inputValue.trim() && !isLoading ? '#007680' : '#E2E8F0',
                color: '#FFFFFF',
                border: 'none',
                cursor: inputValue.trim() && !isLoading ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease',
                flexShrink: 0,
                boxShadow: inputValue.trim() && !isLoading ? '0 2px 8px rgba(0, 118, 128, 0.25)' : 'none',
              }}
            >
              <Send size={15} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// ── Clean, Compact Markdown Parser (NO EXCESS SPACE) ────────────────
function renderBeautifulMarkdown(raw: string): string {
  if (!raw) return '';

  // 1. Sanitize & Normalize Whitespace
  let text = raw
    .replace(/omnia/gi, 'Deloitte JET')
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // 2. Headings (H3 & H4) with tight margins
  text = text.replace(
    /^### (.*$)/gim,
    '<div style="font-size: 0.88rem; font-weight: 850; color: #0F172A; margin: 6px 0 3px; letter-spacing: -0.01em; border-bottom: 1px solid #F1F5F9; padding-bottom: 2px;">$1</div>'
  );
  text = text.replace(
    /^#### (.*$)/gim,
    '<div style="font-size: 0.78rem; font-weight: 800; color: #007680; margin: 6px 0 2px; text-transform: uppercase; letter-spacing: 0.03em;">$1</div>'
  );

  // 3. Bold text
  text = text.replace(/\*\*(.*?)\*\*/g, '<strong style="color: #0F172A; font-weight: 750;">$1</strong>');

  // 4. Interactive Question Chips: `What is this step?`
  text = text.replace(/`([^`]+)`/g, (_match, p1) => {
    return `<code data-query="${p1.replace(/"/g, '&quot;')}" style="background: #F1F5F9; color: #007680; padding: 2px 6px; border-radius: 4px; font-size: 0.75rem; font-family: monospace; font-weight: 600; cursor: pointer; border: 1px solid #E2E8F0; display: inline-block; margin: 1px 0;" title="Click to ask this question">${p1}</code>`;
  });

  // 5. Bullet points with tight margins
  text = text.replace(
    /^\s*-\s(.*$)/gim,
    '<div style="display: flex; gap: 6px; margin: 2px 0; align-items: flex-start; line-height: 1.45;"><span style="color: #007680; font-weight: 800; font-size: 0.82rem; line-height: 1.2;">•</span><div style="flex: 1;">$1</div></div>'
  );

  // 6. Numbered lists with tight margins
  text = text.replace(
    /^\s*(\d+)\.\s(.*$)/gim,
    '<div style="display: flex; gap: 6px; margin: 2px 0; align-items: flex-start; line-height: 1.45;"><span style="color: #007680; font-weight: 750; font-size: 0.74rem; min-width: 16px;">$1.</span><div style="flex: 1;">$2</div></div>'
  );

  // 7. General paragraphs: convert double newlines to clean spacing
  const paragraphs = text.split('\n\n');
  return paragraphs
    .map((p) => {
      const trimmed = p.trim();
      if (!trimmed) return '';
      if (trimmed.startsWith('<div') || trimmed.startsWith('<code')) return trimmed;
      return `<p style="margin: 3px 0 5px; line-height: 1.5; color: #334155;">${trimmed}</p>`;
    })
    .join('');
}
