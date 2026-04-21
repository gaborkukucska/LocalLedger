import { Transaction, AccountingMethod } from './sqlite_db';

export interface BASReport {
  period: string;
  totalSales: number; // G1
  gstOnSales: number; // 1A
  gstOnPurchases: number; // 1B
  netGSTPayable: number;
  method: AccountingMethod;
}

export const accounting = {
  calculateGST: (amount: number, taxCode: Transaction['taxCode']) => {
    if (taxCode === 'GST') {
      // Amount is usually gross (including GST)
      return amount - amount / 1.1; 
    }
    return 0;
  },
  generateBAS: (transactions: Transaction[], startDate: Date, endDate: Date, method: AccountingMethod = 'CASH'): BASReport => {
    const periodTxs = transactions.filter(tx => {
      const date = new Date(tx.date);
      const isDateInRange = date >= startDate && date <= endDate;
      
      if (method === 'CASH') {
        // Only include items that have been verified/reconciled
        return isDateInRange && (tx.status === 'REVIEWED' || tx.status === 'RECONCILED');
      }
      
      // Accrual includes everything in the period
      return isDateInRange;
    });

    let totalSales = 0;
    let gstOnSales = 0;
    let gstOnPurchases = 0;

    periodTxs.forEach(tx => {
      if (tx.amount > 0) {
        // Income
        totalSales += tx.amount;
        if (tx.taxCode === 'GST') {
          gstOnSales += tx.amount - tx.amount / 1.1;
        }
      } else {
        // Expense
        if (tx.taxCode === 'GST') {
          gstOnPurchases += Math.abs(tx.amount) - Math.abs(tx.amount) / 1.1;
        }
      }
    });

    return {
      period: `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`,
      totalSales,
      gstOnSales,
      gstOnPurchases,
      netGSTPayable: gstOnSales - gstOnPurchases,
      method
    };
  }
};
