import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  sendChatMessage,
  streamChatMessage,
  getChatbotStatus,
  resetChatbotSession,
  formatChatErrorMessage,
  extractChatErrorInfo,
} from '../services/api';
import {
  Bot,
  X,
  Send,
  Sparkles,
  RotateCcw,
  Maximize2,
  Minimize2,
  Info,
  StopCircle,
  ExternalLink,
} from 'lucide-react';

const SUGGESTED_QUESTIONS = [
  'What is projectile motion?',
  'Explain the range formula.',
  'Why is 45 degrees important?',
  'What is kinetic energy?',
  'Explain the difference between speed and velocity.',
  'Calculate the maximum height for a projectile.',
  'Explain my latest prediction.',
];

export default function AIChatbot({ currentSimulationContext }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState([
    {
      sender: 'tutor',
      text: 'Hello! I am your **PROJECTILE AI TUTOR** powered by Google Gemini. How can I help you explore kinematics, energy formulas, programming, or your latest AI prediction results today?',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputVal, setInputVal] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [statusInfo, setStatusInfo] = useState(null);
  const [isStreaming, setIsStreaming] = useState(false);

  // Auto-retry state for temporary rate limits
  const [retryCountdown, setRetryCountdown] = useState(null);
  const [pendingRetryText, setPendingRetryText] = useState(null);
  const countdownIntervalRef = useRef(null);

  const messagesEndRef = useRef(null);
  const abortControllerRef = useRef(null);
  const lastSentRef = useRef('');

  const cancelAutoRetry = () => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    setRetryCountdown(null);
    setPendingRetryText(null);
  };

  const startAutoRetry = (textToRetry, seconds, currentCount) => {
    cancelAutoRetry();
    const duration = Math.max(3, Math.min(seconds || 15, 60));
    setRetryCountdown(duration);
    setPendingRetryText(textToRetry);

    countdownIntervalRef.current = setInterval(() => {
      setRetryCountdown((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          clearInterval(countdownIntervalRef.current);
          countdownIntervalRef.current = null;
          setPendingRetryText(null);
          handleSend(textToRetry, { retryCount: currentCount + 1, isAutoRetry: true });
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, []);

  // Listen to custom events from Hero or other components
  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    const handlePrefill = (e) => {
      if (e.detail?.text) {
        setIsOpen(true);
        setTimeout(() => handleSend(e.detail.text), 100);
      }
    };
    window.addEventListener('open-ai-tutor', handleOpen);
    window.addEventListener('prefill-ai-tutor', handlePrefill);
    return () => {
      window.removeEventListener('open-ai-tutor', handleOpen);
      window.removeEventListener('prefill-ai-tutor', handlePrefill);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch status on mount
  useEffect(() => {
    getChatbotStatus()
      .then((res) => setStatusInfo(res))
      .catch(() => setStatusInfo(null));
  }, []);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isStreaming]);

  // Resolve telemetry context: from props or global window store
  const getActiveContext = () => {
    if (currentSimulationContext && Object.keys(currentSimulationContext).length > 0) {
      return currentSimulationContext;
    }
    if (typeof window !== 'undefined' && window.__PROJECTILE_SIMULATION_CONTEXT__) {
      return window.__PROJECTILE_SIMULATION_CONTEXT__;
    }
    return null;
  };

  const handleSend = async (textToSend, options = {}) => {
    const rawText = (typeof textToSend === 'string' && textToSend.trim()) ? textToSend : inputVal;
    if (!rawText || !rawText.trim()) return;

    const userMessageText = rawText.trim();
    const retryCount = options.retryCount || 0;

    // Prevent accidental duplicate submission of the exact same message while loading
    if (isLoading && userMessageText === lastSentRef.current && !options.isAutoRetry) return;
    lastSentRef.current = userMessageText;

    // Stop any pending auto-retry countdown
    if (!options.isAutoRetry) {
      cancelAutoRetry();
    }

    // If an older request is running, cancel it immediately before sending new question
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    const userMsg = {
      sender: 'user',
      text: userMessageText,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    // Update conversation state: purge any empty pending placeholder and append new user message + initial tutor placeholder
    setMessages((prev) => {
      const cleaned = prev.filter((m) => m.text && m.text.trim());
      return [
        ...cleaned,
        userMsg,
        {
          sender: 'tutor',
          text: '',
          sources: [],
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ];
    });

    setInputVal('');
    setIsLoading(true);
    setIsStreaming(true);

    // Build multi-turn history payload (exclude initial greeting, cap at last 6 messages to keep latency minimal)
    const historyPayload = messages
      .slice(1)
      .filter((m) => m.text && m.text.trim() && !m.isError)
      .slice(-6)
      .map((m) => ({
        role: m.sender === 'user' ? 'user' : 'model',
        text: m.text,
      }));

    const telemetryCtx = getActiveContext();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    let accumulatedText = '';
    let collectedSources = [];

    try {
      await streamChatMessage({
        message: userMessageText,
        simulationContext: telemetryCtx,
        history: historyPayload,
        enableGrounding: true,
        signal: controller.signal,
        onChunk: (chunkText) => {
          accumulatedText += chunkText;
          setMessages((prev) => {
            const next = [...prev];
            const lastIdx = next.length - 1;
            if (lastIdx >= 0 && next[lastIdx].sender === 'tutor') {
              next[lastIdx] = {
                ...next[lastIdx],
                text: accumulatedText,
              };
            }
            return next;
          });
        },
        onDone: (meta) => {
          if (meta.grounding_sources && meta.grounding_sources.length > 0) {
            collectedSources = meta.grounding_sources;
          }
          setMessages((prev) => {
            const next = [...prev];
            const lastIdx = next.length - 1;
            if (lastIdx >= 0 && next[lastIdx].sender === 'tutor') {
              next[lastIdx] = {
                ...next[lastIdx],
                text: accumulatedText || 'I processed your question, but no response was generated.',
                sources: collectedSources,
                modelUsed: meta.model_used,
                isError: false,
              };
            }
            return next;
          });
          setIsStreaming(false);
          setIsLoading(false);
          abortControllerRef.current = null;
        },
        onError: async (streamErr) => {
          if (controller.signal.aborted) return;
          console.warn('[Streaming Error, falling back to unary call]:', streamErr);
          try {
            const unaryRes = await sendChatMessage(
              userMessageText,
              telemetryCtx,
              historyPayload,
              true
            );
            const isErr = unaryRes.status === 'error';
            const errInfo = isErr ? extractChatErrorInfo({ response: { data: unaryRes } }) : null;

            setMessages((prev) => {
              const next = [...prev];
              const lastIdx = next.length - 1;
              if (lastIdx >= 0 && next[lastIdx].sender === 'tutor') {
                next[lastIdx] = {
                  ...next[lastIdx],
                  text: unaryRes.answer || unaryRes.message || 'No response returned.',
                  sources: unaryRes.grounding_sources || [],
                  modelUsed: unaryRes.model_used,
                  setupNotice: unaryRes.error_code === 'API_KEY_MISSING' ? unaryRes.setup_guide : null,
                  isError: isErr,
                  errorInfo: errInfo,
                  originalQuestion: userMessageText,
                };
              }
              return next;
            });

            if (isErr && errInfo?.canAutoRetry && !errInfo?.isDaily && retryCount < 2) {
              startAutoRetry(userMessageText, errInfo.retryAfter, retryCount);
            }
          } catch (unaryErr) {
            if (controller.signal.aborted) return;
            console.error('[Unary Call Error]:', unaryErr);
            const userFriendlyMsg = formatChatErrorMessage(unaryErr || streamErr);
            const errInfo = extractChatErrorInfo(unaryErr || streamErr);

            setMessages((prev) => {
              const next = [...prev];
              const lastIdx = next.length - 1;
              if (lastIdx >= 0 && next[lastIdx].sender === 'tutor') {
                next[lastIdx] = {
                  ...next[lastIdx],
                  text: userFriendlyMsg,
                  isError: true,
                  errorInfo: errInfo,
                  originalQuestion: userMessageText,
                };
              }
              return next;
            });

            if (errInfo?.canAutoRetry && !errInfo?.isDaily && retryCount < 2) {
              startAutoRetry(userMessageText, errInfo.retryAfter, retryCount);
            }
          } finally {
            setIsStreaming(false);
            setIsLoading(false);
            abortControllerRef.current = null;
          }
        },
      });
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Fatal Chat Handler Error:', err);
        const userFriendlyMsg = formatChatErrorMessage(err);
        const errInfo = extractChatErrorInfo(err);
        setMessages((prev) => {
          const next = [...prev];
          const lastIdx = next.length - 1;
          if (lastIdx >= 0 && next[lastIdx].sender === 'tutor') {
            next[lastIdx] = {
              ...next[lastIdx],
              text: userFriendlyMsg,
              isError: true,
              errorInfo: errInfo,
              originalQuestion: userMessageText,
            };
          }
          return next;
        });
        if (errInfo?.canAutoRetry && !errInfo?.isDaily && retryCount < 2) {
          startAutoRetry(userMessageText, errInfo.retryAfter, retryCount);
        }
      }
      setIsStreaming(false);
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
    setIsLoading(false);
  };

  const clearChat = async () => {
    try {
      await resetChatbotSession();
    } catch (_) {}
    setMessages([
      {
        sender: 'tutor',
        text: 'Chat history cleared. What topic or projectile physics question would you like to explore next?',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  return (
    <>
      {/* Floating Chat Trigger Button */}
      {!isOpen && (
        <div className="fixed bottom-6 right-6 z-50">
          <button
            onClick={() => setIsOpen(true)}
            className="flex items-center gap-3 px-4 py-3.5 rounded-full bg-gradient-to-r from-cyan-500 via-sky-500 to-purple-600 text-white font-semibold shadow-2xl shadow-cyan-500/30 hover:scale-105 active:scale-95 transition-all group"
            aria-label="Open AI Physics Tutor"
          >
            <div className="relative">
              <Bot className="w-6 h-6 text-white group-hover:rotate-12 transition-transform" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full animate-ping"></span>
            </div>
            <div className="text-left hidden sm:block">
              <span className="text-xs font-black block tracking-tight">PROJECTILE AI TUTOR</span>
              <span className="text-[10px] text-cyan-200 block -mt-0.5">Physics Doubts & Predictions</span>
            </div>
          </button>
        </div>
      )}

      {/* Floating Chat Drawer / Window */}
      {isOpen && (
        <div
          className={`fixed z-50 transition-all duration-300 shadow-2xl ${
            isExpanded
              ? 'inset-4 sm:inset-10'
              : 'bottom-4 right-4 w-[95vw] sm:w-[440px] h-[600px] max-h-[88vh]'
          } glass-panel border border-slate-700/80 rounded-2xl flex flex-col overflow-hidden bg-slate-950/95`}
        >
          {/* Header */}
          <div className="p-4 border-b border-slate-800 bg-slate-900/80 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-purple-600 flex items-center justify-center">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  PROJECTILE AI TUTOR
                  <span className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-purple-950 text-purple-300 border border-purple-500/30">
                    Physics AI
                  </span>
                </h3>
                <span className="text-[10px] text-slate-400 block font-mono">
                  {statusInfo?.ai_powered
                    ? `Powered by Gemini AI (${statusInfo.model || 'gemini-2.5-flash'})`
                    : 'Google Gemini AI Assistant'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={clearChat}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                title="Clear Chat History"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 hidden sm:block"
                title={isExpanded ? 'Minimize' : 'Maximize'}
              >
                {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                title="Close Tutor"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Setup notice if Gemini API key is missing */}
          {!statusInfo?.ai_powered && (
            <div className="px-4 py-2.5 bg-amber-950/40 border-b border-amber-900/50 flex items-start gap-2.5 text-[11px] text-amber-200/90">
              <Info className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-amber-300">Live Gemini AI Configuration:</span>
                <p className="mt-0.5 text-amber-200/80">
                  Set <code className="text-cyan-300 bg-slate-900 px-1 py-0.5 rounded">GEMINI_API_KEY</code> in{' '}
                  <code className="text-cyan-300 bg-slate-900 px-1 py-0.5 rounded">backend/.env</code> to unlock live LLM reasoning, code explanations, and multi-turn chat.
                </p>
              </div>
            </div>
          )}

          {/* Messages Scroll Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[90%] sm:max-w-[85%] rounded-2xl p-3.5 text-xs sm:text-sm leading-relaxed ${
                    m.sender === 'user'
                      ? 'bg-gradient-to-r from-cyan-600 to-sky-600 text-white rounded-br-none shadow-md'
                      : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-bl-none shadow-sm'
                  }`}
                >
                  {m.sender === 'user' ? (
                    <div className="whitespace-pre-wrap">{m.text}</div>
                  ) : (
                    <div className="prose prose-invert prose-sm max-w-none space-y-2">
                      {m.text ? (
                        <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
                          strong: ({ children }) => <strong className="font-semibold text-cyan-200">{children}</strong>,
                          em: ({ children }) => <em className="italic text-purple-200">{children}</em>,
                          ul: ({ children }) => <ul className="list-disc pl-4 mb-2 space-y-1">{children}</ul>,
                          ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 space-y-1">{children}</ol>,
                          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                          h1: ({ children }) => <h1 className="text-base font-bold text-white mt-2 mb-1">{children}</h1>,
                          h2: ({ children }) => <h2 className="text-sm font-bold text-cyan-300 mt-2 mb-1">{children}</h2>,
                          h3: ({ children }) => <h3 className="text-xs font-bold text-purple-300 mt-1.5 mb-1">{children}</h3>,
                          blockquote: ({ children }) => (
                            <blockquote className="border-l-2 border-cyan-500 pl-3 my-2 italic text-slate-300 bg-slate-950/40 py-1">
                              {children}
                            </blockquote>
                          ),
                          code: ({ inline, className, children, ...props }) => {
                            if (inline) {
                              return (
                                <code
                                  className="px-1.5 py-0.5 rounded text-[11px] font-mono bg-slate-950 text-cyan-300 border border-slate-800"
                                  {...props}
                                >
                                  {children}
                                </code>
                              );
                            }
                            return (
                              <pre className="p-2.5 my-2 rounded-xl bg-slate-950 border border-slate-800 font-mono text-[11px] text-cyan-100 overflow-x-auto">
                                <code>{children}</code>
                              </pre>
                            );
                          },
                          table: ({ children }) => (
                            <div className="overflow-x-auto my-2">
                              <table className="min-w-full text-left text-[11px] border-collapse border border-slate-800">
                                {children}
                              </table>
                            </div>
                          ),
                          th: ({ children }) => (
                            <th className="border border-slate-800 bg-slate-950 px-2 py-1 font-semibold text-cyan-300">
                              {children}
                            </th>
                          ),
                          td: ({ children }) => (
                            <td className="border border-slate-800 px-2 py-1">{children}</td>
                          ),
                        }}
                      >
                        {m.text}
                      </ReactMarkdown>
                    ) : (
                      <div className="flex items-center gap-2 py-1 text-cyan-400 font-mono text-xs">
                        <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
                        <span>Thinking...</span>
                      </div>
                    )}

                      {/* Web grounding citations if present */}
                      {m.sources && m.sources.length > 0 && (
                        <div className="mt-3 pt-2.5 border-t border-slate-800/80">
                          <span className="text-[10px] uppercase font-mono text-slate-400 block mb-1">
                            Verified Web Citations:
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {m.sources.map((s, sIdx) => (
                              <a
                                key={sIdx}
                                href={s.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-slate-950 hover:bg-slate-800 text-cyan-300 border border-slate-800 hover:border-cyan-500/50 transition-colors"
                              >
                                <span>{s.title || 'Web Reference'}</span>
                                <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            ))}
                          </div>
                        </div>
                      )}

                      {m.setupNotice && (
                        <div className="mt-2 pt-2 border-t border-slate-800 text-[10px] text-amber-400/90 italic">
                          {m.setupNotice}
                        </div>
                      )}

                      {m.isError && (
                        <div className="mt-3 pt-2.5 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
                          {retryCountdown !== null && pendingRetryText === m.originalQuestion ? (
                            <div className="flex items-center gap-2 text-[11px] text-amber-300 font-mono">
                              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
                              <span>Auto-retrying in {retryCountdown}s...</span>
                              <button
                                type="button"
                                onClick={() => {
                                  cancelAutoRetry();
                                  handleSend(m.originalQuestion, { retryCount: 0 });
                                }}
                                className="ml-2 px-2 py-0.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-sans text-[10px] font-semibold transition-colors"
                              >
                                Retry Now
                              </button>
                              <button
                                type="button"
                                onClick={cancelAutoRetry}
                                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-sans text-[10px] transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                cancelAutoRetry();
                                handleSend(m.originalQuestion || m.text, { retryCount: 0 });
                              }}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-cyan-900/60 text-slate-300 hover:text-cyan-200 border border-slate-700 hover:border-cyan-500/50 text-[11px] font-medium transition-all"
                            >
                              <RotateCcw className="w-3 h-3 text-cyan-400" />
                              <span>Retry Question</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <span className="text-[10px] font-mono text-slate-500 mt-1 px-1">
                  {m.sender === 'user' ? 'You' : 'AI Tutor'} &bull; {m.time}
                </span>
              </div>
            ))}

            <div ref={messagesEndRef} />
          </div>

          {/* Suggested Quick Questions */}
          <div className="p-2 border-t border-slate-800/80 bg-slate-900/40">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {SUGGESTED_QUESTIONS.map((q, qIdx) => (
                <button
                  key={qIdx}
                  type="button"
                  onClick={() => handleSend(q)}
                  className="whitespace-nowrap px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-cyan-300 border border-slate-700/60 transition-all flex items-center gap-1"
                >
                  <Sparkles className="w-2.5 h-2.5 text-purple-400" />
                  <span>{q}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Input Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="p-3 border-t border-slate-800 bg-slate-900 flex items-center gap-2"
          >
            <textarea
              rows={1}
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Ask physics, kinematics, or math (Enter to send, Shift+Enter for newline)..."
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 resize-none max-h-24 scrollbar-none leading-normal"
            />
            {isStreaming ? (
              <button
                type="button"
                onClick={handleStopGeneration}
                className="p-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold transition-all flex items-center justify-center flex-shrink-0"
                title="Stop Generation"
              >
                <StopCircle className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!inputVal.trim()}
                className="p-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-sky-500 hover:from-cyan-400 hover:to-sky-400 text-slate-950 font-bold transition-all disabled:opacity-40 flex items-center justify-center flex-shrink-0"
                title="Send Message"
              >
                <Send className="w-4 h-4" />
              </button>
            )}
          </form>
        </div>
      )}
    </>
  );
}
