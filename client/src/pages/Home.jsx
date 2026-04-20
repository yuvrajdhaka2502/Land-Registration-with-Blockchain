import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useWeb3 } from '../contexts/Web3Context';

export default function Home() {
  const { account, currentUser, connectWallet, isLoading, error, isWrongNetwork } = useWeb3();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (!account || !currentUser?.isRegistered) return;
    const map = { 1: '/seller', 2: '/buyer', 3: '/patwari', 4: '/survey', 5: '/sub-registrar' };
    const path = map[currentUser.role];
    if (path) navigate(path, { replace: true });
  }, [account, currentUser, navigate]);

  const steps = [
    { n: '01', title: 'Identity',   blurb: 'Create an on-chain profile. Verify identity through an Aadhaar OTP oracle — your 12-digit number is keccak-hashed before it ever touches the ledger.' },
    { n: '02', title: 'Registration', blurb: 'Upload the sale deed to IPFS. A deterministic ULPIN is minted from the state-district code so every parcel is uniquely addressable.' },
    { n: '03', title: 'Three-signature approval', blurb: 'Patwari, Survey Officer, and Sub-Registrar each approve independently. No single office can fast-track a transfer.' },
    { n: '04', title: 'Mutation', blurb: 'Dakhil Kharij is recorded on-chain as a terminal state. The revenue record and the ownership record converge — no more dual-registry drift.' },
  ];

  const pillars = [
    { k: 'Three-dept multi-sig',       v: 'Patwari · Survey · Sub-Registrar' },
    { k: 'Dakhil Kharij on-chain',     v: '2025 Digital India reform' },
    { k: 'Aadhaar OTP oracle',         v: 'Off-chain KYC, on-chain hash' },
    { k: 'Circle-rate oracle',         v: 'Auto stamp-duty + undervaluation flag' },
    { k: 'Encumbrance certificate',    v: 'Generated live from tx history' },
    { k: 'ULPIN + WGS-84 coordinates', v: 'Cartographic-grade parcel identity' },
  ];

  const marqueeItems = [
    'UserRegistry.sol', 'LandRegistry.sol', 'AadhaarOracle.sol', 'CircleRateOracle.sol',
    'Hardhat · Solidity 0.8.20 viaIR', 'Ethers.js v6', 'React 18 + Tailwind',
    'Pinata IPFS', 'OpenStreetMap · Leaflet', '57 passing tests',
  ];

  const handleConnect = async () => { await connectWallet(); };

  return (
    <div className="relative min-h-screen bg-paper overflow-x-hidden">
      {/* top hairline + brand bar */}
      <header className="relative z-10 max-w-7xl mx-auto px-6 sm:px-10 pt-6 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <LogoMark />
          <div className="leading-tight">
            <p className="font-serif text-lg font-semibold tracking-tightest">BhuChain</p>
            <p className="text-[10px] uppercase tracking-[0.24em] text-muted">Revenue records · on chain</p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-[11px] tracking-[0.14em] uppercase text-slate2">
          <span className="w-1.5 h-1.5 rounded-full bg-land-600 animate-pulse" />
          Hardhat Local · 31337
        </div>
      </header>

      {/* HERO */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 sm:px-10 pt-16 sm:pt-20 pb-20">
        <p className="eyebrow mb-8">Prototype · course project · 2026</p>

        <h1 className="font-serif text-[44px] sm:text-[68px] lg:text-[88px] leading-[0.98] tracking-tightest font-semibold text-ink max-w-5xl">
          A ledger for <em className="italic text-land-700 font-normal">land</em>,
          <br />
          rebuilt where <em className="italic text-clay-500 font-normal">records</em> never drift.
        </h1>

        <div className="mt-10 grid grid-cols-1 lg:grid-cols-12 gap-10 items-end">
          <p className="lg:col-span-7 text-lg text-slate2 leading-relaxed max-w-2xl">
            India's registry passes through three offices &mdash; Patwari, Survey, and Sub-Registrar &mdash;
            and two parallel record systems. BhuChain collapses both into a single settlement layer where
            mutation is not an afterthought but a terminal on-chain state.
          </p>

          <div className="lg:col-span-5 flex flex-col items-start gap-3">
            {error && (
              <div className="w-full p-3 rounded-sm bg-rose2/10 border border-rose2/30 text-rose2 text-sm">{error}</div>
            )}
            {isWrongNetwork && account && (
              <div className="w-full p-3 rounded-sm bg-saffron/10 border border-saffron/30 text-clay-700 text-sm">
                Switch MetaMask to <strong>Hardhat Local</strong> (31337).
              </div>
            )}

            {!account ? (
              <button onClick={handleConnect} disabled={isLoading} className="btn-primary px-7 py-3.5 text-base">
                {isLoading ? (
                  <>
                    <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-paper" />
                    Connecting
                  </>
                ) : (
                  <>
                    Connect MetaMask
                    <Arrow />
                  </>
                )}
              </button>
            ) : !currentUser?.isRegistered ? (
              <button onClick={() => navigate('/register')} className="btn-primary px-7 py-3.5 text-base">
                Create account <Arrow />
              </button>
            ) : null}

            <p className="text-xs text-muted">
              Runs on localhost · No real ETH required · MetaMask required
            </p>
          </div>
        </div>

        {/* hero key numbers */}
        <div className="mt-20 grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-bone border-y border-bone">
          {[
            { k: 'Contracts',     v: '4',  c: 'deployed on Hardhat' },
            { k: 'Dashboards',    v: '5',  c: 'role-gated surfaces' },
            { k: 'Land states',   v: '10', c: 'submit → mutation' },
            { k: 'Hardhat tests', v: '57', c: 'all contracts green' },
          ].map(({ k, v, c }) => (
            <div key={k} className="py-6 px-4 flex flex-col items-start">
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted mb-2">{k}</p>
              <p className="font-serif text-5xl font-semibold text-ink leading-none">{v}</p>
              <p className="text-xs text-slate2 mt-2">{c}</p>
            </div>
          ))}
        </div>
      </section>

      {/* MARQUEE */}
      <section className="relative z-10 border-y border-bone bg-vellum/50 overflow-hidden">
        <div className="py-4 flex whitespace-nowrap animate-marquee gap-10">
          {[...marqueeItems, ...marqueeItems].map((t, i) => (
            <span key={i} className="font-mono text-xs tracking-tight text-slate2 inline-flex items-center gap-10">
              {t}
              <span className="text-land-600">◆</span>
            </span>
          ))}
        </div>
      </section>

      {/* WORKFLOW */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 sm:px-10 py-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 mb-14">
          <div className="lg:col-span-5">
            <p className="eyebrow mb-5">Flow</p>
            <h2 className="font-serif text-4xl sm:text-5xl leading-[1.05] tracking-tightest font-semibold text-ink">
              Four acts, <span className="italic text-land-700">one</span> ledger.
            </h2>
          </div>
          <p className="lg:col-span-7 text-base text-slate2 leading-relaxed self-end">
            The sequence below is enforced at the contract level. A Patwari cannot finalise a registration.
            A Sub-Registrar cannot mutate records. The contract is the bureaucracy, minus the drift.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-px bg-bone border border-bone">
          {steps.map((s) => (
            <div key={s.n} className="bg-paper p-6 min-h-[220px] flex flex-col">
              <p className="font-mono text-xs text-clay-500 tracking-widest">{s.n}</p>
              <h3 className="font-serif text-2xl font-semibold text-ink mt-6 tracking-tightest leading-tight">
                {s.title}
              </h3>
              <p className="text-sm text-slate2 mt-3 leading-relaxed">{s.blurb}</p>
            </div>
          ))}
        </div>
      </section>

      {/* PILLARS — dark band */}
      <section className="relative z-10 bg-ink text-paper overflow-hidden">
        <div className="absolute inset-0 bg-parcels opacity-[0.08] pointer-events-none" />
        <div className="relative max-w-7xl mx-auto px-6 sm:px-10 py-24">
          <div className="flex items-end justify-between gap-8 flex-wrap mb-12">
            <div>
              <p className="eyebrow text-paper/60 mb-4" style={{ }}>Why it's different</p>
              <h2 className="font-serif text-4xl sm:text-5xl leading-tight tracking-tightest font-semibold max-w-2xl">
                Not a tokenised deed. A <span className="italic text-clay-300">replacement</span> for the filing cabinet.
              </h2>
            </div>
            <p className="text-sm text-paper/60 max-w-xs leading-relaxed">
              Most &ldquo;blockchain land&rdquo; projects re-implement transfer.
              BhuChain models the <em>workflow</em> — approvals, mutation, encumbrance, stamp duty.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-paper/10 border border-paper/10">
            {pillars.map((p) => (
              <div key={p.k} className="bg-ink px-6 py-7">
                <p className="font-serif text-xl font-semibold text-paper tracking-tightest leading-snug">
                  {p.k}
                </p>
                <p className="font-mono text-xs uppercase tracking-[0.14em] text-paper/50 mt-3">
                  {p.v}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA STRIP */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 sm:px-10 py-24">
        <div className="border border-bone bg-vellum/50 rounded-sm px-8 py-14 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-8">
            <p className="eyebrow mb-4">Try it locally</p>
            <h3 className="font-serif text-3xl sm:text-4xl font-semibold text-ink tracking-tightest leading-tight">
              Bring a MetaMask. Spin up Hardhat. Watch a parcel flow through all ten states.
            </h3>
          </div>
          <div className="lg:col-span-4 flex flex-wrap gap-3 lg:justify-end">
            {!account ? (
              <button onClick={handleConnect} disabled={isLoading} className="btn-primary">
                Connect MetaMask <Arrow />
              </button>
            ) : !currentUser?.isRegistered ? (
              <button onClick={() => navigate('/register')} className="btn-primary">
                Register <Arrow />
              </button>
            ) : null}
            <button onClick={() => navigate('/map')} className="btn-secondary">
              Browse the map
            </button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="relative z-10 border-t border-bone">
        <div className="max-w-7xl mx-auto px-6 sm:px-10 py-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <LogoMark small />
            <p className="text-xs text-slate2">
              BhuChain &middot; Decentralised Land Registry &middot;
              <span className="text-muted ml-1">a course prototype, 2026</span>
            </p>
          </div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
            v3 · Solidity 0.8.20 · Ethers v6
          </p>
        </div>
      </footer>
    </div>
  );
}

/* ── Small building blocks ─────────────────────────────────────────────────── */

function LogoMark({ small = false }) {
  const size = small ? 28 : 36;
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-label="BhuChain mark">
      <rect x="1" y="1" width="38" height="38" rx="2" stroke="#171612" strokeWidth="1.5" fill="#FAF7F0" />
      {/* land wedge */}
      <path d="M2 28 L14 14 L22 22 L30 12 L38 22 L38 38 L2 38 Z" fill="#1F5D4C" />
      {/* horizon line */}
      <line x1="2" y1="28" x2="38" y2="28" stroke="#171612" strokeWidth="0.8" strokeDasharray="2 2" />
      {/* sun */}
      <circle cx="30" cy="10" r="2.6" fill="#C87A2F" />
    </svg>
  );
}

function Arrow() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M1 7h12M8 2l5 5-5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="square" />
    </svg>
  );
}
