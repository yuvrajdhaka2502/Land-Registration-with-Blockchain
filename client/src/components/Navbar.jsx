import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useWeb3 } from '../contexts/Web3Context';
import { USER_ROLE, shortAddress } from '../utils/contractHelpers';

const ROLE_DASHBOARD = {
  1: '/seller', 2: '/buyer', 3: '/patwari', 4: '/survey', 5: '/sub-registrar',
};

export default function Navbar() {
  const { account, currentUser, disconnectWallet, isWrongNetwork } = useWeb3();
  const location = useLocation();

  const dashPath = currentUser?.isRegistered
    ? ROLE_DASHBOARD[currentUser.role] || '/'
    : '/';

  const isActive = (path) => location.pathname === path;

  const link = (to, label, show = true) => {
    if (!show) return null;
    const active = isActive(to);
    return (
      <Link
        to={to}
        className={`relative px-1 py-2 text-sm tracking-wide transition-colors ${
          active ? 'text-ink' : 'text-slate2 hover:text-ink'
        }`}
      >
        {label}
        {active && (
          <span className="absolute left-0 right-0 -bottom-[1px] h-[2px] bg-land-600" />
        )}
      </Link>
    );
  };

  return (
    <nav className="bg-paper/90 backdrop-blur border-b border-bone sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 sm:px-10 h-16 flex items-center justify-between">
        {/* Brand */}
        <Link to={dashPath} className="flex items-center gap-2.5 group">
          <MarkSmall />
          <div className="leading-none">
            <p className="font-serif text-[17px] font-semibold tracking-tightest text-ink">BhuChain</p>
            <p className="text-[9px] uppercase tracking-[0.2em] text-muted mt-0.5">Revenue · on chain</p>
          </div>
        </Link>

        {/* Nav links */}
        {account && (
          <div className="hidden md:flex items-center gap-7">
            {link(dashPath, 'Dashboard', currentUser?.isRegistered)}
            {link('/map',   'Map')}
            {link('/tools', 'Tools')}
          </div>
        )}

        {/* Right */}
        <div className="flex items-center gap-3">
          {isWrongNetwork && (
            <span className="pill bg-rose2/10 text-rose2 border-rose2/30 hidden sm:inline-flex">
              Wrong network
            </span>
          )}

          {account ? (
            <div className="flex items-center gap-4">
              {currentUser?.isRegistered && (
                <span className="hidden lg:inline-flex font-mono text-[10px] uppercase tracking-[0.2em] text-land-700">
                  {USER_ROLE[currentUser.role]}
                </span>
              )}

              <div className="text-right hidden sm:block">
                <p className="text-xs font-medium text-ink leading-tight">
                  {currentUser?.isRegistered ? currentUser.name : 'Unregistered'}
                </p>
                <p className="font-mono text-[10px] text-muted mt-0.5">{shortAddress(account)}</p>
              </div>

              <button onClick={disconnectWallet} className="btn-secondary py-1.5 px-3 text-xs">
                Disconnect
              </button>
            </div>
          ) : (
            location.pathname !== '/' && (
              <Link to="/" className="btn-primary py-1.5 px-3 text-xs">
                Connect wallet
              </Link>
            )
          )}
        </div>
      </div>
    </nav>
  );
}

function MarkSmall() {
  return (
    <svg width="28" height="28" viewBox="0 0 40 40" fill="none" aria-hidden>
      <rect x="1" y="1" width="38" height="38" rx="2" stroke="#171612" strokeWidth="1.5" fill="#FAF7F0" />
      <path d="M2 28 L14 14 L22 22 L30 12 L38 22 L38 38 L2 38 Z" fill="#1F5D4C" />
      <line x1="2" y1="28" x2="38" y2="28" stroke="#171612" strokeWidth="0.8" strokeDasharray="2 2" />
      <circle cx="30" cy="10" r="2.6" fill="#C87A2F" />
    </svg>
  );
}
