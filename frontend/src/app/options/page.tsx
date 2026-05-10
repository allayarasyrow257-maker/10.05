'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useTabletStore } from '@/store/tablet-store';
import {
  Tablet, Lock, X, Shield, ChevronRight, Hash,
  CheckCircle, AlertCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface TableItem {
  id: number;
  number: number;
  tableCode: string;
  name?: string;
  status: string;
}

type TabletStep = 'idle' | 'pin' | 'tables';

export default function Home() {
  const router = useRouter();
  const { enterTabletMode } = useTabletStore();

  // Tablet flow state
  const [tabletStep, setTabletStep] = useState<TabletStep>('idle');
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [tables, setTables] = useState<TableItem[]>([]);
  const [tablesLoading, setTablesLoading] = useState(false);
  const pinInputRef = useRef<HTMLInputElement>(null);

  // Default table code for "View Menu"
  const [defaultTableCode, setDefaultTableCode] = useState<string | null>(null);

  useEffect(() => {
    api.get<TableItem[]>('/tables')
      .then((data) => {
        const sorted = data.sort((a, b) => a.number - b.number);
        if (sorted.length > 0) setDefaultTableCode(sorted[0].tableCode);
      })
      .catch(() => {});
  }, []);

  const openTabletPin = () => {
    setPin('');
    setPinError('');
    setTabletStep('pin');
    setTimeout(() => pinInputRef.current?.focus(), 100);
  };

  const handleVerifyPin = async () => {
    if (pin.length < 4) return;
    setVerifying(true);
    setPinError('');
    try {
      await api.post('/admin/verify-tablet-pin', { pin });
      // PIN correct — load all tables
      setTabletStep('tables');
      setTablesLoading(true);
      const data = await api.get<TableItem[]>('/tables');
      setTables(data.sort((a, b) => a.number - b.number));
      setTablesLoading(false);
    } catch (error: any) {
      setPinError(error.message || 'Invalid PIN');
      setPin('');
      setTimeout(() => pinInputRef.current?.focus(), 50);
    } finally {
      setVerifying(false);
    }
  };

  const handleSelectTable = (table: TableItem) => {
    enterTabletMode(table);
    router.push(`/menu?table=${table.tableCode}`);
  };

  const closeTablet = () => {
    setTabletStep('idle');
    setPin('');
    setPinError('');
    setTables([]);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'occupied': return 'from-emerald-500 to-green-600';
      case 'reserved': return 'from-yellow-500 to-orange-500';
      default: return 'from-blue-500 to-blue-600';
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
            onClick={openTabletPin}
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


      {/* ───── TABLET OVERLAY ───── */}
      <AnimatePresence>
        {tabletStep !== 'idle' && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/85 backdrop-blur-md z-40"
              onClick={closeTablet}
            />

            {/* ── PIN Entry ── */}
            {tabletStep === 'pin' && (
              <motion.div
                key="pin-panel"
                initial={{ opacity: 0, scale: 0.92, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.92, y: 20 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-6"
              >
                <div className="w-full max-w-sm bg-zinc-900 rounded-3xl border border-white/10 p-7 shadow-2xl">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-blue-500/15 flex items-center justify-center">
                        <Tablet size={22} className="text-blue-400" />
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-white">Tablet Mode</h2>
                        <p className="text-xs text-zinc-400">Enter PIN to continue</p>
                      </div>
                    </div>
                    <button
                      onClick={closeTablet}
                      className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  {/* PIN Dots display */}
                  <div className="flex justify-center gap-3 mb-5">
                    {Array.from({ length: Math.max(4, pin.length) }).map((_, i) => (
                      <motion.div
                        key={i}
                        animate={{ scale: pin.length > i ? 1.15 : 1 }}
                        className={`w-4 h-4 rounded-full transition-colors ${
                          pin.length > i
                            ? 'bg-blue-500'
                            : 'bg-white/15'
                        }`}
                      />
                    ))}
                  </div>

                  {/* Input */}
                  <div className="relative mb-4">
                    <Hash size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
                    <input
                      ref={pinInputRef}
                      type="password"
                      inputMode="numeric"
                      maxLength={6}
                      value={pin}
                      onChange={(e) => {
                        setPin(e.target.value.replace(/\D/g, ''));
                        setPinError('');
                      }}
                      onKeyDown={(e) => { if (e.key === 'Enter' && pin.length >= 4) handleVerifyPin(); }}
                      placeholder="Enter tablet PIN"
                      className="w-full pl-12 pr-4 py-4 rounded-2xl bg-zinc-800 border border-white/10 focus:outline-none focus:border-blue-500/50 text-center text-2xl font-bold tracking-[0.5em] text-white transition-colors"
                    />
                  </div>

                  {/* Error */}
                  <AnimatePresence>
                    {pinError && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20 mb-4"
                      >
                        <AlertCircle size={14} className="text-red-400 flex-shrink-0" />
                        <p className="text-xs text-red-400">{pinError}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>

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
                        Unlock Tablet
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            )}

            {/* ── Table Selection ── */}
            {tabletStep === 'tables' && (
              <motion.div
                key="tables-panel"
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 40 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
              >
                <div className="w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col bg-zinc-900 rounded-3xl border border-white/10 shadow-2xl pointer-events-auto">
                  {/* Header */}
                  <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center">
                        <CheckCircle size={20} className="text-emerald-400" />
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-white">Select Table</h2>
                        <p className="text-[11px] text-zinc-400">Tap your table to start ordering</p>
                      </div>
                    </div>
                    <button
                      onClick={closeTablet}
                      className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  {/* Tables grid */}
                  <div className="flex-1 overflow-y-auto p-6">
                    {tablesLoading ? (
                      <div className="flex justify-center py-16">
                        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                      </div>
                    ) : tables.length === 0 ? (
                      <div className="text-center py-16">
                        <Tablet size={36} className="text-zinc-700 mx-auto mb-3" />
                        <p className="text-sm text-zinc-400">No tables configured</p>
                        <p className="text-xs text-zinc-500 mt-1">Add tables in Admin → Tables</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                        {tables.map((table, i) => (
                          <motion.button
                            key={table.id}
                            initial={{ opacity: 0, scale: 0.88 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: i * 0.03 }}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={() => handleSelectTable(table)}
                            className="relative p-4 rounded-2xl border border-white/10 bg-white/[0.03] hover:bg-blue-500/10 hover:border-blue-500/40 transition-all group text-center overflow-hidden"
                          >
                            {/* Status strip */}
                            <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${getStatusColor(table.status)} opacity-60`} />

                            <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${getStatusColor(table.status)} flex items-center justify-center mx-auto mb-2 shadow-lg`}>
                              <span className="text-lg font-black text-white">{table.number}</span>
                            </div>
                            <p className="text-xs font-bold text-white truncate">
                              {table.name || `Table ${table.number}`}
                            </p>
                            <p className={`text-[10px] mt-0.5 capitalize ${
                              table.status === 'occupied' ? 'text-emerald-400'
                              : table.status === 'reserved' ? 'text-yellow-400'
                              : 'text-zinc-500'
                            }`}>{table.status}</p>

                            {/* Arrow hint */}
                            <ChevronRight
                              size={14}
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-600 group-hover:text-blue-400 transition-colors"
                            />
                          </motion.button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
