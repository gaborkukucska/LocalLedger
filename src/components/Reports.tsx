import React, { useMemo } from 'react';
import { Transaction, AccountingMethod } from '../lib/sqlite_db.ts';
import { accounting, BASReport } from '../lib/accounting.ts';
import { Download, FileCheck, Printer } from 'lucide-react';

interface ReportsProps {
  transactions: Transaction[];
  identityName?: string;
  accountingMethod?: AccountingMethod;
}

export default function Reports({ transactions, identityName, accountingMethod = 'CASH' }: ReportsProps) {
  const currentBAS = useMemo(() => {
    // Current Quarter (April - June 2026 based on current system date)
    const start = new Date(2026, 3, 1); // April 1
    const end = new Date(2026, 5, 30); // June 30
    return accounting.generateBAS(transactions, start, end, accountingMethod);
  }, [transactions, accountingMethod]);

  const reportItems = [
    { label: 'G1: Total Sales (incl. GST)', val: currentBAS.totalSales, highlight: false },
    { label: '1A: GST on Sales', val: currentBAS.gstOnSales, highlight: true },
    { label: '1B: GST on Purchases', val: currentBAS.gstOnPurchases, highlight: true },
    { label: 'Net GST Payable / Refundable', val: currentBAS.netGSTPayable, highlight: true, result: true },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="bg-white p-12 rounded-2xl border border-[#141414]/10 shadow-sm relative overflow-hidden">
        {/* Australian Govt Style Badge */}
        <div className="absolute top-8 right-8 flex items-center gap-2 opacity-20 transform rotate-12">
          <FileCheck size={48} />
          <div className="font-bold text-2xl tracking-tighter">ATO READY</div>
        </div>

        <div className="mb-12">
          <h2 className="text-3xl font-black mb-1 tracking-tight uppercase">{identityName || 'Activity Statement'}</h2>
          <p className="text-[#141414]/40 font-mono text-xs uppercase tracking-widest">ATO Period: {currentBAS.period}</p>
        </div>

        <div className="space-y-6">
          {reportItems.map((item, i) => (
            <div 
              key={i} 
              className={`flex items-center justify-between py-6 ${item.result ? 'border-t-2 border-[#141414] mt-4' : 'border-b border-[#141414]/5'}`}
            >
              <div className="space-y-1">
                <span className={`text-sm ${item.highlight ? 'font-bold' : 'text-[#141414]/60'}`}>{item.label}</span>
                {item.result && <p className="text-[10px] text-[#141414]/40 italic uppercase">Calculated on {currentBAS.method.toLowerCase()} basis</p>}
              </div>
              <div className={`text-2xl font-mono ${item.result ? 'font-black' : 'font-bold'} ${item.result && item.val > 0 ? 'text-red-600' : ''}`}>
                ${Math.abs(item.val).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                {item.result && item.val < 0 ? ' REFUND' : ''}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 flex gap-4">
          <button 
            onClick={() => window.print()}
            className="flex-1 py-4 border border-[#141414] text-[#141414] rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-[#141414]/5 transition-colors"
          >
            <Printer size={18} /> PRINT STATEMENT
          </button>
          <button className="flex-1 py-4 bg-[#141414] text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:scale-[1.02] shadow-lg transition-transform">
            <Download size={18} /> EXPORT CSV
          </button>
        </div>
      </div>

      <div className="p-6 bg-orange-50 border border-orange-100 rounded-2xl flex gap-4 items-start">
        <FileCheck className="text-orange-600 mt-1" />
        <div className="text-sm text-orange-900 leading-relaxed">
          <p className="font-bold mb-1">Disclaimer for Australian Business Owners</p>
          This report is generated based on your local transaction data. Ensure all transactions are correctly marked as <b>GST</b> or <b>GST-Free</b> before lodging with the ATO. Consult a registered tax agent if unsure.
        </div>
      </div>
    </div>
  );
}
