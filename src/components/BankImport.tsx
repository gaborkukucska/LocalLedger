import React, { useState } from 'react';
import { Upload, FileText, CheckCircle, AlertTriangle } from 'lucide-react';

interface BankImportProps {
  userId: string;
  identityId?: string;
  onImported: () => void;
}

export default function BankImport({ userId, identityId, onImported }: BankImportProps) {
  const [file, setFile] = useState<File | null>(null);
  const [csvContent, setCsvContent] = useState<string>('');
  const [mapping, setMapping] = useState({
    date: 'Date',
    description: 'Description',
    amount: 'Amount'
  });
  const [headers, setHeaders] = useState<string[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [plugins, setPlugins] = useState<any[]>([]);
  const [currency, setCurrency] = useState('AUD');
  const [exchangeRate, setExchangeRate] = useState<string>('');

  React.useEffect(() => {
    const fetchPlugins = async () => {
      try {
        const res = await fetch('/api/plugins/mappers', {
          headers: { 'x-user-id': userId }
        });
        setPlugins(await res.json());
      } catch (err) {
        console.error('Failed to load plugins', err);
      }
    };
    fetchPlugins();
  }, [userId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        setCsvContent(text);
        const firstLine = text.split('\n')[0];
        setHeaders(firstLine.split(',').map(h => h.trim().replace(/"/g, '')));
      };
      reader.readAsText(selected);
    }
  };

  const runImport = async () => {
    if (!identityId) return;
    setIsImporting(true);
    try {
      const res = await fetch('/api/import', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': userId,
          'x-identity-id': identityId
        },
        body: JSON.stringify({ 
          csvContent, 
          mapping, 
          currency, 
          exchangeRate: exchangeRate ? parseFloat(exchangeRate) : undefined 
        })
      });
      const data = await res.json();
      alert(`Successfully imported ${data.count} transactions.`);
      onImported();
      setFile(null);
    } catch (err) {
      alert('Import failed. Please check your mapping.');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-white p-8 rounded-2xl border border-[#141414]/10 shadow-sm text-center">
        {!file ? (
          <label className="cursor-pointer group">
            <input type="file" accept=".csv" className="hidden" onChange={handleFileChange} />
            <div className="w-16 h-16 bg-[#141414]/5 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
              <Upload className="text-[#141414]" />
            </div>
            <h3 className="text-xl font-bold mb-2">Import Statement</h3>
            <p className="text-sm text-[#141414]/40">Upload your bank CSV file. No data leaves your machine.</p>
          </label>
        ) : (
          <div className="space-y-6 text-left">
            <div className="flex items-center gap-3 p-4 bg-green-50 rounded-xl border border-green-100">
              <CheckCircle className="text-green-600" />
              <div>
                <div className="text-sm font-bold">{file.name}</div>
                <div className="text-xs text-green-700">File loaded successfully</div>
              </div>
              <button 
                onClick={() => setFile(null)}
                className="ml-auto text-xs font-bold uppercase tracking-widest text-green-700 hover:underline"
              >
                Change
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold uppercase tracking-widest text-[#141414]/40 italic">Presets & Plugins</h4>
              </div>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setMapping({ date: 'Date', description: 'Description', amount: 'Amount' })}
                  className="px-3 py-2 bg-[#F5F5F5] border border-[#141414]/10 rounded-xl text-[10px] font-bold hover:border-[#141414]/30 transition-all"
                >
                  DEFAULT
                </button>
                {plugins.map(p => (
                  <button
                    key={p.name}
                    onClick={() => setMapping(p.mapping)}
                    className="px-3 py-2 bg-blue-50 border border-blue-100 text-blue-600 rounded-xl text-[10px] font-bold hover:scale-105 transition-all shadow-sm"
                  >
                    {p.name.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold uppercase tracking-widest text-[#141414]/40 italic">Manual Mapping</h4>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 text-[10px] text-orange-600 font-bold bg-orange-50 px-2 py-1 rounded">
                    <AlertTriangle size={10} /> REQUIRED
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {(['date', 'description', 'amount'] as const).map((key) => (
                  <div key={key} className="space-y-1.5">
                    <label className="text-xs font-bold capitalize">{key}</label>
                    <select 
                      className="w-full text-xs bg-white border border-[#141414]/10 rounded-lg p-2 focus:ring-2 ring-[#141414]/5 ring-offset-0"
                      value={mapping[key]}
                      onChange={(e) => setMapping({ ...mapping, [key]: e.target.value })}
                    >
                      {headers.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                ))}
              </div>

              <div className="flex justify-end mt-2">
                <button 
                   onClick={async () => {
                     const name = prompt('Enter a name for this bank preset:');
                     if (!name) return;
                     await fetch('/api/plugins/mappers', {
                       method: 'POST',
                       headers: { 
                         'Content-Type': 'application/json',
                         'x-user-id': userId 
                       },
                       body: JSON.stringify({ name, mapping })
                     });
                     // Refresh
                     const res = await fetch('/api/plugins/mappers', {
                       headers: { 'x-user-id': userId }
                     });
                     setPlugins(await res.json());
                   }}
                   className="text-[10px] uppercase font-bold text-blue-600 tracking-widest hover:underline px-2 py-1"
                >
                   + Save as Custom Preset
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-bold uppercase tracking-widest text-[#141414]/40 italic">Currency Settings</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold">Base Currency</label>
                  <select 
                    className="w-full text-xs bg-white border border-[#141414]/10 rounded-lg p-2"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                  >
                    <option value="AUD">AUD (Australian Dollar)</option>
                    <option value="USD">USD (US Dollar)</option>
                    <option value="EUR">EUR (Euro)</option>
                    <option value="GBP">GBP (British Pound)</option>
                    <option value="NZD">NZD (NZ Dollar)</option>
                    <option value="JPY">JPY (Japanese Yen)</option>
                  </select>
                </div>
                {currency !== 'AUD' && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-blue-600">Exchange Rate (vs AUD)</label>
                    <input 
                      type="number" 
                      step="0.0001"
                      placeholder="e.g. 0.65"
                      className="w-full text-xs bg-white border border-blue-200 text-blue-600 rounded-lg p-2 focus:ring-2 ring-blue-50"
                      value={exchangeRate}
                      onChange={(e) => setExchangeRate(e.target.value)}
                    />
                    <p className="text-[9px] text-blue-500 italic">Leave blank to use default system rates.</p>
                  </div>
                )}
              </div>
            </div>

            <button 
              onClick={runImport}
              disabled={isImporting}
              className="w-full py-4 bg-[#141414] text-white rounded-xl font-bold hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {isImporting ? 'IMPORTING...' : 'CONFIRM & IMPORT'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
