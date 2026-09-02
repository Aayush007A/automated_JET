import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Send,
  Sparkles,
  ShieldCheck,
  Cpu,
  Settings,
  Trash2,
  Copy,
  Check,
  ChevronRight,
  RefreshCw,
  HelpCircle,
  ExternalLink,
  Minimize2,
  AlertCircle
} from 'lucide-react';
import { AiService, AiChatMessage, AiStatus } from '../../services/aiService';

interface AiAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const STARTER_PROMPTS = [
  {
    icon: '🔍',
    title: 'Test 2: Suspect Keywords',
    prompt: 'How does Test 2 detect suspect keywords and narrations in journal entries?',
  },
  {
    icon: '📊',
    title: "Benford's Law Conformity",
    prompt: "How is the Benford's Law conformity score calculated and what does MAD indicate?",
  },
  {
    icon: '⏰',
    title: 'Cutoff Window Adjustments',
    prompt: 'What does Test 3 Post-Closing Cutoff Window (+/- 5 days) measure?',
  },
  {
    icon: '📈',
    title: 'Column Health & Grouped Bars',
    prompt: 'Explain how the EDA Column Health Visualizer renders side-by-side grouped multivariate bars and handles accounting parenthesis.',
  },
  {
    icon: '⚙️',
    title: 'Materiality Configuration',
    prompt: 'How do I configure the materiality threshold and how does it influence flagged risk priority?',
  },
];

