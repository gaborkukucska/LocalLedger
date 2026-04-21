import React, { useState } from 'react';
import { BrainCircuit, Sparkles, Plus, Trash2 } from 'lucide-react';
import { LearningRule } from '../lib/sqlite_db.ts';

interface RulesProps {
  rules: LearningRule[];
  userId: string;
  identityId?: string;
  onUpdate: () => void;
}

export default function Rules({ rules, userId, identityId, onUpdate }: RulesProps) {
  const [testDesc, setTestDesc] = useState('');
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const analyzeDescription = async () => {
    if (!testDesc || !identityId) return;
    setIsAnalyzing(true);
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': userId,
          'x-identity-id': identityId
        },
        body: JSON.stringify({
          prompt: `As an expert Australian bookkeeper, suggest a broad category (Rent, Utilities, Software, Meals, Travel, Supplies, Marketing, Sales) for a transaction with description: "${testDesc}". Reply ONLY with the category name.`,
        })
      });
      const data = await res.json();
      setSuggestion(data.response.trim());
    } catch (err) {
      console.error(err);
      setSuggestion('Failed connecting to Ollama');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const addRule = async (pattern: string, category: string) => {
    if (!identityId) return;
    await fetch('/api/rules', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-user-id': userId,
        'x-identity-id': identityId
      },
      body: JSON.stringify({ pattern, category, taxCode: 'GST' })
    });
    setSuggestion(null);
    setTestDesc('');
    onUpdate();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* AI Assistant Card */}
      <div className="lg:col-span-1 space-y-6">
        <div className="bg-[#141414] text-white p-8 rounded-2xl shadow-xl space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center">
              <BrainCircuit size={20} className="text-white" />
            </div>
            <div>
              <h3 className="font-bold">Local Intelligence</h3>
              <p className="text-[10px] text-white/50 uppercase tracking-widest">Powered by Ollama</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-white/70">Test Pattern</label>
              <input 
                type="text" 
                placeholder="e.g. WOOLWORTHS MARRICKVILLE"
                className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm focus:outline-none focus:ring-1 ring-white/20"
                value={testDesc}
                onChange={(e) => setTestDesc(e.target.value)}
              />
            </div>
            
            <button 
              onClick={analyzeDescription}
              disabled={isAnalyzing}
              className="w-full py-3 bg-white text-[#141414] rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-white/90 transition-colors disabled:opacity-50"
            >
              {isAnalyzing ? (
                <div className="w-4 h-4 border-2 border-[#141414] border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <Sparkles size={16} />
              )}
              {isAnalyzing ? 'THINKING...' : 'ANALYZE PATTERN'}
            </button>

            {suggestion && (
              <div className="p-4 bg-white/5 rounded-xl border border-white/10 animate-in fade-in slide-in-from-top-2">
                <div className="text-[10px] uppercase font-bold text-white/40 mb-1">Suggested Category</div>
                <div className="text-lg font-bold mb-3">{suggestion}</div>
                <button 
                  onClick={() => addRule(testDesc, suggestion)}
                  className="w-full py-2 bg-green-600/20 text-green-400 border border-green-600/30 rounded-lg text-xs font-bold hover:bg-green-600/30 transition-colors flex items-center justify-center gap-2"
                >
                  <Plus size={14} /> CREATE RULE
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Rules List */}
      <div className="lg:col-span-2 space-y-6">
        <h3 className="text-xl font-bold italic serif">Active Learning Rules</h3>
        <div className="bg-white rounded-2xl border border-[#141414]/10 shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#141414]/10 bg-[#141414]/5">
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-[#141414]/40 italic serif">Pattern</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-[#141414]/40 italic serif">Category</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-[#141414]/40 italic serif">Tax</th>
                <th className="px-6 py-4 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#141414]/5">
              {rules.map((rule) => (
                <tr key={rule.id} className="hover:bg-[#141414]/5 transition-colors">
                  <td className="px-6 py-4 font-mono text-xs">{rule.pattern}</td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-bold px-2 py-1 bg-[#141414]/5 rounded">{rule.category}</span>
                  </td>
                  <td className="px-6 py-4 text-xs">{rule.taxCode}</td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-red-400 hover:text-red-600 p-1.5 rounded transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
              {rules.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-[#141414]/40 text-sm">
                    No rules yet. Use the local AI to train your ledger.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
