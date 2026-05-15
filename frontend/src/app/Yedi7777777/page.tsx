'use client';

import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { api, getImageUrl } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Upload, X, Save, ImageIcon, Sun, Moon, Lock, Mail, Eye, EyeOff,
  Shield, KeyRound, LogOut, ArrowLeft, AlertTriangle, Power, Calendar, Clock,
} from 'lucide-react';
import toast from 'react-hot-toast';

const MASTER_SESSION_KEY = 'master_gate_ok';
const MASTER_TOKEN_KEY = 'master_token';

interface CafeSettings {
  name?: string;
  logo?: string;
  backgroundColorLight?: string;
  backgroundColorDark?: string;
  accentColorLight?: string;
  accentColorDark?: string;
  maintenance?: boolean;
  maintenanceUntil?: string | null;
}

/** Tiny helper – puts the master JWT into localStorage so api.put(..., true) picks it up */
function setMasterToken(token: string) {
  localStorage.setItem('token', token);
  sessionStorage.setItem(MASTER_TOKEN_KEY, token);
}
function clearMasterToken() {
  // Only clear if the token was set by us
  if (sessionStorage.getItem(MASTER_TOKEN_KEY)) {
    localStorage.removeItem('token');
    sessionStorage.removeItem(MASTER_TOKEN_KEY);
  }
}

export default function MasterAdminPage() {
  const [bootstrapped, setBootstrapped] = useState(false);
  const [gateOk, setGateOk] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setGateOk(sessionStorage.getItem(MASTER_SESSION_KEY) === '1');
    }
    setBootstrapped(true);
  }, []);

  if (!bootstrapped) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!gateOk) {
    return (
      <MasterGate
        onSuccess={(token) => {
          sessionStorage.setItem(MASTER_SESSION_KEY, '1');
          setMasterToken(token);
          setGateOk(true);
        }}
      />
    );
  }

  return (
    <MasterPanel
      onLogoutGate={() => {
        sessionStorage.removeItem(MASTER_SESSION_KEY);
        clearMasterToken();
        setGateOk(false);
      }}
    />
  );
}

function MasterGate({ onSuccess }: { onSuccess: (token: string) => void }) {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!login || !password) {
      toast.error('Please fill in both fields');
      return;
    }
    setSubmitting(true);
    try {
      const data = await api.post<{ ok: boolean; token: string }>('/auth/master-verify', { login, password });
      toast.success('Access granted');
      onSuccess(data.token);
    } catch (error: any) {
      toast.error(error.message || 'Invalid credentials');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.5 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring' }}
            className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center bg-gradient-to-br from-purple-600 to-fuchsia-600 shadow-lg shadow-purple-500/30"
          >
            <KeyRound size={28} className="text-white" />
          </motion.div>
          <h1 className="text-2xl font-bold">Restricted Area</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Enter master credentials to continue
          </p>
        </div>

        <form onSubmit={handleSubmit} className="glass rounded-2xl p-6 space-y-4">
          <div>
            <label className="text-sm text-muted-foreground mb-1.5 block">Login</label>
            <div className="relative">
              <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                placeholder="Master login"
                autoComplete="off"
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:outline-none focus:border-purple-500/50 transition-colors"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-sm text-muted-foreground mb-1.5 block">Password</label>
            <div className="relative">
              <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Master password"
                autoComplete="off"
                className="w-full pl-10 pr-10 py-3 rounded-xl bg-white/5 border border-white/10 focus:outline-none focus:border-purple-500/50 transition-colors"
                required
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <Button type="submit" disabled={submitting} className="w-full h-12">
            {submitting ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              'Unlock'
            )}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            Master credentials required to access this area
          </p>
        </form>
      </motion.div>
    </div>
  );
}

