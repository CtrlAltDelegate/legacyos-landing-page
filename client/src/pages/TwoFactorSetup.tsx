import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, ShieldCheck, ArrowLeft, Copy, CheckCircle2 } from 'lucide-react';
import { api, getErrorMessage } from '@/api/client';
import Spinner from '@/components/Spinner';

type Stage = 'status' | 'setup' | 'verify' | 'enabled' | 'disable';

interface Status { enabled: boolean; backupCodesRemaining: number; }
interface SetupData { qrCode: string; secret: string; backupCodes: string[]; }

export default function TwoFactorSetup() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status | null>(null);
  const [setup, setSetup] = useState<SetupData | null>(null);
  const [stage, setStage] = useState<Stage>('status');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => { loadStatus(); }, []);

  async function loadStatus() {
    setLoading(true);
    try {
      const { data } = await api.get('/2fa/status');
      setStatus(data);
      setStage(data.enabled ? 'status' : 'status');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleStartSetup() {
    setSaving(true);
    setError('');
    try {
      const { data } = await api.post('/2fa/setup');
      setSetup(data);
      setStage('setup');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleEnable() {
    if (!code.trim()) { setError('Enter the 6-digit code from your authenticator app.'); return; }
    setSaving(true);
    setError('');
    try {
      await api.post('/2fa/enable', { code: code.replace(/\s/g, '') });
      setStatus({ enabled: true, backupCodesRemaining: setup?.backupCodes.length ?? 8 });
      setStage('enabled');
      setCode('');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDisable() {
    if (!code.trim()) { setError('Enter your 6-digit authenticator code to confirm.'); return; }
    setSaving(true);
    setError('');
    try {
      await api.post('/2fa/disable', { code: code.replace(/\s/g, '') });
      setStatus({ enabled: false, backupCodesRemaining: 0 });
      setStage('status');
      setCode('');
      setSetup(null);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  function copySecret() {
    if (setup?.secret) {
      navigator.clipboard.writeText(setup.secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  if (loading) return <div className="flex h-full items-center justify-center"><Spinner className="h-8 w-8 text-brand-600" /></div>;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-lg mx-auto space-y-6">
      <button onClick={() => navigate('/profile')} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to Profile
      </button>

      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Two-Factor Authentication</h1>
        <p className="mt-1 text-sm text-gray-500">Protect your account with an authenticator app.</p>
      </div>

      {/* Status card */}
      {(stage === 'status') && (
        <div className="rounded-xl bg-white shadow-sm border border-gray-100 p-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${status?.enabled ? 'bg-green-50' : 'bg-gray-100'}`}>
              {status?.enabled
                ? <ShieldCheck className="h-5 w-5 text-green-600" />
                : <Shield className="h-5 w-5 text-gray-400" />}
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">
                {status?.enabled ? '2FA is enabled' : '2FA is not enabled'}
              </p>
              <p className="text-xs text-gray-500">
                {status?.enabled
                  ? `${status.backupCodesRemaining} backup codes remaining`
                  : 'Add an extra layer of security to your account.'}
              </p>
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          {status?.enabled ? (
            <button onClick={() => { setStage('disable'); setCode(''); setError(''); }} className="btn-secondary w-full justify-center text-red-600 border-red-200 hover:bg-red-50">
              Disable 2FA
            </button>
          ) : (
            <button onClick={handleStartSetup} disabled={saving} className="btn-primary w-full justify-center">
              {saving ? <Spinner className="h-4 w-4" /> : <Shield className="h-4 w-4" />}
              Set up 2FA
            </button>
          )}
        </div>
      )}

      {/* Setup: scan QR */}
      {stage === 'setup' && setup && (
        <div className="rounded-xl bg-white shadow-sm border border-gray-100 p-6 space-y-5">
          <h2 className="text-base font-bold text-gray-900">Step 1 — Scan the QR code</h2>
          <p className="text-sm text-gray-500">Open Google Authenticator, Authy, or 1Password and scan the code below.</p>

          <div className="flex justify-center">
            <img src={setup.qrCode} alt="2FA QR code" className="w-44 h-44 rounded-xl border border-gray-200" />
          </div>

          <div className="flex items-center gap-2 rounded-lg bg-gray-50 border border-gray-200 px-3 py-2">
            <code className="flex-1 text-xs font-mono text-gray-600 break-all">{setup.secret}</code>
            <button onClick={copySecret} className="text-gray-400 hover:text-brand-600 transition-colors flex-shrink-0">
              {copied ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
          <p className="text-xs text-gray-400">Can't scan? Enter the code above manually.</p>

          <div className="pt-2 border-t border-gray-100">
            <h3 className="text-sm font-bold text-gray-900 mb-2">Save your backup codes</h3>
            <p className="text-xs text-gray-500 mb-3">Keep these somewhere safe. Each code can only be used once to access your account if you lose your phone.</p>
            <div className="grid grid-cols-2 gap-1.5">
              {setup.backupCodes.map((c) => (
                <code key={c} className="rounded bg-gray-100 px-2.5 py-1.5 text-xs font-mono text-gray-700 text-center">{c}</code>
              ))}
            </div>
          </div>

          <button onClick={() => setStage('verify')} className="btn-primary w-full justify-center">
            I've saved my backup codes — Continue
          </button>
        </div>
      )}

      {/* Verify code */}
      {stage === 'verify' && (
        <div className="rounded-xl bg-white shadow-sm border border-gray-100 p-6 space-y-4">
          <h2 className="text-base font-bold text-gray-900">Step 2 — Verify it works</h2>
          <p className="text-sm text-gray-500">Enter the 6-digit code from your authenticator app to confirm setup.</p>
          <div>
            <label className="label">Authentication code</label>
            <input
              className="input text-center text-xl font-mono tracking-widest"
              placeholder="000 000"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              autoFocus
              maxLength={6}
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-3">
            <button onClick={() => setStage('setup')} className="btn-secondary flex-1">Back</button>
            <button onClick={handleEnable} disabled={saving || code.length < 6} className="btn-primary flex-1">
              {saving ? <Spinner className="h-4 w-4" /> : 'Enable 2FA'}
            </button>
          </div>
        </div>
      )}

      {/* Success */}
      {stage === 'enabled' && (
        <div className="rounded-xl bg-white shadow-sm border border-gray-100 p-6 text-center space-y-4">
          <ShieldCheck className="h-12 w-12 text-green-500 mx-auto" />
          <div>
            <h2 className="text-lg font-bold text-gray-900">2FA enabled!</h2>
            <p className="text-sm text-gray-500 mt-1">Your account is now protected with two-factor authentication.</p>
          </div>
          <button onClick={() => navigate('/profile')} className="btn-primary px-8">Done</button>
        </div>
      )}

      {/* Disable confirmation */}
      {stage === 'disable' && (
        <div className="rounded-xl bg-white shadow-sm border border-red-100 p-6 space-y-4">
          <h2 className="text-base font-bold text-red-700">Disable two-factor authentication</h2>
          <p className="text-sm text-gray-500">Enter your authenticator code to confirm. This will make your account less secure.</p>
          <div>
            <label className="label">Authentication code</label>
            <input
              className="input text-center text-xl font-mono tracking-widest"
              placeholder="000 000"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              autoFocus
              maxLength={6}
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-3">
            <button onClick={() => setStage('status')} className="btn-secondary flex-1">Cancel</button>
            <button
              onClick={handleDisable}
              disabled={saving || code.length < 6}
              className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? <Spinner className="h-4 w-4" /> : 'Disable 2FA'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
