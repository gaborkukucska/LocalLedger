import React, { useState, useEffect } from 'react';
import { BookOpen, Upload, FileText, Trash2, Search, ExternalLink } from 'lucide-react';

interface KnowledgeFile {
  name: string;
  size: number;
}

export default function KnowledgeBase({ userId }: { userId: string }) {
  const [files, setFiles] = useState<KnowledgeFile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const fetchFiles = async () => {
    try {
      const res = await fetch('/api/knowledge', {
        headers: { 'x-user-id': userId }
      });
      setFiles(await res.json());
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      await fetch('/api/knowledge/upload', {
        method: 'POST',
        headers: { 'x-user-id': userId },
        body: formData
      });
      fetchFiles();
    } catch (err) {
      alert('Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const deleteFile = async (name: string) => {
    if (!confirm(`Delete ${name}?`)) return;
    try {
      await fetch(`/api/knowledge/${name}`, {
        method: 'DELETE',
        headers: { 'x-user-id': userId }
      });
      fetchFiles();
    } catch (err) {
      alert('Delete failed');
    }
  };

  const filteredFiles = files.filter(f => f.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-[#141414] text-white rounded-2xl flex items-center justify-center shadow-lg">
            <BookOpen />
          </div>
          <div>
            <h2 className="text-3xl font-black tracking-tight uppercase">Knowledge Base</h2>
            <p className="text-sm text-[#141414]/40 italic serif uppercase">Source Documents for RAG Accountant</p>
          </div>
        </div>
        
        <label className={`flex items-center gap-2 px-6 py-3 bg-[#141414] text-white rounded-xl font-bold cursor-pointer hover:scale-[1.02] transition-all ${isUploading ? 'opacity-50' : ''}`}>
          <Upload size={18} />
          <span>{isUploading ? 'INDEXING...' : 'UPLOAD DOC'}</span>
          <input type="file" className="hidden" onChange={handleUpload} disabled={isUploading} />
        </label>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#141414]/20" size={18} />
            <input 
              type="text" 
              placeholder="Search indexed legislation, PDFs, and notes..."
              className="w-full bg-white border border-[#141414]/10 rounded-2xl pl-12 pr-4 py-4 text-sm focus:ring-2 ring-[#141414]/5"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="bg-white border border-[#141414]/10 rounded-3xl overflow-hidden shadow-sm">
            <div className="p-6 border-b border-[#141414]/5 flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#141414]/40">Active Corpus</span>
              <span className="text-[10px] font-bold text-[#141414]/40">{files.length} DOCUMENTS</span>
            </div>
            
            <div className="divide-y divide-[#141414]/5">
              {filteredFiles.map(file => (
                <div key={file.name} className="p-4 flex items-center justify-between hover:bg-[#F5F5F5]/30 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                      <FileText size={20} />
                    </div>
                    <div>
                      <div className="text-sm font-black tracking-tight">{file.name}</div>
                      <div className="text-[10px] text-[#141414]/40 font-mono uppercase">
                        {(file.size / 1024).toFixed(1)} KB • Local RAG Indexed
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => deleteFile(file.name)}
                    className="p-2 text-[#141414]/20 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
              {filteredFiles.length === 0 && (
                <div className="p-12 text-center text-[#141414]/40 italic serif">
                  Your knowledge base is empty. Upload ATO legislation or custom notes to empower the AI Accountant.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-[#141414] text-white p-8 rounded-3xl shadow-xl space-y-4 relative overflow-hidden">
            <div className="absolute -top-4 -right-4 opacity-10">
              <BookOpen size={120} />
            </div>
            <h3 className="text-xl font-black italic serif">RAG Insights</h3>
            <p className="text-sm text-white/60 leading-relaxed">
              When documents are uploaded, LocaLedger indexes them locally. The AI Accountant will "consult" these facts before making categorization suggestions.
            </p>
            <div className="pt-4 space-y-2">
              <div className="text-[10px] font-bold uppercase tracking-widest text-white/40">Trusted ATO Sources</div>
              <a href="https://www.ato.gov.au/business/gst/" target="_blank" rel="noreferrer" className="flex items-center justify-between text-xs font-bold hover:translate-x-1 transition-transform border-b border-white/10 pb-2">
                ATO GST Guide <ExternalLink size={12} />
              </a>
              <a href="https://www.ato.gov.au/business/bus/tax-legislation---the-basics/" target="_blank" rel="noreferrer" className="flex items-center justify-between text-xs font-bold hover:translate-x-1 transition-transform border-b border-white/10 pb-2">
                Tax Legislation <ExternalLink size={12} />
              </a>
            </div>
          </div>

          <div className="p-6 bg-orange-50 border border-orange-100 rounded-3xl">
             <div className="text-[10px] font-black uppercase text-orange-600 mb-2">Privacy Check</div>
             <p className="text-xs text-orange-900 leading-relaxed font-medium">
               Document indexing happens on your local machine. No data is sent to external clouds for embedding/indexing when using Local RAG mode.
             </p>
          </div>
        </div>
      </div>
    </div>
  );
}
