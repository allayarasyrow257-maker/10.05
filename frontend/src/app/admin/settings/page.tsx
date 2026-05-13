'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Lock, Eye, EyeOff, Shield, Tablet, Key, UserCheck } from 'lucide-react';
import toast from 'react-hot-toast';

interface CafeSettings {
  tabletPin?: string | null;
  waiterPassword?: string | null;
}

export default function SettingsPage() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  // Tablet PIN
  const [currentPin, setCurrentPin] = useState<string | null>(null);
  const [showCurrentPin, setShowCurrentPin] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [showNewPin, setShowNewPin] = useState(false);
  const [savingPin, setSavingPin] = useState(false);
  const [pinLoaded, setPinLoaded] = useState(false);

  // Waiter Password
  const [currentWaiterPw, setCurrentWaiterPw] = useState<string | null>(null);
  const [showCurrentWaiterPw, setShowCurrentWaiterPw] = useState(false);
  const [newWaiterPw, setNewWaiterPw] = useState('');
  const [showNewWaiterPw, setShowNewWaiterPw] = useState(false);
  const [savingWaiterPw, setSavingWaiterPw] = useState(false);

  useEffect(() => {
    api.get<CafeSettings>('/admin/settings', true).then((data) => {
      setCurrentPin(data.tabletPin ?? null);
      setCurrentWaiterPw(data.waiterPassword ?? null);
      setPinLoaded(true);
    }).catch(() => setPinLoaded(true));
  }, []);

  const handleChangePassword = async () => {
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

  const handleSavePin = async () => {
    if (newPin && !/^\d{4,6}$/.test(newPin)) {
      toast.error('Tablet PIN must be 4–6 digits');
      return;
    }
    setSavingPin(true);
    try {
      const updated = await api.put<CafeSettings>('/admin/settings', { tabletPin: newPin || null }, true);
      setCurrentPin(updated.tabletPin ?? null);
      setNewPin('');
      toast.success(newPin ? 'Tablet PIN updated' : 'Tablet PIN removed');
    } catch (error: any) {
      toast.error(error.message || 'Failed to save PIN');
    } finally {
      setSavingPin(false);
    }
  };

  const handleSaveWaiterPassword = async () => {
    if (newWaiterPw && newWaiterPw.length < 4) {
      toast.error('Waiter password must be at least 4 characters');
      return;
    }
    setSavingWaiterPw(true);
    try {
      const updated = await api.put<CafeSettings>('/admin/settings', { waiterPassword: newWaiterPw || null }, true);
      setCurrentWaiterPw(updated.waiterPassword ?? null);
      setNewWaiterPw('');
      toast.success(newWaiterPw ? 'Waiter password updated' : 'Waiter password removed');
    } catch (error: any) {
      toast.error(error.message || 'Failed to save waiter password');
    } finally {
      setSavingWaiterPw(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage password and tablet PIN</p>
      </div>

      {/* ── Global Tablet PIN ── */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Card>
          <CardContent>
            <div className="flex items-center gap-2 mb-4">
              <Tablet size={20} className="text-blue-400" />
              <h3 className="text-lg font-semibold">Global Tablet PIN</h3>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              One PIN unlocks all tables on the tablet page. Leave empty to disable tablet mode.
            </p>

            {/* Current PIN display */}
            {pinLoaded && (
              <div className="mb-4 p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Key size={15} className="text-muted-foreground flex-shrink-0" />
                  <span className="text-xs text-muted-foreground">Current PIN:</span>
                  <span className="font-mono font-bold text-sm">
                    {currentPin
                      ? (showCurrentPin ? currentPin : '●'.repeat(currentPin.length))
                      : <span className="text-muted-foreground italic text-xs">not set</span>
                    }
                  </span>
                </div>
                {currentPin && (
                  <button
                    type="button"
                    onClick={() => setShowCurrentPin(!showCurrentPin)}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    title={showCurrentPin ? 'Hide PIN' : 'Show PIN'}
                  >
                    {showCurrentPin ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                )}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">New PIN (4–6 digits)</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type={showNewPin ? 'text' : 'password'}
                    inputMode="numeric"
                    maxLength={6}
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="e.g. 1234"
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-white/5 border border-white/10 focus:outline-none focus:border-blue-500/50 transition-colors text-sm text-center font-bold tracking-[0.3em]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPin(!showNewPin)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showNewPin ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="flex gap-2">
                {currentPin && (
                  <Button
                    variant="destructive"
                    onClick={() => { setNewPin(''); setTimeout(handleSavePin, 0); }}
                    disabled={savingPin}
                    className="flex-1"
                  >
                    Remove PIN
                  </Button>
                )}
                <Button
                  onClick={handleSavePin}
                  disabled={savingPin || (!!newPin && !/^\d{4,6}$/.test(newPin))}
                  className="flex-1 h-10"
                >
                  {savingPin
                    ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    : 'Save PIN'
                  }
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Waiter Password ── */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <Card>
          <CardContent>
            <div className="flex items-center gap-2 mb-4">
              <UserCheck size={20} className="text-amber-400" />
              <h3 className="text-lg font-semibold">Waiter Password</h3>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              Password for waiters to access the waiter panel from the options page.
            </p>

            {pinLoaded && (
              <div className="mb-4 p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Key size={15} className="text-muted-foreground flex-shrink-0" />
                  <span className="text-xs text-muted-foreground">Current:</span>
                  <span className="font-mono font-bold text-sm">
                    {currentWaiterPw
                      ? (showCurrentWaiterPw ? currentWaiterPw : '●'.repeat(currentWaiterPw.length))
                      : <span className="text-muted-foreground italic text-xs">not set</span>
                    }
                  </span>
                </div>
                {currentWaiterPw && (
                  <button type="button" onClick={() => setShowCurrentWaiterPw(!showCurrentWaiterPw)}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    title={showCurrentWaiterPw ? 'Hide' : 'Show'}>
                    {showCurrentWaiterPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                )}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">New Password (min 4 characters)</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type={showNewWaiterPw ? 'text' : 'password'}
                    value={newWaiterPw}
                    onChange={(e) => setNewWaiterPw(e.target.value)}
                    placeholder="e.g. waiter123"
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-white/5 border border-white/10 focus:outline-none focus:border-amber-500/50 transition-colors text-sm"
                  />
                  <button type="button" onClick={() => setShowNewWaiterPw(!showNewWaiterPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showNewWaiterPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div className="flex gap-2">
                {currentWaiterPw && (
                  <Button variant="destructive"
                    onClick={() => { setNewWaiterPw(''); setTimeout(handleSaveWaiterPassword, 0); }}
                    disabled={savingWaiterPw} className="flex-1">
                    Remove Password
                  </Button>
                )}
                <Button onClick={handleSaveWaiterPassword}
                  disabled={savingWaiterPw || (!!newWaiterPw && newWaiterPw.length < 4)}
                  className="flex-1 h-10">
                  {savingWaiterPw
                    ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    : 'Save Password'
                  }
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Change Admin Password ── */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card>
          <CardContent>
            <div className="flex items-center gap-2 mb-4">
              <Shield size={20} className="text-purple-400" />
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
                    placeholder="Enter current password"
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
                    placeholder="Enter new password (min 6 chars)"
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
                {newPassword && confirmPassword && newPassword !== confirmPassword && (
                  <p className="text-xs text-red-400 mt-1">Passwords do not match</p>
                )}
              </div>
              <Button
                onClick={handleChangePassword}
                disabled={changingPassword || !currentPassword || !newPassword || !confirmPassword}
                className="w-full h-12"
              >
                {changingPassword ? (
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                ) : (
                  <Lock size={16} className="mr-2" />
                )}
                {changingPassword ? 'Updating...' : 'Update Password'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
