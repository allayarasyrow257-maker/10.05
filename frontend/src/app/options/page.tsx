'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { api } from '@/lib/api';
import { useTabletStore } from '@/store/tablet-store';
import { useTheme } from '@/components/theme-provider';
import { useCartStore } from '@/store/cart-store';
import {
  Tablet, Lock, X, Shield, ChevronRight, Hash,
  CheckCircle, AlertCircle, Sun, Moon, ChevronDown, Check,
  Monitor, UserCheck, UtensilsCrossed,
} from 'lucide-react';
import toast from 'react-hot-toast';

const LANGUAGES = [
  { code: 'tk', label: 'Turkmen', flag: '🇹🇲' },
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'ru', label: 'Russian', flag: '🇷🇺' },
  { code: 'tr', label: 'Turkish', flag: '🇹🇷' },
];

interface TableItem {
  id: number;
  number: number;
  tableCode: string;
  name?: string;
  status: string;
}

type ActiveModal = 'none' | 'tablet-pin' | 'tablet-tables' | 'waiter-password';

export default function OptionsPage() {
  const router = useRouter();
  const { enterTabletMode } = useTabletStore();
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage } = useCartStore();

  // Shared state
  const [activeModal, setActiveModal] = useState<ActiveModal>('none');
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [tables, setTables] = useState<TableItem[]>([]);
  const [tablesLoading, setTablesLoading] = useState(false);
  const [defaultTableCode, setDefaultTableCode] = useState<string | null>(null);

  // Waiter password
  const [waiterPassword, setWaiterPassword] = useState('');
  const [waiterError, setWaiterError] = useState('');
  const [waiterVerifying, setWaiterVerifying] = useState(false);

  // Language dropdown
  const [showLangDropdown, setShowLangDropdown] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);
  const pinInputRef = useRef<HTMLInputElement>(null);
  const waiterInputRef = useRef<HTMLInputElement>(null);

  const activeLang = LANGUAGES.find(l => l.code === language) || LANGUAGES[1];

  useEffect(() => {
    api.get<TableItem[]>('/tables')
      .then((data) => {
        const sorted = data.sort((a, b) => a.number - b.number);
        if (sorted.length > 0) setDefaultTableCode(sorted[0].tableCode);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(event.target as Node)) {
        setShowLangDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Labels
  const t = {
    title: { en: 'QR Menu', tk: 'QR Menýu', ru: 'QR Меню', tr: 'QR Menü' },
    subtitle: { en: 'Restaurant Management System', tk: 'Restoran dolandyryş ulgamy', ru: 'Система управления рестораном', tr: 'Restoran Yönetim Sistemi' },
    tablet: { en: 'Tablet Mode', tk: 'Planşet tertibi', ru: 'Режим планшета', tr: 'Tablet Modu' },
    tabletDesc: { en: 'Order management for tables', tk: 'Stollar üçin sargyt dolandyryşy', ru: 'Управление заказами для столов', tr: 'Masalar için sipariş yönetimi' },
    admin: { en: 'Admin Panel', tk: 'Admin Paneli', ru: 'Панель администратора', tr: 'Yönetici Paneli' },
    adminDesc: { en: 'Full restaurant management', tk: 'Doly restoran dolandyryşy', ru: 'Полное управление рестораном', tr: 'Tam restoran yönetimi' },
    waiter: { en: 'Waiter Panel', tk: 'Ofisiant paneli', ru: 'Панель официанта', tr: 'Garson Paneli' },
    waiterDesc: { en: 'View orders & manage tables', tk: 'Sargytlary görmek we stollary dolandyrmak', ru: 'Просмотр заказов и управление столами', tr: 'Siparişleri görüntüle ve masaları yönet' },
    enterPin: { en: 'Enter PIN to continue', tk: 'Dowam etmek üçin PIN giriziň', ru: 'Введите PIN для продолжения', tr: 'Devam etmek için PIN girin' },
    unlockTablet: { en: 'Unlock Tablet', tk: 'Planşeti açyň', ru: 'Разблокировать планшет', tr: 'Tableti Aç' },
    selectTable: { en: 'Select Table', tk: 'Stol saýlaň', ru: 'Выберите стол', tr: 'Masa Seçin' },
    selectTableDesc: { en: 'Tap your table to start ordering', tk: 'Sargyt bermek üçin stoluňyzy saýlaň', ru: 'Нажмите на свой стол для начала заказа', tr: 'Sipariş vermek için masanıza dokunun' },
    noTables: { en: 'No tables configured', tk: 'Stol düzülmedi', ru: 'Столы не настроены', tr: 'Masa yapılandırılmadı' },
    enterWaiterPassword: { en: 'Enter waiter password', tk: 'Ofisiant parolyny giriziň', ru: 'Введите пароль официанта', tr: 'Garson şifresini girin' },
    unlock: { en: 'Unlock', tk: 'Açmak', ru: 'Разблокировать', tr: 'Kilidi Aç' },
  };

  const label = (key: keyof typeof t) => t[key][language as keyof (typeof t)[typeof key]] || t[key].en;

  const openTabletPin = () => {
    setPin('');
    setPinError('');
    setActiveModal('tablet-pin');
    setTimeout(() => pinInputRef.current?.focus(), 100);
  };

  const openWaiterPassword = () => {
    setWaiterPassword('');
    setWaiterError('');
    setActiveModal('waiter-password');
    setTimeout(() => waiterInputRef.current?.focus(), 100);
  };

  const handleVerifyPin = async () => {
    if (pin.length < 4) return;
    setVerifying(true);
    setPinError('');
    try {
      await api.post('/admin/verify-tablet-pin', { pin });
      setActiveModal('tablet-tables');
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

  const handleVerifyWaiterPassword = async () => {
    if (!waiterPassword) return;
    setWaiterVerifying(true);
    setWaiterError('');
    try {
      const res = await api.post<{ ok: boolean; token: string }>('/admin/verify-waiter-password', { password: waiterPassword });
      sessionStorage.setItem('waiter_authorized', 'true');
      localStorage.setItem('waiter_token', res.token);
      router.push('/waiter');
    } catch (error: any) {
      setWaiterError(error.message || 'Invalid password');
      setWaiterPassword('');
      setTimeout(() => waiterInputRef.current?.focus(), 50);
    } finally {
      setWaiterVerifying(false);
    }
  };

  const handleSelectTable = (table: TableItem) => {
    enterTabletMode(table);
    router.push(`/menu?table=${table.tableCode}`);
  };

  const closeModal = () => {
    setActiveModal('none');
    setPin('');
    setPinError('');
    setWaiterPassword('');
    setWaiterError('');
    setTables([]);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'occupied': return 'from-emerald-500 to-green-600';
      case 'reserved': return 'from-yellow-500 to-orange-500';
      default: return 'from-blue-500 to-blue-600';
    }
  };

  const cards = [
    {
      key: 'tablet',
      icon: Tablet,
      title: label('tablet'),
      desc: label('tabletDesc'),
      gradient: 'from-blue-500 to-cyan-500',
      shadow: 'shadow-blue-500/20',
      onClick: openTabletPin,
    },
    {
      key: 'admin',
      icon: Shield,
      title: label('admin'),
      desc: label('adminDesc'),
      gradient: 'from-purple-500 to-pink-500',
      shadow: 'shadow-purple-500/20',
      onClick: () => router.push('/admin'),
    },
    {
      key: 'waiter',
      icon: UserCheck,
      title: label('waiter'),
      desc: label('waiterDesc'),
      gradient: 'from-amber-500 to-orange-500',
      shadow: 'shadow-amber-500/20',
      onClick: openWaiterPassword,
    },
  ];

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background decorative meal images */}
      <div className="absolute left-0 bottom-0 w-48 md:w-72 lg:w-96 opacity-15 dark:opacity-10 pointer-events-none select-none">
        <Image src="/meal left.png" alt="" width={400} height={400} className="w-full h-auto" priority />
      </div>
      <div className="absolute right-0 bottom-0 w-48 md:w-72 lg:w-96 opacity-15 dark:opacity-10 pointer-events-none select-none">
        <Image src="/meal right.png" alt="" width={400} height={400} className="w-full h-auto" priority />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl border-b border-black/5 dark:border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/20">
              <UtensilsCrossed size={20} className="text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg dark:text-white leading-tight">QR Menu</h1>
              <p className="text-[10px] font-bold text-orange-500 uppercase tracking-widest">Management</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Language Selector */}
            <div className="relative" ref={langRef}>
              <button
                onClick={() => setShowLangDropdown(!showLangDropdown)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-100 dark:bg-white/5 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-white/10 transition-all text-sm"
              >
                <span className="text-base leading-none">{activeLang.flag}</span>
                <span className="text-xs font-bold uppercase tracking-wider hidden sm:inline">{activeLang.code}</span>
                <ChevronDown size={14} className={`transition-transform duration-200 ${showLangDropdown ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence>
                {showLangDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.95 }}
                    className="absolute right-0 mt-2 w-44 bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-black/5 dark:border-white/10 overflow-hidden z-50"
                  >
                    <div className="p-1.5 space-y-0.5">
                      {LANGUAGES.map((lang) => (
                        <button
                          key={lang.code}
                          onClick={() => { setLanguage(lang.code as any); setShowLangDropdown(false); }}
                          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                            language === lang.code
                              ? 'bg-zinc-100 dark:bg-white/10 text-zinc-900 dark:text-white'
                              : 'text-zinc-500 hover:bg-zinc-50 dark:hover:bg-white/5 hover:text-zinc-900 dark:hover:text-white'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-base leading-none">{lang.flag}</span>
                            <span>{lang.label}</span>
                          </div>
                          {language === lang.code && <Check size={14} />}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2.5 rounded-xl bg-zinc-100 dark:bg-white/5 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-white/10 transition-all"
            >
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12 md:mb-16"
        >
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.15, type: 'spring' }}
          >
            <h2 className="text-4xl sm:text-5xl md:text-6xl font-black text-gradient mb-3">{label('title')}</h2>
            <p className="text-base sm:text-lg text-muted-foreground max-w-md mx-auto">{label('subtitle')}</p>
          </motion.div>
        </motion.div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6 max-w-3xl mx-auto">
          {cards.map((card, i) => (
            <motion.button
              key={card.key}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.1, duration: 0.4 }}
              whileHover={{ scale: 1.03, y: -4 }}
              whileTap={{ scale: 0.97 }}
              onClick={card.onClick}
              className={`group relative p-6 md:p-8 rounded-3xl bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/5 hover:border-transparent transition-all shadow-lg hover:shadow-2xl ${card.shadow} text-left overflow-hidden`}
            >
              {/* Gradient accent line */}
              <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${card.gradient} opacity-0 group-hover:opacity-100 transition-opacity`} />
              
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${card.gradient} flex items-center justify-center mb-4 shadow-lg ${card.shadow} group-hover:scale-110 transition-transform`}>
                <card.icon size={24} className="text-white" />
              </div>
              <h3 className="font-bold text-lg dark:text-white mb-1">{card.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{card.desc}</p>
              <ChevronRight size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-300 dark:text-zinc-600 group-hover:text-zinc-500 dark:group-hover:text-zinc-400 transition-colors" />
            </motion.button>
          ))}
        </div>
      </main>

      {/* ───── MODALS ───── */}
      <AnimatePresence>
        {activeModal !== 'none' && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 backdrop-blur-md z-40"
              onClick={closeModal}
            />

            {/* ── Tablet PIN Modal ── */}
            {activeModal === 'tablet-pin' && (
              <motion.div
                key="pin-modal"
                initial={{ opacity: 0, scale: 0.92, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.92, y: 20 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-4"
              >
                <div className="w-full max-w-sm bg-white dark:bg-zinc-900 rounded-3xl border border-black/5 dark:border-white/10 p-7 shadow-2xl">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-blue-500/10 dark:bg-blue-500/15 flex items-center justify-center">
                        <Tablet size={22} className="text-blue-500" />
                      </div>
                      <div>
                        <h2 className="text-lg font-bold dark:text-white">{label('tablet')}</h2>
                        <p className="text-xs text-muted-foreground">{label('enterPin')}</p>
                      </div>
                    </div>
                    <button onClick={closeModal} className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-white/5 flex items-center justify-center text-zinc-400 hover:text-zinc-600 dark:hover:text-white transition-colors">
                      <X size={16} />
                    </button>
                  </div>

                  <div className="flex justify-center gap-3 mb-5">
                    {Array.from({ length: Math.max(4, pin.length) }).map((_, i) => (
                      <motion.div key={i} animate={{ scale: pin.length > i ? 1.15 : 1 }}
                        className={`w-4 h-4 rounded-full transition-colors ${pin.length > i ? 'bg-blue-500' : 'bg-zinc-200 dark:bg-white/15'}`}
                      />
                    ))}
                  </div>

                  <div className="relative mb-4">
                    <Hash size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
                    <input
                      ref={pinInputRef}
                      type="password"
                      inputMode="numeric"
                      maxLength={6}
                      value={pin}
                      onChange={(e) => { setPin(e.target.value.replace(/\D/g, '')); setPinError(''); }}
                      onKeyDown={(e) => { if (e.key === 'Enter' && pin.length >= 4) handleVerifyPin(); }}
                      placeholder="Enter tablet PIN"
                      className="w-full pl-12 pr-4 py-4 rounded-2xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-white/10 focus:outline-none focus:border-blue-500/50 text-center text-2xl font-bold tracking-[0.5em] dark:text-white transition-colors"
                    />
                  </div>

                  <AnimatePresence>
                    {pinError && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 mb-4">
                        <AlertCircle size={14} className="text-red-500 flex-shrink-0" />
                        <p className="text-xs text-red-500">{pinError}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <button onClick={handleVerifyPin} disabled={pin.length < 4 || verifying}
                    className="w-full py-4 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-300 dark:disabled:bg-zinc-700 disabled:text-zinc-500 text-white font-bold text-sm transition-colors flex items-center justify-center gap-2">
                    {verifying ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Lock size={16} />{label('unlockTablet')}</>}
                  </button>
                </div>
              </motion.div>
            )}

            {/* ── Table Selection Modal ── */}
            {activeModal === 'tablet-tables' && (
              <motion.div
                key="tables-modal"
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 40 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
              >
                <div className="w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col bg-white dark:bg-zinc-900 rounded-3xl border border-black/5 dark:border-white/10 shadow-2xl pointer-events-auto">
                  <div className="flex items-center justify-between px-6 py-4 border-b border-black/5 dark:border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/15 flex items-center justify-center">
                        <CheckCircle size={20} className="text-emerald-500" />
                      </div>
                      <div>
                        <h2 className="text-lg font-bold dark:text-white">{label('selectTable')}</h2>
                        <p className="text-[11px] text-muted-foreground">{label('selectTableDesc')}</p>
                      </div>
                    </div>
                    <button onClick={closeModal} className="w-9 h-9 rounded-full bg-zinc-100 dark:bg-white/5 flex items-center justify-center text-zinc-400 hover:text-zinc-600 dark:hover:text-white transition-colors">
                      <X size={18} />
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-6">
                    {tablesLoading ? (
                      <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
                    ) : tables.length === 0 ? (
                      <div className="text-center py-16">
                        <Tablet size={36} className="text-zinc-300 dark:text-zinc-700 mx-auto mb-3" />
                        <p className="text-sm text-muted-foreground">{label('noTables')}</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                        {tables.map((table, i) => (
                          <motion.button key={table.id}
                            initial={{ opacity: 0, scale: 0.88 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.03 }}
                            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}
                            onClick={() => handleSelectTable(table)}
                            className="relative p-4 rounded-2xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/[0.03] hover:bg-blue-50 dark:hover:bg-blue-500/10 hover:border-blue-300 dark:hover:border-blue-500/40 transition-all group text-center overflow-hidden"
                          >
                            <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${getStatusColor(table.status)} opacity-60`} />
                            <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${getStatusColor(table.status)} flex items-center justify-center mx-auto mb-2 shadow-lg`}>
                              <span className="text-lg font-black text-white">{table.number}</span>
                            </div>
                            <p className="text-xs font-bold dark:text-white truncate">{table.name || `Table ${table.number}`}</p>
                            <p className={`text-[10px] mt-0.5 capitalize ${table.status === 'occupied' ? 'text-emerald-500' : table.status === 'reserved' ? 'text-yellow-500' : 'text-zinc-400'}`}>{table.status}</p>
                            <ChevronRight size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-300 dark:text-zinc-600 group-hover:text-blue-400 transition-colors" />
                          </motion.button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── Waiter Password Modal ── */}
            {activeModal === 'waiter-password' && (
              <motion.div
                key="waiter-modal"
                initial={{ opacity: 0, scale: 0.92, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.92, y: 20 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-4"
              >
                <div className="w-full max-w-sm bg-white dark:bg-zinc-900 rounded-3xl border border-black/5 dark:border-white/10 p-7 shadow-2xl">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-amber-500/10 dark:bg-amber-500/15 flex items-center justify-center">
                        <UserCheck size={22} className="text-amber-500" />
                      </div>
                      <div>
                        <h2 className="text-lg font-bold dark:text-white">{label('waiter')}</h2>
                        <p className="text-xs text-muted-foreground">{label('enterWaiterPassword')}</p>
                      </div>
                    </div>
                    <button onClick={closeModal} className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-white/5 flex items-center justify-center text-zinc-400 hover:text-zinc-600 dark:hover:text-white transition-colors">
                      <X size={16} />
                    </button>
                  </div>

                  <div className="relative mb-4">
                    <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
                    <input
                      ref={waiterInputRef}
                      type="password"
                      value={waiterPassword}
                      onChange={(e) => { setWaiterPassword(e.target.value); setWaiterError(''); }}
                      onKeyDown={(e) => { if (e.key === 'Enter' && waiterPassword) handleVerifyWaiterPassword(); }}
                      placeholder={label('enterWaiterPassword')}
                      className="w-full pl-12 pr-4 py-4 rounded-2xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-white/10 focus:outline-none focus:border-amber-500/50 text-center text-lg font-bold tracking-wider dark:text-white transition-colors"
                    />
                  </div>

                  <AnimatePresence>
                    {waiterError && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 mb-4">
                        <AlertCircle size={14} className="text-red-500 flex-shrink-0" />
                        <p className="text-xs text-red-500">{waiterError}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <button onClick={handleVerifyWaiterPassword} disabled={!waiterPassword || waiterVerifying}
                    className="w-full py-4 rounded-2xl bg-amber-500 hover:bg-amber-600 disabled:bg-zinc-300 dark:disabled:bg-zinc-700 disabled:text-zinc-500 text-white font-bold text-sm transition-colors flex items-center justify-center gap-2">
                    {waiterVerifying ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Lock size={16} />{label('unlock')}</>}
                  </button>
                </div>
              </motion.div>
            )}
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
