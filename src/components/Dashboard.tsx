import React from 'react';
import { motion } from 'motion/react';
import { Transaction } from '../lib/db.ts';
import { 
  TrendingUp, 
  TrendingDown, 
  CreditCard, 
  DollarSign,
  AlertCircle
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';

interface DashboardProps {
  transactions: Transaction[];
  username: string;
  identityId?: string;
  onRefresh?: () => void;
}

export default function Dashboard({ transactions, username, identityId, onRefresh }: DashboardProps) {
  const incoming = transactions
    .filter(t => t.amount > 0)
    .reduce((acc, t) => acc + t.amount, 0);
  
  const outgoing = transactions
    .filter(t => t.amount < 0)
    .reduce((acc, t) => acc + Math.abs(t.amount), 0);

  const stats = [
    { label: 'Total Inflow', val: incoming, icon: TrendingUp, color: 'text-green-600' },
    { label: 'Total Outflow', val: outgoing, icon: TrendingDown, color: 'text-red-600' },
    { label: 'Net Position', val: incoming - outgoing, icon: DollarSign, color: 'text-[#141414]' },
  ];

  // Group by category for chart
  const categories = transactions.reduce((acc: any, t) => {
    if (t.amount < 0) {
      acc[t.category] = (acc[t.category] || 0) + Math.abs(t.amount);
    }
    return acc;
  }, {});
  
  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-96 bg-white rounded-2xl border border-[#141414]/10 shadow-sm text-center p-8">
        <div className="w-16 h-16 bg-[#141414]/5 rounded-full flex items-center justify-center mb-6">
          <CreditCard size={32} className="text-[#141414]/40" />
        </div>
        <h2 className="text-2xl font-bold font-serif mb-2">Welcome to LocaLedger</h2>
        <p className="text-[#141414]/60 max-w-md mb-8">
          Your private, local-first accountant is ready. To get started:
        </p>
        <div className="flex flex-col items-start text-left gap-4 max-w-md">
          <div className="flex items-center gap-3">
             <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">1</div>
             <span className="text-sm">Head to <b>Bank Import</b> and securely load your bank statements (.csv)</span>
          </div>
          <div className="flex items-center gap-3">
             <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">2</div>
             <span className="text-sm">Use the <b>Transactions</b> tab to rapidly categorize, or use Bulk Match</span>
          </div>
          <div className="flex items-center gap-3">
             <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">3</div>
             <span className="text-sm">Chat with the <b>AI Accountant</b> to generate categorization rules!</span>
          </div>
        </div>
      </div>
    );
  }

  const chartData = Object.entries(categories).map(([name, value]) => ({ name, value }));

  const pendingCount = transactions.filter(t => t.status === 'PENDING').length;

  const handleBulkVerify = async () => {
    if (!identityId) return;
    try {
      await fetch('/api/transactions/bulk-verify', {
        method: 'POST',
        headers: { 
          'x-user-id': localStorage.getItem('localedger_userid') || '',
          'x-identity-id': identityId
        }
      });
      onRefresh?.();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-8">
      {/* AI Welcome Banner */}
      <div className="flex flex-col lg:flex-row gap-6">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex-1 bg-[#141414] text-white p-8 rounded-3xl shadow-2xl relative overflow-hidden group"
        >
          <div className="relative z-10">
            <h1 className="text-3xl font-black mb-2 tracking-tight">G'day, {username}! 👋</h1>
            <p className="text-white/60 text-sm max-w-xl italic serif">
              I've analyzed your latest transactions. Your net position is {incoming > outgoing ? 'looking healthy' : 'a bit tight'} this month. Need a BAS breakdown or want to categorize some new entries? I'm here to help! 📊✨
            </p>
          </div>
          <div className="absolute right-[-20px] top-[-20px] opacity-10 group-hover:rotate-12 transition-transform duration-700 pointer-events-none">
             <DollarSign size={200} />
          </div>
          <div className="mt-6 flex gap-3 relative z-10">
             <div className="px-3 py-1 bg-white/10 rounded-full text-[10px] font-bold uppercase tracking-widest border border-white/10">
                Ollama Optimized 🤖
             </div>
             <div className="px-3 py-1 bg-white/10 rounded-full text-[10px] font-bold uppercase tracking-widest border border-white/10">
                Local & Private 🔒
             </div>
          </div>
        </motion.div>

        {pendingCount > 0 && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="lg:w-72 bg-white border-2 border-orange-200 p-8 rounded-3xl flex flex-col justify-center items-center text-center shadow-lg"
          >
            <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center mb-4">
               <AlertCircle size={24} />
            </div>
            <div className="text-3xl font-black text-[#141414]">{pendingCount}</div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-[#141414]/40 mt-1">Pending Review</div>
            <p className="text-xs text-[#141414]/60 mt-3 italic serif">AI suggestions ready for your approval.</p>
            <button 
              onClick={handleBulkVerify}
              className="mt-4 w-full py-2 bg-[#141414] text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-transform"
            >
              Verify All
            </button>
          </motion.div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl border border-[#141414]/10 shadow-sm transition-transform hover:-translate-y-1">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase tracking-widest text-[#141414]/40">{stat.label}</span>
              <stat.icon size={18} className={stat.color} />
            </div>
            <div className={`text-3xl font-bold ${stat.color}`}>
              ${stat.val.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
          </div>
        ))}
      </div>

      {/* Chart & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-2xl border border-[#141414]/10 shadow-sm">
          <h3 className="text-lg font-bold mb-6 italic serif tracking-tight">Spending by Category</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#14141410" />
                <XAxis dataKey="name" fontSize={11} axisLine={false} tickLine={false} />
                <YAxis fontSize={11} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
                <Tooltip 
                  cursor={{ fill: '#14141405' }}
                  contentStyle={{ borderRadius: '12px', border: '1px solid #14141410', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#141414' : '#14141480'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 rounded-2xl border border-[#141414]/10 shadow-sm overflow-hidden flex flex-col">
          <h3 className="text-lg font-bold mb-6 italic serif tracking-tight">Recent Activity</h3>
          <div className="flex-1 space-y-4">
            {transactions.slice(-5).reverse().map((tx) => (
              <div key={tx.id} className="flex items-center justify-between p-3 rounded-xl border border-[#141414]/5 hover:bg-[#141414]/5 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${tx.amount > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {tx.amount > 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                  </div>
                  <div>
                    <div className="text-sm font-bold">{tx.description}</div>
                    <div className="text-xs text-[#141414]/40">{tx.category}</div>
                  </div>
                </div>
                <div className={`text-sm font-mono font-bold ${tx.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {tx.amount > 0 ? '+' : ''}{tx.amount.toFixed(2)}
                </div>
              </div>
            ))}
            {transactions.length === 0 && (
              <div className="text-center py-12 text-[#141414]/40 text-sm">
                No transactions yet. Import your first bank statement to start.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
