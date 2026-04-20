import React from 'react';
import { LandStatusBadge, EncumbranceBadge } from './StatusBadge';
import { formatINR, formatCoord, shortAddress } from '../utils/contractHelpers';
import { getIPFSUrl } from '../utils/pinata';

/**
 * LandCard — rendered as a hairline-bordered "deed sheet".
 * Uses serif numerals for scale, monospace for identifiers.
 */
export default function LandCard({ parcel, actions }) {
  const lat = formatCoord(parcel.latitude);
  const lng = formatCoord(parcel.longitude);

  return (
    <article className="bg-paper border border-bone rounded-sm shadow-deed hover:shadow-deed-hover transition-shadow duration-200 flex flex-col">
      {/* Top band: ULPIN + status */}
      <div className="px-5 pt-4 pb-3 border-b border-bone/70 flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted">ULPIN</p>
          <p className="chip-ulpin mt-1">{parcel.ulpin}</p>
          <p className="text-xs text-slate2 mt-2">
            Survey <span className="font-mono text-ink">{parcel.surveyNumber}</span>
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <LandStatusBadge status={parcel.status} />
          {parcel.encumbrance !== 0 && <EncumbranceBadge encumbrance={parcel.encumbrance} />}
        </div>
      </div>

      {/* Main body: headline numbers + grid of facts */}
      <div className="px-5 py-5 flex-1">
        <div className="flex items-baseline gap-6 mb-5">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted">Value</p>
            <p className="font-serif text-2xl font-semibold text-ink tracking-tightest leading-none mt-1">
              {formatINR(parcel.declaredValue)}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted">Area</p>
            <p className="font-serif text-2xl font-semibold text-ink tracking-tightest leading-none mt-1">
              {parcel.areaInSqFt.toLocaleString('en-IN')}
              <span className="text-base font-normal text-slate2 ml-1">sq·ft</span>
            </p>
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <Field label="State"          value={parcel.stateCode} />
          <Field label="District"       value={`${parcel.districtCode} · ${parcel.tehsil}`} />
          <Field label="Coordinates"    value={<span className="font-mono text-xs">{lat}°, {lng}°</span>} colSpan />
          <Field label="Owner"          value={<span className="font-mono text-xs">{shortAddress(parcel.owner)}</span>} colSpan />
        </dl>

        {parcel.saleDeedCid && (
          <a
            href={getIPFSUrl(parcel.saleDeedCid)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-land-700 hover:text-land-800 mt-5 border-b border-land-700/30 hover:border-land-800 pb-0.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            View sale deed on IPFS
          </a>
        )}
      </div>

      {actions && (
        <div className="px-5 py-3 border-t border-bone/70 bg-vellum/40 flex flex-wrap gap-2 items-center">
          {actions}
        </div>
      )}
    </article>
  );
}

function Field({ label, value, colSpan }) {
  return (
    <div className={colSpan ? 'col-span-2' : ''}>
      <dt className="text-[10px] uppercase tracking-[0.18em] text-muted">{label}</dt>
      <dd className="text-ink mt-0.5">{value}</dd>
    </div>
  );
}
