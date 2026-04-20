import React, { useState } from 'react';
import { useWeb3 } from '../contexts/Web3Context';

export default function AadhaarKYC({ onVerified }) {
  const { account, aadhaarOracle, sendTx, oracleUrl, refreshUser } = useWeb3();

  const [step,    setStep]    = useState('input');  // input | otp | done
  const [aadhaar, setAadhaar] = useState('');
  const [otp,     setOtp]     = useState('');
  const [demoOTP, setDemoOTP] = useState('');
  const [name,    setName]    = useState('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const requestVerification = async () => {
    if (!/^\d{12}$/.test(aadhaar)) { setError("Enter a valid 12-digit Aadhaar number."); return; }
    setError('');
    setLoading(true);

    try {
      if (aadhaarOracle) {
        try { await sendTx(aadhaarOracle.requestVerification()); }
        catch (err) { console.warn("requestVerification on-chain:", err.reason || err.message); }
      }

      const resp = await fetch(`${oracleUrl}/verify-aadhaar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aadhaarNumber: aadhaar, walletAddress: account }),
      });

      const data = await resp.json();
      if (!resp.ok) { setError(data.error || "Verification request failed."); return; }

      setName(data.name);
      setDemoOTP(data.demoOTP || '');
      setStep('otp');
    } catch (err) {
      setError(err.message || "Could not reach oracle backend.");
    } finally {
      setLoading(false);
    }
  };

  const confirmOTP = async () => {
    if (!/^\d{6}$/.test(otp)) { setError("Enter a valid 6-digit OTP."); return; }
    setError('');
    setLoading(true);

    try {
      const resp = await fetch(`${oracleUrl}/confirm-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otp, walletAddress: account }),
      });

      const data = await resp.json();
      if (!resp.ok) { setError(data.error || "OTP confirmation failed."); return; }

      setStep('done');
      await refreshUser();
      if (onVerified) onVerified();
    } catch (err) {
      setError(err.message || "Could not reach oracle backend.");
    } finally {
      setLoading(false);
    }
  };

  if (step === 'done') {
    return (
      <div className="panel bg-land-50/60 border-land-600/30">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-sm bg-land-600 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-paper" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <p className="eyebrow mb-1">Identity verified</p>
            <p className="font-serif text-xl text-ink font-semibold tracking-tightest">Welcome, {name}.</p>
            <p className="text-sm text-slate2 mt-1">Your Aadhaar hash is now bound to wallet on-chain.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="panel space-y-6">
      <div>
        <p className="eyebrow mb-2">Step 1 · Identity</p>
        <h3 className="font-serif text-2xl font-semibold text-ink tracking-tightest">Aadhaar KYC</h3>
        <p className="text-sm text-slate2 mt-2 max-w-prose">
          Verify identity through simulated Aadhaar OTP. Your 12-digit number is hashed with keccak-256
          before it ever reaches chain — only the hash and wallet address are stored.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-sm text-sm bg-rose2/10 border-l-2 border-rose2 text-rose2">{error}</div>
      )}

      {step === 'input' && (
        <div className="space-y-4">
          <div>
            <label className="label">Aadhaar number</label>
            <input
              className="input font-mono"
              type="text"
              maxLength={12}
              placeholder="123456789012"
              value={aadhaar}
              onChange={e => setAadhaar(e.target.value.replace(/\D/g, ''))}
              disabled={loading}
            />
            <p className="text-xs text-muted mt-2">
              Demo numbers: <span className="font-mono text-slate2">123456789012</span>,{' '}
              <span className="font-mono text-slate2">234567890123</span>,{' '}
              <span className="font-mono text-slate2">345678901234</span>
            </p>
          </div>
          <button className="btn-primary text-xs py-2.5 px-5" onClick={requestVerification} disabled={loading}>
            {loading ? "Sending OTP…" : "Send OTP"}
          </button>
        </div>
      )}

      {step === 'otp' && (
        <div className="space-y-4">
          <div className="p-4 bg-vellum/60 border border-bone rounded-sm text-sm">
            <p className="text-xs text-muted uppercase tracking-[0.18em]">Identity matched</p>
            <p className="font-serif text-lg font-semibold text-ink mt-1">{name}</p>
            <p className="text-xs text-slate2 mt-1">An OTP has been dispatched to your registered channel.</p>
          </div>

          {demoOTP && (
            <div className="p-4 bg-clay-50 border-l-2 border-clay-400 rounded-sm text-sm">
              <p className="text-xs uppercase tracking-[0.18em] text-clay-600 mb-1">Demo mode</p>
              <p className="text-ink">
                Your OTP is <span className="font-mono font-bold text-lg">{demoOTP}</span>
              </p>
              <p className="text-xs text-slate2 mt-1">In production this would be SMS-delivered to your registered mobile.</p>
            </div>
          )}

          <div>
            <label className="label">Enter 6-digit OTP</label>
            <input
              className="input font-mono"
              type="text"
              maxLength={6}
              placeholder="••••••"
              value={otp}
              onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
              disabled={loading}
            />
          </div>

          <div className="flex gap-3">
            <button
              className="btn-secondary text-xs py-2.5 px-5"
              onClick={() => { setStep('input'); setOtp(''); setError(''); }}
              disabled={loading}
            >
              Back
            </button>
            <button className="btn-primary text-xs py-2.5 px-5" onClick={confirmOTP} disabled={loading}>
              {loading ? "Verifying on-chain…" : "Verify OTP"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
