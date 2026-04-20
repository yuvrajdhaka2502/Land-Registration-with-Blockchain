import React from 'react';
import {
  LAND_STATUS_LABEL, LAND_STATUS_COLOR,
  ENCUMBRANCE_STATUS, ENCUMBRANCE_COLOR,
  USER_ROLE, USER_ROLE_COLOR,
} from '../utils/contractHelpers';

export function LandStatusBadge({ status }) {
  return (
    <span className={`pill ${LAND_STATUS_COLOR[status] || 'bg-vellum text-slate2 border-bone'}`}>
      {LAND_STATUS_LABEL[status] || 'Unknown'}
    </span>
  );
}

export function EncumbranceBadge({ encumbrance }) {
  return (
    <span className={`pill ${ENCUMBRANCE_COLOR[encumbrance] || 'bg-vellum text-slate2 border-bone'}`}>
      {ENCUMBRANCE_STATUS[encumbrance] || 'Unknown'}
    </span>
  );
}

export function RoleBadge({ role }) {
  return (
    <span className={`pill ${USER_ROLE_COLOR[role] || 'bg-vellum text-slate2 border-bone'}`}>
      {USER_ROLE[role] || 'None'}
    </span>
  );
}

export function KYCBadge({ isKYCVerified }) {
  return isKYCVerified ? (
    <span className="pill bg-land-50 text-land-700 border-land-100 gap-1.5">
      <Dot className="text-land-600" /> KYC verified
    </span>
  ) : (
    <span className="pill bg-clay-50 text-clay-700 border-clay-100 gap-1.5">
      <Dot className="text-clay-500" /> KYC pending
    </span>
  );
}

function Dot({ className = '' }) {
  return (
    <svg className={`w-1.5 h-1.5 ${className}`} viewBox="0 0 8 8">
      <circle cx="4" cy="4" r="4" fill="currentColor" />
    </svg>
  );
}
