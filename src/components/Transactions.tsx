import React, { useState } from 'react';
import { Transaction } from '../lib/sqlite_db.ts';
import { Check, Edit2, Shield, MoreVertical } from 'lucide-react';

interface TransactionsProps {
  transactions: Transaction[];
  userId: string;
  identityId?: string;
  onUpdate: () => void;
}

export default function Transactions({ transactions, userId, identityId, onUpdate }: TransactionsProps) {
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleStatusChange = async (id: string, status: Transaction['status']) => {
    if (!identityId) return;
    await fetch(`/api/transactions/${id}`, {
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/json',
        'x-user-id': userId,
        'x-identity-id': identityId
      },
      body: JSON.stringify({ status })
    });
    onUpdate();
  };

  const handleCategoryChange = async (id: string, category: string) => {
    if (!identityId) return;
    await fetch(`/api/transactions/${id}`, {
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/json',
        'x-user-id': userId,
        'x-identity-id': identityId
      },
      body: JSON.stringify({ category })
    });
    setEditingId(null);
    onUpdate();
  };

  const categories = [
    'Sales', 'Software', 'Rent', 'Travel', 'Meals', 'Supplies', 'Marketing', 'Uncategorized'
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold italic serif">Ledger</h3>
        <button 
          onClick={async () => {
             const pending = transactions.filter(t => t.status !== 'RECONCILED');
             if (pending.length === 0) return alert('No pending transactions to reconcile.');
             if (!confirm(`Are you sure you want to bulk reconcile ${pending.length} transactions?`)) return;
             
             try {
               await Promise.all(pending.map(t => fetch(`/api/transactions/${t.id}`, {
                 method: 'PATCH',
                 headers: { 
                   'Content-Type': 'application/json',
                   'x-user-id': userId,
                   'x-identity-id': identityId || ''
                 },
                 body: JSON.stringify({ status: 'RECONCILED' })
               })));
               onUpdate();
             } catch(err) {
               alert('Error bulk reconciling');
             }
          }}
          className="px-4 py-2 bg-green-600 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-green-700 transition-colors shadow-sm flex items-center gap-2"
        >
          <Check size={14} /> Bulk Reconcile Current
        </button>
      </div>
      <div className="bg-white rounded-2xl border border-[#141414]/10 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-[#141414]/10 bg-[#141414]/5">
            <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-[#141414]/40 italic serif">Date</th>
            <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-[#141414]/40 italic serif">Description</th>
            <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-[#141414]/40 italic serif">Amount</th>
            <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-[#141414]/40 italic serif">Category</th>
            <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-[#141414]/40 italic serif">Tax Code</th>
            <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-[#141414]/40 italic serif">Status</th>
            <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-[#141414]/40 italic serif text-right">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#141414]/5">
          {transactions.slice().reverse().map((tx) => (
            <tr key={tx.id} className="hover:bg-[#141414]/5 transition-colors group">
              <td className="px-6 py-4 text-xs font-mono">{new Date(tx.date).toLocaleDateString()}</td>
              <td className="px-6 py-4">
                <div className="text-sm font-bold">{tx.description}</div>
              </td>
              <td className={`px-6 py-4 text-sm font-mono font-bold ${tx.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                <div>{tx.amount.toFixed(2)} AUD</div>
                {tx.currency && tx.currency !== 'AUD' && (
                  <div className="text-[10px] opacity-40 italic serif">
                    {tx.originalAmount?.toFixed(2)} {tx.currency} (Rate: {tx.exchangeRate})
                  </div>
                )}
              </td>
              <td className="px-6 py-4">
                {editingId === tx.id ? (
                  <select 
                    autoFocus
                    className="text-xs bg-white border border-[#141414]/10 rounded p-1"
                    onChange={(e) => handleCategoryChange(tx.id, e.target.value)}
                    onBlur={() => setEditingId(null)}
                  >
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                ) : (
                  <button 
                    onClick={() => setEditingId(tx.id)}
                    className="text-xs px-2 py-1 bg-[#141414]/5 rounded hover:bg-[#141414]/10 transition-colors"
                  >
                    {tx.category}
                  </button>
                )}
              </td>
              <td className="px-6 py-4">
                <span className="text-[10px] font-mono px-1.5 py-0.5 border border-[#141414]/20 rounded text-[#141414]/60">
                  {tx.taxCode}
                </span>
              </td>
              <td className="px-6 py-4">
                <span className={`text-[9px] uppercase font-black tracking-widest px-2.5 py-1 rounded-lg ${
                  tx.status === 'RECONCILED' ? 'bg-[#141414] text-white' : 
                  tx.status === 'REVIEWED' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700 animate-pulse'
                }`}>
                  {tx.status === 'PENDING' ? 'AI Review' : tx.status}
                </span>
              </td>
              <td className="px-6 py-4 text-right">
                <div className="flex justify-end gap-2">
                  {tx.status !== 'RECONCILED' && (
                    <button 
                      onClick={() => handleStatusChange(tx.id, 'RECONCILED')}
                      className="p-1.5 text-green-600 hover:bg-green-100 rounded transition-colors"
                      title="Mark as Reconciled"
                    >
                      <Check size={14} />
                    </button>
                  )}
                  <button className="p-1.5 text-[#141414]/40 hover:bg-[#141414]/10 rounded transition-colors opacity-0 group-hover:opacity-100">
                    <MoreVertical size={14} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    </div>
  );
}
