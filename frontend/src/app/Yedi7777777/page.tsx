'use client';

import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { api, getImageUrl } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Upload, X, Save, ImageIcon, Sun, Moon, Lock, Mail, Eye, EyeOff,
  Shield, KeyRound, LogOut, ArrowLeft, AlertTriangle, Power,
} from 'lucide-react';
import { useAdminStore } from '@/store/admin-store';
import toast from 'react-hot-toast';

const MASTER_SESSION_KEY = 'master_gate_ok';

interface CafeSettings {
  name?: string;
  logo?: string;
  backgroundColorLight?: string;
  backgroundColorDark?: string;
  accentColorLight?: string;
  accentColorDark?: string;
  maintenance?: boolean;
}

export default function MasterAdminPage() {
  const router = useRouter();
  const { user, isAuthenticated, loadFromStorage, updateAuth, logout } = useAdminStore();

  const [bootstrapped, setBootstrapped] = useState(false);
  const [gateOk, setGateOk] = useState(false);

  useEffect(() => {
    loadFromStorage();
    if (typeof window !== 'undefined') {
      setGateOk(sessionStorage.getItem(MASTER_SESSION_KEY) === '1');
    }
    setBootstrapped(true);
  }, [loadFromStorage]);

  if (!bootstrapped) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AdminRequired onGoLogin={() => router.push('/admin')} />;
  }

  if (!gateOk) {
    return (
      <MasterGate
        onSuccess={() => {
          sessionStorage.setItem(MASTER_SESSION_KEY, '1');
          setGateOk(true);
        }}
        onBack={() => router.push('/admin/dashboard')}
      />
    );
  }

  return (
    <MasterPanel
      user={user}
      onLogoutGate={() => {
        sessionStorage.removeItem(MASTER_SESSION_KEY);
        setGateOk(false);
      }}
      onLogoutAdmin={() => {
        sessionStorage.removeItem(MASTER_SESSION_KEY);
        logout();
        router.push('/admin');
      }}
      onAuthUpdated={updateAuth}
    />
  );
}

function AdminRequired({ onGoLogin }: { onGoLogin: () => void }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md text-center"
      >
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
          <Shield size={28} className="text-amber-500" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Admin Login Required</h1>
        <p className="text-muted-foreground text-sm mb-6">
          You must be signed in as admin to access this protected area.
        </p>
        <Button onClick={onGoLogin} className="w-full h-12">
          Go to Admin Login
        </Button>
      </motion.div>
    </div>
  );
}

function MasterGate({ onSuccess, onBack }: { onSuccess: () => void; onBack: () => void }) {
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
      await api.post('/auth/master-verify', { login, password });
      toast.success('Access granted');
      onSuccess();
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
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft size={14} />
          Back to dashboard
        </button>

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
            Even admins must authenticate again to access this area
          </p>
        </form>
      </motion.div>
    </div>
  );
}

interface MasterPanelProps {
  user: { id: number; email: string; name: string; role: string } | null;
  onLogoutGate: () => void;
  onLogoutAdmin: () => void;
  onAuthUpdated: (token: string, user: any) => void;
}

