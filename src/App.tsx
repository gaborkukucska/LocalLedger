import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  ArrowLeftRight, 
  Upload, 
  BrainCircuit, 
  MessageSquare,
  FileText, 
  Settings, 
  Menu, 
  X,
  CreditCard,
  TrendingUp,
  AlertCircle,
  User as UserIcon,
  LogOut,
  Plus,
  Users,
  BookOpen,
  Package,
  Globe
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Transaction, LearningRule, BankAccount, User, TaxIdentity, IdentityType, AccountingMethod, InventoryItem } from './lib/sqlite_db.ts';

// View Components
import Dashboard from './components/Dashboard.tsx';
import Transactions from './components/Transactions.tsx';
import BankImport from './components/BankImport.tsx';
import Rules from './components/Rules.tsx';
import Reports from './components/Reports.tsx';
import Chat from './components/Chat.tsx';
import AuditTrail from './components/AuditTrail.tsx';
import KnowledgeBase from './components/KnowledgeBase.tsx';
import Inventory from './components/Inventory.tsx';

type View = 'dashboard' | 'chat' | 'transactions' | 'import' | 'rules' | 'knowledge' | 'reports' | 'settings' | 'inventory';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<Partial<User>[]>([]);
  const [identities, setIdentities] = useState<TaxIdentity[]>([]);
  const [activeIdentity, setActiveIdentity] = useState<TaxIdentity | null>(null);
  const [activeView, setActiveView] = useState<View>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [rules, setRules] = useState<LearningRule[]>([]);
  
  // Auth Form State
  const [isReg, setIsReg] = useState(false);
  const [username, setUsername] = useState('');
  const [pwd, setPwd] = useState('');

  // Identity Form State
  const [isAddingIdentity, setIsAddingIdentity] = useState(false);
  const [newIdName, setNewIdName] = useState('');
  const [newIdType, setNewIdType] = useState<IdentityType>('PERSONAL');
  const [newIdMethod, setNewIdMethod] = useState<AccountingMethod>('CASH');

  useEffect(() => {
    const savedUser = localStorage.getItem('localedger_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    fetchUsers();
  }, []);

  useEffect(() => {
    if (user) {
      fetchIdentities();
    }
  }, [user]);

  useEffect(() => {
    if (user && activeIdentity) {
      fetchData();
    }
  }, [user, activeIdentity]);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users');
      setUsers(await res.json());
    } catch (err) {
      console.error(err);
    }
  };

  const fetchIdentities = async () => {
    if (!user) return;
    try {
      const res = await fetch('/api/identities', {
        headers: { 'x-user-id': user.id }
      });
      const ids = await res.json();
      setIdentities(ids);
      if (ids.length > 0 && !activeIdentity) {
        setActiveIdentity(ids[0]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchData = async () => {
    if (!user || !activeIdentity) return;
    try {
      const headers = { 
        'x-user-id': user.id,
        'x-identity-id': activeIdentity.id 
      };
      const [txRes, rulesRes] = await Promise.all([
        fetch('/api/transactions', { headers }),
        fetch('/api/rules', { headers })
      ]);
      setTransactions(await txRes.json());
      setRules(await rulesRes.json());
    } catch (err) {
      console.error('Failed to load data', err);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const endpoint = isReg ? '/api/auth/register' : '/api/auth/login';
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password: pwd })
      });
      const data = await res.json();
      if (data.id) {
        setUser(data);
        localStorage.setItem('localedger_user', JSON.stringify(data));
        localStorage.setItem('localedger_userid', data.id);
        setPwd('');
      } else {
        alert(data.error || 'Login failed');
      }
    } catch (err) {
      alert('Connection error');
    }
  };

  const handleAddIdentity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      const res = await fetch('/api/identities', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': user.id 
        },
        body: JSON.stringify({ 
          name: newIdName, 
          type: newIdType,
          accountingMethod: newIdMethod
        })
      });
      const newId = await res.json();
      setIdentities(prev => [...prev, newId]);
      setActiveIdentity(newId);
      setIsAddingIdentity(false);
      setNewIdName('');
    } catch (err) {
      alert('Failed to add identity');
    }
  };

  const logout = () => {
    setUser(null);
    setActiveIdentity(null);
    setIdentities([]);
    localStorage.removeItem('localedger_user');
    localStorage.removeItem('localedger_userid');
  };

  if (!user) {
    return (
      <div className="h-screen bg-[#F5F5F5] flex items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-12 rounded-3xl border border-[#141414]/10 shadow-2xl max-w-md w-full"
        >
          <div className="flex justify-center mb-8">
             <div className="w-16 h-16 bg-[#141414] rounded-2xl flex items-center justify-center shadow-xl rotate-3 transform transition-transform hover:rotate-0">
                <span className="text-white font-black text-3xl">L</span>
              </div>
          </div>
          <h1 className="text-3xl font-black text-center mb-2 tracking-tight">LocaLedger</h1>
          <p className="text-center text-[#141414]/40 text-sm mb-8 italic serif">Secure Family Accounting 🇦🇺</p>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-[#141414]/40">Username</label>
              <input 
                type="text" 
                className="w-full bg-[#F5F5F5] border border-[#141414]/5 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 ring-[#141414]/5 transition-all"
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-[#141414]/40">Password</label>
              <input 
                type="password" 
                className="w-full bg-[#F5F5F5] border border-[#141414]/5 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 ring-[#141414]/5 transition-all"
                value={pwd}
                onChange={e => setPwd(e.target.value)}
                required
              />
            </div>
            <button className="w-full py-4 bg-[#141414] text-white rounded-2xl font-bold text-sm tracking-widest uppercase hover:scale-[1.02] shadow-xl active:scale-[0.98] transition-all">
              {isReg ? 'Create Account' : 'Sign In'}
            </button>
          </form>

          <button 
            onClick={() => setIsReg(!isReg)}
            className="w-full mt-6 text-xs font-bold text-[#141414]/40 hover:text-[#141414] transition-colors"
          >
            {isReg ? 'Already have an account? Sign In' : 'Need an account? Register'}
          </button>

          {users.length > 0 && !isReg && (
            <div className="mt-8 pt-8 border-t border-[#141414]/10">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#141414]/40 mb-4 text-center">Family Profiles</p>
              <div className="flex justify-center gap-4 flex-wrap">
                {users.map(u => (
                  <button 
                    key={u.id}
                    onClick={() => setUsername(u.username || '')}
                    className="flex flex-col items-center gap-1 group"
                  >
                    <div className="w-10 h-10 rounded-full bg-[#141414]/5 flex items-center justify-center group-hover:bg-[#141414] group-hover:text-white transition-colors">
                      <UserIcon size={16} />
                    </div>
                    <span className="text-[10px] font-bold">{u.username}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </div>
    );
  }

  const navItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Overview' },
    { id: 'chat', icon: MessageSquare, label: 'AI Chat' },
    { id: 'transactions', icon: ArrowLeftRight, label: 'Transactions' },
    { id: 'import', icon: Upload, label: 'Import Bank' },
    { id: 'rules', icon: BrainCircuit, label: 'AI Mapping' },
    { id: 'inventory', icon: Package, label: 'Inventory' },
    { id: 'knowledge', icon: BookOpen, label: 'Knowledge' },
    { id: 'reports', icon: FileText, label: 'BAS Report' },
    { id: 'settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <div className="flex h-screen bg-[#F5F5F5] font-sans text-[#141414] relative overflow-hidden">
      {/* Mobile Toggle */}
      <button 
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="lg:hidden fixed top-4 right-4 z-50 p-2 bg-[#141414] text-white rounded-lg shadow-xl"
      >
        {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          onClick={() => setIsSidebarOpen(false)}
          className="lg:hidden fixed inset-0 bg-[#141414]/20 backdrop-blur-sm z-30"
        />
      )}

      {/* Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ width: isSidebarOpen ? 260 : 80 }}
        className={`bg-white border-r border-[#141414]/10 flex flex-col z-40 fixed inset-y-0 lg:relative transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        <div className="p-6 flex items-center gap-3 border-bottom border-[#141414]/10">
          <div className="w-8 h-8 bg-[#141414] rounded-lg flex items-center justify-center shadow-lg">
            <span className="text-white font-black text-xl">L</span>
          </div>
          {isSidebarOpen && <span className="font-black text-xl tracking-tighter">LocaLedger</span>}
        </div>

        {/* Identity Selector */}
        {isSidebarOpen && (
          <div className="px-3 mb-4">
            <div className="text-[9px] font-bold uppercase tracking-widest text-[#141414]/40 px-3 mb-2">Active Entity</div>
            <div className="space-y-1">
              {identities.map(id => (
                <button
                  key={id.id}
                  onClick={() => setActiveIdentity(id)}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                    activeIdentity?.id === id.id 
                    ? 'bg-[#141414]/5 border-[#141414]/20 text-[#141414]' 
                    : 'border-transparent text-[#141414]/40 hover:bg-[#141414]/5'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>{id.name}</span>
                    <span className="text-[8px] opacity-40">{id.type[0]}</span>
                  </div>
                </button>
              ))}
              <button 
                onClick={() => setIsAddingIdentity(true)}
                className="w-full text-left px-3 py-2 rounded-xl text-[10px] font-bold text-blue-600 hover:bg-blue-50 transition-colors flex items-center gap-2"
              >
                <Plus size={12} /> Add Identity
              </button>
            </div>
          </div>
        )}

        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id as View)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                activeView === item.id 
                ? 'bg-[#141414] text-white shadow-xl translate-x-1' 
                : 'hover:bg-[#141414]/5 text-[#141414]/60'
              }`}
            >
              <item.icon size={20} />
              {isSidebarOpen && <span className="text-sm font-bold tracking-tight">{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-[#141414]/10">
          <button 
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-red-500 hover:bg-red-50 transition-colors"
          >
            <LogOut size={20} />
            {isSidebarOpen && <span className="text-sm font-bold">Log Out</span>}
          </button>
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="w-full mt-2 p-2 flex justify-center text-[#141414]/20 hover:text-[#141414] transition-colors"
          >
             {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto flex flex-col">
        {/* Identity Add Modal Overlay */}
        {isAddingIdentity && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#141414]/20 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-8 rounded-3xl border border-[#141414]/10 shadow-2xl max-w-sm w-full"
            >
              <h3 className="text-xl font-black mb-4">New Identity</h3>
              <form onSubmit={handleAddIdentity} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[#141414]/40">Entity Name</label>
                  <input 
                    type="text" 
                    placeholder="e.g. My Sole Trader Biz"
                    className="w-full bg-[#F5F5F5] border border-[#141414]/10 rounded-xl p-3 text-sm"
                    value={newIdName}
                    onChange={e => setNewIdName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[#141414]/40">Type</label>
                  <select 
                    className="w-full bg-[#F5F5F5] border border-[#141414]/10 rounded-xl p-3 text-sm"
                    value={newIdType}
                    onChange={e => setNewIdType(e.target.value as IdentityType)}
                  >
                    <option value="PERSONAL">Personal</option>
                    <option value="SOLE_TRADER">Sole Trader</option>
                    <option value="COMPANY">Company</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[#141414]/40">Accounting Basis</label>
                  <div className="flex gap-2">
                    {['CASH', 'ACCRUAL'].map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setNewIdMethod(m as AccountingMethod)}
                        className={`flex-1 py-2 text-[10px] font-black rounded-lg border transition-all ${
                          newIdMethod === m 
                          ? 'bg-[#141414] text-white border-[#141414]' 
                          : 'bg-[#F5F5F5] text-[#141414]/40 border-[#141414]/5 hover:border-[#141414]/20'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                  <p className="text-[8px] text-[#141414]/40 italic mt-1 leading-tight">
                    {newIdMethod === 'CASH' 
                      ? 'GST is reported only after payment/receipt.' 
                      : 'GST is reported when invoice is issued/received.'}
                  </p>
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setIsAddingIdentity(false)} className="flex-1 py-3 text-xs font-bold text-[#141414]/40">Cancel</button>
                  <button type="submit" className="flex-1 py-3 bg-[#141414] text-white rounded-xl text-xs font-bold">Create</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* Header */}
        <header className="h-16 bg-white border-b border-[#141414]/10 px-8 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#141414]/40 italic serif">
              {navItems.find(n => n.id === activeView)?.label}
            </h2>
            {activeIdentity && (
              <div className="flex items-center gap-2">
                <div className="w-1 h-1 rounded-full bg-[#141414]/20"></div>
                <span className="text-[10px] font-black uppercase text-blue-600 tracking-widest">{activeIdentity.name}</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-4">
             <div className="flex items-center gap-2 group cursor-pointer">
                <div className="text-right hidden sm:block">
                  <div className="text-xs font-black">{user.username}</div>
                  <div className="text-[9px] uppercase font-bold text-[#141414]/40 tracking-widest">Family Profile</div>
                </div>
                <div className="w-8 h-8 rounded-full bg-[#141414]/5 border border-[#141414]/10 flex items-center justify-center group-hover:bg-[#141414] group-hover:text-white transition-all">
                  <UserIcon size={16} />
                </div>
             </div>
          </div>
        </header>

        {/* View Transition */}
        <div className="p-8 max-w-7xl mx-auto w-full">
          <AnimatePresence mode="wait">
            <motion.div
              key={`${activeView}-${activeIdentity?.id}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeView === 'dashboard' && <Dashboard transactions={transactions} username={user.username} identityId={activeIdentity?.id} onRefresh={fetchData} />}
              {activeView === 'chat' && <Chat identityId={activeIdentity?.id} onActionApplied={fetchData} />}
              {activeView === 'transactions' && <Transactions transactions={transactions} userId={user.id} identityId={activeIdentity?.id} onUpdate={fetchData} />}
              {activeView === 'import' && <BankImport userId={user.id} identityId={activeIdentity?.id} onImported={fetchData} />}
              {activeView === 'rules' && <Rules rules={rules} userId={user.id} identityId={activeIdentity?.id} onUpdate={fetchData} />}
              {activeView === 'inventory' && <Inventory userId={user.id} identityId={activeIdentity?.id} />}
              {activeView === 'knowledge' && <KnowledgeBase userId={user.id} />}
              {activeView === 'reports' && <Reports transactions={transactions} identityName={activeIdentity?.name} accountingMethod={activeIdentity?.accountingMethod} />}
              {activeView === 'settings' && (
                <div className="bg-white rounded-2xl border border-[#141414]/10 p-12 shadow-sm">
                   <div className="flex items-center gap-4 mb-8">
                      <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center">
                        <Settings />
                      </div>
                      <div>
                        <h3 className="text-2xl font-black tracking-tight">System Settings</h3>
                        <p className="text-sm text-[#141414]/40 italic serif">Privacy & Local Infrastructure</p>
                      </div>
                   </div>
                   
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="p-6 bg-[#F5F5F5] rounded-3xl border border-[#141414]/5">
                        <div className="font-bold mb-2">Local LLM Host</div>
                        <p className="text-xs text-[#141414]/40 mb-4">Ollama endpoint for private accounting.</p>
                        <input 
                          type="text" 
                          defaultValue="http://localhost:11434"
                          className="w-full bg-white border border-[#141414]/10 rounded-xl p-3 text-sm font-mono"
                        />
                      </div>
                      
                      <div className="p-6 bg-[#F5F5F5] rounded-3xl border border-[#141414]/5">
                        <div className="font-bold mb-2">Data Location</div>
                        <p className="text-xs text-[#141414]/40 mb-4">Your accounting database is stored securely.</p>
                        <div className="flex gap-2">
                           <div className="text-xs font-mono bg-[#141414] text-white p-3 rounded-xl flex-1 truncate">
                             {window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? './data/localedger.db' : '/data/localedger.db'}
                           </div>
                           <button 
                             onClick={() => {
                               if (!activeIdentity?.id) return alert('Select an active entity first.');
                               window.open(`/api/export/data?userId=${user.id}&identityId=${activeIdentity.id}`, '_blank');
                             }}
                             className="px-4 py-3 bg-[#141414] text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:scale-105 transition-transform whitespace-nowrap shadow-md"
                           >
                              Export Data
                           </button>
                        </div>
                      </div>
                   </div>

                   <div className="mt-12 pt-12 border-t border-[#141414]/10">
                      <AuditTrail />
                   </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
