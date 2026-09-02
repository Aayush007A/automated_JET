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
  Sparkles,
  HelpCircle,
  ArrowRight,
  Zap,
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

  // Entrance holographic animation state
  const [showEntranceAnimation, setShowEntranceAnimation] = useState<boolean>(true);

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

  // Reset or trigger entrance animation on open
  useEffect(() => {
    if (isOpen) {
      setShowEntranceAnimation(true);
      const timer = setTimeout(() => {
        setShowEntranceAnimation(false);
      }, 1800);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

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
    if (isOpen && !showEntranceAnimation) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, showEntranceAnimation, isLoading]);

  // Focus input when opened and intro done
  useEffect(() => {
    if (isOpen && !showEntranceAnimation) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, showEntranceAnimation]);

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
          initial={{ opacity: 0, y: 32, scale: 0.94 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 24, scale: 0.94 }}
          transition={{ type: 'spring', damping: 26, stiffness: 320 }}
          style={{
            position: 'fixed',
            bottom: '96px',
            right: '24px',
            width: '560px',
            maxWidth: 'calc(100vw - 36px)',
            height: '730px',
            maxHeight: 'calc(100vh - 110px)',
            background: '#FFFFFF',
            borderRadius: '20px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 25px 65px -12px rgba(0, 118, 128, 0.16), 0 12px 30px -8px rgba(15, 23, 42, 0.10)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            zIndex: 9999,
            fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
          }}
        >
          {/* ENTRANCE HOLOGRAPHIC ANIMATION SCREEN */}
          <AnimatePresence>
            {showEntranceAnimation && (
              <motion.div
                initial={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.45 }}
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(145deg, #FFFFFF 0%, #F0FDFA 60%, #E6F4F5 100%)',
                  zIndex: 10,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '32px',
                  textAlign: 'center',
                }}
              >
                {/* Expanding Glowing Orb Portal */}
                <div style={{ position: 'relative', width: '96px', height: '96px', marginBottom: '24px' }}>
                  {/* Outer Ripple Wave 1 */}
                  <motion.div
                    animate={{ scale: [1, 1.7, 2.1], opacity: [0.6, 0.25, 0] }}
                    transition={{ repeat: Infinity, duration: 1.8, ease: 'easeOut' }}
                    style={{
                      position: 'absolute',
                      inset: -12,
                      borderRadius: '50%',
                      border: '2px solid #007680',
                      pointerEvents: 'none',
                    }}
                  />
                  {/* Outer Ripple Wave 2 */}
                  <motion.div
                    animate={{ scale: [1, 1.5, 1.8], opacity: [0.8, 0.35, 0] }}
                    transition={{ repeat: Infinity, duration: 1.8, delay: 0.4, ease: 'easeOut' }}
                    style={{
                      position: 'absolute',
                      inset: -6,
                      borderRadius: '50%',
                      border: '2px solid #2DD4BF',
                      pointerEvents: 'none',
                    }}
                  />

                  {/* Core Holographic AI Orb */}
                  <motion.div
                    animate={{ scale: [0.85, 1.05, 1], rotate: [0, 6, 0] }}
                    transition={{ duration: 1.2, ease: 'easeOut' }}
                    style={{
                      width: '96px',
                      height: '96px',
                      borderRadius: '50%',
                      overflow: 'hidden',
                      background: '#090D16',
                      boxShadow: '0 0 35px rgba(0, 118, 128, 0.45), 0 0 60px rgba(45, 212, 191, 0.25)',
                    }}
                  >
                    <img
                      src="/ai-agent-avatar.png"
                      alt="Deloitte AI"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </motion.div>
                </div>

                {/* Animated Typography */}
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25, duration: 0.4 }}
                >
                  <div
                    style={{
                      fontSize: '1.28rem',
                      fontWeight: 850,
                      letterSpacing: '-0.02em',
                      color: '#0F172A',
                      marginBottom: '6px',
                    }}
                  >
                    Deloitte JET AI Copilot
                  </div>
                  <div
                    style={{
                      fontSize: '0.80rem',
                      color: '#007680',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      marginBottom: '14px',
                    }}
                  >
                    <span
                      style={{
                        width: '7px',
                        height: '7px',
                        borderRadius: '50%',
                        background: '#10B981',
                        boxShadow: '0 0 8px #10B981',
                      }}
                    />
                    <span>Connected to {pageContext.stepTitle || pageContext.pageTitle || 'Platform'}</span>
                  </div>
                  <p
                    style={{
                      fontSize: '0.78rem',
                      color: '#64748B',
                      maxWidth: '360px',
                      margin: '0 auto 20px',
                      lineHeight: 1.5,
                    }}
                  >
                    Synchronizing real-time screen telemetry, schema constraints, and audit risk intelligence...
                  </p>
                </motion.div>

                {/* Skip / Enter Now Button */}
                <button
                  type="button"
                  onClick={() => setShowEntranceAnimation(false)}
                  style={{
                    padding: '7px 18px',
                    borderRadius: '20px',
                    background: '#007680',
                    color: '#FFFFFF',
                    border: 'none',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 4px 12px rgba(0, 118, 128, 0.25)',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#005A62')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = '#007680')}
                >
                  <span>Enter Assistant</span>
                  <ArrowRight size={13} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* LIGHT THEMED EXECUTIVE HEADER */}
          <div
            style={{
              padding: '14px 20px',
              background: '#FFFFFF',
              borderBottom: '1px solid #E2E8F0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div
                style={{
                  position: 'relative',
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  overflow: 'hidden',
                  background: '#090D16',
                  boxShadow: '0 0 16px rgba(0, 118, 128, 0.35)',
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
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.96rem', fontWeight: 800, letterSpacing: '-0.01em', color: '#0F172A' }}>
                    Deloitte JET Assistant
                  </span>
                  <span
                    style={{
                      fontSize: '0.64rem',
                      fontWeight: 750,
                      color: '#059669',
                      background: '#ECFDF5',
                      border: '1px solid #A7F3D0',
                      padding: '2px 7px',
                      borderRadius: '12px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#10B981' }} />
                    Active
                  </span>
                </div>
                <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ShieldCheck size={12} color="#007680" />
                  <span>Enterprise Audit Copilot • ISA 240 / PCAOB AS 2401</span>
                </div>
              </div>
            </div>

            {/* Header Right Actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {/* Question Catalog Quick Action Button */}
              <button
                type="button"
                onClick={handleShowPromptCatalog}
                title="Browse Sample Questions (/questions)"
                style={{
                  background: '#F0FDFA',
                  border: '1px solid #99F6E4',
                  color: '#007680',
                  padding: '6px 12px',
                  borderRadius: '16px',
                  cursor: 'pointer',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
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
                <BookOpen size={13} />
                <span>Sample Questions</span>
              </button>

              <button
                type="button"
                onClick={handleClearHistory}
                title="Clear Conversation"
                style={{
                  background: 'transparent',
                  border: '1px solid #E2E8F0',
                  color: '#64748B',
                  padding: '6px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#F1F5F9')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <Trash2 size={15} />
              </button>

              <button
                type="button"
                onClick={onClose}
                title="Close Assistant"
                style={{
                  background: 'transparent',
                  border: '1px solid #E2E8F0',
                  color: '#64748B',
                  padding: '6px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#F1F5F9')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <X size={17} />
              </button>
            </div>
          </div>

          {/* Current Page / Step Context Badge */}
          {pageContext && (
            <div
              style={{
                background: '#F0FDFA',
                borderBottom: '1px solid #CCFBF1',
                padding: '9px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '0.74rem',
                color: '#0F766E',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                <span style={{ fontWeight: 800, color: '#007680', letterSpacing: '0.01em' }}>
                  {pageContext.currentStep ? `Step ${pageContext.currentStep} of ${pageContext.totalSteps || 6}` : 'Active Screen'}
                </span>
                <span style={{ color: '#99F6E4' }}>•</span>
                <span style={{ fontWeight: 650, color: '#134E4A' }}>
                  {pageContext.stepTitle || pageContext.pageTitle || 'Audit Workspace'}
                </span>
              </div>
              <span
                style={{
                  fontSize: '0.64rem',
                  fontWeight: 750,
                  color: '#007680',
                  background: '#FFFFFF',
                  border: '1px solid #99F6E4',
                  padding: '2px 8px',
                  borderRadius: '10px',
                  whiteSpace: 'nowrap',
                }}
              >
                Dynamic Telemetry
              </span>
            </div>
          )}

          {/* Message Stream */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
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
                    fontSize: '0.68rem',
                    color: '#94A3B8',
                    marginBottom: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontWeight: 600,
                  }}
                >
                  {msg.role === 'user' ? 'Auditor' : 'Deloitte JET Assistant'}
                  <span>•</span>
                  <span>{msg.timestamp}</span>
                  {msg.guardrailTriggered && (
                    <span
                      style={{
                        background: '#FEF2F2',
                        color: '#DC2626',
                        padding: '1px 6px',
                        borderRadius: '4px',
                        fontWeight: 750,
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
                    padding: '14px 18px',
                    borderRadius: msg.role === 'user' ? '16px 16px 2px 16px' : '16px 16px 16px 2px',
                    background: msg.role === 'user' ? 'linear-gradient(135deg, #007680 0%, #0369A1 100%)' : '#FFFFFF',
                    color: msg.role === 'user' ? '#FFFFFF' : '#0F172A',
                    border: msg.role === 'user' ? 'none' : '1px solid #E2E8F0',
                    boxShadow: msg.role === 'user' ? '0 4px 12px rgba(0, 118, 128, 0.20)' : '0 2px 8px rgba(15, 23, 42, 0.04)',
                    fontSize: '0.82rem',
                    lineHeight: 1.62,
                    position: 'relative',
                    wordBreak: 'break-word',
                  }}
                >
                  <div
                    style={{ whiteSpace: 'pre-wrap' }}
                    onClick={(e) => {
                      // Click-to-ask delegation for sample question chips
                      const target = e.target as HTMLElement;
                      if (target && target.tagName === 'CODE' && target.dataset.query) {
                        handleSend(target.dataset.query);
                      }
                    }}
                    dangerouslySetInnerHTML={{
                      __html: renderBeautifulMarkdown(msg.content),
                    }}
                  />

                  {msg.role === 'assistant' && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px', borderTop: '1px solid #F1F5F9', paddingTop: '6px' }}>
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
                          fontSize: '0.68rem',
                          fontWeight: 650,
                          padding: '3px 6px',
                          borderRadius: '4px',
                        }}
                      >
                        {copiedId === msg.id ? <Check size={13} /> : <Copy size={13} />}
                        {copiedId === msg.id ? 'Copied to Clipboard' : 'Copy Text'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Thinking / Neural Generation Animation */}
            {isLoading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px' }}>
                <div
                  style={{
                    width: '30px',
                    height: '30px',
                    borderRadius: '50%',
                    overflow: 'hidden',
                    background: '#090D16',
                    flexShrink: 0,
                    boxShadow: '0 0 10px rgba(0, 118, 128, 0.4)',
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
                    padding: '9px 16px',
                    borderRadius: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.03)',
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
                  <span style={{ fontSize: '0.74rem', color: '#475569', marginLeft: '4px', fontWeight: 650 }}>
                    Evaluating audit context & neural inference...
                  </span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* CONTEXT-AWARE ACTION PROMPT CHIPS */}
          {!isLoading && currentPrompts.length > 0 && (
            <div
              style={{
                padding: '10px 18px',
                background: '#FFFFFF',
                borderTop: '1px solid #F1F5F9',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.66rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Recommended Inquiries
                </span>
                <span style={{ fontSize: '0.64rem', color: '#94A3B8' }}>
                  Type <code style={{ color: '#007680' }}>/questions</code> for master catalog
                </span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {currentPrompts.map((chip, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSend(chip.query)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '16px',
                      background: '#F8FAFC',
                      border: '1px solid #E2E8F0',
                      color: '#334155',
                      fontSize: '0.72rem',
                      fontWeight: 650,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
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
                    <ChevronRight size={12} />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* INPUT & SEND BAR */}
          <div
            style={{
              padding: '14px 20px',
              background: '#FFFFFF',
              borderTop: '1px solid #E2E8F0',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
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
                padding: '11px 16px',
                borderRadius: '12px',
                border: '1.5px solid #E2E8F0',
                background: '#F8FAFC',
                color: '#0F172A',
                fontSize: '0.82rem',
                fontFamily: 'inherit',
                outline: 'none',
                resize: 'none',
                maxHeight: '110px',
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
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: inputValue.trim() && !isLoading ? '#007680' : '#E2E8F0',
                color: '#FFFFFF',
                border: 'none',
                cursor: inputValue.trim() && !isLoading ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease',
                flexShrink: 0,
                boxShadow: inputValue.trim() && !isLoading ? '0 4px 12px rgba(0, 118, 128, 0.25)' : 'none',
              }}
            >
              <Send size={16} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// ── Beautiful Structured Markdown Formatter ─────────────────────────
function renderBeautifulMarkdown(raw: string): string {
  if (!raw) return '';

  let text = raw
    // Clean out any Omnia occurrences
    .replace(/omnia/gi, 'Deloitte JET')
    // Escape standard HTML tags
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // Headings (H3, H4, H2)
    .replace(/^### (.*$)/gim, '<div style="font-size: 0.94rem; font-weight: 850; color: #0F172A; margin: 10px 0 6px; letter-spacing: -0.01em; border-bottom: 1px solid #F1F5F9; padding-bottom: 4px;">$1</div>')
    .replace(/^#### (.*$)/gim, '<div style="font-size: 0.84rem; font-weight: 800; color: #007680; margin: 8px 0 4px; text-transform: uppercase; letter-spacing: 0.03em;">$1</div>')
    .replace(/^## (.*$)/gim, '<div style="font-size: 1.05rem; font-weight: 850; color: #0F172A; margin: 12px 0 6px;">$1</div>')
    // Bold text
    .replace(/\*\*(.*?)\*\*/g, '<strong style="color: #0F172A; font-weight: 750;">$1</strong>')
    // Highlight callout blocks (e.g. lines starting with >)
    .replace(/^>\s?(.*$)/gim, '<div style="background: #F0FDFA; border-left: 3px solid #007680; padding: 8px 12px; border-radius: 6px; margin: 6px 0; font-size: 0.78rem; color: #134E4A;">$1</div>')
    // Interactive code chips: if line matches a prompt, render as clickable chip
    .replace(/`([^`]+)`/g, (_match, p1) => {
      return `<code data-query="${p1.replace(/"/g, '&quot;')}" style="background: #F1F5F9; color: #007680; padding: 3px 7px; border-radius: 5px; font-size: 0.77rem; font-family: monospace; font-weight: 600; cursor: pointer; border: 1px solid #E2E8F0; display: inline-block; margin: 1px 0;" title="Click to ask this question">${p1}</code>`;
    })
    // Bullet points with teal dots
    .replace(/^\s*-\s(.*$)/gim, '<div style="display: flex; gap: 8px; margin: 4px 0; align-items: flex-start;"><span style="color: #007680; font-weight: 800; line-height: 1.4;">•</span><div style="flex: 1;">$1</div></div>')
    // Numbered lists
    .replace(/^\s*(\d+)\.\s(.*$)/gim, '<div style="display: flex; gap: 8px; margin: 4px 0; align-items: flex-start;"><span style="color: #007680; font-weight: 750; font-size: 0.76rem; min-width: 16px;">$1.</span><div style="flex: 1;">$2</div></div>');

  return text;
}
