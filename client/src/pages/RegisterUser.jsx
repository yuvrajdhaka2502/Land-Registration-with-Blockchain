import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWeb3 } from '../contexts/Web3Context';
import Navbar from '../components/Navbar';

const ROLES = [
  { value: 1, label: 'Seller',         desc: 'I own land and want to register or sell it.' },
  { value: 2, label: 'Buyer',          desc: 'I want to browse and purchase land.' },
  { value: 3, label: 'Patwari',        desc: 'Revenue Dept — I verify land records and mutate.' },
  { value: 4, label: 'Survey Officer', desc: 'Survey & Settlement — I verify GPS and area.' },
  { value: 5, label: 'Sub-Registrar',  desc: 'Registration Dept — I finalise legal transfers.' },
];

export default function RegisterUser() {
  const { userRegistry, sendTx, refreshUser, account, error, setError } = useWeb3();
  const navigate = useNavigate();

  const [form,       setForm]       = useState({ name: '', email: '', phone: '', role: '' });
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState('');

  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError(''); setError(null);

    if (!form.name.trim() || !form.email.trim() || !form.phone.trim() || !form.role) {
      setLocalError('All fields are required.'); return;
    }
    if (!userRegistry) {
      setLocalError('Contracts not loaded. MetaMask must be on Hardhat Local (31337).');
      return;
    }

    try {
      setSubmitting(true);
      await sendTx(userRegistry.registerUser(form.name, form.email, form.phone, Number(form.role)));
      await refreshUser();
      const map = { 1: '/seller', 2: '/buyer', 3: '/patwari', 4: '/survey', 5: '/sub-registrar' };
      navigate(map[Number(form.role)] || '/', { replace: true });
    } catch (err) {
      setLocalError(err?.reason || err?.message || 'Registration failed.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!account) {
    return (
      <div className="min-h-screen flex flex-col bg-paper">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-slate2">Connect your wallet first.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-paper">
      <Navbar />
      <div className="flex-1 max-w-5xl mx-auto w-full px-6 sm:px-10 py-14">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Left — narrative */}
          <aside className="lg:col-span-5">
            <p className="eyebrow mb-5">Enrolment</p>
            <h1 className="font-serif text-4xl sm:text-5xl font-semibold text-ink tracking-tightest leading-[1.05]">
              One wallet, <span className="italic text-land-700">one</span> role,
              signed onto the ledger.
            </h1>
            <p className="text-slate2 mt-6 leading-relaxed">
              Your role selection here is permanent for this wallet — the contract enforces
              role-gated functions. Pick the one that matches how you'll use the system.
            </p>

            <div className="mt-10 border-t border-bone pt-6 space-y-3 text-sm text-slate2">
              <Row k="Address"   v={<span className="font-mono text-xs text-ink">{account}</span>} />
              <Row k="Network"   v="Hardhat Local · 31337" />
              <Row k="Contract"  v="UserRegistry.sol" />
            </div>
          </aside>

          {/* Right — form */}
          <div className="lg:col-span-7">
            {(localError || error) && (
              <div className="mb-4 p-3 rounded-sm bg-rose2/10 border border-rose2/30 text-rose2 text-sm">
                {localError || error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="panel space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="label">Full name</label>
                  <input className="input" name="name" placeholder="Rajan Sharma" value={form.name} onChange={handleChange} disabled={submitting} required />
                </div>
                <div>
                  <label className="label">Mobile</label>
                  <input className="input" name="phone" placeholder="+91 98765 43210" value={form.phone} onChange={handleChange} disabled={submitting} required />
                </div>
              </div>

              <div>
                <label className="label">Email</label>
                <input className="input" type="email" name="email" placeholder="rajan@example.com" value={form.email} onChange={handleChange} disabled={submitting} required />
              </div>

              <div>
                <label className="label">Role</label>
                <div className="grid grid-cols-1 gap-px bg-bone border border-bone">
                  {ROLES.map((r) => {
                    const selected = form.role === String(r.value);
                    return (
                      <label
                        key={r.value}
                        className={`cursor-pointer px-4 py-3.5 flex items-start gap-4 transition-colors ${
                          selected ? 'bg-land-50' : 'bg-paper hover:bg-vellum/60'
                        }`}
                      >
                        <input
                          type="radio" name="role" value={r.value}
                          checked={selected} onChange={handleChange}
                          className="sr-only"
                          disabled={submitting}
                        />
                        <span className={`mt-1 w-2.5 h-2.5 rounded-full flex-shrink-0 ${selected ? 'bg-land-600' : 'bg-bone'}`} />
                        <span className="flex-1">
                          <span className="flex items-baseline gap-3">
                            <span className="font-serif text-lg font-semibold text-ink tracking-tightest">{r.label}</span>
                            <span className="font-mono text-[10px] uppercase tracking-widest text-muted">role {r.value}</span>
                          </span>
                          <span className="block text-xs text-slate2 mt-0.5">{r.desc}</span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between gap-4 pt-2">
                <p className="text-xs text-muted">MetaMask will ask you to sign. Gas is test ETH.</p>
                <button type="submit" disabled={submitting} className="btn-primary">
                  {submitting ? (
                    <>
                      <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-paper" />
                      Registering
                    </>
                  ) : (
                    <>
                      Register on-chain
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M1 7h12M8 2l5 5-5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="square" />
                      </svg>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ k, v }) {
  return (
    <div className="flex items-baseline gap-6">
      <span className="text-[10px] uppercase tracking-[0.2em] text-muted w-20 flex-shrink-0">{k}</span>
      <span className="text-sm text-ink break-all">{v}</span>
    </div>
  );
}
