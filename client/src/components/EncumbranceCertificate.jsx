import React, { useState } from 'react';
import { useWeb3 } from '../contexts/Web3Context';
import { parseLandParcel, formatINR, formatCoord, shortAddress, LAND_STATUS_LABEL, ENCUMBRANCE_STATUS } from '../utils/contractHelpers';

export default function EncumbranceCertificate() {
  const { landRegistry } = useWeb3();

  const [parcelId,  setParcelId]  = useState('');
  const [parcel,    setParcel]    = useState(null);
  const [transfers, setTransfers] = useState([]);
  const [disputes,  setDisputes]  = useState([]);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');

  const lookup = async () => {
    const id = parseInt(parcelId);
    if (!id || id < 1) { setError("Enter a valid parcel ID."); return; }
    setError('');
    setLoading(true);

    try {
      const raw = await landRegistry.getLand(id);
      setParcel(parseLandParcel(raw));

      const txHistory = await landRegistry.getTransferHistory(id);
      setTransfers(txHistory.map(t => ({
        from: t.from,
        to: t.to,
        timestamp: Number(t.timestamp),
        declaredValue: t.declaredValue,
      })));

      const dispHistory = await landRegistry.getDisputeHistory(id);
      setDisputes(dispHistory.map(d => ({
        flaggedBy: d.flaggedBy,
        reason: d.reason,
        timestamp: Number(d.timestamp),
        resolved: d.resolved,
        resolution: d.resolution,
        resolvedBy: d.resolvedBy,
        resolvedAt: Number(d.resolvedAt),
      })));
    } catch (err) {
      setError(err?.reason || err?.message || "Failed to fetch parcel data.");
      setParcel(null);
    } finally {
      setLoading(false);
    }
  };

  const printCertificate = () => {
    const printWindow = window.open('', '_blank');
    const content = document.getElementById('ec-content').innerHTML;
    printWindow.document.write(`
      <html>
      <head>
        <title>Encumbrance Certificate — ${parcel?.ulpin || ''}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');
          body { font-family: 'Inter', sans-serif; max-width: 820px; margin: 0 auto; padding: 56px 40px; color: #171612; background: #FAF7F0; }
          h1 { font-family: 'Fraunces', serif; text-align: center; font-size: 32px; font-weight: 600; letter-spacing: -0.02em; border-bottom: 1px solid #E8E2D1; padding-bottom: 18px; margin: 0 0 8px; }
          h2 { font-family: 'Fraunces', serif; font-size: 18px; font-weight: 600; color: #171612; margin-top: 32px; padding-bottom: 6px; border-bottom: 1px solid #E8E2D1; }
          .eyebrow { font-size: 10px; text-transform: uppercase; letter-spacing: 0.2em; color: #8A8577; margin: 0 0 4px; }
          table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 12px; }
          th, td { border-bottom: 1px solid #E8E2D1; padding: 8px 10px; text-align: left; }
          th { background: #F3EEE1; font-weight: 500; color: #524D42; text-transform: uppercase; letter-spacing: 0.1em; font-size: 10px; }
          td.mono { font-family: 'JetBrains Mono', monospace; font-size: 11px; }
          .header-info { display: grid; grid-template-columns: 1fr 1fr; gap: 16px 24px; margin: 24px 0; }
          .field .k { font-size: 10px; text-transform: uppercase; letter-spacing: 0.18em; color: #8A8577; }
          .field .v { font-size: 14px; color: #171612; margin-top: 2px; }
          .field .v.mono { font-family: 'JetBrains Mono', monospace; font-size: 12px; }
          .footer { margin-top: 40px; text-align: center; font-size: 10px; color: #8A8577; border-top: 1px solid #E8E2D1; padding-top: 16px; line-height: 1.6; }
          .pill { display: inline-block; padding: 2px 8px; border-radius: 2px; font-size: 10px; font-weight: 500; letter-spacing: 0.05em; text-transform: uppercase; }
          .pill-clear { background: #E7F0EB; color: #1F5D4C; }
          .pill-disputed { background: #F5DCDC; color: #B33A3A; }
          .chip-ulpin { display: inline-block; font-family: 'JetBrains Mono', monospace; background: #E7F0EB; color: #1F5D4C; padding: 3px 10px; font-size: 11px; letter-spacing: 0.05em; }
          @media print { body { padding: 20px; background: #fff; } }
        </style>
      </head>
      <body>${content}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="panel space-y-6">
      <div>
        <p className="eyebrow mb-2">Step 2 · Title history</p>
        <h3 className="font-serif text-2xl font-semibold text-ink tracking-tightest">Encumbrance certificate</h3>
        <p className="text-sm text-slate2 mt-2 max-w-prose">
          A complete ownership and dispute trail for any parcel, rebuilt on-demand from chain events.
          Instant, tamper-proof, printable.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-sm text-sm bg-rose2/10 border-l-2 border-rose2 text-rose2">{error}</div>
      )}

      <div className="flex gap-3">
        <input
          className="input flex-1"
          type="number"
          placeholder="Parcel ID (e.g. 1)"
          value={parcelId}
          onChange={e => setParcelId(e.target.value)}
          min="1"
        />
        <button className="btn-primary text-xs py-2.5 px-5 flex-shrink-0" onClick={lookup} disabled={loading}>
          {loading ? "Loading…" : "Generate EC"}
        </button>
      </div>

      {parcel && (
        <>
          <div className="flex justify-end">
            <button
              onClick={printCertificate}
              className="btn-secondary text-xs py-1.5 px-3 inline-flex items-center gap-2"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print / Save as PDF
            </button>
          </div>

          <div id="ec-content" className="bg-paper border border-bone rounded-sm p-8">
            <h1>Encumbrance Certificate</h1>
            <p style={{ textAlign: 'center', fontSize: '11px', color: '#8A8577', letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 24px' }}>
              BhuChain Decentralised Land Registry · {new Date().toLocaleString('en-IN')}
            </p>

            <h2>Parcel details</h2>
            <div className="header-info">
              <Field k="ULPIN"    v={<span className="chip-ulpin">{parcel.ulpin}</span>} html />
              <Field k="Survey number" v={parcel.surveyNumber} />
              <Field k="Location"      v={`${parcel.stateCode}-${parcel.districtCode}, ${parcel.tehsil}`} />
              <Field k="Area"          v={`${parcel.areaInSqFt.toLocaleString('en-IN')} sq·ft`} />
              <Field k="Current owner" v={parcel.owner} mono />
              <Field k="RoR holder"    v={parcel.recordOfRightsHolder} mono />
              <Field k="Status"        v={LAND_STATUS_LABEL[parcel.status]} />
              <Field k="Encumbrance"   v={ENCUMBRANCE_STATUS[parcel.encumbrance]} />
              <Field k="Declared value" v={formatINR(parcel.declaredValue)} />
              <Field k="GPS"           v={`${formatCoord(parcel.latitude)}, ${formatCoord(parcel.longitude)}`} mono />
            </div>

            <h2>Transfer history</h2>
            {transfers.length === 0 ? (
              <p style={{ fontSize: '13px', color: '#8A8577', fontStyle: 'italic', margin: '8px 0' }}>No transfers recorded.</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th style={{ width: '36px' }}>#</th>
                    <th>From</th>
                    <th>To</th>
                    <th>Value</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {transfers.map((t, i) => (
                    <tr key={i}>
                      <td>{i + 1}</td>
                      <td className="mono">{shortAddress(t.from)}</td>
                      <td className="mono">{shortAddress(t.to)}</td>
                      <td>{formatINR(t.declaredValue)}</td>
                      <td>{new Date(t.timestamp * 1000).toLocaleDateString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            <h2>Dispute history</h2>
            {disputes.length === 0 ? (
              <p style={{ fontSize: '13px', color: '#8A8577', fontStyle: 'italic', margin: '8px 0' }}>No disputes recorded.</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th style={{ width: '36px' }}>#</th>
                    <th>Flagged by</th>
                    <th>Reason</th>
                    <th>Date</th>
                    <th>State</th>
                    <th>Resolution</th>
                  </tr>
                </thead>
                <tbody>
                  {disputes.map((d, i) => (
                    <tr key={i}>
                      <td>{i + 1}</td>
                      <td className="mono">{shortAddress(d.flaggedBy)}</td>
                      <td>{d.reason}</td>
                      <td>{new Date(d.timestamp * 1000).toLocaleDateString('en-IN')}</td>
                      <td>
                        <span className={`pill ${d.resolved ? 'pill-clear' : 'pill-disputed'}`}>
                          {d.resolved ? 'Resolved' : 'Active'}
                        </span>
                      </td>
                      <td>{d.resolution || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            <div className="footer">
              <p>Generated from immutable on-chain data stored on the Ethereum blockchain.</p>
              <p>Each record is cryptographically anchored; no off-chain signature is required.</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Field({ k, v, mono, html }) {
  return (
    <div className="field">
      <p className="k">{k}</p>
      <p className={`v ${mono ? 'mono' : ''}`}>{html ? v : v}</p>
    </div>
  );
}
