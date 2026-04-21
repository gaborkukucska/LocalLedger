import React, { useState, useEffect } from 'react';
import { Shield, Clock, Search, RefreshCw } from 'lucide-react';
import { motion } from 'motion/react';

export default function AuditTrail() {
  const [logs, setLogs] = useState<string[]>([]);
  const [filter, setFilter] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/system/logs', {
        headers: { 
          'x-user-id': localStorage.getItem('localedger_userid') || ''
        }
      });
      setLogs(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter(l => l.toLowerCase().includes(filter.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#141414] text-white rounded-xl flex items-center justify-center shadow-lg">
            <Shield size={20} />
          </div>
          <div>
            <h2 className="text-xl font-black tracking-tight">Audit Trail</h2>
            <p className="text-[10px] uppercase font-bold text-[#141414]/40 tracking-widest">System Fidelity Logs</p>
          </div>
        </div>
        <button 
          onClick={fetchLogs}
          disabled={isLoading}
          className="p-2 hover:bg-[#141414]/5 rounded-lg transition-colors"
        >
          <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#141414]/20" size={16} />
        <input 
          type="text" 
          placeholder="Search logs (e.g. AUDIT, transaction id)..."
          className="w-full bg-white border border-[#141414]/10 rounded-xl pl-12 pr-4 py-3 text-sm focus:outline-none focus:ring-2 ring-[#141414]/5"
          value={filter}
          onChange={e => setFilter(e.target.value)}
        />
      </div>

      <div className="bg-white border border-[#141414]/10 rounded-2xl overflow-hidden shadow-sm">
        <div className="max-h-[500px] overflow-auto font-mono text-[11px] p-4 space-y-1">
          {filteredLogs.map((log, i) => {
            const isAudit = log.includes('[AUDIT]');
            const isError = log.includes('[ERROR]');
            return (
              <div 
                key={i} 
                className={`flex gap-3 leading-relaxed ${isAudit ? 'text-blue-600 font-bold' : isError ? 'text-red-600' : 'text-[#141414]/60'}`}
              >
                <Clock size={12} className="mt-0.5 flex-shrink-0 opacity-40" />
                <span>{log}</span>
              </div>
            );
          })}
          {filteredLogs.length === 0 && (
            <div className="py-12 text-center text-[#141414]/40 italic">No logs matched your filter.</div>
          )}
        </div>
      </div>
      
      <p className="text-[10px] text-[#141414]/40 text-center italic serif">
        Showing last 200 system events. Logs are stored locally and encrypted at rest if enabled. 🇦🇺
      </p>
    </div>
  );
}