function MasterPanel({ onLogoutGate }: { onLogoutGate: () => void }) {
  const [settings, setSettings] = useState<CafeSettings>({});
  const [name, setName] = useState('');
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [accentLight, setAccentLight] = useState('#7c3aed');
  const [accentDark, setAccentDark] = useState('#a78bfa');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [togglingMaintenance, setTogglingMaintenance] = useState(false);
  const [showGoLiveModal, setShowGoLiveModal] = useState(false);
  const [expiryDateTime, setExpiryDateTime] = useState('');
  const [maintenanceUntil, setMaintenanceUntil] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.get<CafeSettings>('/admin/settings', true).then((data) => {
      setSettings(data);
      setName(data.name || '');
      if (data.logo) setLogoPreview(getImageUrl(data.logo));
      if (data.accentColorLight) setAccentLight(data.accentColorLight);
      if (data.accentColorDark) setAccentDark(data.accentColorDark);
      setMaintenanceMode(!!data.maintenance);
      if (data.maintenanceUntil) setMaintenanceUntil(data.maintenanceUntil);
    }).catch(() => {});
  }, []);

  const handleToggleMaintenance = async (enable: boolean) => {
    if (enable && !window.confirm('Enable maintenance mode? The entire site will be shut down for all users.')) return;
    if (!enable) {
      // Show the Go Live modal to pick expiry date+time
      const defaultDate = new Date();
      defaultDate.setMonth(defaultDate.getMonth() + 1);
      // Format as YYYY-MM-DDThh:mm for datetime-local input
      const pad = (n: number) => n.toString().padStart(2, '0');
      setExpiryDateTime(
        `${defaultDate.getFullYear()}-${pad(defaultDate.getMonth() + 1)}-${pad(defaultDate.getDate())}T${pad(defaultDate.getHours())}:${pad(defaultDate.getMinutes())}`
      );
      setShowGoLiveModal(true);
      return;
    }
    setTogglingMaintenance(true);
    try {
      const updated = await api.put<CafeSettings>('/admin/settings', { maintenance: true, maintenanceUntil: null }, true);
      setSettings(updated);
      setMaintenanceMode(true);
      setMaintenanceUntil(null);
      toast.success('Maintenance mode enabled — site is now offline');
    } catch (error: any) {
      toast.error(error.message || 'Failed to toggle maintenance');
    } finally {
      setTogglingMaintenance(false);
    }
  };

  const handleGoLive = async () => {
    if (!expiryDateTime) {
      toast.error('Please select a date and time');
      return;
    }
    const selectedDate = new Date(expiryDateTime);
    if (selectedDate <= new Date()) {
      toast.error('Expiry must be in the future');
      return;
    }
    setTogglingMaintenance(true);
    try {
      const updated = await api.put<CafeSettings>('/admin/settings', {
        maintenance: false,
        maintenanceUntil: selectedDate.toISOString(),
      }, true);
      setSettings(updated);
      setMaintenanceMode(false);
      setMaintenanceUntil(updated.maintenanceUntil || null);
      setShowGoLiveModal(false);
      toast.success('Site is now live until ' + selectedDate.toLocaleString());
    } catch (error: any) {
      toast.error(error.message || 'Failed to go live');
    } finally {
      setTogglingMaintenance(false);
    }
  };

  /** Set expiryDateTime to N months from now, keeping current time */
  const setQuickExpiry = (months: number) => {
    const d = new Date();
    d.setMonth(d.getMonth() + months);
    const pad = (n: number) => n.toString().padStart(2, '0');
    setExpiryDateTime(
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
    );
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setLogoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);

    setUploading(true);
    try {
      const data = await api.upload<{ url: string }>('/upload', file);
      setSettings((prev) => ({ ...prev, logo: data.url }));
      toast.success('Logo uploaded');
    } catch (error: any) {
      toast.error(error.message || 'Upload failed');
      setLogoPreview(settings.logo ? getImageUrl(settings.logo) : null);
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveLogo = () => {
    setLogoPreview(null);
    setSettings((prev) => ({ ...prev, logo: undefined }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await api.put<CafeSettings>('/admin/settings', {
        name,
        logo: settings.logo || null,
        accentColorLight: accentLight || null,
        accentColorDark: accentDark || null,
      }, true);
      setSettings(updated);
      toast.success('Settings saved');
    } catch (error: any) {
      toast.error(error.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  /** Format an ISO date for display */
  const formatExpiry = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border-b border-black/5 dark:border-white/5 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
              <KeyRound size={18} className="text-white" />
            </div>
            <div>
              <h1 className="font-bold text-sm leading-tight">Master Admin</h1>
              <p className="text-[11px] text-muted-foreground">System Control Panel</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleToggleMaintenance(!maintenanceMode)}
              disabled={togglingMaintenance}
              className={`text-xs px-3 py-2 rounded-xl transition-colors flex items-center gap-1.5 font-semibold ${
                maintenanceMode
                  ? 'bg-amber-500/15 text-amber-500 hover:bg-amber-500/25 border border-amber-500/30'
                  : 'bg-zinc-100 dark:bg-white/5 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-white/10'
              }`}
            >
              {togglingMaintenance ? (
                <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : maintenanceMode ? (
                <Power size={14} />
              ) : (
                <AlertTriangle size={14} />
              )}
              {maintenanceMode ? 'Go Live' : 'Shutdown'}
            </button>
            <button
              onClick={onLogoutGate}
              className="text-xs px-3 py-2 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors flex items-center gap-1.5"
            >
              <Lock size={14} />
              Lock & Exit
            </button>
          </div>
        </div>
      </header>

      {/* Go Live Modal – date + time picker */}
      {showGoLiveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl border border-white/10 shadow-2xl overflow-hidden"
          >
            <div className="p-6 space-y-5">
              <div className="text-center">
                <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                  <Calendar size={24} className="text-emerald-500" />
                </div>
                <h2 className="text-xl font-bold">Go Live</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Select the date and time until which the system will remain active.
                  After this moment, the system will automatically shut down.
                </p>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Clock size={16} />
                  Active until (date & time):
                </label>
                <input
                  type="datetime-local"
                  value={expiryDateTime}
                  onChange={(e) => setExpiryDateTime(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:outline-none focus:border-emerald-500/50 transition-colors text-base"
                />

                <div className="flex gap-2 flex-wrap">
                  {[
                    { label: '1 Month', months: 1 },
                    { label: '3 Months', months: 3 },
                    { label: '6 Months', months: 6 },
                    { label: '1 Year', months: 12 },
                  ].map(({ label, months }) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => setQuickExpiry(months)}
                      className="text-xs px-3 py-2 rounded-xl border transition-colors font-medium bg-white/5 border-white/10 text-muted-foreground hover:bg-white/10"
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {expiryDateTime && (
                  <p className="text-xs text-muted-foreground text-center">
                    System will be active until{' '}
                    <span className="font-semibold text-foreground">
                      {new Date(expiryDateTime).toLocaleString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </p>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowGoLiveModal(false)}
                  className="flex-1 px-4 py-3 rounded-xl bg-zinc-100 dark:bg-white/5 text-sm font-medium hover:bg-zinc-200 dark:hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleGoLive}
                  disabled={togglingMaintenance || !expiryDateTime}
                  className="flex-1 px-4 py-3 rounded-xl bg-emerald-500 text-white text-sm font-bold hover:bg-emerald-600 transition-colors disabled:opacity-50"
                >
                  {togglingMaintenance ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
                  ) : (
                    'Activate'
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Active Until Banner */}
      {!maintenanceMode && maintenanceUntil && (
        <div className="max-w-3xl mx-auto px-6 pt-4">
          <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
            <Calendar size={18} className="text-emerald-500 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-emerald-500">System Active</p>
              <p className="text-xs text-emerald-500/70">
                Active until {formatExpiry(maintenanceUntil)}
              </p>
            </div>
            <button
              onClick={() => handleToggleMaintenance(true)}
              disabled={togglingMaintenance}
              className="text-xs px-3 py-1.5 rounded-xl bg-red-500 text-white font-bold hover:bg-red-600 transition-colors shrink-0"
            >
              Shutdown Now
            </button>
          </div>
        </div>
      )}

      {/* Maintenance Banner */}
      {maintenanceMode && (
        <div className="max-w-3xl mx-auto px-6 pt-4">
          <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-amber-500/10 border border-amber-500/20">
            <AlertTriangle size={18} className="text-amber-500 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-amber-500">Maintenance Mode Active</p>
              <p className="text-xs text-amber-500/70">All pages are offline. Only this page is accessible.</p>
            </div>
            <button
              onClick={() => handleToggleMaintenance(false)}
              disabled={togglingMaintenance}
              className="text-xs px-3 py-1.5 rounded-xl bg-emerald-500 text-white font-bold hover:bg-emerald-600 transition-colors shrink-0"
            >
              Go Live
            </button>
          </div>
        </div>
      )}

      <main className="max-w-3xl mx-auto p-6 space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Cafe Configuration</h2>
          <p className="text-muted-foreground text-sm">
            Branding and theme colors
          </p>
        </div>

        {/* Logo */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card>
            <CardContent>
              <h3 className="text-lg font-semibold mb-4">Cafe Logo</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Upload your cafe logo (PNG, SVG, JPG, WebP). This will appear on the customer menu page.
              </p>

              <div className="flex items-start gap-6">
                <div className="relative group">
                  {logoPreview ? (
                    <div className="relative w-28 h-28 rounded-2xl overflow-hidden border-2 border-dashed border-purple-500/30">
                      <img
                        src={logoPreview}
                        alt="Logo"
                        className="w-full h-full object-contain bg-white/5 p-2"
                      />
                      <button
                        onClick={handleRemoveLogo}
                        className="absolute top-1 right-1 p-1 rounded-lg bg-red-500/80 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <div className="w-28 h-28 rounded-2xl border-2 border-dashed border-white/20 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                      <ImageIcon size={28} />
                      <span className="text-[11px]">No logo</span>
                    </div>
                  )}
                </div>

                <div className="flex-1 space-y-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                  <Button
                    variant="secondary"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="w-full"
                  >
                    {uploading ? (
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                    ) : (
                      <Upload size={16} className="mr-2" />
                    )}
                    {uploading ? 'Uploading...' : 'Upload Logo'}
                  </Button>
                  <p className="text-[11px] text-muted-foreground">
                    Max 5MB. Recommended: square image, at least 200x200px.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Cafe Name */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card>
            <CardContent>
              <h3 className="text-lg font-semibold mb-4">Cafe Name</h3>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Cafe"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:outline-none focus:border-purple-500/50 transition-colors"
              />
            </CardContent>
          </Card>
        </motion.div>

        {/* Accent / Button Colors */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <Card>
            <CardContent>
              <h3 className="text-lg font-semibold mb-2">Button & Accent Colors</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Customize the primary button and accent color for light and dark mode.
              </p>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3 p-4 rounded-2xl border border-white/10 bg-white/5">
                  <div className="flex items-center gap-2 mb-2">
                    <Sun size={16} className="text-yellow-500" />
                    <span className="text-sm font-semibold">Light Mode</span>
                  </div>
                  <input
                    type="color"
                    value={accentLight}
                    onChange={(e) => setAccentLight(e.target.value)}
                    className="w-full h-12 rounded-xl cursor-pointer border-2 border-white/10 bg-transparent [&::-webkit-color-swatch-wrapper]:p-1 [&::-webkit-color-swatch]:rounded-lg [&::-webkit-color-swatch]:border-none"
                  />
                  <input
                    type="text"
                    value={accentLight}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (/^#[0-9A-Fa-f]{0,6}$/.test(val)) setAccentLight(val);
                    }}
                    placeholder="#7c3aed"
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 focus:outline-none focus:border-purple-500/50 transition-colors text-sm font-mono"
                  />
                  <div className="rounded-xl h-16 border border-black/10 flex items-center justify-center gap-2 bg-gray-50">
                    <span
                      className="text-xs font-semibold px-4 py-2 rounded-xl text-white"
                      style={{ backgroundColor: accentLight }}
                    >
                      Button
                    </span>
                    <span
                      className="text-xs font-semibold"
                      style={{ color: accentLight }}
                    >
                      Accent Text
                    </span>
                  </div>
                  <button
                    onClick={() => setAccentLight('#7c3aed')}
                    className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Reset default
                  </button>
                </div>

                <div className="space-y-3 p-4 rounded-2xl border border-white/10 bg-white/5">
                  <div className="flex items-center gap-2 mb-2">
                    <Moon size={16} className="text-blue-400" />
                    <span className="text-sm font-semibold">Dark Mode</span>
                  </div>
                  <input
                    type="color"
                    value={accentDark}
                    onChange={(e) => setAccentDark(e.target.value)}
                    className="w-full h-12 rounded-xl cursor-pointer border-2 border-white/10 bg-transparent [&::-webkit-color-swatch-wrapper]:p-1 [&::-webkit-color-swatch]:rounded-lg [&::-webkit-color-swatch]:border-none"
                  />
                  <input
                    type="text"
                    value={accentDark}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (/^#[0-9A-Fa-f]{0,6}$/.test(val)) setAccentDark(val);
                    }}
                    placeholder="#a78bfa"
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 focus:outline-none focus:border-purple-500/50 transition-colors text-sm font-mono"
                  />
                  <div className="rounded-xl h-16 border border-white/10 flex items-center justify-center gap-2" style={{ backgroundColor: '#0a0f1a' }}>
                    <span
                      className="text-xs font-semibold px-4 py-2 rounded-xl text-white"
                      style={{ backgroundColor: accentDark }}
                    >
                      Button
                    </span>
                    <span
                      className="text-xs font-semibold"
                      style={{ color: accentDark }}
                    >
                      Accent Text
                    </span>
                  </div>
                  <button
                    onClick={() => setAccentDark('#a78bfa')}
                    className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Reset default
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Save */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Button onClick={handleSave} disabled={saving} className="w-full h-12">
            {saving ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Save size={18} className="mr-2" />
                Save Settings
              </>
            )}
          </Button>
        </motion.div>
      </main>
    </div>
  );
}
