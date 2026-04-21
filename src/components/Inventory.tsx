import React, { useState, useEffect } from 'react';
import { 
  Package, 
  Plus, 
  Search, 
  TrendingDown, 
  AlertTriangle,
  Edit2,
  Trash2,
  DollarSign,
  Tag,
  Layers
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { InventoryItem } from '../lib/db.ts';

interface InventoryProps {
  userId: string;
  identityId?: string;
}

export default function Inventory({ userId, identityId }: InventoryProps) {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [quantity, setQuantity] = useState(0);
  const [costPrice, setCostPrice] = useState(0);
  const [salePrice, setSalePrice] = useState(0);
  const [category, setCategory] = useState('');

  useEffect(() => {
    fetchInventory();
  }, [identityId]);

  const fetchInventory = async () => {
    if (!identityId) return;
    try {
      const res = await fetch('/api/inventory', {
        headers: { 
          'x-user-id': userId,
          'x-identity-id': identityId
        }
      });
      const data = await res.json();
      setItems(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identityId) return;

    const payload = { name, sku, quantity, costPrice, salePrice, category };
    
    try {
      if (editingItem) {
        await fetch(`/api/inventory/${editingItem.id}`, {
          method: 'PATCH',
          headers: { 
            'Content-Type': 'application/json',
            'x-user-id': userId,
            'x-identity-id': identityId
          },
          body: JSON.stringify(payload)
        });
      } else {
        await fetch('/api/inventory', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'x-user-id': userId,
            'x-identity-id': identityId
          },
          body: JSON.stringify(payload)
        });
      }
      resetForm();
      fetchInventory();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!identityId || !confirm('Are you sure you want to delete this item?')) return;
    try {
      await fetch(`/api/inventory/${id}`, {
        method: 'DELETE',
        headers: { 
          'x-user-id': userId,
          'x-identity-id': identityId
        }
      });
      fetchInventory();
    } catch (err) {
      console.error(err);
    }
  };

  const resetForm = () => {
    setName('');
    setSku('');
    setQuantity(0);
    setCostPrice(0);
    setSalePrice(0);
    setCategory('');
    setIsAdding(false);
    setEditingItem(null);
  };

  const filteredItems = items.filter(i => 
    i.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    i.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalValue = items.reduce((acc, i) => acc + (i.quantity * i.costPrice), 0);
  const lowStock = items.filter(i => i.quantity < 5).length;

  return (
    <div className="space-y-8 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black italic serif tracking-tight">Inventory Tracking</h2>
          <p className="text-sm text-[#141414]/40 mt-1">Manage your stock, SKUs, and margins.</p>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="flex items-center justify-center gap-2 bg-[#141414] text-white px-6 py-3 rounded-2xl font-bold text-sm tracking-widest uppercase hover:scale-105 active:scale-95 transition-all shadow-xl"
        >
          <Plus size={18} /> Add Item
        </button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-[#141414]/10 shadow-sm">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
               <Layers size={20} />
            </div>
            <span className="text-xs font-bold uppercase tracking-widest text-[#141414]/40">Total Items</span>
          </div>
          <div className="text-3xl font-bold">{items.length}</div>
        </div>
        
        <div className="bg-white p-6 rounded-2xl border border-[#141414]/10 shadow-sm">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-10 h-10 rounded-xl bg-green-100 text-green-600 flex items-center justify-center">
               <DollarSign size={20} />
            </div>
            <span className="text-xs font-bold uppercase tracking-widest text-[#141414]/40">Total Stock Value</span>
          </div>
          <div className="text-3xl font-bold">${totalValue.toLocaleString()}</div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-[#141414]/10 shadow-sm">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
               <TrendingDown size={20} />
            </div>
            <span className="text-xs font-bold uppercase tracking-widest text-[#141414]/40">Low Stock</span>
          </div>
          <div className="text-3xl font-bold text-orange-600">{lowStock}</div>
        </div>
      </div>

      {/* Search & Table */}
      <div className="bg-white rounded-3xl border border-[#141414]/10 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-[#141414]/5 flex items-center gap-4">
          <Search size={18} className="text-[#141414]/20" />
          <input 
            type="text" 
            placeholder="Search by name or SKU..."
            className="flex-1 bg-transparent text-sm font-medium focus:outline-none"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#141414]/5">
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-[#141414]/40">Product</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-[#141414]/40">SKU</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-[#141414]/40">Stock</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-[#141414]/40">Cost</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-[#141414]/40">Price</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-[#141414]/40 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#141414]/5">
              {filteredItems.map(item => (
                <tr key={item.id} className="hover:bg-[#141414]/5 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="font-bold text-[#141414]">{item.name}</div>
                    <div className="text-[10px] text-[#141414]/40 uppercase tracking-widest font-bold mt-0.5">{item.category}</div>
                  </td>
                  <td className="px-6 py-4 text-xs font-mono text-[#141414]/60">{item.sku}</td>
                  <td className="px-6 py-4">
                    <div className={`flex items-center gap-2 text-sm font-bold ${item.quantity < 5 ? 'text-orange-600' : ''}`}>
                      {item.quantity}
                      {item.quantity < 5 && <AlertTriangle size={14} />}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm">${item.costPrice.toFixed(2)}</td>
                  <td className="px-6 py-4 text-sm font-bold">${item.salePrice.toFixed(2)}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => {
                          setEditingItem(item);
                          setName(item.name);
                          setSku(item.sku);
                          setQuantity(item.quantity);
                          setCostPrice(item.costPrice);
                          setSalePrice(item.salePrice);
                          setCategory(item.category);
                          setIsAdding(true);
                        }}
                        className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => handleDelete(item.id)}
                        className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredItems.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-[#141414]/40 italic serif text-sm">
                    No items found. Add your first inventory item to track your gear.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Slide-over Modal */}
      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-50 flex items-center justify-end bg-[#141414]/20 backdrop-blur-sm pointer-events-auto">
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              className="w-full max-w-md h-full bg-white shadow-2xl p-8 overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-black italic serif">{editingItem ? 'Edit Item' : 'New Item'}</h3>
                <button 
                  onClick={resetForm}
                  className="p-2 hover:bg-[#141414]/5 rounded-full"
                >
                  <Trash2 size={20} className="text-[#141414]/40" />
                </button>
              </div>

              <form onSubmit={handleSave} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[#141414]/40">Product Name</label>
                  <input 
                    type="text" 
                    className="w-full bg-[#F5F5F5] border border-[#141414]/5 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 ring-[#141414]/5"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-[#141414]/40">SKU / ID</label>
                    <input 
                      type="text" 
                      className="w-full bg-[#F5F5F5] border border-[#141414]/5 rounded-xl px-4 py-3 text-sm"
                      value={sku}
                      onChange={e => setSku(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-[#141414]/40">Stock Qty</label>
                    <input 
                      type="number" 
                      className="w-full bg-[#F5F5F5] border border-[#141414]/5 rounded-xl px-4 py-3 text-sm"
                      value={quantity}
                      onChange={e => setQuantity(Number(e.target.value))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-[#141414]/40">Cost Price</label>
                    <div className="relative">
                      <DollarSign size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#141414]/40" />
                      <input 
                        type="number" 
                        step="0.01"
                        className="w-full bg-[#F5F5F5] border border-[#141414]/5 rounded-xl pl-10 pr-4 py-3 text-sm"
                        value={costPrice}
                        onChange={e => setCostPrice(Number(e.target.value))}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-[#141414]/40">Sale Price</label>
                    <div className="relative">
                      <Tag size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#141414]/40" />
                      <input 
                        type="number" 
                        step="0.01"
                        className="w-full bg-[#F5F5F5] border border-[#141414]/5 rounded-xl pl-10 pr-4 py-3 text-sm"
                        value={salePrice}
                        onChange={e => setSalePrice(Number(e.target.value))}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[#141414]/40">Category</label>
                  <input 
                    type="text" 
                    className="w-full bg-[#F5F5F5] border border-[#141414]/5 rounded-xl px-4 py-3 text-sm"
                    placeholder="e.g. Services, Physical Goods"
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                  />
                </div>

                <div className="pt-6 space-y-3">
                  <div className="p-4 bg-blue-50 rounded-2xl flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">Est. Margin</span>
                    <span className="font-bold text-blue-700">
                      {salePrice > 0 ? `${Math.round(((salePrice - costPrice) / salePrice) * 100)}%` : '0%'}
                    </span>
                  </div>
                  <button className="w-full py-4 bg-[#141414] text-white rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl hover:scale-105 active:scale-95 transition-all">
                    {editingItem ? 'Update Item' : 'Add to Stock'}
                  </button>
                  <button 
                    type="button" 
                    onClick={resetForm}
                    className="w-full py-4 text-[#141414]/40 font-bold text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
