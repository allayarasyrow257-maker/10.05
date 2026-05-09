'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Tablet, Lock, X, Hash, Shield, Monitor } from 'lucide-react';
import toast from 'react-hot-toast';

interface TableItem {
  id: number;
  number: number;
  tableCode: string;
  name?: string;
  status: string;
  hasTabletPin?: boolean;
}

export default function Home() {
  const router = useRouter();

  // Tablet state
  const [showTablet, setShowTablet] = useState(false);
  const [tables, setTables] = useState<TableItem[]>([]);
  const [tablesLoading, setTablesLoading] = useState(false);
  const [selectedTable, setSelectedTable] = useState<TableItem | null>(null);
  const [pin, setPin] = useState('');
  const [verifying, setVerifying] = useState(false);



  // Default table code for "View Menu"
  const [defaultTableCode, setDefaultTableCode] = useState<string | null>(null);

  useEffect(() => {
    api.get<TableItem[]>('/tables')
      .then((data) => {
        const sorted = data.sort((a, b) => a.number - b.number);
        if (sorted.length > 0) setDefaultTableCode(sorted[0].tableCode);
      })
      .catch(() => { });
  }, []);

  const handleOpenTablet = () => {
    setShowTablet(true);
    setTablesLoading(true);
    api.get<TableItem[]>('/tables')
      .then((data) => setTables(data.filter((t) => t.hasTabletPin)))
      .catch(() => toast.error('Failed to load tables'))
      .finally(() => setTablesLoading(false));
  };

  const handleVerifyPin = async () => {
    if (!selectedTable || !pin) return;
    setVerifying(true);
    try {
      await api.post('/tables/verify-pin', {
        tableId: selectedTable.id,
        pin,
      });
      toast.success(`Table ${selectedTable.number} — unlocked`);
      router.push(`/menu?table=${selectedTable.tableCode}`);
    } catch (error: any) {
      toast.error(error.message || 'Invalid PIN');
      setPin('');
    } finally {
      setVerifying(false);
    }
  };



  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center space-y-8 p-8"
      >
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring' }}
        >
          <h1 className="text-6xl font-bold text-gradient mb-4">QR Menu</h1>
          <p className="text-xl text-muted-foreground">
            Modern Restaurant Ordering System
          </p>
        </motion.div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              if (defaultTableCode) router.push(`/menu?table=${defaultTableCode}`);
              else toast.error('No tables available');
            }}
            className="px-8 py-4 gradient-primary rounded-2xl text-white font-semibold text-lg shadow-lg shadow-purple-500/25"
          >
            View Menu
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleOpenTablet}
            className="px-8 py-4 rounded-2xl font-semibold text-lg bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2"
          >
            <Tablet size={20} />
            Tablet
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => router.push('/admin')}
            className="px-8 py-4 glass rounded-2xl font-semibold text-lg flex items-center justify-center gap-2"
          >
            <Shield size={18} />
            Admin
          </motion.button>
        </div>

        <p className="text-sm text-muted-foreground">
          Scan a QR code on your table to start ordering
        </p>
      </motion.div>



      {/* ───── TABLET: Table Selection Overlay ───── */}
      <AnimatePresence>
        {showTablet && !selectedTable && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-md z-40"
              onClick={() => setShowTablet(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
            >
              <div className="w-full max-w-2xl max-h-[80vh] overflow-y-auto bg-zinc-900 rounded-3xl border border-white/10 shadow-2xl pointer-events-auto">
                <div className="sticky top-0 z-10 bg-zinc-900/95 backdrop-blur-md border-b border-white/5 px-6 py-4 flex items-center justify-between rounded-t-3xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/15 flex items-center justify-center">
                      <Tablet size={20} className="text-blue-400" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-white">Select Table</h2>
                      <p className="text-[11px] text-zinc-400">Tap your table to enter PIN</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowTablet(false)}
                    className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="p-6">
                  {tablesLoading ? (
                    <div className="flex justify-center py-12">
                      <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : tables.length === 0 ? (
                    <div className="text-center py-12">
                      <Tablet size={32} className="text-zinc-700 mx-auto mb-3" />
                      <p className="text-sm text-zinc-400">No tables with PIN configured</p>
                      <p className="text-xs text-zinc-500 mt-1">Set PINs in Admin → Tables</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                      {tables.map((table, i) => (
                        <motion.button
                          key={table.id}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: i * 0.03 }}
                          onClick={() => { setSelectedTable(table); setPin(''); }}
                          className="p-4 rounded-2xl border border-white/10 bg-white/[0.02] hover:bg-blue-500/10 hover:border-blue-500/30 transition-all group text-center"
                        >
                          <div className="w-12 h-12 rounded-full bg-blue-500/10 group-hover:bg-blue-500/20 flex items-center justify-center mx-auto mb-2 transition-colors">
                            <span className="text-lg font-black text-blue-400">{table.number}</span>
                          </div>
                          <p className="text-xs font-bold text-white truncate">
                            {table.name || `Table ${table.number}`}
                          </p>
                        </motion.button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ───── PIN Modal ───── */}
      <AnimatePresence>
        {selectedTable && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60]"
              onClick={() => setSelectedTable(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-0 z-[60] flex items-center justify-center p-6"
            >
              <div className="w-full max-w-sm bg-zinc-900 rounded-3xl border border-white/10 p-6 shadow-2xl">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-lg font-bold text-white">
                      Table {selectedTable.number}
                    </h2>
                    <p className="text-xs text-zinc-400">Enter PIN to start ordering</p>
                  </div>
                  <button
                    onClick={() => setSelectedTable(null)}
                    className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="relative">
                    <Hash size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
                    <input
                      type="password"
                      inputMode="numeric"
                      maxLength={6}
                      value={pin}
                      onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                      onKeyDown={(e) => { if (e.key === 'Enter' && pin.length >= 4) handleVerifyPin(); }}
                      placeholder="4-6 digit PIN"
                      autoFocus
                      className="w-full pl-12 pr-4 py-4 rounded-2xl bg-zinc-800 border border-white/10 focus:outline-none focus:border-blue-500/50 text-center text-2xl font-bold tracking-[0.5em] text-white transition-colors"
                    />
                  </div>
                  <button
                    onClick={handleVerifyPin}
                    disabled={pin.length < 4 || verifying}
                    className="w-full py-4 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-700 disabled:text-zinc-500 text-white font-bold text-sm transition-colors flex items-center justify-center gap-2"
                  >
                    {verifying ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Lock size={16} />
                        Unlock & Order
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
