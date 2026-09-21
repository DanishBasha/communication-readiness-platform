import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../services/api';
import { 
  X, 
  Send, 
  Sparkles, 
  BookOpen, 
  MessageSquare, 
  TrendingUp, 
  CheckCircle2, 
  ArrowRight,
  Bot
} from 'lucide-react';

interface SuggestionChatModalProps {
  onClose: () => void;
  studentId?: string;
}

interface TerminologyCard {
  term: string;
  definition: string;
  betterAlternativeTo?: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  technicalTerminology?: TerminologyCard[];
  communicationSuggestions?: string[];
  structuralAdvice?: string[];
}

export const SuggestionChatModal: React.FC<SuggestionChatModalProps> = ({ onClose, studentId = 'stu-101' }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init-1',
      role: 'assistant',
      content: 'Welcome to your AI Communication Readiness Coach! You can practice drafting interview answers or ask how to explain complex architecture concepts. I evaluate both your technical terminology and communication structure.',
      technicalTerminology: [
        {
          term: 'Optimistic Concurrency Control (OCC)',
          definition: 'A concurrency strategy validating version timestamps before transaction commits to prevent deadlocks.',
          betterAlternativeTo: 'locking the database rows'
        }
      ],
      communicationSuggestions: [
        'State the architectural tradeoff first before explaining low-level syntax.',
        'Avoid filler transitions like "basically" by taking a steady 1-second breath.'
      ],
      structuralAdvice: [
        'Use S-T-A-R: Situation (High traffic), Task (Order deduplication), Action (Redis lock + Kafka), Result (<50ms p99 latency).'
      ]
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const initSession = async () => {
      try {
        const sId = await api.suggestions.getOrCreateSession(studentId);
        setSessionId(sId);
        const history = await api.suggestions.getHistory(sId);
        if (history && history.length > 0) {
          setMessages(history);
        }
      } catch (err) {
        console.warn('Using local suggestion chatbot session');
      }
    };
    initSession();
  }, [studentId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userText = input.trim();
    setInput('');

    const newMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      role: 'user',
      content: userText
    };

    setMessages(prev => [...prev, newMsg]);
    setIsLoading(true);

    try {
      const activeSession = sessionId || `sug-${Date.now()}`;
      const response = await api.suggestions.sendMessage(activeSession, userText);
      if (response && response.assistantMessage) {
        setMessages(prev => [...prev, response.assistantMessage]);
      }
    } catch (err) {
      // Fallback response if offline
      setMessages(prev => [
        ...prev,
        {
          id: `ast-${Date.now()}`,
          role: 'assistant',
          content: 'Good technical articulation. To elevate this response for campus interview panels, replace informal phrasing with specific engineering patterns and explicitly justify your caching invalidation policy.',
          technicalTerminology: [
            {
              term: 'Idempotent Consumer Pattern',
              definition: 'Ensures duplicate Kafka delivery does not alter system state twice.',
              betterAlternativeTo: 'checking if it is already done'
            }
          ],
          communicationSuggestions: [
            'Lead with the scale metrics (e.g. 1,500 req/sec) to immediately establish credibility.'
          ],
          structuralAdvice: [
            'Structure: 1. Pattern Chosen -> 2. Tradeoffs -> 3. Edge Cases.'
          ]
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white border border-neutral-200 rounded-2xl w-full max-w-2xl h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="p-4 sm:px-6 border-b border-neutral-200/80 flex items-center justify-between bg-neutral-50/50">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-neutral-900 text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-semibold tracking-tight text-neutral-900">
                  AI Suggestion & Communication Coach
                </h3>
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-100 text-emerald-800 rounded font-mono">
                  2 AGENTS ACTIVE
                </span>
              </div>
              <p className="text-[11px] text-neutral-500">
                Conversation Agent + Evaluation Agent for Technical Terminology & Clarity
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Chat Messages Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 text-xs bg-[#FAFAFA]">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl p-4 leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-neutral-900 text-white shadow-xs'
                    : 'bg-white text-neutral-800 border border-neutral-200 shadow-xs'
                }`}
              >
                <div className="flex items-center space-x-1.5 mb-1.5 text-[10px] font-mono uppercase tracking-wider text-neutral-400">
                  {m.role === 'user' ? (
                    <span>You (Student)</span>
                  ) : (
                    <span className="flex items-center text-neutral-600 font-semibold">
                      <Bot className="w-3 h-3 mr-1 text-emerald-600" /> Coaching Assistant
                    </span>
                  )}
                </div>
                <p className="whitespace-pre-wrap">{m.content}</p>

                {/* Rich Cards generated by Suggestion Evaluation Agent */}
                {m.role === 'assistant' && m.technicalTerminology && m.technicalTerminology.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-neutral-100 space-y-2.5">
                    <p className="text-[10px] font-mono font-semibold uppercase tracking-wider text-neutral-500 flex items-center">
                      <BookOpen className="w-3 h-3 mr-1 text-neutral-700" /> Recommended Technical Terminology
                    </p>
                    <div className="space-y-2">
                      {m.technicalTerminology.map((term, idx) => (
                        <div key={idx} className="p-2.5 bg-neutral-50 rounded-xl border border-neutral-200/70 text-[11px]">
                          <div className="flex items-center justify-between font-semibold text-neutral-900">
                            <span>{term.term}</span>
                            {term.betterAlternativeTo && (
                              <span className="text-[10px] font-normal text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">
                                Replaces: "{term.betterAlternativeTo}"
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-neutral-600 mt-1">{term.definition}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {m.role === 'assistant' && m.communicationSuggestions && m.communicationSuggestions.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-neutral-100 space-y-1.5">
                    <p className="text-[10px] font-mono font-semibold uppercase tracking-wider text-neutral-500 flex items-center">
                      <TrendingUp className="w-3 h-3 mr-1 text-neutral-700" /> Communication Insights
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-neutral-600 text-[11px]">
                      {m.communicationSuggestions.map((tip, idx) => (
                        <li key={idx}>{tip}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {m.role === 'assistant' && m.structuralAdvice && m.structuralAdvice.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-neutral-100 space-y-1.5">
                    <p className="text-[10px] font-mono font-semibold uppercase tracking-wider text-neutral-500 flex items-center">
                      <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" /> Structure & Delivery
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-neutral-600 text-[11px]">
                      {m.structuralAdvice.map((s, idx) => (
                        <li key={idx}>{s}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex items-center space-x-2 text-neutral-500 text-xs pl-2">
              <Sparkles className="w-3.5 h-3.5 animate-spin text-neutral-900" />
              <span>Analyzing communication and generating terminology suggestions...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSend} className="p-3 sm:p-4 border-t border-neutral-200 bg-white flex items-center space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Draft an interview answer or ask how to explain a technical concept..."
            className="flex-1 bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5 text-xs text-neutral-800 placeholder-neutral-400 focus:outline-none focus:border-neutral-900 transition-colors"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="bg-neutral-900 hover:bg-black text-white px-4 py-2.5 rounded-xl text-xs font-medium transition-all shadow-xs disabled:opacity-40 flex items-center space-x-1.5"
          >
            <span>Send</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>

      </div>
    </div>
  );
};
