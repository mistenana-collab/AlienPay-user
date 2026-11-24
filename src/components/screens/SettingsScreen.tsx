import React, { useState } from 'react';
import { 
  ArrowLeft, 
  Server, 
  Shield, 
  KeyRound, 
  Bell, 
  Globe, 
  DollarSign, 
  Fingerprint, 
  CheckCircle2, 
  AlertCircle, 
  Play, 
  RefreshCw, 
  Save, 
  Sun,
  Moon,
  Sparkles,
  Check
} from 'lucide-react';
import { ApiService, DEFAULT_USER } from '../../services/apiService';
import { AuthApiConfig, ActiveScreen, ThemeMode, UserProfile } from '../../types';
import { BiometricModal } from '../modals/BiometricModal';

interface SettingsScreenProps {
  user?: UserProfile;
  onUpdateUser?: (user: UserProfile) => void;
  onNavigate: (screen: ActiveScreen) => void;
  onConfigUpdated: (config: AuthApiConfig) => void;
  theme: ThemeMode;
  onToggleTheme: (newTheme: ThemeMode) => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  user,
  onUpdateUser,
  onNavigate,
  onConfigUpdated,
  theme,
  onToggleTheme,
}) => {
  const activeUser = user || ApiService.getStoredUser() || DEFAULT_USER;
  const hasCustomPin = Boolean(activeUser.securityPin && activeUser.securityPin.trim() !== '' && activeUser.securityPin.trim() !== '1234');
  const [config, setConfig] = useState<AuthApiConfig>(ApiService.getConfig());
  const [mode, setMode] = useState<'built_in' | 'custom_api'>(config.mode);
  const [baseUrl, setBaseUrl] = useState(config.baseUrl);
  const [loginEndpoint, setLoginEndpoint] = useState(config.loginEndpoint);
  const [signupEndpoint, setSignupEndpoint] = useState(config.signupEndpoint);
  const [profileEndpoint, setProfileEndpoint] = useState(config.profileEndpoint);
  const [manualToken, setManualToken] = useState(ApiService.getToken() || '');

  // Test connection state
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    reachable: boolean;
    status?: number;
    message: string;
    responseTimeMs?: number;
  } | null>(null);

  // Preference states
  const [currencyPref, setCurrencyPref] = useState<'INR' | 'USDT'>('USDT');
  const [biometricEnabled, setBiometricEnabled] = useState<boolean>(activeUser.biometricEnabled !== false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(true);
  const [requirePinForWithdrawal, setRequirePinForWithdrawal] = useState(true);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Sync biometric toggle if user prop updates
  React.useEffect(() => {
    setBiometricEnabled(activeUser.biometricEnabled !== false);
  }, [activeUser.biometricEnabled]);

  // Security PIN states
  const [showChangePin, setShowChangePin] = useState(false);
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmNewPin, setConfirmNewPin] = useState('');
  const [isSavingPin, setIsSavingPin] = useState(false);
  const [pinMsg, setPinMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showBiometricTest, setShowBiometricTest] = useState(false);

  const handleToggleBiometric = async (checked: boolean) => {
    setBiometricEnabled(checked);
    try {
      const res = await ApiService.updateSecuritySettings({
        userId: activeUser.id,
        email: activeUser.email,
        biometricEnabled: checked,
      });
      if (onUpdateUser && res.user) {
        onUpdateUser(res.user);
      }
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2000);
    } catch (err) {
      console.error('Failed to update biometric preference:', err);
    }
  };

  const handleSaveNewPin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinMsg(null);

    if (hasCustomPin && currentPin.trim() !== activeUser.securityPin?.trim()) {
      setPinMsg({ type: 'error', text: 'Current Security PIN is incorrect.' });
      return;
    }
    if (!/^\d{4}$/.test(newPin.trim())) {
      setPinMsg({ type: 'error', text: 'New PIN must be exactly 4 digits.' });
      return;
    }
    if (newPin.trim() !== confirmNewPin.trim()) {
      setPinMsg({ type: 'error', text: 'New PINs do not match.' });
      return;
    }

    setIsSavingPin(true);
    try {
      const res = await ApiService.updateSecuritySettings({
        userId: activeUser.id,
        email: activeUser.email,
        currentPin: hasCustomPin ? currentPin.trim() : undefined,
        newPin: newPin.trim(),
      });
      if (onUpdateUser && res.user) {
        onUpdateUser(res.user);
      }
      setPinMsg({ type: 'success', text: 'Custom 4-digit Security PIN saved to database!' });
      setTimeout(() => {
        setShowChangePin(false);
        setCurrentPin('');
        setNewPin('');
        setConfirmNewPin('');
        setPinMsg(null);
      }, 1500);
    } catch (err: any) {
      setPinMsg({ type: 'error', text: err.message || 'Failed to update Security PIN.' });
    } finally {
      setIsSavingPin(false);
    }
  };

  const handleSaveApiConfig = () => {
    const updated = ApiService.saveConfig({
      mode,
      baseUrl: baseUrl.trim(),
      loginEndpoint: loginEndpoint.trim(),
      signupEndpoint: signupEndpoint.trim(),
      profileEndpoint: profileEndpoint.trim(),
    });

    if (manualToken) {
      ApiService.setToken(manualToken.trim());
    }

    setConfig(updated);
    onConfigUpdated(updated);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleTestApi = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const result = await ApiService.testConnection(baseUrl, loginEndpoint);
      setTestResult(result);
    } catch (err: any) {
      setTestResult({
        reachable: false,
        message: err.message || 'Failed to connect to API',
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col pb-8 transition-colors duration-250">
      {/* Top Header */}
      <div 
        className="px-4 py-3 border-b flex items-center justify-between sticky top-0 z-10 backdrop-blur-md transition-colors duration-250"
        style={{
          backgroundColor: 'var(--app-header-bg)',
          borderColor: 'var(--app-border-subtle)',
        }}
      >
        <button
          onClick={() => onNavigate('dashboard')}
          className="p-1.5 rounded-lg cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
          style={{ color: 'var(--app-text-secondary)' }}
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        <h1 className="font-heading font-bold text-sm tracking-tight" style={{ color: 'var(--app-text-primary)' }}>
          Settings & Preferences
        </h1>

        <div className="w-8"></div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* THEME TOGGLE SECTION (User requested via CSS variables) */}
        <div 
          className="rounded-2xl p-4 border shadow-xl transition-colors duration-250"
          style={{
            backgroundColor: 'var(--app-surface)',
            borderColor: 'var(--app-border)',
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-heading font-bold text-sm flex items-center gap-1.5" style={{ color: 'var(--app-text-primary)' }}>
              {theme === 'dark' ? (
                <Moon className="w-4 h-4 text-cyan-400" />
              ) : (
                <Sun className="w-4 h-4 text-amber-500" />
              )}
              <span>Application Theme</span>
            </h2>

            <span 
              className="text-[10px] font-bold px-2 py-0.5 rounded-full border"
              style={{
                backgroundColor: 'var(--app-surface-highlight)',
                borderColor: 'var(--app-border)',
                color: 'var(--app-text-secondary)',
              }}
            >
              CSS Variables Powered
            </span>
          </div>

          <p className="text-xs mb-3" style={{ color: 'var(--app-text-dim)' }}>
            Toggle between the default Dark theme and the high-contrast Light theme across the entire application interface.
          </p>

          {/* Theme Option Selector Cards */}
          <div className="grid grid-cols-2 gap-2.5">
            {/* Dark Theme Button */}
            <button
              type="button"
              onClick={() => onToggleTheme('dark')}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer relative flex flex-col justify-between ${
                theme === 'dark'
                  ? 'ring-2 ring-cyan-400 shadow-md'
                  : 'opacity-70 hover:opacity-100'
              }`}
              style={{
                backgroundColor: '#041a18',
                borderColor: theme === 'dark' ? '#00bcd4' : 'rgba(20, 184, 166, 0.3)',
                color: '#ffffff',
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="w-7 h-7 rounded-lg bg-teal-950 border border-cyan-500/40 flex items-center justify-center text-cyan-300">
                  <Moon className="w-4 h-4" />
                </div>
                {theme === 'dark' && (
                  <span className="w-4 h-4 rounded-full bg-cyan-400 text-slate-950 flex items-center justify-center">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </span>
                )}
              </div>
              <div>
                <span className="font-heading font-bold text-xs block text-white">Dark Theme</span>
                <span className="text-[10px] text-teal-300/80">Obsidian & Teal (Default)</span>
              </div>
            </button>

            {/* Light Theme Button */}
            <button
              type="button"
              onClick={() => onToggleTheme('light')}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer relative flex flex-col justify-between ${
                theme === 'light'
                  ? 'ring-2 ring-cyan-600 shadow-md'
                  : 'opacity-70 hover:opacity-100'
              }`}
              style={{
                backgroundColor: '#ffffff',
                borderColor: theme === 'light' ? '#0891b2' : 'rgba(13, 148, 136, 0.3)',
                color: '#0f172a',
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="w-7 h-7 rounded-lg bg-teal-50 border border-teal-300 flex items-center justify-center text-amber-500">
                  <Sun className="w-4 h-4" />
                </div>
                {theme === 'light' && (
                  <span className="w-4 h-4 rounded-full bg-teal-600 text-white flex items-center justify-center">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </span>
                )}
              </div>
              <div>
                <span className="font-heading font-bold text-xs block text-slate-900">Light Theme</span>
                <span className="text-[10px] text-teal-700">Clean Slate & Cyan</span>
              </div>
            </button>
          </div>
        </div>

        {/* API Integration Panel */}
        <div 
          className="rounded-2xl p-4 border shadow-xl transition-colors duration-250"
          style={{
            backgroundColor: 'var(--app-surface)',
            borderColor: 'var(--app-border)',
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-heading font-bold text-sm flex items-center gap-1.5" style={{ color: 'var(--app-text-primary)' }}>
              <Server className="w-4 h-4 text-cyan-400" />
              <span>Authentication API Integration</span>
            </h2>
            <span 
              className="text-[10px] font-bold px-2 py-0.5 rounded-full border"
              style={{
                backgroundColor: 'var(--app-surface-highlight)',
                borderColor: 'var(--app-border)',
                color: 'var(--app-text-secondary)',
              }}
            >
              Developer Hook
            </span>
          </div>

          <p className="text-xs mb-3" style={{ color: 'var(--app-text-dim)' }}>
            Plug your existing authentication backend API into AlienPay. The app routes sign up, login, and auth token headers to these endpoints.
          </p>

          {/* Mode Switcher */}
          <div 
            className="grid grid-cols-2 gap-2 p-1 rounded-xl border mb-3 text-xs"
            style={{
              backgroundColor: 'var(--app-surface-subtle)',
              borderColor: 'var(--app-border-subtle)',
            }}
          >
            <button
              onClick={() => setMode('built_in')}
              className={`py-2 px-3 rounded-lg font-semibold transition-all cursor-pointer ${
                mode === 'built_in'
                  ? 'bg-cyan-500 text-slate-950 shadow-sm'
                  : 'opacity-70 hover:opacity-100'
              }`}
            >
              Interactive Ready Mode
            </button>
            <button
              onClick={() => setMode('custom_api')}
              className={`py-2 px-3 rounded-lg font-semibold transition-all cursor-pointer ${
                mode === 'custom_api'
                  ? 'bg-cyan-500 text-slate-950 shadow-sm'
                  : 'opacity-70 hover:opacity-100'
              }`}
            >
              Custom Backend API
            </button>
          </div>

          {/* Custom API Configuration Inputs */}
          {mode === 'custom_api' ? (
            <div className="space-y-2.5 text-xs pt-1">
              <div>
                <label className="block font-semibold mb-1" style={{ color: 'var(--app-text-muted)' }}>
                  Base API URL
                </label>
                <input
                  type="text"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder="https://api.yourdomain.com or http://localhost:8000"
                  className="w-full border rounded-xl px-3 py-2 font-mono text-xs focus:outline-none"
                  style={{
                    backgroundColor: 'var(--app-input-bg)',
                    borderColor: 'var(--app-input-border)',
                    color: 'var(--app-input-text)',
                  }}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold mb-1" style={{ color: 'var(--app-text-muted)' }}>
                    Login Route
                  </label>
                  <input
                    type="text"
                    value={loginEndpoint}
                    onChange={(e) => setLoginEndpoint(e.target.value)}
                    placeholder="/auth/login"
                    className="w-full border rounded-xl px-3 py-2 font-mono text-xs focus:outline-none"
                    style={{
                      backgroundColor: 'var(--app-input-bg)',
                      borderColor: 'var(--app-input-border)',
                      color: 'var(--app-input-text)',
                    }}
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1" style={{ color: 'var(--app-text-muted)' }}>
                    Sign Up Route
                  </label>
                  <input
                    type="text"
                    value={signupEndpoint}
                    onChange={(e) => setSignupEndpoint(e.target.value)}
                    placeholder="/auth/register"
                    className="w-full border rounded-xl px-3 py-2 font-mono text-xs focus:outline-none"
                    style={{
                      backgroundColor: 'var(--app-input-bg)',
                      borderColor: 'var(--app-input-border)',
                      color: 'var(--app-input-text)',
                    }}
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1" style={{ color: 'var(--app-text-muted)' }}>
                  Active Bearer Token (Optional / Manual Overwrite)
                </label>
                <input
                  type="text"
                  value={manualToken}
                  onChange={(e) => setManualToken(e.target.value)}
                  placeholder="Bearer eyJhbGciOiJIUzI1..."
                  className="w-full border rounded-xl px-3 py-2 font-mono text-xs focus:outline-none"
                  style={{
                    backgroundColor: 'var(--app-input-bg)',
                    borderColor: 'var(--app-input-border)',
                    color: 'var(--app-input-text)',
                  }}
                />
              </div>

              {/* Action Buttons: Test & Save */}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleTestApi}
                  disabled={isTesting}
                  className="flex-1 py-2 rounded-xl border font-bold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
                  style={{
                    backgroundColor: 'var(--app-surface-subtle)',
                    borderColor: 'var(--app-border)',
                    color: 'var(--app-text-secondary)',
                  }}
                >
                  {isTesting ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Play className="w-3.5 h-3.5 text-cyan-400" />
                  )}
                  <span>Test Endpoint</span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveApiConfig}
                  className="flex-1 py-2 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save API Config</span>
                </button>
              </div>

              {/* Test result display */}
              {testResult && (
                <div
                  className={`mt-2 p-2.5 rounded-xl border text-xs flex items-start gap-2 ${
                    testResult.reachable
                      ? 'bg-emerald-950/60 border-emerald-800/60 text-emerald-200'
                      : 'bg-amber-950/60 border-amber-800/60 text-amber-200'
                  }`}
                >
                  {testResult.reachable ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p className="font-semibold">{testResult.message}</p>
                    <p className="text-[10px] opacity-75 mt-0.5 font-mono">
                      Target: {baseUrl}{loginEndpoint}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div 
              className="p-3 rounded-xl border text-xs flex items-center justify-between"
              style={{
                backgroundColor: 'var(--app-surface-subtle)',
                borderColor: 'var(--app-border-subtle)',
              }}
            >
              <div>
                <span className="font-semibold block" style={{ color: 'var(--app-text-primary)' }}>
                  Interactive Mock Engine Enabled
                </span>
                <span className="text-[11px]" style={{ color: 'var(--app-text-dim)' }}>
                  Simulates real JWT auth, local storage, balances, and deposits
                </span>
              </div>
              <button
                onClick={handleSaveApiConfig}
                className="px-3 py-1.5 rounded-lg bg-cyan-400 text-slate-950 font-bold hover:bg-cyan-300 cursor-pointer shadow-sm"
              >
                Apply
              </button>
            </div>
          )}

          {savedSuccess && (
            <div className="mt-2 text-xs text-emerald-400 flex items-center gap-1 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Settings updated successfully!</span>
            </div>
          )}
        </div>

        {/* Security & PIN Preferences */}
        <div 
          className="rounded-2xl p-4 border space-y-3.5 transition-colors duration-250"
          style={{
            backgroundColor: 'var(--app-surface)',
            borderColor: 'var(--app-border)',
          }}
        >
          <div className="flex items-center justify-between">
            <h2 className="font-heading font-bold text-sm flex items-center gap-1.5" style={{ color: 'var(--app-text-primary)' }}>
              <Shield className="w-4 h-4 text-cyan-400" />
              <span>Security PIN & Biometrics</span>
            </h2>
          </div>

          <div className="space-y-3 text-xs">
            {/* 4-Digit Security PIN Card */}
            <div 
              className="p-3 rounded-xl border space-y-2.5 transition-colors"
              style={{
                backgroundColor: 'var(--app-surface-subtle)',
                borderColor: 'var(--app-border-subtle)',
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-emerald-400" />
                  <div>
                    <span className="font-bold block" style={{ color: 'var(--app-text-primary)' }}>
                      4-Digit Security PIN
                    </span>
                    <span className="text-[10px]" style={{ color: 'var(--app-text-dim)' }}>
                      {hasCustomPin ? 'Status: Custom PIN Active (••••)' : 'Status: Set your custom 4-digit PIN'}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowChangePin(!showChangePin)}
                  className="px-2.5 py-1.5 rounded-lg bg-teal-900/30 text-cyan-600 dark:text-cyan-400 border border-teal-700/40 text-[11px] font-bold cursor-pointer hover:bg-teal-800/40"
                >
                  {showChangePin ? 'Cancel' : hasCustomPin ? 'Change PIN' : 'Set Custom PIN'}
                </button>
              </div>

              {/* Inline Change PIN Form */}
              {showChangePin && (
                <form onSubmit={handleSaveNewPin} className="mt-2 pt-2 border-t space-y-2" style={{ borderColor: 'var(--app-border-subtle)' }}>
                  {pinMsg && (
                    <div className={`p-2 rounded-lg text-xs font-semibold ${
                      pinMsg.type === 'success' ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/40' : 'bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/40'
                    }`}>
                      {pinMsg.text}
                    </div>
                  )}

                  <div className={`grid ${hasCustomPin ? 'grid-cols-3' : 'grid-cols-2'} gap-2`}>
                    {hasCustomPin && (
                      <div>
                        <label className="block text-[10px] mb-1 font-semibold" style={{ color: 'var(--app-text-muted)' }}>Current PIN</label>
                        <input
                          type="password"
                          maxLength={4}
                          required
                          value={currentPin}
                          onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, ''))}
                          placeholder="••••"
                          className="w-full rounded-lg px-2 py-1.5 font-mono text-center text-xs border"
                          style={{
                            backgroundColor: 'var(--app-input-bg)',
                            borderColor: 'var(--app-input-border)',
                            color: 'var(--app-input-text)',
                          }}
                        />
                      </div>
                    )}
                    <div>
                      <label className="block text-[10px] mb-1 font-semibold" style={{ color: 'var(--app-text-muted)' }}>New 4-Digit PIN</label>
                      <input
                        type="password"
                        maxLength={4}
                        required
                        value={newPin}
                        onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                        placeholder="••••"
                        className="w-full rounded-lg px-2 py-1.5 font-mono text-center text-xs border"
                        style={{
                          backgroundColor: 'var(--app-input-bg)',
                          borderColor: 'var(--app-input-border)',
                          color: 'var(--app-input-text)',
                        }}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] mb-1 font-semibold" style={{ color: 'var(--app-text-muted)' }}>Confirm PIN</label>
                      <input
                        type="password"
                        maxLength={4}
                        required
                        value={confirmNewPin}
                        onChange={(e) => setConfirmNewPin(e.target.value.replace(/\D/g, ''))}
                        placeholder="••••"
                        className="w-full rounded-lg px-2 py-1.5 font-mono text-center text-xs border"
                        style={{
                          backgroundColor: 'var(--app-input-bg)',
                          borderColor: 'var(--app-input-border)',
                          color: 'var(--app-input-text)',
                        }}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSavingPin}
                    className="w-full mt-2 py-1.5 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs cursor-pointer shadow-sm transition-all disabled:opacity-60"
                  >
                    {isSavingPin ? 'Saving PIN...' : 'Save New PIN'}
                  </button>
                </form>
              )}
            </div>

            {/* Biometric Unlock */}
            <div 
              className="flex items-center justify-between p-2.5 rounded-xl border"
              style={{
                backgroundColor: 'var(--app-surface-subtle)',
                borderColor: 'var(--app-border-subtle)',
              }}
            >
              <div className="flex items-center gap-2">
                <Fingerprint className="w-4 h-4 text-cyan-500 dark:text-cyan-400" />
                <div>
                  <span className="font-semibold block" style={{ color: 'var(--app-text-primary)' }}>
                    Biometric Authentication (Touch ID / Face ID)
                  </span>
                  <span className="text-[10px]" style={{ color: 'var(--app-text-dim)' }}>
                    Instant biometric unlock for withdrawals and sensitive actions
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowBiometricTest(true)}
                  className="px-2 py-1 rounded-md text-[10px] font-bold bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/25 cursor-pointer"
                >
                  Test Sensor
                </button>
                <input
                  type="checkbox"
                  checked={biometricEnabled}
                  onChange={(e) => handleToggleBiometric(e.target.checked)}
                  className="w-4 h-4 rounded text-cyan-500 cursor-pointer"
                />
              </div>
            </div>

            {/* Require PIN for Withdrawals */}
            <div 
              className="flex items-center justify-between p-2.5 rounded-xl border"
              style={{
                backgroundColor: 'var(--app-surface-subtle)',
                borderColor: 'var(--app-border-subtle)',
              }}
            >
              <div>
                <span className="font-semibold block" style={{ color: 'var(--app-text-primary)' }}>
                  Require PIN for Withdrawals
                </span>
                <span className="text-[10px]" style={{ color: 'var(--app-text-dim)' }}>
                  Mandatory 4-digit PIN verification before releasing payout
                </span>
              </div>
              <input
                type="checkbox"
                checked={requirePinForWithdrawal}
                onChange={(e) => setRequirePinForWithdrawal(e.target.checked)}
                className="w-4 h-4 rounded text-cyan-500 cursor-pointer"
              />
            </div>

            {/* 2FA Toggle */}
            <div 
              className="flex items-center justify-between p-2.5 rounded-xl border"
              style={{
                backgroundColor: 'var(--app-surface-subtle)',
                borderColor: 'var(--app-border-subtle)',
              }}
            >
              <div>
                <span className="font-semibold block" style={{ color: 'var(--app-text-primary)' }}>
                  Two-Factor Authentication (Email 2FA)
                </span>
                <span className="text-[10px]" style={{ color: 'var(--app-text-dim)' }}>
                  Require email OTP verification for high-value actions
                </span>
              </div>
              <input
                type="checkbox"
                checked={twoFactorEnabled}
                onChange={(e) => setTwoFactorEnabled(e.target.checked)}
                className="w-4 h-4 rounded text-cyan-500 cursor-pointer"
              />
            </div>
          </div>

          {/* Biometric test modal */}
          <BiometricModal
            isOpen={showBiometricTest}
            onClose={() => setShowBiometricTest(false)}
            onSuccess={() => {
              setShowBiometricTest(false);
              setSavedSuccess(true);
              setTimeout(() => setSavedSuccess(false), 2000);
            }}
            title="Biometric Sensor Test"
            subtitle="Testing device fingerprint & Face ID compatibility"
          />
        </div>

        {/* Currency & Display */}
        <div 
          className="rounded-2xl p-4 border space-y-3 transition-colors duration-250"
          style={{
            backgroundColor: 'var(--app-surface)',
            borderColor: 'var(--app-border)',
          }}
        >
          <h2 className="font-heading font-bold text-sm flex items-center gap-1.5" style={{ color: 'var(--app-text-primary)' }}>
            <DollarSign className="w-4 h-4 text-cyan-400" />
            <span>Default Valuation Currency</span>
          </h2>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              onClick={() => setCurrencyPref('INR')}
              className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                currencyPref === 'INR'
                  ? 'border-cyan-400 shadow-sm font-bold'
                  : 'opacity-70 hover:opacity-100'
              }`}
              style={{
                backgroundColor: currencyPref === 'INR' ? 'var(--app-surface-highlight)' : 'var(--app-surface-subtle)',
                borderColor: currencyPref === 'INR' ? 'var(--app-text-secondary)' : 'var(--app-border-subtle)',
                color: 'var(--app-text-primary)',
              }}
            >
              <span className="font-bold block text-sm">₹ INR</span>
              <span className="text-[10px]" style={{ color: 'var(--app-text-dim)' }}>Indian Rupee</span>
            </button>

            <button
              onClick={() => setCurrencyPref('USDT')}
              className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                currencyPref === 'USDT'
                  ? 'border-cyan-400 shadow-sm font-bold'
                  : 'opacity-70 hover:opacity-100'
              }`}
              style={{
                backgroundColor: currencyPref === 'USDT' ? 'var(--app-surface-highlight)' : 'var(--app-surface-subtle)',
                borderColor: currencyPref === 'USDT' ? 'var(--app-text-secondary)' : 'var(--app-border-subtle)',
                color: 'var(--app-text-primary)',
              }}
            >
              <span className="font-bold block text-sm">$ USDT</span>
              <span className="text-[10px]" style={{ color: 'var(--app-text-dim)' }}>Tether USD</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
