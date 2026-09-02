import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Send,
  Trash2,
  Copy,
  Check,
  ChevronRight,
  ShieldCheck
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
          content: `### Deloitte JET Assistant

I am your dedicated enterprise audit copilot, specialized in **Journal Entry Testing (JET)**, forensic analytics, and audit data preparation.

I am aware of your current workflow position and can guide you step-by-step through data ingestion, schema validation, column health, and the 12 audit risk tests.

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
        content: `**Connection Error**: Unable to complete request (${err.message || 'Service Unavailable'}). Please ensure the backend service is active.`,
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
        content: `### Conversation Cleared\n\nReady for your next Journal Entry Testing (JET) inquiry.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
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
        { label: 'What do the 12 risk tests indicate?', query: 'Provide a breakdown of the 12 forensic risk tests and how exceptions are evaluated.' },
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

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.96 }}
          transition={{ type: 'spring', damping: 28, stiffness: 340 }}
          style={{
            position: 'fixed',
            bottom: '96px',
            right: '24px',
            width: '450px',
            maxWidth: 'calc(100vw - 36px)',
            height: '650px',
            maxHeight: 'calc(100vh - 120px)',
            background: '#FFFFFF',
            borderRadius: '16px',
            border: '1px solid #CBD5E1',
            boxShadow: '0 24px 60px -12px rgba(15, 23, 42, 0.28), 0 0 0 1px rgba(0, 118, 128, 0.08)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            zIndex: 9999,
            fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
          }}
        >
          {/* Executive Header */}
          <div
            style={{
              padding: '14px 18px',
              background: '#0B132B',
              borderBottom: '1px solid rgba(0, 118, 128, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              color: '#FFFFFF',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  position: 'relative',
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  overflow: 'hidden',
                  background: '#090D16',
                  boxShadow: '0 0 14px rgba(0, 118, 128, 0.6)',
                  flexShrink: 0,
                }}
              >
                <img
                  src="/ai-agent-avatar.png"
                  alt="Deloitte AI"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.90rem', fontWeight: 800, letterSpacing: '-0.01em', color: '#FFFFFF' }}>
                    Deloitte JET Assistant
                  </span>
                  <span
                    style={{
                      width: '7px',
                      height: '7px',
                      borderRadius: '50%',
                      background: '#10B981',
                      boxShadow: '0 0 8px #10B981',
                      display: 'inline-block',
                    }}
                    title="Active & Ready"
                  />
                </div>
                <div style={{ fontSize: '0.70rem', color: '#94A3B8', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <ShieldCheck size={11} color="#2DD4BF" />
                  <span>Enterprise Audit Copilot</span>
                </div>
              </div>
            </div>

            {/* Header Actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <button
                type="button"
                onClick={handleClearHistory}
                title="Clear Conversation"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94A3B8',
                  padding: '6px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Trash2 size={15} />
              </button>
              <button
                type="button"
                onClick={onClose}
                title="Close Assistant"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94A3B8',
                  padding: '6px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={17} />
              </button>
            </div>
          </div>

          {/* Current Page / Step Context Badge */}
          {pageContext && (
            <div
              style={{
                background: '#F8FAFC',
                borderBottom: '1px solid #E2E8F0',
                padding: '8px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '0.72rem',
                color: '#475569',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                <span style={{ fontWeight: 750, color: '#007680' }}>
                  {pageContext.currentStep ? `Step ${pageContext.currentStep} of ${pageContext.totalSteps || 6}` : 'Screen'}
                </span>
                <span style={{ color: '#CBD5E1' }}>|</span>
                <span style={{ fontWeight: 600, color: '#1E293B' }}>
                  {pageContext.stepTitle || pageContext.pageTitle || 'Audit Workspace'}
                </span>
              </div>
              <span
                style={{
                  fontSize: '0.64rem',
                  fontWeight: 700,
                  color: '#007680',
                  background: '#E6F4F5',
                  padding: '2px 7px',
                  borderRadius: '12px',
                  whiteSpace: 'nowrap',
                }}
              >
                Context Aware
              </span>
            </div>
          )}

          {/* Message Stream */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
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
                {/* Message Header */}
                <div
                  style={{
                    fontSize: '0.66rem',
                    color: '#94A3B8',
                    marginBottom: '3px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  {msg.role === 'user' ? 'You' : 'Deloitte JET Assistant'}
                  <span>•</span>
                  <span>{msg.timestamp}</span>
                  {msg.guardrailTriggered && (
                    <span
                      style={{
                        background: '#FEF2F2',
                        color: '#DC2626',
                        padding: '1px 5px',
                        borderRadius: '4px',
                        fontWeight: 700,
                        fontSize: '0.62rem',
                      }}
                    >
                      Scope Protected
                    </span>
                  )}
                </div>

                {/* Message Bubble Card */}
                <div
                  style={{
                    maxWidth: '92%',
                    padding: '12px 16px',
                    borderRadius: msg.role === 'user' ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                    background: msg.role === 'user' ? 'linear-gradient(135deg, #007680 0%, #0369A1 100%)' : '#FFFFFF',
                    color: msg.role === 'user' ? '#FFFFFF' : '#1E293B',
                    border: msg.role === 'user' ? 'none' : '1px solid #E2E8F0',
                    boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)',
                    fontSize: '0.80rem',
                    lineHeight: 1.55,
                    position: 'relative',
                    wordBreak: 'break-word',
                  }}
                >
                  <div
                    style={{ whiteSpace: 'pre-wrap' }}
                    dangerouslySetInnerHTML={{
                      __html: renderCleanMarkdown(msg.content),
                    }}
                  />

                  {msg.role === 'assistant' && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
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
                          gap: '4px',
                          fontSize: '0.66rem',
                          padding: '2px 4px',
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px' }}>
                <div
                  style={{
                    width: '26px',
                    height: '26px',
                    borderRadius: '50%',
                    overflow: 'hidden',
                    background: '#090D16',
                    flexShrink: 0,
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
                    padding: '8px 14px',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <motion.span
                    animate={{ scale: [1, 1.4, 1] }}
                    transition={{ repeat: Infinity, duration: 0.8, delay: 0 }}
                    style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#007680' }}
                  />
                  <motion.span
                    animate={{ scale: [1, 1.4, 1] }}
                    transition={{ repeat: Infinity, duration: 0.8, delay: 0.2 }}
                    style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#0284C7' }}
                  />
                  <motion.span
                    animate={{ scale: [1, 1.4, 1] }}
                    transition={{ repeat: Infinity, duration: 0.8, delay: 0.4 }}
                    style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#6366F1' }}
                  />
                  <span style={{ fontSize: '0.72rem', color: '#64748B', marginLeft: '4px', fontWeight: 600 }}>
                    Evaluating audit context...
                  </span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Context-Aware Action Prompt Chips */}
          {!isLoading && currentPrompts.length > 0 && (
            <div
              style={{
                padding: '10px 14px',
                background: '#FFFFFF',
                borderTop: '1px solid #F1F5F9',
                display: 'flex',
                flexDirection: 'column',
                gap: '5px',
              }}
            >
              <div style={{ fontSize: '0.66rem', fontWeight: 750, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Suggested Inquiries
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {currentPrompts.map((chip, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSend(chip.query)}
                    style={{
                      padding: '5px 11px',
                      borderRadius: '14px',
                      background: '#F8FAFC',
                      border: '1px solid #E2E8F0',
                      color: '#334155',
                      fontSize: '0.70rem',
                      fontWeight: 600,
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

          {/* Input & Send Bar */}
          <div
            style={{
              padding: '12px 16px',
              background: '#FFFFFF',
              borderTop: '1px solid #E2E8F0',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={pageContext.currentStep ? `Ask anything about Step ${pageContext.currentStep} or audit tests...` : "Ask about audit tests, column health, Benford scoring..."}
              rows={1}
              style={{
                flex: 1,
                padding: '10px 14px',
                borderRadius: '10px',
                border: '1.5px solid #E2E8F0',
                background: '#F8FAFC',
                color: '#0F172A',
                fontSize: '0.80rem',
                fontFamily: 'inherit',
                outline: 'none',
                resize: 'none',
                maxHeight: '100px',
                boxSizing: 'border-box',
                transition: 'border-color 0.15s ease',
              }}
              onFocus={(e) => (e.target.style.borderColor = '#007680')}
              onBlur={(e) => (e.target.style.borderColor = '#E2E8F0')}
            />

            <button
              type="button"
              onClick={() => handleSend()}
              disabled={!inputValue.trim() || isLoading}
              aria-label="Send Message"
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: inputValue.trim() && !isLoading ? '#007680' : '#E2E8F0',
                color: '#FFFFFF',
                border: 'none',
                cursor: inputValue.trim() && !isLoading ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.2s ease',
                flexShrink: 0,
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

// ── Clean Markdown Formatter Helper ─────────────────────────────────
function renderCleanMarkdown(raw: string): string {
  if (!raw) return '';

  let text = raw
    // Clean out Omnia occurrences
    .replace(/omnia/gi, 'Deloitte JET')
    // Escape standard tags
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // Headings
    .replace(/^### (.*$)/gim, '<div style="font-size: 0.90rem; font-weight: 800; color: #0F172A; margin: 8px 0 4px;">$1</div>')
    .replace(/^## (.*$)/gim, '<div style="font-size: 0.98rem; font-weight: 800; color: #0F172A; margin: 10px 0 4px;">$1</div>')
    // Bold
    .replace(/\*\*(.*?)\*\*/g, '<strong style="color: #0F172A; font-weight: 750;">$1</strong>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code style="background: #F1F5F9; color: #007680; padding: 2px 5px; border-radius: 4px; font-size: 0.76rem; font-family: monospace;">$1</code>')
    // Bullet points
    .replace(/^\s*-\s(.*$)/gim, '<div style="display: flex; gap: 6px; margin: 2px 0;"><span style="color: #007680; font-weight: bold;">•</span><span>$1</span></div>');

  return text;
}