export const AiAssistantModal: React.FC<AiAssistantModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [messages, setMessages] = useState<AiChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [status, setStatus] = useState<AiStatus | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsEndpoint, setSettingsEndpoint] = useState('http://localhost:11434');
  const [settingsModel, setSettingsModel] = useState('llama3.2:1b');
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [configFeedback, setConfigFeedback] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Load stored history and check local LLM status
  useEffect(() => {
    const history = AiService.getStoredMessages();
    if (history.length > 0) {
      setMessages(history);
    } else {
      // Welcome Greeting Message
      setMessages([
        {
          id: 'welcome-init',
          role: 'assistant',
          content: `### 👋 Welcome to Deloitte Automated JET Intelligence!

I am your dedicated **Journal Entry Testing (JET) Copilot**, guarded to answer queries strictly concerning this platform, our 12 Omnia risk tests, and dataset health diagnostics.

Select a prompt below or ask any question about your audit data:`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          source: 'built-in-engine',
          modelUsed: 'Deloitte-JET-Assistant',
        },
      ]);
    }

    // Check daemon status
    AiService.getStatus().then((res) => {
      setStatus(res);
      setSettingsEndpoint(res.endpoint || 'http://localhost:11434');
      setSettingsModel(res.model || 'llama3.2:1b');
    });
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
      const response = await AiService.sendMessage(
        updatedHistory.map((m) => ({ role: m.role, content: m.content }))
      );

      const assistantMsg: AiChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: response.message,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        guardrailTriggered: response.guardrailTriggered,
        guardrailReason: response.guardrailReason,
        modelUsed: response.modelUsed,
        source: response.source,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      const errorMsg: AiChatMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: `⚠️ **Connection Error**: Unable to reach AI Assistant service (${err.message || 'Network Timeout'}). Please ensure the backend server is running.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        source: 'built-in-engine',
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
        content: `### 🔄 Conversation Cleared\n\nI am ready for your next Journal Entry Testing (JET) or Omnia audit inquiry!`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        source: 'built-in-engine',
      },
    ]);
  };

  const handleSaveConfig = async () => {
    setIsSavingConfig(true);
    setConfigFeedback(null);
    try {
      await AiService.updateConfig({
        localEndpoint: settingsEndpoint,
        model: settingsModel,
      });
      const newStatus = await AiService.getStatus();
      setStatus(newStatus);
      setConfigFeedback('Configuration updated successfully!');
      setTimeout(() => {
        setShowSettings(false);
        setConfigFeedback(null);
      }, 1200);
    } catch (err: any) {
      setConfigFeedback(`Failed to update config: ${err.message}`);
    } finally {
      setIsSavingConfig(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.94 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 25, scale: 0.94 }}
          transition={{ type: 'spring', damping: 26, stiffness: 320 }}
          style={{
            position: 'fixed',
            bottom: '96px',
            right: '24px',
            width: '460px',
            maxWidth: 'calc(100vw - 36px)',
            height: '660px',
            maxHeight: 'calc(100vh - 120px)',
            background: '#FFFFFF',
            borderRadius: '18px',
            border: '1px solid #CBD5E1',
            boxShadow: '0 24px 60px -12px rgba(15, 23, 42, 0.28), 0 0 0 1px rgba(0, 118, 128, 0.08)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            zIndex: 9999,
            fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
          }}
        >
          {/* Header Bar */}
          <div
            style={{
              padding: '14px 18px',
              background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
              borderBottom: '1px solid #334155',
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
                  boxShadow: '0 0 12px rgba(0, 118, 128, 0.5)',
                }}
              >
                <img
                  src="/ai-agent-avatar.png"
                  alt="Agent"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.90rem', fontWeight: 800, letterSpacing: '-0.01em' }}>
                    Deloitte JET AI
                  </span>
                  <span
                    style={{
                      fontSize: '0.62rem',
                      fontWeight: 700,
                      background: 'rgba(0, 118, 128, 0.3)',
                      color: '#2DD4BF',
                      border: '1px solid rgba(45, 212, 191, 0.4)',
                      padding: '1px 6px',
                      borderRadius: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <ShieldCheck size={10} /> GUARDED
                  </span>
                </div>
                <div style={{ fontSize: '0.68rem', color: '#94A3B8', marginTop: '1px' }}>
                  {status?.connected
                    ? `🟢 Local LLM (${status.model})`
                    : '⚡ Built-in JET Knowledge Engine'}
                </div>
              </div>
            </div>

            {/* Header Action Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <button
                type="button"
                onClick={() => setShowSettings(!showSettings)}
                title="Model & Endpoint Settings"
                style={{
                  background: showSettings ? 'rgba(0, 118, 128, 0.4)' : 'transparent',
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
                <Settings size={15} />
              </button>
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

          {/* Settings Drawer (if toggled) */}
          <AnimatePresence>
            {showSettings && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                style={{
                  background: '#F8FAFC',
                  borderBottom: '1px solid #E2E8F0',
                  padding: '14px 18px',
                  overflow: 'hidden',
                  fontSize: '0.78rem',
                }}
              >
                <div style={{ fontWeight: 800, color: '#0F172A', marginBottom: '8px' }}>
                  Local LLM Engine Configuration
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.70rem', fontWeight: 700, color: '#475569', marginBottom: '3px' }}>
                      Local Daemon Endpoint (Ollama / LM Studio)
                    </label>
                    <input
                      type="text"
                      value={settingsEndpoint}
                      onChange={(e) => setSettingsEndpoint(e.target.value)}
                      placeholder="http://localhost:11434"
                      style={{
                        width: '100%',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        border: '1px solid #CBD5E1',
                        fontSize: '0.76rem',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.70rem', fontWeight: 700, color: '#475569', marginBottom: '3px' }}>
                      Model Tag / Name
                    </label>
                    <input
                      type="text"
                      value={settingsModel}
                      onChange={(e) => setSettingsModel(e.target.value)}
                      placeholder="llama3.2:1b"
                      style={{
                        width: '100%',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        border: '1px solid #CBD5E1',
                        fontSize: '0.76rem',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
                    <span style={{ fontSize: '0.70rem', color: '#64748B' }}>
                      Status: {status?.connected ? '✅ Connected' : '⚡ Using Built-in Engine'}
                    </span>
                    <button
                      type="button"
                      onClick={handleSaveConfig}
                      disabled={isSavingConfig}
                      style={{
                        padding: '5px 12px',
                        borderRadius: '6px',
                        background: '#007680',
                        color: '#FFFFFF',
                        border: 'none',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      {isSavingConfig ? 'Saving...' : 'Apply & Save'}
                    </button>
                  </div>
                  {configFeedback && (
                    <div style={{ fontSize: '0.70rem', color: configFeedback.includes('Failed') ? '#DC2626' : '#16A34A', fontWeight: 600 }}>
                      {configFeedback}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Messages Scroll Area */}
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
                {/* Role Header */}
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
                  {msg.role === 'user' ? 'You' : 'Deloitte JET Copilot'}
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
                    maxWidth: '90%',
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
                      __html: renderSimpleMarkdown(msg.content),
                    }}
                  />

                  {/* Copy Button for Assistant responses */}
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

            {/* Thinking / Typing Animation */}
            {isLoading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px' }}>
                <div
                  style={{
                    width: '26px',
                    height: '26px',
                    borderRadius: '50%',
                    overflow: 'hidden',
                    background: '#090D16',
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
                    gap: '5px',
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
                    style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#8B5CF6' }}
                  />
                  <span style={{ fontSize: '0.72rem', color: '#64748B', marginLeft: '4px', fontWeight: 600 }}>
                    Synthesizing audit intelligence...
                  </span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Starter Chips (Only show if few messages) */}
          {messages.length <= 2 && !isLoading && (
            <div
              style={{
                padding: '10px 16px',
                background: '#FFFFFF',
                borderTop: '1px solid #F1F5F9',
                display: 'flex',
                flexWrap: 'wrap',
                gap: '6px',
              }}
            >
              {STARTER_PROMPTS.slice(0, 3).map((chip, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSend(chip.prompt)}
                  style={{
                    padding: '5px 10px',
                    borderRadius: '16px',
                    background: '#F1F5F9',
                    border: '1px solid #E2E8F0',
                    color: '#334155',
                    fontSize: '0.70rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#E0F2FE';
                    e.currentTarget.style.borderColor = '#38BDF8';
                    e.currentTarget.style.color = '#0284C7';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#F1F5F9';
                    e.currentTarget.style.borderColor = '#E2E8F0';
                    e.currentTarget.style.color = '#334155';
                  }}
                >
                  <span>{chip.icon}</span>
                  <span>{chip.title}</span>
                </button>
              ))}
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
              placeholder="Ask about Omnia tests, Benford scoring, column health..."
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

// ── Simple Markdown Formatter Helper ─────────────────────────────────
function renderSimpleMarkdown(raw: string): string {
  if (!raw) return '';

  let text = raw
    // Escape standard tags
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // Headings
    .replace(/^### (.*$)/gim, '<div style="font-size: 0.92rem; font-weight: 800; color: #0F172A; margin: 8px 0 4px;">$1</div>')
    .replace(/^## (.*$)/gim, '<div style="font-size: 1.0rem; font-weight: 800; color: #0F172A; margin: 10px 0 4px;">$1</div>')
    // Bold
    .replace(/\*\*(.*?)\*\*/g, '<strong style="color: #0F172A; font-weight: 750;">$1</strong>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code style="background: #F1F5F9; color: #007680; padding: 2px 5px; border-radius: 4px; font-size: 0.76rem; font-family: monospace;">$1</code>')
    // Bullet points
    .replace(/^\s*-\s(.*$)/gim, '<div style="display: flex; gap: 6px; margin: 2px 0;"><span style="color: #007680; font-weight: bold;">•</span><span>$1</span></div>');

  return text;
}
