import React, { useState, useEffect, useRef } from 'react';
import { Send, User as UserIcon, Bot, Sparkles, Loader2, Check, Plus, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  sources?: any[];
  suggestion?: {
    type: 'CATEGORY' | 'RULE';
    targetId?: string;
    value: string;
    pattern?: string;
    confidence?: number;
  };
}

interface ChatProps {
  identityId?: string;
  onActionApplied?: () => void;
}

export default function Chat({ identityId, onActionApplied }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    { 
      id: '1', 
      role: 'assistant', 
      content: "G'day! I'm your private AI accountant. I can help you categorize transactions or create rules. Just ask! 📊✨",
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const parseSuggestion = (content: string): Message['suggestion'] | undefined => {
    // [SUGGEST: CATEGORY Rent CONFIDENCE 0.95 FOR tx_123]
    const catMatch = content.match(/\[SUGGEST: CATEGORY (.*?) CONFIDENCE (.*?) FOR (.*?)\]/);
    if (catMatch) {
      return { type: 'CATEGORY', value: catMatch[1], confidence: parseFloat(catMatch[2]), targetId: catMatch[3] };
    }
    // Backward compatibility for older syntax
    const catMatchOld = content.match(/\[SUGGEST: CATEGORY (.*?) FOR (.*?)\]/);
    if (catMatchOld) {
      return { type: 'CATEGORY', value: catMatchOld[1], targetId: catMatchOld[2] };
    }
    // [SUGGEST: RULE patterns -> category]
    const ruleMatch = content.match(/\[SUGGEST: RULE (.*?) -> (.*?)\]/);
    if (ruleMatch) {
      return { type: 'RULE', pattern: ruleMatch[1], value: ruleMatch[2] };
    }
    return undefined;
  };

  const applyAction = async (msgId: string, suggestion: Message['suggestion']) => {
    if (!identityId || !suggestion) return;
    
    try {
      if (suggestion.type === 'CATEGORY' && suggestion.targetId) {
        await fetch(`/api/transactions/${suggestion.targetId}`, {
          method: 'PATCH',
          headers: { 
            'Content-Type': 'application/json',
            'x-user-id': localStorage.getItem('localedger_userid') || '',
            'x-identity-id': identityId
          },
          body: JSON.stringify({ category: suggestion.value, status: 'REVIEWED' })
        });
      } else if (suggestion.type === 'RULE') {
        await fetch('/api/rules', {
          method: 'POST',
          headers: { 
             'Content-Type': 'application/json',
             'x-user-id': localStorage.getItem('localedger_userid') || '',
             'x-identity-id': identityId
          },
          body: JSON.stringify({ pattern: suggestion.pattern, category: suggestion.value, taxCode: 'GST' })
        });
      }
      
      // Update message to show it was applied
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, suggestion: undefined, content: m.content + '\n\n✅ Action applied successfully!' } : m));
      onActionApplied?.();
    } catch (err) {
      alert('Failed to apply action. Check connection.');
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading || !identityId) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': localStorage.getItem('localedger_userid') || '',
          'x-identity-id': identityId
        },
        body: JSON.stringify({ prompt: input })
      });
      const data = await res.json();
      
      const suggestion = parseSuggestion(data.response);
      const cleanContent = data.response.replace(/\[SUGGEST:.*?\]/g, '').trim();

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: cleanContent || 'I have a suggestion for you:',
        timestamp: new Date(),
        sources: data.groundingMetadata ? [data.groundingMetadata] : undefined,
        suggestion
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-160px)] bg-white rounded-2xl border border-[#141414]/10 shadow-sm overflow-hidden">
      {/* Chat Messages */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#F9F9F9]"
      >
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                msg.role === 'assistant' ? 'bg-[#141414] text-white' : 'bg-blue-100 text-blue-600'
              }`}>
                {msg.role === 'assistant' ? <Bot size={16} /> : <UserIcon size={16} />}
              </div>
              <div className="flex flex-col gap-2 max-w-[80%]">
                <div className={`p-4 rounded-2xl text-sm ${
                  msg.role === 'assistant' 
                  ? 'bg-white border border-[#141414]/10 shadow-sm' 
                  : 'bg-[#141414] text-white'
                }`}>
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                  
                  {msg.sources && msg.sources.map((s, idx) => s.searchEntryPoint?.renderedContent && (
                    <div 
                      key={idx} 
                      className="mt-4 pt-4 border-t border-[#141414]/10" 
                      dangerouslySetInnerHTML={{ __html: s.searchEntryPoint.renderedContent }}
                    />
                  ))}

                  <div className={`text-[9px] mt-1 opacity-40 ${msg.role === 'user' ? 'text-right' : ''}`}>
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>

                {msg.suggestion && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex items-center justify-between gap-4"
                  >
                    <div className="text-[10px] font-bold text-blue-600 uppercase tracking-widest leading-tight">
                       Proposed {msg.suggestion.type}: {msg.suggestion.confidence && `(${Math.round(msg.suggestion.confidence * 100)}% Match)`}<br/>
                       <span className="text-[#141414] normal-case text-xs">
                         {msg.suggestion.type === 'CATEGORY' ? `Apply "${msg.suggestion.value}" to transaction` : `New rule: "${msg.suggestion.pattern}" → ${msg.suggestion.value}`}
                       </span>
                    </div>
                    <button 
                      onClick={() => applyAction(msg.id, msg.suggestion)}
                      className="bg-[#141414] text-white px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:scale-105 transition-transform whitespace-nowrap"
                    >
                      Apply Now
                    </button>
                  </motion.div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {isLoading && (
          <div className="flex gap-3">
             <div className="w-8 h-8 rounded-full bg-[#141414] text-white flex items-center justify-center animate-pulse">
                <Bot size={16} />
              </div>
              <div className="bg-white border border-[#141414]/10 p-4 rounded-2xl flex items-center gap-2 text-xs text-[#141414]/40 font-mono">
                <Loader2 size={12} className="animate-spin" /> THINKING...
              </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-[#141414]/10">
        <div className="flex gap-2 p-1.5 bg-[#F5F5F5] rounded-xl border border-[#141414]/5">
          <input
            type="text"
            placeholder="Ask your AI accountant anything..."
            className="flex-1 bg-transparent px-3 py-2 text-sm focus:outline-none"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          />
          <button 
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="bg-[#141414] text-white p-2 rounded-lg hover:scale-105 transition-transform disabled:opacity-50"
          >
            <Send size={18} />
          </button>
        </div>
        <div className="flex justify-center gap-4 mt-3">
          <button 
            onClick={() => setInput("Summarize my expenses for me 📊")}
            className="text-[10px] uppercase font-bold text-[#141414]/40 hover:text-[#141414] transition-colors"
          >
            Summarize 📊
          </button>
          <button 
            onClick={() => setInput("Check for tax savings 💰")}
            className="text-[10px] uppercase font-bold text-[#141414]/40 hover:text-[#141414] transition-colors"
          >
            Tax Savings 💰
          </button>
          <button 
             onClick={() => setInput("Explain my last transaction 🧐")}
            className="text-[10px] uppercase font-bold text-[#141414]/40 hover:text-[#141414] transition-colors"
          >
            Explain Last 🧐
          </button>
        </div>
      </div>
    </div>
  );
}