function MasterPanel({ user, onLogoutGate, onLogoutAdmin, onAuthUpdated }: MasterPanelProps) {
  const [settings, setSettings] = useState<CafeSettings>({});
  const [name, setName] = useState('');
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [accentLight, setAccentLight] = useState('#7c3aed');
  const [accentDark, setAccentDark] = useState('#a78bfa');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [showEmailPw, setShowEmailPw] = useState(false);
  const [changingEmail, setChangingEmail] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [togglingMaintenance, setTogglingMaintenance] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.get<CafeSettings>('/admin/settings').then((data) => {
      setSettings(data);
      setName(data.name || '');
      if (data.logo) setLogoPreview(getImageUrl(data.logo));
      if (data.accentColorLight) setAccentLight(data.accentColorLight);
      if (data.accentColorDark) setAccentDark(data.accentColorDark);
      setMaintenanceMode(!!data.maintenance);
    }).catch(() => {});
  }, []);

  const handleToggleMaintenance = async (enable: boolean) => {
    if (enable && !window.confirm('Enable maintenance mode? The entire site will be shut down for all users.')) return;
    setTogglingMaintenance(true);
    try {
      const updated = await api.put<CafeSettings>('/admin/settings', { maintenance: enable }, true);
      setSettings(updated);
      setMaintenanceMode(!!updated.maintenance);
      toast.success(enable ? 'Maintenance mode enabled — site is now offline' : 'Maintenance mode disabled — site is back online');
    } catch (error: any) {
      toast.error(error.message || 'Failed to toggle maintenance');
    } finally {
      setTogglingMaintenance(false);
    }
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

  const handleChangeEmail = async () => {
    if (!newEmail || !emailPassword) {
      toast.error('Please fill in all fields');
      return;
    }
    setChangingEmail(true);
    try {
      const data = await api.put<{ token: string; user: any }>('/auth/change-email', {
        newEmail,
        password: emailPassword,
      }, true);
      onAuthUpdated(data.token, data.user);
      toast.success('Email changed successfully');
      setNewEmail('');
      setEmailPassword('');
    } catch (error: any) {
      toast.error(error.message || 'Failed to change email');
    } finally {
      setChangingEmail(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('Please fill in all password fields');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setChangingPassword(true);
    try {
      await api.put('/auth/change-password', {
        currentPassword,
        newPassword,
      }, true);
      toast.success('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      toast.error(error.message || 'Failed to change password');
    } finally {
      setChangingPassword(false);
    }
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
              <p className="text-[11px] text-muted-foreground">{user?.email}</p>
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
              className="text-xs px-3 py-2 rounded-xl bg-zinc-100 dark:bg-white/5 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-white/10 transition-colors flex items-center gap-1.5"
            >
              <Lock size={14} />
              Lock
            </button>
            <button
              onClick={onLogoutAdmin}
              className="text-xs px-3 py-2 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors flex items-center gap-1.5"
            >
              <LogOut size={14} />
              Sign out
            </button>
          </div>
        </div>
      </header>

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
            Branding, theme colors and login email
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

        {/* Change Email */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
          <Card>
            <CardContent>
              <div className="flex items-center gap-2 mb-4">
                <Shield size={20} className="text-purple-400" />
                <h3 className="text-lg font-semibold">Change Login Email</h3>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Current: <span className="font-mono text-foreground">{user?.email}</span>
              </p>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">New Email</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="new@email.com"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 focus:outline-none focus:border-purple-500/50 transition-colors text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Confirm with Password</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type={showEmailPw ? 'text' : 'password'}
                      value={emailPassword}
                      onChange={(e) => setEmailPassword(e.target.value)}
                      placeholder="Current password"
                      className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-white/5 border border-white/10 focus:outline-none focus:border-purple-500/50 transition-colors text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowEmailPw(!showEmailPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showEmailPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <Button
                  variant="secondary"
                  onClick={handleChangeEmail}
                  disabled={changingEmail || !newEmail || !emailPassword}
                  className="w-full"
                >
                  {changingEmail ? (
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                  ) : (
                    <Mail size={16} className="mr-2" />
                  )}
                  {changingEmail ? 'Updating...' : 'Update Email'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Change Password */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card>
            <CardContent>
              <div className="flex items-center gap-2 mb-4">
                <KeyRound size={20} className="text-purple-400" />
                <h3 className="text-lg font-semibold">Change Password</h3>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Current Password</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type={showCurrentPw ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Current password"
                      className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-white/5 border border-white/10 focus:outline-none focus:border-purple-500/50 transition-colors text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPw(!showCurrentPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showCurrentPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">New Password</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type={showNewPw ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="New password (min 6 chars)"
                      className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-white/5 border border-white/10 focus:outline-none focus:border-purple-500/50 transition-colors text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPw(!showNewPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showNewPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Confirm New Password</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 focus:outline-none focus:border-purple-500/50 transition-colors text-sm"
                    />
                  </div>
                </div>
                <Button
                  variant="secondary"
                  onClick={handleChangePassword}
                  disabled={changingPassword || !currentPassword || !newPassword || !confirmPassword}
                  className="w-full"
                >
                  {changingPassword ? (
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                  ) : (
                    <KeyRound size={16} className="mr-2" />
                  )}
                  {changingPassword ? 'Updating...' : 'Update Password'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  );
}
