import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Shield,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  Search,
  Users,
  ArrowDownToLine,
  ArrowUpFromLine,
  Crown,
  Sparkles,
  Coins,
  TrendingUp,
  Clock,
  ExternalLink,
  ChevronRight,
  Filter,
  Check,
  X,
  CreditCard,
  Building,
  Save,
  QrCode,
  Upload,
  Trash2,
  Headphones,
  Plus,
  MessageCircle,
  Copy
} from 'lucide-react';
import { ActiveScreen, UserProfile, InrDepositConfig, SupportConfig, TelegramSupportAgent } from '../../types';
import { ApiService } from '../../services/apiService';
import { DEPOSIT_PLANS } from '../../data/plans';

// Telegram brand icon component
const TelegramIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .37z" />
  </svg>
);

interface AdminPanelScreenProps {
  currentUser: UserProfile;
  onNavigate: (screen: ActiveScreen) => void;
  onUserUpdated?: (user: UserProfile) => void;
}

type AdminTab = 'deposits' | 'withdrawals' | 'users' | 'roi' | 'deposit_config' | 'support_config';

export const AdminPanelScreen: React.FC<AdminPanelScreenProps> = ({
  currentUser,
  onNavigate,
  onUserUpdated,
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('deposits');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Admin Data State
  const [users, setUsers] = useState<any[]>([]);
  const [deposits, setDeposits] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalUsers: 0,
    pendingDepositsCount: 0,
    pendingWithdrawalsCount: 0,
    activePlanCount: 0,
    totalBalanceUsdt: 0,
  });

  // Filters & Search
  const [depositFilter, setDepositFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [withdrawalFilter, setWithdrawalFilter] = useState<'all' | 'pending' | 'completed' | 'rejected'>('pending');
  const [userSearch, setUserSearch] = useState('');

  // Daily ROI Action State
  const [isDistributingRoi, setIsDistributingRoi] = useState(false);
  const [roiResult, setRoiResult] = useState<{
    totalDistributedUsdt: number;
    usersCredited: number;
    details: Array<{
      userId: string;
      userName: string;
      userEmail: string;
      planName: string;
      roiAmount: number;
    }>;
  } | null>(null);

  // INR Deposit Bank/UPI Configuration State
  const [inrConfig, setInrConfig] = useState<InrDepositConfig>({
    upiId: 'alienpay.business@icici',
    accountHolder: 'AlienPay Corporate Ltd',
    accountNumber: '50200084920192',
    ifscCode: 'ICIC0000104',
    bankName: 'ICICI Bank Ltd',
    branch: 'Bandra Kurla Complex, Mumbai',
  });
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const qrFileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [isUploadingQr, setIsUploadingQr] = useState(false);
  const [qrUploadError, setQrUploadError] = useState<string | null>(null);
  const [qrUploadSuccess, setQrUploadSuccess] = useState<string | null>(null);

  // 24/7 Telegram Support Configuration State
  const [supportConfig, setSupportConfig] = useState<SupportConfig>({
    telegramChannelName: 'AlienPay Official Community & Updates',
    telegramChannelUsername: 'AlienPayOfficial',
    telegramChannelUrl: 'https://t.me/AlienPayOfficial',
    channelSubscribersCount: '24.8K+ Members',
    announcementNotice: 'Welcome to AlienPay 24/7 Official Helpdesk. Our dedicated support agents are online 24/7 on Telegram. We have removed WhatsApp VIP Desk—please only connect with official handles below.',
    agents: [
      {
        id: 'agent-1',
        name: 'Agent Rohit · INR & UPI Desk',
        role: 'Deposit Approvals, UPI & Bank UTR Verification',
        username: '@AlienPay_Support1',
        link: 'https://t.me/AlienPay_Support1',
        isOnline: true,
        avatarText: 'D1',
      },
      {
        id: 'agent-2',
        name: 'Agent Alex · Crypto & Blockchain Desk',
        role: 'BEP-20 USDT Deposit & Gas Verification',
        username: '@AlienPay_Support2',
        link: 'https://t.me/AlienPay_Support2',
        isOnline: true,
        avatarText: 'D2',
      },
      {
        id: 'agent-3',
        name: 'Agent Priya · VIP Relations Desk',
        role: 'Silver, Gold & Diamond Plans & Daily Dividends',
        username: '@AlienPay_VIPSupport',
        link: 'https://t.me/AlienPay_VIPSupport',
        isOnline: true,
        avatarText: 'VIP',
      },
      {
        id: 'agent-4',
        name: 'Agent David · Priority Escalation Desk',
        role: 'Withdrawal Settlements & 24/7 Supervisor Desk',
        username: '@AlienPay_Escalation',
        link: 'https://t.me/AlienPay_Escalation',
        isOnline: true,
        avatarText: 'ESC',
      },
    ],
  });
  const [isSavingSupportConfig, setIsSavingSupportConfig] = useState(false);

  // User Plan Upgrade Modal/Select State
  const [selectedUserForPlan, setSelectedUserForPlan] = useState<any | null>(null);
  const [targetPlanId, setTargetPlanId] = useState<string>('silver');
  const [targetPlanStatus, setTargetPlanStatus] = useState<'active' | 'inactive'>('active');
  const [isUpdatingPlan, setIsUpdatingPlan] = useState(false);

  // Process Action State (for buttons)
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchOverview = async (showLoader = false) => {
    if (showLoader) setIsLoading(true);
    setIsRefreshing(true);
    try {
      const res = await ApiService.getAdminOverview();
      if (res.success) {
        setUsers(res.users || []);
        setDeposits(res.deposits || []);
        setWithdrawals(res.withdrawals || []);
        if (res.stats) setStats(res.stats);
        if (res.inrDepositConfig) setInrConfig(res.inrDepositConfig);
        if (res.supportConfig) {
          setSupportConfig(res.supportConfig);
        } else {
          ApiService.getSupportConfig().then((cfg) => {
            if (cfg) setSupportConfig(cfg);
          }).catch(() => {});
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load admin overview');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOverview(true);
  }, []);

  const showNotification = (msg: string, isError = false) => {
    if (isError) {
      setErrorMsg(msg);
      setTimeout(() => setErrorMsg(null), 5000);
    } else {
      setSuccessMsg(msg);
      setTimeout(() => setSuccessMsg(null), 4000);
    }
  };

  // Deposit Actions: Approve / Reject
  const handleDepositAction = async (depositId: string, action: 'approve' | 'reject') => {
    setProcessingId(`dep_${depositId}_${action}`);
    try {
      const res = await ApiService.verifyDeposit(depositId, action);
      showNotification(
        action === 'approve'
          ? `Deposit verified & credited to user balance!`
          : `Deposit request marked as rejected.`
      );
      if (res.user && res.user.id === currentUser.id && onUserUpdated) {
        onUserUpdated(res.user);
      }
      await fetchOverview();
    } catch (err: any) {
      showNotification(err.message || `Failed to ${action} deposit`, true);
    } finally {
      setProcessingId(null);
    }
  };

  // Withdrawal Actions: Approve / Reject (Refund)
  const handleWithdrawalAction = async (withdrawalId: string, action: 'approve' | 'reject') => {
    setProcessingId(`wd_${withdrawalId}_${action}`);
    try {
      const res = await ApiService.verifyWithdrawal(withdrawalId, action);
      showNotification(
        action === 'approve'
          ? `Withdrawal approved & completed successfully.`
          : `Withdrawal rejected: Funds automatically refunded back to user's wallet!`
      );
      if (res.user && res.user.id === currentUser.id && onUserUpdated) {
        onUserUpdated(res.user);
      }
      await fetchOverview();
    } catch (err: any) {
      showNotification(err.message || `Failed to ${action} withdrawal`, true);
    } finally {
      setProcessingId(null);
    }
  };

  // Trigger Daily ROI Distribution
  const handleDistributeDailyRoi = async () => {
    setIsDistributingRoi(true);
    setRoiResult(null);
    try {
      const res = await ApiService.distributeDailyRoi();
      if (res.success) {
        setRoiResult({
          totalDistributedUsdt: res.totalDistributedUsdt,
          usersCredited: res.usersCredited,
          details: res.details,
        });
        showNotification(
          `Daily ROI Payout Complete! Credited ${res.usersCredited} users with $${res.totalDistributedUsdt} USDT total dividends.`
        );
        await fetchOverview();
      }
    } catch (err: any) {
      showNotification(err.message || 'Failed to distribute daily ROI', true);
    } finally {
      setIsDistributingRoi(false);
    }
  };

  // Admin Upgrade/Deactivate User Plan
  const handleSaveUserPlan = async () => {
    if (!selectedUserForPlan) return;
    setIsUpdatingPlan(true);
    try {
      const res = await ApiService.updateUserPlan(
        selectedUserForPlan.id,
        targetPlanId,
        targetPlanStatus
      );
      showNotification(
        `Plan updated for ${selectedUserForPlan.name} (${selectedUserForPlan.email}) to ${
          targetPlanStatus === 'active' ? targetPlanId.toUpperCase() : 'Inactive'
        }!`
      );
      if (res.user && res.user.id === currentUser.id && onUserUpdated) {
        onUserUpdated(res.user);
      }
      setSelectedUserForPlan(null);
      await fetchOverview();
    } catch (err: any) {
      showNotification(err.message || 'Failed to update user plan', true);
    } finally {
      setIsUpdatingPlan(false);
    }
  };

  // Admin Update INR Deposit Configuration (UPI & Bank Details)
  const handleSaveInrConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingConfig(true);
    try {
      const res = await ApiService.updateInrDepositConfig(inrConfig);
      if (res.success && res.config) {
        setInrConfig(res.config);
        showNotification('INR Deposit details updated successfully! All users will immediately see these details.');
      }
    } catch (err: any) {
      showNotification(err.message || 'Failed to update INR deposit configuration', true);
    } finally {
      setIsSavingConfig(false);
    }
  };

  // Upload QR Code image to Cloudinary CDN
  const handleQrFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setQrUploadError('Invalid file type. Please upload a JPG, PNG, or WebP image.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setQrUploadError('Image size exceeds 5MB limit.');
      return;
    }

    setIsUploadingQr(true);
    setQrUploadError(null);
    setQrUploadSuccess(null);

    try {
      const res = await ApiService.uploadDepositQrCode(file);
      if (res.success && res.qrCodeUrl) {
        setInrConfig((prev) => ({ ...prev, qrCodeUrl: res.qrCodeUrl }));
        setQrUploadSuccess('QR Code image uploaded to Cloudinary successfully!');
        showNotification('Deposit QR Code image uploaded to Cloudinary CDN!');
      }
    } catch (err: any) {
      console.error('QR upload error:', err);
      setQrUploadError(err.message || 'Failed to upload QR code image to Cloudinary');
    } finally {
      setIsUploadingQr(false);
      if (qrFileInputRef.current) qrFileInputRef.current.value = '';
    }
  };

  // Remove QR Code image from configuration
  const handleRemoveQrCode = async () => {
    setIsSavingConfig(true);
    setQrUploadError(null);
    setQrUploadSuccess(null);
    try {
      const res = await ApiService.updateInrDepositConfig({ qrCodeUrl: '' });
      if (res.success && res.config) {
        setInrConfig(res.config);
        setQrUploadSuccess('QR Code image removed.');
        showNotification('Deposit QR Code removed.');
      }
    } catch (err: any) {
      showNotification(err.message || 'Failed to remove QR code', true);
    } finally {
      setIsSavingConfig(false);
    }
  };

  // Admin Update 24/7 Telegram Support Desks & Channel Configuration
  const handleSaveSupportConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSupportConfig(true);
    try {
      const res = await ApiService.updateSupportConfig(supportConfig);
      if (res.success && res.config) {
        setSupportConfig(res.config);
        showNotification('24/7 Telegram Support Desks & Channel updated successfully! All users will immediately see these details.');
      }
    } catch (err: any) {
      showNotification(err.message || 'Failed to update support configuration', true);
    } finally {
      setIsSavingSupportConfig(false);
    }
  };

  const handleUpdateAgentField = (index: number, field: keyof TelegramSupportAgent, value: any) => {
    setSupportConfig((prev) => {
      const nextAgents = [...prev.agents];
      const agent = { ...nextAgents[index], [field]: value };
      if (field === 'username' && typeof value === 'string') {
        const clean = value.replace(/^@/, '').trim();
        agent.link = `https://t.me/${clean}`;
      }
      nextAgents[index] = agent;
      return { ...prev, agents: nextAgents };
    });
  };

  const handleAddAgent = () => {
    setSupportConfig((prev) => {
      const nextIdx = prev.agents.length + 1;
      const newAgent: TelegramSupportAgent = {
        id: `agent-${Date.now()}`,
        name: `Support Desk #${nextIdx}`,
        role: 'General & Account Assistance',
        username: `@AlienPay_Support${nextIdx}`,
        link: `https://t.me/AlienPay_Support${nextIdx}`,
        isOnline: true,
        avatarText: `D${nextIdx}`,
      };
      return { ...prev, agents: [...prev.agents, newAgent] };
    });
  };

  const handleRemoveAgent = (index: number) => {
    setSupportConfig((prev) => ({
      ...prev,
      agents: prev.agents.filter((_, i) => i !== index),
    }));
  };

  const handleResetSupportToDefaults = () => {
    setSupportConfig({
      telegramChannelName: 'AlienPay Official Community & Updates',
      telegramChannelUsername: 'AlienPayOfficial',
      telegramChannelUrl: 'https://t.me/AlienPayOfficial',
      channelSubscribersCount: '24.8K+ Members',
      announcementNotice: 'Welcome to AlienPay 24/7 Official Helpdesk. Our dedicated support agents are online 24/7 on Telegram. We have removed WhatsApp VIP Desk—please only connect with official handles below.',
      agents: [
        {
          id: 'agent-1',
          name: 'Agent Rohit · INR & UPI Desk',
          role: 'Deposit Approvals, UPI & Bank UTR Verification',
          username: '@AlienPay_Support1',
          link: 'https://t.me/AlienPay_Support1',
          isOnline: true,
          avatarText: 'D1',
        },
        {
          id: 'agent-2',
          name: 'Agent Alex · Crypto & Blockchain Desk',
          role: 'BEP-20 USDT Deposit & Gas Verification',
          username: '@AlienPay_Support2',
          link: 'https://t.me/AlienPay_Support2',
          isOnline: true,
          avatarText: 'D2',
        },
        {
          id: 'agent-3',
          name: 'Agent Priya · VIP Relations Desk',
          role: 'Silver, Gold & Diamond Plans & Daily Dividends',
          username: '@AlienPay_VIPSupport',
          link: 'https://t.me/AlienPay_VIPSupport',
          isOnline: true,
          avatarText: 'VIP',
        },
        {
          id: 'agent-4',
          name: 'Agent David · Priority Escalation Desk',
          role: 'Withdrawal Settlements & 24/7 Supervisor Desk',
          username: '@AlienPay_Escalation',
          link: 'https://t.me/AlienPay_Escalation',
          isOnline: true,
          avatarText: 'ESC',
        },
      ],
    });
  };

  // Filtered lists
  const filteredDeposits = deposits.filter((d) => {
    if (depositFilter === 'all') return true;
    return d.status === depositFilter;
  });

  const filteredWithdrawals = withdrawals.filter((w) => {
    if (withdrawalFilter === 'all') return true;
    return w.status === withdrawalFilter;
  });

  const filteredUsers = users.filter((u) => {
    if (!userSearch.trim()) return true;
    const q = userSearch.toLowerCase();
    return (
      (u.name || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q) ||
      (u.alienPayId || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex-1 flex flex-col pb-8 transition-colors duration-250">
      {/* Top Section Header */}
      <div
        className="px-4 py-3 border-b flex items-center justify-between sticky top-0 z-20 backdrop-blur-md transition-colors duration-250"
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
          <span>Dashboard</span>
        </button>

        <div className="flex items-center gap-1.5">
          <Shield className="w-4 h-4 text-cyan-400" />
          <h1 className="font-heading font-bold text-sm tracking-tight" style={{ color: 'var(--app-text-primary)' }}>
            Control Panel (Admin)
          </h1>
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-500 border border-amber-500/30">
            Testing
          </span>
        </div>

        <button
          onClick={() => fetchOverview()}
          disabled={isRefreshing}
          className="p-1.5 rounded-lg cursor-pointer"
          style={{ color: 'var(--app-text-secondary)' }}
          title="Refresh Data"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="px-4 py-3 space-y-4">
        {/* Notification Alert Banners */}
        {successMsg && (
          <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 text-xs flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span className="font-medium">{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-400 text-xs flex items-center gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span className="font-medium">{errorMsg}</span>
          </div>
        )}

        {/* Quick Metrics Bar */}
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {/* Pending Deposits */}
          <div
            onClick={() => { setActiveTab('deposits'); setDepositFilter('pending'); }}
            className={`p-3 rounded-2xl border transition-all cursor-pointer ${
              activeTab === 'deposits' && depositFilter === 'pending'
                ? 'ring-2 ring-cyan-400 shadow-md'
                : ''
            }`}
            style={{
              backgroundColor: 'var(--app-surface)',
              borderColor: 'var(--app-border)',
            }}
          >
            <div className="flex items-center justify-between text-xs" style={{ color: 'var(--app-text-dim)' }}>
              <span>Pending Deposits</span>
              <ArrowDownToLine className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl font-heading font-black tabular-nums" style={{ color: 'var(--app-text-primary)' }}>
                {stats.pendingDepositsCount}
              </span>
              {stats.pendingDepositsCount > 0 && (
                <span className="text-[10px] font-bold text-amber-400 bg-amber-500/15 px-1.5 py-0.2 rounded-full">
                  Action Req.
                </span>
              )}
            </div>
          </div>

          {/* Pending Withdrawals */}
          <div
            onClick={() => { setActiveTab('withdrawals'); setWithdrawalFilter('pending'); }}
            className={`p-3 rounded-2xl border transition-all cursor-pointer ${
              activeTab === 'withdrawals' && withdrawalFilter === 'pending'
                ? 'ring-2 ring-cyan-400 shadow-md'
                : ''
            }`}
            style={{
              backgroundColor: 'var(--app-surface)',
              borderColor: 'var(--app-border)',
            }}
          >
            <div className="flex items-center justify-between text-xs" style={{ color: 'var(--app-text-dim)' }}>
              <span>Pending Payouts</span>
              <ArrowUpFromLine className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl font-heading font-black tabular-nums" style={{ color: 'var(--app-text-primary)' }}>
                {stats.pendingWithdrawalsCount}
              </span>
              {stats.pendingWithdrawalsCount > 0 && (
                <span className="text-[10px] font-bold text-rose-400 bg-rose-500/15 px-1.5 py-0.2 rounded-full">
                  Action Req.
                </span>
              )}
            </div>
          </div>

          {/* Active Plan Users */}
          <div
            onClick={() => setActiveTab('users')}
            className={`p-3 rounded-2xl border transition-all cursor-pointer ${
              activeTab === 'users' ? 'ring-2 ring-cyan-400 shadow-md' : ''
            }`}
            style={{
              backgroundColor: 'var(--app-surface)',
              borderColor: 'var(--app-border)',
            }}
          >
            <div className="flex items-center justify-between text-xs" style={{ color: 'var(--app-text-dim)' }}>
              <span>Active Plans</span>
              <Crown className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl font-heading font-black tabular-nums" style={{ color: 'var(--app-text-primary)' }}>
                {stats.activePlanCount}
              </span>
              <span className="text-[10px] font-semibold" style={{ color: 'var(--app-text-dim)' }}>
                / {stats.totalUsers} users
              </span>
            </div>
          </div>

          {/* Daily ROI Distribution */}
          <div
            onClick={() => setActiveTab('roi')}
            className={`p-3 rounded-2xl border transition-all cursor-pointer ${
              activeTab === 'roi' ? 'ring-2 ring-cyan-400 shadow-md' : ''
            }`}
            style={{
              backgroundColor: 'var(--app-surface)',
              borderColor: 'var(--app-border)',
            }}
          >
            <div className="flex items-center justify-between text-xs" style={{ color: 'var(--app-text-dim)' }}>
              <span>Daily ROI Tool</span>
              <Sparkles className="w-3.5 h-3.5 text-teal-400" />
            </div>
            <div className="mt-1 text-xs font-bold text-teal-400 flex items-center gap-1">
              <span>Distribute</span>
              <ChevronRight className="w-3 h-3" />
            </div>
          </div>
        </div>

        {/* Tab Selector Navigation */}
        <div
          className="flex p-1 rounded-xl border text-xs font-semibold overflow-x-auto gap-1 no-scrollbar"
          style={{
            backgroundColor: 'var(--app-surface-subtle)',
            borderColor: 'var(--app-border-subtle)',
          }}
        >
          <button
            onClick={() => setActiveTab('deposits')}
            className={`flex-1 min-w-[85px] py-1.5 px-2 rounded-lg text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'deposits'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                : 'opacity-70 hover:opacity-100'
            }`}
            style={{
              color: activeTab === 'deposits' ? '#021312' : 'var(--app-text-primary)',
            }}
          >
            <ArrowDownToLine className="w-3.5 h-3.5" />
            <span>Deposits</span>
            {stats.pendingDepositsCount > 0 && (
              <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-rose-500 text-white font-black">
                {stats.pendingDepositsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('withdrawals')}
            className={`flex-1 min-w-[95px] py-1.5 px-2 rounded-lg text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'withdrawals'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                : 'opacity-70 hover:opacity-100'
            }`}
            style={{
              color: activeTab === 'withdrawals' ? '#021312' : 'var(--app-text-primary)',
            }}
          >
            <ArrowUpFromLine className="w-3.5 h-3.5" />
            <span>Withdrawals</span>
            {stats.pendingWithdrawalsCount > 0 && (
              <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-rose-500 text-white font-black">
                {stats.pendingWithdrawalsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`flex-1 min-w-[90px] py-1.5 px-2 rounded-lg text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'users'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                : 'opacity-70 hover:opacity-100'
            }`}
            style={{
              color: activeTab === 'users' ? '#021312' : 'var(--app-text-primary)',
            }}
          >
            <Users className="w-3.5 h-3.5" />
            <span>User Plans</span>
          </button>

          <button
            onClick={() => setActiveTab('roi')}
            className={`flex-1 min-w-[85px] py-1.5 px-2 rounded-lg text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'roi'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                : 'opacity-70 hover:opacity-100'
            }`}
            style={{
              color: activeTab === 'roi' ? '#021312' : 'var(--app-text-primary)',
            }}
          >
            <Coins className="w-3.5 h-3.5" />
            <span>Daily ROI</span>
          </button>

          <button
            onClick={() => setActiveTab('deposit_config')}
            className={`flex-1 min-w-[110px] py-1.5 px-2 rounded-lg text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'deposit_config'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                : 'opacity-70 hover:opacity-100'
            }`}
            style={{
              color: activeTab === 'deposit_config' ? '#021312' : 'var(--app-text-primary)',
            }}
          >
            <Building className="w-3.5 h-3.5" />
            <span>Deposit Bank</span>
          </button>

          <button
            onClick={() => setActiveTab('support_config')}
            className={`flex-1 min-w-[110px] py-1.5 px-2 rounded-lg text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'support_config'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                : 'opacity-70 hover:opacity-100'
            }`}
            style={{
              color: activeTab === 'support_config' ? '#021312' : 'var(--app-text-primary)',
            }}
          >
            <Headphones className="w-3.5 h-3.5" />
            <span>24/7 Support</span>
          </button>
        </div>

        {/* ==================================================================== */}
        {/* TAB 1: DEPOSITS VERIFICATION & APPROVAL / REJECTION */}
        {/* ==================================================================== */}
        {activeTab === 'deposits' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-heading font-bold text-xs flex items-center gap-1.5" style={{ color: 'var(--app-text-primary)' }}>
                <ArrowDownToLine className="w-4 h-4 text-cyan-400" />
                <span>Verify Deposit Requests</span>
              </h3>

              {/* Status Filter */}
              <div className="flex items-center gap-1 text-[10px]">
                {(['pending', 'approved', 'rejected', 'all'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setDepositFilter(filter)}
                    className={`px-2 py-0.5 rounded-md capitalize font-semibold transition-all cursor-pointer ${
                      depositFilter === filter
                        ? 'bg-cyan-500 text-slate-950'
                        : 'border opacity-70 hover:opacity-100'
                    }`}
                    style={{
                      borderColor: 'var(--app-border-subtle)',
                      color: depositFilter === filter ? '#021312' : 'var(--app-text-dim)',
                    }}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </div>

            {filteredDeposits.length === 0 ? (
              <div
                className="p-6 rounded-2xl border text-center space-y-2"
                style={{
                  backgroundColor: 'var(--app-surface)',
                  borderColor: 'var(--app-border)',
                }}
              >
                <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-400 opacity-80" />
                <p className="text-xs font-semibold" style={{ color: 'var(--app-text-primary)' }}>
                  No {depositFilter !== 'all' ? depositFilter : ''} deposit requests found
                </p>
                <p className="text-[11px]" style={{ color: 'var(--app-text-dim)' }}>
                  When users submit manual INR/UPI deposits, they will appear here for verification.
                </p>
              </div>
            ) : (
              filteredDeposits.map((dep) => {
                const isPending = dep.status === 'pending';
                const isApproved = dep.status === 'approved';
                const isRejected = dep.status === 'rejected';

                return (
                  <div
                    key={dep.id}
                    className="p-3.5 rounded-2xl border transition-all space-y-2.5"
                    style={{
                      backgroundColor: 'var(--app-surface)',
                      borderColor: isPending ? 'rgba(6, 182, 212, 0.4)' : 'var(--app-border)',
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-xs font-bold" style={{ color: 'var(--app-text-primary)' }}>
                          {dep.userName}
                        </div>
                        <div className="text-[10px] font-mono" style={{ color: 'var(--app-text-dim)' }}>
                          {dep.userEmail}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-sm font-heading font-black text-emerald-400 tabular-nums">
                          +₹{Number(dep.amountInr || 0).toLocaleString('en-IN')}
                        </div>
                        <div className="text-[10px] font-mono text-cyan-400 font-bold">
                          ≈ ${Number(dep.amountUsdt || 0).toFixed(2)} USDT
                        </div>
                      </div>
                    </div>

                    {/* UTR & Method Details */}
                    <div
                      className="p-2 rounded-xl text-[11px] font-mono space-y-1"
                      style={{ backgroundColor: 'var(--app-surface-subtle)' }}
                    >
                      <div className="flex items-center justify-between">
                        <span style={{ color: 'var(--app-text-dim)' }}>UTR Ref:</span>
                        <span className="font-bold text-cyan-300 select-all">{dep.utrNumber}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span style={{ color: 'var(--app-text-dim)' }}>Method:</span>
                        <span style={{ color: 'var(--app-text-primary)' }}>{dep.method}</span>
                      </div>
                      <div className="flex items-center justify-between text-[10px]">
                        <span style={{ color: 'var(--app-text-dim)' }}>Time:</span>
                        <span style={{ color: 'var(--app-text-muted)' }}>
                          {dep.createdAt ? new Date(dep.createdAt).toLocaleString() : 'N/A'}
                        </span>
                      </div>
                    </div>

                    {/* Status & Actions */}
                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                            isApproved
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                              : isRejected
                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                              : 'bg-amber-500/20 text-amber-400 border border-amber-500/40 animate-pulse'
                          }`}
                        >
                          {dep.status}
                        </span>
                      </div>

                      {isPending && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleDepositAction(dep.id, 'reject')}
                            disabled={processingId !== null}
                            className="px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 text-rose-400 text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>Reject</span>
                          </button>

                          <button
                            onClick={() => handleDepositAction(dep.id, 'approve')}
                            disabled={processingId !== null}
                            className="px-3 py-1.5 rounded-xl bg-emerald-500 text-slate-950 hover:bg-emerald-400 text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shadow-sm"
                          >
                            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                            <span>Approve & Credit</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ==================================================================== */}
        {/* TAB 2: WITHDRAWALS VERIFICATION & APPROVAL / REJECTION */}
        {/* ==================================================================== */}
        {activeTab === 'withdrawals' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-heading font-bold text-xs flex items-center gap-1.5" style={{ color: 'var(--app-text-primary)' }}>
                <ArrowUpFromLine className="w-4 h-4 text-amber-400" />
                <span>Verify Payout / Withdrawals</span>
              </h3>

              {/* Status Filter */}
              <div className="flex items-center gap-1 text-[10px]">
                {(['pending', 'completed', 'rejected', 'all'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setWithdrawalFilter(filter)}
                    className={`px-2 py-0.5 rounded-md capitalize font-semibold transition-all cursor-pointer ${
                      withdrawalFilter === filter
                        ? 'bg-cyan-500 text-slate-950'
                        : 'border opacity-70 hover:opacity-100'
                    }`}
                    style={{
                      borderColor: 'var(--app-border-subtle)',
                      color: withdrawalFilter === filter ? '#021312' : 'var(--app-text-dim)',
                    }}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </div>

            {filteredWithdrawals.length === 0 ? (
              <div
                className="p-6 rounded-2xl border text-center space-y-2"
                style={{
                  backgroundColor: 'var(--app-surface)',
                  borderColor: 'var(--app-border)',
                }}
              >
                <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-400 opacity-80" />
                <p className="text-xs font-semibold" style={{ color: 'var(--app-text-primary)' }}>
                  No {withdrawalFilter !== 'all' ? withdrawalFilter : ''} withdrawal requests
                </p>
                <p className="text-[11px]" style={{ color: 'var(--app-text-dim)' }}>
                  Pending withdrawal requests submitted by users will be listed here for approval.
                </p>
              </div>
            ) : (
              filteredWithdrawals.map((wd) => {
                const isPending = wd.status === 'pending';
                const isCompleted = wd.status === 'completed';
                const isRejected = wd.status === 'rejected';

                return (
                  <div
                    key={wd.id}
                    className="p-3.5 rounded-2xl border transition-all space-y-2.5"
                    style={{
                      backgroundColor: 'var(--app-surface)',
                      borderColor: isPending ? 'rgba(251, 191, 36, 0.4)' : 'var(--app-border)',
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-xs font-bold" style={{ color: 'var(--app-text-primary)' }}>
                          {wd.userName}
                        </div>
                        <div className="text-[10px] font-mono" style={{ color: 'var(--app-text-dim)' }}>
                          {wd.userEmail}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-sm font-heading font-black text-amber-400 tabular-nums">
                          ${Number(wd.amount || 0).toFixed(2)} USDT
                        </div>
                        <div className="text-[10px] font-mono text-emerald-400 font-bold">
                          ≈ ₹{(Number(wd.amount || 0) * 100).toLocaleString('en-IN')} INR
                        </div>
                      </div>
                    </div>

                    {/* Destination Address / Payout details */}
                    <div
                      className="p-2 rounded-xl text-[11px] font-mono space-y-1"
                      style={{ backgroundColor: 'var(--app-surface-subtle)' }}
                    >
                      <div className="flex items-center justify-between">
                        <span style={{ color: 'var(--app-text-dim)' }}>Destination:</span>
                        <span className="font-bold text-cyan-300 truncate max-w-[200px] select-all">
                          {wd.toAddress}
                        </span>
                      </div>
                      {wd.txHash && (
                        <div className="flex items-center justify-between text-[10px]">
                          <span style={{ color: 'var(--app-text-dim)' }}>TxHash:</span>
                          <span className="truncate max-w-[200px] text-emerald-400 font-mono select-all">
                            {wd.txHash}
                          </span>
                        </div>
                      )}
                      {wd.errorMessage && (
                        <div className="text-[10px] text-rose-400">
                          Reason: {wd.errorMessage}
                        </div>
                      )}
                      <div className="flex items-center justify-between text-[10px]">
                        <span style={{ color: 'var(--app-text-dim)' }}>Requested:</span>
                        <span style={{ color: 'var(--app-text-muted)' }}>
                          {wd.createdAt ? new Date(wd.createdAt).toLocaleString() : 'N/A'}
                        </span>
                      </div>
                    </div>

                    {/* Status & Actions */}
                    <div className="flex items-center justify-between pt-1">
                      <div>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                            isCompleted
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                              : isRejected
                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                              : 'bg-amber-500/20 text-amber-400 border border-amber-500/40 animate-pulse'
                          }`}
                        >
                          {wd.status}
                        </span>
                      </div>

                      {isPending && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleWithdrawalAction(wd.id, 'reject')}
                            disabled={processingId !== null}
                            className="px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 text-rose-400 text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                            title="Rejects and automatically refunds balance back to user"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>Reject & Refund</span>
                          </button>

                          <button
                            onClick={() => handleWithdrawalAction(wd.id, 'approve')}
                            disabled={processingId !== null}
                            className="px-3 py-1.5 rounded-xl bg-emerald-500 text-slate-950 hover:bg-emerald-400 text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shadow-sm"
                          >
                            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                            <span>Approve Payout</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ==================================================================== */}
        {/* TAB 3: USER MANAGEMENT & PLAN UPGRADE / DEACTIVATE */}
        {/* ==================================================================== */}
        {activeTab === 'users' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-heading font-bold text-xs flex items-center gap-1.5" style={{ color: 'var(--app-text-primary)' }}>
                <Users className="w-4 h-4 text-cyan-400" />
                <span>Registered Users & VIP Plans</span>
              </h3>
              <span className="text-[10px] font-bold" style={{ color: 'var(--app-text-dim)' }}>
                {filteredUsers.length} Users
              </span>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Search user by name, email, or AlienPay UID..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border focus:outline-none transition-colors"
                style={{
                  backgroundColor: 'var(--app-input-bg)',
                  borderColor: 'var(--app-input-border)',
                  color: 'var(--app-input-text)',
                }}
              />
            </div>

            {/* Users List */}
            <div className="space-y-2.5">
              {filteredUsers.map((u) => {
                const isActivePlan = u.planStatus === 'active';

                return (
                  <div
                    key={u.id}
                    className="p-3.5 rounded-2xl border transition-all space-y-2"
                    style={{
                      backgroundColor: 'var(--app-surface)',
                      borderColor: 'var(--app-border)',
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-9 h-9 rounded-full border flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden"
                          style={{
                            backgroundColor: 'var(--app-surface-subtle)',
                            borderColor: 'var(--app-border)',
                            color: 'var(--app-text-primary)',
                          }}
                        >
                          {u.profilePhoto ? (
                            <img src={u.profilePhoto} alt={u.name} className="w-full h-full object-cover" />
                          ) : (
                            u.name?.slice(0, 2).toUpperCase() || 'AP'
                          )}
                        </div>

                        <div>
                          <div className="text-xs font-bold flex items-center gap-1" style={{ color: 'var(--app-text-primary)' }}>
                            <span>{u.name}</span>
                            {u.isVerified && <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                          </div>
                          <div className="text-[10px] font-mono" style={{ color: 'var(--app-text-dim)' }}>
                            {u.email}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-xs font-heading font-black tabular-nums text-cyan-400">
                          ${Number(u.walletBalance || 0).toFixed(2)} USDT
                        </div>
                        <div className="text-[10px] font-mono" style={{ color: 'var(--app-text-dim)' }}>
                          UID: {u.alienPayId || u.id.slice(0, 8)}
                        </div>
                      </div>
                    </div>

                    {/* Plan Info & Payout accounts */}
                    <div
                      className="p-2 rounded-xl text-[11px] flex items-center justify-between"
                      style={{ backgroundColor: 'var(--app-surface-subtle)' }}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px]" style={{ color: 'var(--app-text-dim)' }}>Plan:</span>
                        {isActivePlan ? (
                          <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Crown className="w-3 h-3 text-amber-400 fill-amber-400" />
                            <span>{u.planName || 'Active VIP'}</span>
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-500/20 text-slate-400 border border-slate-500/30 px-2 py-0.5 rounded-full">
                            Inactive
                          </span>
                        )}
                      </div>

                      <button
                        onClick={() => {
                          setSelectedUserForPlan(u);
                          setTargetPlanId(u.activePlanId || 'silver');
                          setTargetPlanStatus(u.planStatus === 'active' ? 'active' : 'active');
                        }}
                        className="px-2.5 py-1 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-[11px] transition-all cursor-pointer flex items-center gap-1"
                      >
                        <Crown className="w-3 h-3" />
                        <span>{isActivePlan ? 'Change Plan' : 'Upgrade Plan'}</span>
                      </button>
                    </div>

                    {/* Bound Accounts Quick Info */}
                    {(u.upiId || u.usdtAddress) && (
                      <div className="text-[10px] font-mono text-slate-400 flex flex-wrap gap-2 pt-0.5">
                        {u.upiId && <span>UPI: <span className="text-emerald-400">{u.upiId}</span></span>}
                        {u.usdtAddress && <span>BEP20: <span className="text-cyan-400">{u.usdtAddress.slice(0, 8)}...</span></span>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* TAB 4: DAILY ROI DISTRIBUTION ACTION PANEL */}
        {/* ==================================================================== */}
        {activeTab === 'roi' && (
          <div className="space-y-4">
            <div
              className="p-4 rounded-2xl border shadow-xl relative overflow-hidden space-y-3"
              style={{
                background: 'linear-gradient(to bottom, var(--app-card-gradient-from), var(--app-card-gradient-to))',
                borderColor: 'var(--app-border)',
              }}
            >
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/40">
                  <Coins className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-heading font-black text-sm" style={{ color: 'var(--app-text-primary)' }}>
                    Daily ROI Dividend Distribution
                  </h3>
                  <p className="text-[11px]" style={{ color: 'var(--app-text-dim)' }}>
                    Run daily dividend payout to all users with active plans
                  </p>
                </div>
              </div>

              {/* Plans Rates Breakdown */}
              <div
                className="p-3 rounded-xl border text-xs space-y-1.5 font-mono"
                style={{
                  backgroundColor: 'var(--app-surface-subtle)',
                  borderColor: 'var(--app-border-subtle)',
                }}
              >
                <div className="text-[11px] font-bold font-sans" style={{ color: 'var(--app-text-primary)' }}>
                  Active Plan Daily Dividend Rules:
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-teal-400 font-semibold">• Silver VIP (400 USDT):</span>
                  <span className="text-emerald-400 font-bold">+4.00 USDT / day (₹400)</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-amber-400 font-semibold">• Gold Pro VIP (800 USDT):</span>
                  <span className="text-emerald-400 font-bold">+8.00 USDT / day (₹800)</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-cyan-400 font-semibold">• Diamond Elite VIP (1800 USDT):</span>
                  <span className="text-emerald-400 font-bold">+18.00 USDT / day (₹1,800)</span>
                </div>
              </div>

              {/* Status counter */}
              <div className="flex items-center justify-between text-xs" style={{ color: 'var(--app-text-muted)' }}>
                <span>Subscribers eligible today:</span>
                <span className="font-heading font-black text-emerald-400 text-sm">
                  {stats.activePlanCount} Users
                </span>
              </div>

              {/* Run Daily ROI Button */}
              <button
                type="button"
                onClick={handleDistributeDailyRoi}
                disabled={isDistributingRoi || stats.activePlanCount === 0}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-teal-400 to-cyan-400 hover:from-teal-300 hover:to-cyan-300 text-slate-950 font-heading font-bold text-xs tracking-wide shadow-lg shadow-teal-500/20 transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4 text-slate-950" />
                <span>
                  {isDistributingRoi
                    ? 'Processing Daily Dividends...'
                    : `Distribute Daily ROI to ${stats.activePlanCount} Users`}
                </span>
              </button>
            </div>

            {/* Recent ROI Distribution Results */}
            {roiResult && (
              <div
                className="p-3.5 rounded-2xl border space-y-2 animate-in fade-in"
                style={{
                  backgroundColor: 'var(--app-surface)',
                  borderColor: 'var(--app-border)',
                }}
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Distribution Completed Successfully</span>
                  </h4>
                  <span className="text-xs font-heading font-black text-emerald-400">
                    +${roiResult.totalDistributedUsdt.toFixed(2)} USDT
                  </span>
                </div>

                <div className="text-[11px]" style={{ color: 'var(--app-text-dim)' }}>
                  Successfully credited {roiResult.usersCredited} user accounts:
                </div>

                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {roiResult.details.map((d, i) => (
                    <div
                      key={i}
                      className="p-2 rounded-lg text-[11px] font-mono flex items-center justify-between"
                      style={{ backgroundColor: 'var(--app-surface-subtle)' }}
                    >
                      <div>
                        <span className="font-bold text-slate-200">{d.userName}</span>{' '}
                        <span className="text-slate-400">({d.planName})</span>
                      </div>
                      <span className="font-bold text-emerald-400">
                        +${d.roiAmount.toFixed(2)} USDT
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ==================================================================== */}
        {/* TAB 5: INR DEPOSIT BANK & UPI DETAILS CONFIGURATION */}
        {/* ==================================================================== */}
        {activeTab === 'deposit_config' && (
          <div className="space-y-4">
            <div
              className="p-4 rounded-2xl border shadow-xl space-y-4"
              style={{
                backgroundColor: 'var(--app-surface)',
                borderColor: 'var(--app-border)',
              }}
            >
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/40">
                  <Building className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-heading font-black text-sm" style={{ color: 'var(--app-text-primary)' }}>
                    Official INR Deposit Configuration
                  </h3>
                  <p className="text-[11px]" style={{ color: 'var(--app-text-dim)' }}>
                    Admin control for receiving user INR deposits (UPI & Bank details)
                  </p>
                </div>
              </div>

              <div
                className="p-3 rounded-xl border text-xs"
                style={{
                  backgroundColor: 'var(--app-surface-subtle)',
                  borderColor: 'var(--app-border-subtle)',
                  color: 'var(--app-text-muted)',
                }}
              >
                Configure the destination UPI ID, bank account details, and upload your official QR code image via Cloudinary. Any updates here update immediately in the user app.
              </div>

              {/* Cloudinary Official QR Code Upload Card */}
              <div
                className="p-3.5 rounded-xl border space-y-3"
                style={{
                  backgroundColor: 'var(--app-surface-subtle)',
                  borderColor: 'var(--app-border-subtle)',
                }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <label className="font-bold text-xs flex items-center gap-1.5" style={{ color: 'var(--app-text-primary)' }}>
                      <QrCode className="w-4 h-4 text-cyan-400" />
                      <span>Official UPI / Bank QR Code Image</span>
                    </label>
                    <span className="text-[10px]" style={{ color: 'var(--app-text-dim)' }}>
                      Upload your official PhonePe / GPay / Paytm QR code for instant user scanning
                    </span>
                  </div>
                  <span className="text-[9.5px] font-bold text-cyan-400 bg-cyan-500/15 border border-cyan-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Sparkles className="w-2.5 h-2.5" /> Cloudinary CDN
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3.5 pt-1">
                  {inrConfig.qrCodeUrl ? (
                    <div className="relative shrink-0">
                      <div className="w-28 h-28 bg-white rounded-2xl p-1.5 shadow-md border border-cyan-500/40 flex items-center justify-center">
                        <img
                          src={inrConfig.qrCodeUrl}
                          alt="Official Deposit QR Code"
                          className="w-24 h-24 object-contain rounded-xl"
                        />
                      </div>
                      <span className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 rounded-full bg-emerald-500 text-slate-950 font-bold text-[9px] shadow-sm">
                        Live
                      </span>
                    </div>
                  ) : (
                    <div className="w-28 h-28 rounded-2xl border-2 border-dashed border-cyan-500/40 bg-cyan-500/5 flex flex-col items-center justify-center text-center p-2 shrink-0">
                      <QrCode className="w-9 h-9 text-cyan-400/60 mb-1" />
                      <span className="text-[10px] font-semibold text-cyan-400">No QR Code</span>
                      <span className="text-[8.5px]" style={{ color: 'var(--app-text-dim)' }}>Click Upload below</span>
                    </div>
                  )}

                  <div className="flex-1 space-y-2 w-full">
                    <input
                      type="file"
                      ref={qrFileInputRef}
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleQrFileSelected}
                      className="hidden"
                    />

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => qrFileInputRef.current?.click()}
                        disabled={isUploadingQr}
                        className="px-3.5 py-2 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all shadow-sm active:scale-95"
                      >
                        {isUploadingQr ? (
                          <>
                            <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
                            <span>Uploading to Cloudinary...</span>
                          </>
                        ) : (
                          <>
                            <Upload className="w-3.5 h-3.5" />
                            <span>{inrConfig.qrCodeUrl ? 'Replace QR Code Image' : 'Upload QR Code Image'}</span>
                          </>
                        )}
                      </button>

                      {inrConfig.qrCodeUrl && (
                        <button
                          type="button"
                          onClick={handleRemoveQrCode}
                          disabled={isSavingConfig || isUploadingQr}
                          className="px-3 py-2 rounded-xl border border-rose-500/40 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Remove</span>
                        </button>
                      )}
                    </div>

                    <p className="text-[10.5px] leading-relaxed" style={{ color: 'var(--app-text-dim)' }}>
                      Supports PNG, JPG, or WebP up to 5MB. Directly uploaded to Cloudinary and displayed to users on the Deposit screen.
                    </p>

                    {qrUploadSuccess && (
                      <div className="text-[11px] text-emerald-400 font-medium flex items-center gap-1.5 animate-in fade-in">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        <span>{qrUploadSuccess}</span>
                      </div>
                    )}

                    {qrUploadError && (
                      <div className="text-[11px] text-rose-400 font-medium flex items-center gap-1.5 animate-in fade-in">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{qrUploadError}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <form onSubmit={handleSaveInrConfig} className="space-y-3.5 text-xs">
                {/* UPI ID */}
                <div>
                  <label className="block font-semibold mb-1" style={{ color: 'var(--app-text-muted)' }}>
                    Official UPI ID (VPA) <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={inrConfig.upiId}
                    onChange={(e) => setInrConfig({ ...inrConfig, upiId: e.target.value })}
                    placeholder="e.g. alienpay.business@icici"
                    className="w-full rounded-xl px-3 py-2 font-mono text-xs focus:outline-none transition-colors border"
                    style={{
                      backgroundColor: 'var(--app-input-bg)',
                      borderColor: 'var(--app-input-border)',
                      color: 'var(--app-input-text)',
                    }}
                  />
                  <span className="text-[10px] mt-0.5 block" style={{ color: 'var(--app-text-dim)' }}>
                    Used by users for instant UPI apps (GPay, PhonePe, Paytm, etc.)
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Account Name */}
                  <div>
                    <label className="block font-semibold mb-1" style={{ color: 'var(--app-text-muted)' }}>
                      Beneficiary Account Name <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={inrConfig.accountHolder}
                      onChange={(e) => setInrConfig({ ...inrConfig, accountHolder: e.target.value })}
                      placeholder="e.g. AlienPay Corporate Ltd"
                      className="w-full rounded-xl px-3 py-2 text-xs focus:outline-none transition-colors border"
                      style={{
                        backgroundColor: 'var(--app-input-bg)',
                        borderColor: 'var(--app-input-border)',
                        color: 'var(--app-input-text)',
                      }}
                    />
                  </div>

                  {/* Account Number */}
                  <div>
                    <label className="block font-semibold mb-1" style={{ color: 'var(--app-text-muted)' }}>
                      Bank Account Number <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={inrConfig.accountNumber}
                      onChange={(e) => setInrConfig({ ...inrConfig, accountNumber: e.target.value })}
                      placeholder="e.g. 50200084920192"
                      className="w-full rounded-xl px-3 py-2 font-mono text-xs focus:outline-none transition-colors border"
                      style={{
                        backgroundColor: 'var(--app-input-bg)',
                        borderColor: 'var(--app-input-border)',
                        color: 'var(--app-input-text)',
                      }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* IFSC Code */}
                  <div>
                    <label className="block font-semibold mb-1" style={{ color: 'var(--app-text-muted)' }}>
                      Bank IFSC Code <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={inrConfig.ifscCode}
                      onChange={(e) => setInrConfig({ ...inrConfig, ifscCode: e.target.value.toUpperCase() })}
                      placeholder="e.g. ICIC0000104"
                      className="w-full rounded-xl px-3 py-2 font-mono text-xs focus:outline-none transition-colors border uppercase"
                      style={{
                        backgroundColor: 'var(--app-input-bg)',
                        borderColor: 'var(--app-input-border)',
                        color: 'var(--app-input-text)',
                      }}
                    />
                  </div>

                  {/* Bank Name */}
                  <div>
                    <label className="block font-semibold mb-1" style={{ color: 'var(--app-text-muted)' }}>
                      Bank Name <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={inrConfig.bankName}
                      onChange={(e) => setInrConfig({ ...inrConfig, bankName: e.target.value })}
                      placeholder="e.g. ICICI Bank Ltd"
                      className="w-full rounded-xl px-3 py-2 text-xs focus:outline-none transition-colors border"
                      style={{
                        backgroundColor: 'var(--app-input-bg)',
                        borderColor: 'var(--app-input-border)',
                        color: 'var(--app-input-text)',
                      }}
                    />
                  </div>
                </div>

                {/* Branch */}
                <div>
                  <label className="block font-semibold mb-1" style={{ color: 'var(--app-text-muted)' }}>
                    Bank Branch (Optional)
                  </label>
                  <input
                    type="text"
                    value={inrConfig.branch || ''}
                    onChange={(e) => setInrConfig({ ...inrConfig, branch: e.target.value })}
                    placeholder="e.g. Bandra Kurla Complex, Mumbai"
                    className="w-full rounded-xl px-3 py-2 text-xs focus:outline-none transition-colors border"
                    style={{
                      backgroundColor: 'var(--app-input-bg)',
                      borderColor: 'var(--app-input-border)',
                      color: 'var(--app-input-text)',
                    }}
                  />
                </div>

                {/* Submit Button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSavingConfig}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 text-slate-950 font-heading font-black text-xs tracking-wide shadow-lg shadow-cyan-500/20 transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <Save className="w-4 h-4 text-slate-950" />
                    <span>{isSavingConfig ? 'Saving Deposit Details...' : 'Save & Update Deposit Details'}</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Live User Preview Card */}
            <div
              className="p-4 rounded-2xl border space-y-2.5"
              style={{
                backgroundColor: 'var(--app-surface)',
                borderColor: 'var(--app-border)',
              }}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold flex items-center gap-1.5" style={{ color: 'var(--app-text-primary)' }}>
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Live User Deposit Screen Preview</span>
                </span>
                <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-500/15 px-2 py-0.5 rounded-full">
                  Real-time Preview
                </span>
              </div>

              {/* User Box Simulation */}
              <div
                className="p-3.5 rounded-xl border space-y-2.5"
                style={{
                  backgroundColor: 'var(--app-surface-subtle)',
                  borderColor: 'var(--app-border-subtle)',
                }}
              >
                {/* QR Code preview */}
                {inrConfig.qrCodeUrl ? (
                  <div className="w-28 h-28 mx-auto bg-white p-1 rounded-xl shadow border border-cyan-500/30 flex items-center justify-center my-1">
                    <img
                      src={inrConfig.qrCodeUrl}
                      alt="User View QR Code"
                      className="w-24 h-24 object-contain rounded-lg"
                    />
                  </div>
                ) : (
                  <div className="w-20 h-20 mx-auto bg-white p-2 rounded-xl shadow-md flex items-center justify-center my-1">
                    <QrCode className="w-16 h-16 text-slate-950" />
                  </div>
                )}

                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold" style={{ color: 'var(--app-text-primary)' }}>Official UPI ID</span>
                  <span className="text-[11px] text-emerald-400 font-semibold">Copy UPI ID</span>
                </div>
                <div className="font-mono text-xs font-bold p-2.5 rounded-lg border bg-emerald-500/10 text-emerald-400 border-emerald-500">
                  {inrConfig.upiId || 'alienpay.business@icici'}
                </div>

                <div className="text-[11px] space-y-1.5 pt-2 border-t" style={{ borderColor: 'var(--app-border-subtle)', color: 'var(--app-text-dim)' }}>
                  <div className="flex justify-between">
                    <span>Account Name:</span>
                    <span className="font-semibold text-slate-200">{inrConfig.accountHolder || 'AlienPay Corporate Ltd'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>A/C No:</span>
                    <span className="font-mono font-bold text-slate-200">{inrConfig.accountNumber || '50200084920192'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>IFSC Code:</span>
                    <span className="font-mono font-bold text-teal-400">{inrConfig.ifscCode || 'ICIC0000104'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Bank:</span>
                    <span className="text-slate-200">{inrConfig.bankName || 'ICICI Bank Ltd'}</span>
                  </div>
                  {inrConfig.branch && (
                    <div className="flex justify-between">
                      <span>Branch:</span>
                      <span className="text-slate-300">{inrConfig.branch}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* TAB 6: 24/7 SUPPORT & TELEGRAM CHANNELS CONFIGURATION */}
        {/* ==================================================================== */}
        {activeTab === 'support_config' && (
          <div className="space-y-4">
            {/* Header info */}
            <div
              className="p-4 rounded-2xl border shadow-xl space-y-4"
              style={{
                backgroundColor: 'var(--app-surface)',
                borderColor: 'var(--app-border)',
              }}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3" style={{ borderColor: 'var(--app-border-subtle)' }}>
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#0088cc] to-[#38bdf8] flex items-center justify-center text-white shadow-md shadow-[#0088cc]/30 shrink-0">
                    <TelegramIcon className="w-5 h-5 fill-white" />
                  </div>
                  <div>
                    <h3 className="font-heading font-black text-sm tracking-tight flex items-center gap-2" style={{ color: 'var(--app-text-primary)' }}>
                      <span>24/7 Telegram Support & Helpdesk Control</span>
                      <span className="text-[10px] text-emerald-400 font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30">
                        Live Sync
                      </span>
                    </h3>
                    <p className="text-xs" style={{ color: 'var(--app-text-dim)' }}>
                      Manage the Official Telegram Channel link and 3–4 customer support agent handles. WhatsApp VIP Desk has been decommissioned.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleResetSupportToDefaults}
                    className="px-3 py-1.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-xs text-slate-300 font-semibold cursor-pointer transition-colors"
                  >
                    Reset Defaults
                  </button>
                  <button
                    type="button"
                    onClick={handleAddAgent}
                    className="px-3 py-1.5 rounded-xl bg-cyan-500/15 border border-cyan-500/40 hover:bg-cyan-500/25 text-cyan-300 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Desk</span>
                  </button>
                </div>
              </div>

              <form onSubmit={handleSaveSupportConfig} className="space-y-5">
                {/* 1. Official Telegram Channel Section */}
                <div 
                  className="p-3.5 rounded-2xl border space-y-3"
                  style={{
                    backgroundColor: 'var(--app-surface-subtle)',
                    borderColor: 'var(--app-border-subtle)',
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold flex items-center gap-1.5 text-cyan-300">
                      <TelegramIcon className="w-4 h-4 fill-[#0088cc]" />
                      <span>Official Telegram Announcement Channel</span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Shown prominently at top of 24/7 Support
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block font-semibold mb-1" style={{ color: 'var(--app-text-muted)' }}>
                        Channel Display Name <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={supportConfig.telegramChannelName}
                        onChange={(e) => setSupportConfig({ ...supportConfig, telegramChannelName: e.target.value })}
                        placeholder="e.g. AlienPay Official Community & Updates"
                        className="w-full rounded-xl px-3 py-2 text-xs focus:outline-none transition-colors border"
                        style={{
                          backgroundColor: 'var(--app-input-bg)',
                          borderColor: 'var(--app-input-border)',
                          color: 'var(--app-input-text)',
                        }}
                      />
                    </div>

                    <div>
                      <label className="block font-semibold mb-1" style={{ color: 'var(--app-text-muted)' }}>
                        Channel Username / Handle <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={supportConfig.telegramChannelUsername}
                        onChange={(e) => {
                          const val = e.target.value.trim();
                          const clean = val.replace(/^@/, '');
                          setSupportConfig({ 
                            ...supportConfig, 
                            telegramChannelUsername: clean,
                            telegramChannelUrl: `https://t.me/${clean}`
                          });
                        }}
                        placeholder="e.g. AlienPayOfficial"
                        className="w-full rounded-xl px-3 py-2 font-mono text-xs focus:outline-none transition-colors border"
                        style={{
                          backgroundColor: 'var(--app-input-bg)',
                          borderColor: 'var(--app-input-border)',
                          color: 'var(--app-input-text)',
                        }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block font-semibold mb-1" style={{ color: 'var(--app-text-muted)' }}>
                        Direct Telegram Channel URL <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="url"
                        required
                        value={supportConfig.telegramChannelUrl}
                        onChange={(e) => setSupportConfig({ ...supportConfig, telegramChannelUrl: e.target.value })}
                        placeholder="e.g. https://t.me/AlienPayOfficial"
                        className="w-full rounded-xl px-3 py-2 font-mono text-xs focus:outline-none transition-colors border"
                        style={{
                          backgroundColor: 'var(--app-input-bg)',
                          borderColor: 'var(--app-input-border)',
                          color: 'var(--app-input-text)',
                        }}
                      />
                    </div>

                    <div>
                      <label className="block font-semibold mb-1" style={{ color: 'var(--app-text-muted)' }}>
                        Subscribers Badge / Stats (Optional)
                      </label>
                      <input
                        type="text"
                        value={supportConfig.channelSubscribersCount || ''}
                        onChange={(e) => setSupportConfig({ ...supportConfig, channelSubscribersCount: e.target.value })}
                        placeholder="e.g. 24.8K+ Members"
                        className="w-full rounded-xl px-3 py-2 text-xs focus:outline-none transition-colors border"
                        style={{
                          backgroundColor: 'var(--app-input-bg)',
                          borderColor: 'var(--app-input-border)',
                          color: 'var(--app-input-text)',
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Customer Support Telegram Desks (3-4 IDs) */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-heading font-bold text-xs flex items-center gap-1.5" style={{ color: 'var(--app-text-primary)' }}>
                        <Headphones className="w-4 h-4 text-emerald-400" />
                        <span>Dedicated Customer Support Agents (3–4 Telegram Desks)</span>
                      </h4>
                      <p className="text-[11px]" style={{ color: 'var(--app-text-dim)' }}>
                        Configure the exact Telegram IDs users will chat with for instant 1-on-1 account and deposit resolution.
                      </p>
                    </div>
                    <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/20">
                      {supportConfig.agents.length} Desks Active
                    </span>
                  </div>

                  <div className="space-y-3">
                    {supportConfig.agents.map((agent, index) => (
                      <div
                        key={agent.id || index}
                        className="p-3.5 rounded-2xl border space-y-3 relative group"
                        style={{
                          backgroundColor: 'var(--app-surface-subtle)',
                          borderColor: 'var(--app-border-subtle)',
                        }}
                      >
                        <div className="flex items-center justify-between border-b pb-2" style={{ borderColor: 'var(--app-border-subtle)' }}>
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-lg bg-cyan-400 text-slate-950 font-black text-xs flex items-center justify-center font-mono">
                              #{index + 1}
                            </span>
                            <span className="font-heading font-bold text-xs" style={{ color: 'var(--app-text-primary)' }}>
                              Support Desk #{index + 1}
                            </span>
                            <span className={`text-[10px] font-semibold px-2 py-0.2 rounded-full border ${
                              agent.isOnline !== false
                                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                                : 'bg-slate-700 text-slate-400 border-slate-600'
                            }`}>
                              {agent.isOnline !== false ? '● Online 24/7' : '○ Offline'}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <label className="text-[11px] flex items-center gap-1 cursor-pointer select-none text-slate-300">
                              <input
                                type="checkbox"
                                checked={agent.isOnline !== false}
                                onChange={(e) => handleUpdateAgentField(index, 'isOnline', e.target.checked)}
                                className="rounded text-cyan-400 focus:ring-0 cursor-pointer"
                              />
                              <span>Online</span>
                            </label>

                            {supportConfig.agents.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveAgent(index)}
                                className="p-1 rounded-lg text-rose-400 hover:bg-rose-500/15 cursor-pointer transition-colors"
                                title="Remove Desk"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                          <div>
                            <label className="block font-semibold mb-1" style={{ color: 'var(--app-text-muted)' }}>
                              Agent / Desk Name <span className="text-red-400">*</span>
                            </label>
                            <input
                              type="text"
                              required
                              value={agent.name}
                              onChange={(e) => handleUpdateAgentField(index, 'name', e.target.value)}
                              placeholder="e.g. Agent Rohit · INR & UPI Desk"
                              className="w-full rounded-xl px-3 py-1.5 text-xs focus:outline-none transition-colors border"
                              style={{
                                backgroundColor: 'var(--app-input-bg)',
                                borderColor: 'var(--app-input-border)',
                                color: 'var(--app-input-text)',
                              }}
                            />
                          </div>

                          <div>
                            <label className="block font-semibold mb-1" style={{ color: 'var(--app-text-muted)' }}>
                              Role / Specialization <span className="text-red-400">*</span>
                            </label>
                            <input
                              type="text"
                              required
                              value={agent.role}
                              onChange={(e) => handleUpdateAgentField(index, 'role', e.target.value)}
                              placeholder="e.g. Deposit Approvals & UTR Verification"
                              className="w-full rounded-xl px-3 py-1.5 text-xs focus:outline-none transition-colors border"
                              style={{
                                backgroundColor: 'var(--app-input-bg)',
                                borderColor: 'var(--app-input-border)',
                                color: 'var(--app-input-text)',
                              }}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                          <div>
                            <label className="block font-semibold mb-1" style={{ color: 'var(--app-text-muted)' }}>
                              Telegram Username / ID <span className="text-red-400">*</span>
                            </label>
                            <div className="relative">
                              <input
                                type="text"
                                required
                                value={agent.username}
                                onChange={(e) => handleUpdateAgentField(index, 'username', e.target.value)}
                                placeholder="e.g. @AlienPay_Support1"
                                className="w-full rounded-xl px-3 py-1.5 font-mono text-xs focus:outline-none transition-colors border pl-8"
                                style={{
                                  backgroundColor: 'var(--app-input-bg)',
                                  borderColor: 'var(--app-input-border)',
                                  color: 'var(--app-input-text)',
                                }}
                              />
                              <div className="absolute left-2.5 top-2 pointer-events-none text-[#0088cc]">
                                <TelegramIcon className="w-3.5 h-3.5" />
                              </div>
                            </div>
                            <span className="text-[10px] mt-0.5 block" style={{ color: 'var(--app-text-dim)' }}>
                              Auto-generates direct link: https://t.me/{agent.username.replace(/^@/, '')}
                            </span>
                          </div>

                          <div>
                            <label className="block font-semibold mb-1" style={{ color: 'var(--app-text-muted)' }}>
                              Direct Telegram Link URL <span className="text-red-400">*</span>
                            </label>
                            <input
                              type="url"
                              required
                              value={agent.link}
                              onChange={(e) => handleUpdateAgentField(index, 'link', e.target.value)}
                              placeholder="e.g. https://t.me/AlienPay_Support1"
                              className="w-full rounded-xl px-3 py-1.5 font-mono text-xs focus:outline-none transition-colors border"
                              style={{
                                backgroundColor: 'var(--app-input-bg)',
                                borderColor: 'var(--app-input-border)',
                                color: 'var(--app-input-text)',
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Save Button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSavingSupportConfig}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-[#0088cc] via-[#0ea5e9] to-cyan-400 hover:from-[#0099e6] hover:to-cyan-300 text-slate-950 font-heading font-black text-xs tracking-wide shadow-lg shadow-[#0088cc]/20 transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <Save className="w-4 h-4 text-slate-950" />
                    <span>{isSavingSupportConfig ? 'Saving Telegram Helpdesk Settings...' : 'Save & Update 24/7 Telegram Helpdesk'}</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Live User Screen Simulation Preview */}
            <div
              className="p-4 rounded-2xl border space-y-3"
              style={{
                backgroundColor: 'var(--app-surface)',
                borderColor: 'var(--app-border)',
              }}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold flex items-center gap-1.5" style={{ color: 'var(--app-text-primary)' }}>
                  <ShieldCheck className="w-4 h-4 text-cyan-400" />
                  <span>Live User 24/7 Helpdesk Preview</span>
                </span>
                <span className="text-[10px] text-cyan-400 font-semibold bg-cyan-500/15 px-2 py-0.5 rounded-full">
                  Real-time Preview
                </span>
              </div>

              {/* Channel Preview Banner */}
              <div className="p-3.5 rounded-2xl border bg-gradient-to-br from-sky-50 via-cyan-50/70 to-white dark:from-[#0088cc]/25 dark:to-slate-950 border-sky-300 dark:border-[#0088cc]/40 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-[#0088cc] text-white flex items-center justify-center">
                      <TelegramIcon className="w-4 h-4 fill-white" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-950 dark:text-white flex items-center gap-1">
                        <span>{supportConfig.telegramChannelName}</span>
                        <ShieldCheck className="w-3 h-3 text-[#0088cc] dark:text-cyan-400" />
                      </div>
                      <div className="text-[10px] text-sky-700 dark:text-cyan-300 font-mono font-bold">
                        @{supportConfig.telegramChannelUsername.replace(/^@/, '')} · <span className="text-emerald-700 dark:text-emerald-400">{supportConfig.channelSubscribersCount}</span>
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] px-2.5 py-1 rounded-lg bg-[#0088cc] text-white font-bold">
                    Join Channel
                  </span>
                </div>
              </div>

              {/* Desks Grid Simulation */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {supportConfig.agents.map((agent, i) => (
                  <div
                    key={agent.id || i}
                    className="p-2.5 rounded-xl border space-y-1.5"
                    style={{
                      backgroundColor: 'var(--app-surface-subtle)',
                      borderColor: 'var(--app-border-subtle)',
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-bold flex items-center gap-1.5" style={{ color: 'var(--app-text-primary)' }}>
                        <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                        <span className="truncate max-w-[140px]">{agent.name}</span>
                      </div>
                      <span className="text-[9px] font-mono text-cyan-400">Desk #{i + 1}</span>
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">{agent.role}</div>
                    <div className="flex items-center justify-between pt-1 border-t border-slate-800 text-[10px]">
                      <span className="text-cyan-400 font-mono font-bold">{agent.username}</span>
                      <span className="text-[#0088cc] font-bold flex items-center gap-0.5">
                        <TelegramIcon className="w-3 h-3" /> Chat
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ==================================================================== */}
      {/* MODAL: ADMIN UPGRADE / CHANGE USER PLAN */}
      {/* ==================================================================== */}
      {selectedUserForPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div
            className="w-full max-w-sm rounded-2xl border p-4 space-y-3.5 shadow-2xl"
            style={{
              backgroundColor: 'var(--app-surface)',
              borderColor: 'var(--app-border)',
              color: 'var(--app-text-primary)',
            }}
          >
            <div className="flex items-center justify-between border-b pb-2.5" style={{ borderColor: 'var(--app-border-subtle)' }}>
              <div className="flex items-center gap-1.5">
                <Crown className="w-4 h-4 text-amber-400" />
                <h3 className="font-heading font-bold text-sm">
                  Upgrade / Update User Plan
                </h3>
              </div>
              <button
                onClick={() => setSelectedUserForPlan(null)}
                className="p-1 rounded-lg opacity-60 hover:opacity-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div
              className="p-2.5 rounded-xl text-xs space-y-1"
              style={{ backgroundColor: 'var(--app-surface-subtle)' }}
            >
              <div className="font-bold" style={{ color: 'var(--app-text-primary)' }}>
                {selectedUserForPlan.name}
              </div>
              <div className="font-mono text-[10px]" style={{ color: 'var(--app-text-dim)' }}>
                {selectedUserForPlan.email}
              </div>
              <div className="text-[10px]" style={{ color: 'var(--app-text-muted)' }}>
                Current: <span className="font-bold text-cyan-400">{selectedUserForPlan.planName || 'Inactive'}</span> ({selectedUserForPlan.planStatus || 'inactive'})
              </div>
            </div>

            {/* Select Status */}
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--app-text-dim)' }}>
                Plan Status
              </label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setTargetPlanStatus('active')}
                  className={`py-2 px-3 rounded-xl font-bold border transition-all cursor-pointer ${
                    targetPlanStatus === 'active'
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50 shadow-sm'
                      : 'opacity-60 hover:opacity-100'
                  }`}
                  style={{
                    backgroundColor: targetPlanStatus === 'active' ? undefined : 'var(--app-surface-subtle)',
                    borderColor: targetPlanStatus === 'active' ? undefined : 'var(--app-border-subtle)',
                  }}
                >
                  Active Plan
                </button>
                <button
                  type="button"
                  onClick={() => setTargetPlanStatus('inactive')}
                  className={`py-2 px-3 rounded-xl font-bold border transition-all cursor-pointer ${
                    targetPlanStatus === 'inactive'
                      ? 'bg-rose-500/20 text-rose-400 border-rose-500/50 shadow-sm'
                      : 'opacity-60 hover:opacity-100'
                  }`}
                  style={{
                    backgroundColor: targetPlanStatus === 'inactive' ? undefined : 'var(--app-surface-subtle)',
                    borderColor: targetPlanStatus === 'inactive' ? undefined : 'var(--app-border-subtle)',
                  }}
                >
                  Inactive (Deactivate)
                </button>
              </div>
            </div>

            {/* Select Plan Tier (if active) */}
            {targetPlanStatus === 'active' && (
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--app-text-dim)' }}>
                  Select VIP Plan
                </label>
                <div className="space-y-1.5 text-xs">
                  {DEPOSIT_PLANS.map((plan) => {
                    const isSelected = targetPlanId.toLowerCase() === plan.id.toLowerCase();

                    return (
                      <div
                        key={plan.id}
                        onClick={() => setTargetPlanId(plan.id)}
                        className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                          isSelected
                            ? 'border-cyan-400 bg-cyan-500/10 shadow-sm ring-1 ring-cyan-400'
                            : 'hover:opacity-100 opacity-80'
                        }`}
                        style={{
                          backgroundColor: isSelected ? undefined : 'var(--app-surface-subtle)',
                          borderColor: isSelected ? undefined : 'var(--app-border-subtle)',
                        }}
                      >
                        <div>
                          <div className="font-bold flex items-center gap-1.5" style={{ color: 'var(--app-text-primary)' }}>
                            <Crown className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                            <span>{plan.name}</span>
                          </div>
                          <div className="text-[10px] font-mono text-emerald-400">
                            ${plan.usdtAmount} USDT / ₹{plan.inrAmount.toLocaleString('en-IN')} (1% Daily ROI)
                          </div>
                        </div>

                        {isSelected && <Check className="w-4 h-4 text-cyan-400" />}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Modal Action Buttons */}
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedUserForPlan(null)}
                className="flex-1 py-2 rounded-xl border text-xs font-semibold cursor-pointer opacity-80 hover:opacity-100"
                style={{
                  backgroundColor: 'var(--app-surface-subtle)',
                  borderColor: 'var(--app-border-subtle)',
                  color: 'var(--app-text-dim)',
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSaveUserPlan}
                disabled={isUpdatingPlan}
                className="flex-1 py-2 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 text-xs font-bold transition-all shadow-md cursor-pointer disabled:opacity-50"
              >
                {isUpdatingPlan ? 'Updating...' : 'Save Plan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
