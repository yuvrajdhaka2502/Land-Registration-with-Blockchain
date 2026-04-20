import React, { useState, useEffect, useCallback } from 'react';
import { useWeb3 } from '../contexts/Web3Context';
import Navbar from '../components/Navbar';
import LandCard from '../components/LandCard';
import { KYCBadge } from '../components/StatusBadge';
import { PageHeader, Tabs, StatRow, Empty, Spinner, TxBanner } from '../components/DashboardChrome';
import { parseLandParcel, shortAddress, formatINR } from '../utils/contractHelpers';
import { getIPFSUrl } from '../utils/pinata';

export default function SubRegistrarDashboard() {
  const { landRegistry, circleRateOracle, currentUser, sendTx, txPending, oracleUrl } = useWeb3();

  const [parcels,       setParcels]       = useState([]);
  const [disputes,      setDisputes]      = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [tab,           setTab]           = useState('finalize');
  const [txMsg,         setTxMsg]         = useState('');
  const [resolveData,   setResolveData]   = useState({});
  const [stampDutyInfo, setStampDutyInfo] = useState({});

  const loadParcels = useCallback(async () => {
    if (!landRegistry) return;
    try {
      setLoading(true);
      const all = (await landRegistry.getAllParcels()).map(parseLandParcel);
      setParcels(all);

      const disputed = all.filter(p => p.encumbrance === 1);
      const disputeData = [];
      for (const p of disputed) {
        try {
          const history = await landRegistry.getDisputeHistory(p.id);
          const active  = history.filter(d => !d.resolved);
          if (active.length > 0) disputeData.push({ parcel: p, dispute: active[active.length - 1] });
        } catch {}
      }
      setDisputes(disputeData);

      const pendingFinal = all.filter(p => p.status === 7);
      const sdInfo = {};
      for (const p of pendingFinal) {
        try {
          const resp = await fetch(`${oracleUrl}/stamp-duty?stateCode=${p.stateCode}&declaredValue=${Number(p.declaredValue) / 100}`);
          if (resp.ok) sdInfo[p.id] = await resp.json();
        } catch {}

        if (circleRateOracle) {
          try {
            const [isUndervalued, circleValue] = await circleRateOracle.checkUndervaluation(
              p.stateCode, p.districtCode, p.areaInSqFt, p.declaredValue
            );
            if (sdInfo[p.id]) {
              sdInfo[p.id].isUndervalued = isUndervalued;
              sdInfo[p.id].circleValue   = Number(circleValue);
            }
          } catch {}
        }
      }
      setStampDutyInfo(sdInfo);
    } catch (err) { console.error('loadParcels:', err); }
    finally { setLoading(false); }
  }, [landRegistry, circleRateOracle, oracleUrl]);

  useEffect(() => { loadParcels(); }, [loadParcels]);

  const doTx = async (fn, msg) => {
    try { setTxMsg(''); await fn(); setTxMsg(msg); await loadParcels(); }
    catch (err) { setTxMsg('Error: ' + (err?.reason || err?.message || 'Transaction failed.')); }
  };

  const finalize = (id) => doTx(() => sendTx(landRegistry.finalApproval(id)), 'Transfer finalised — ownership transferred on-chain');

  const resolveDispute = (id) => {
    const resolution = resolveData[id];
    if (!resolution?.trim()) { setTxMsg('Error: Resolution text is required.'); return; }
    doTx(() => sendTx(landRegistry.resolveDispute(id, resolution)), 'Dispute resolved — encumbrance cleared');
  };

  const pendingFinalize = parcels.filter(p => p.status === 7);

  const tabs = [
    { id: 'finalize', label: `Finalise · ${pendingFinalize.length}` },
    { id: 'disputes', label: `Disputes · ${disputes.length}` },
    { id: 'all',      label: `All parcels · ${parcels.length}` },
  ];

  return (
    <div className="min-h-screen bg-paper flex flex-col">
      <Navbar />
      <div className="max-w-7xl mx-auto w-full px-6 sm:px-10 py-10">
        <PageHeader
          eyebrow="Registration department"
          title="Sub-Registrar desk"
          subtitle="Finalise transfers, audit stamp duty, and resolve encumbrance disputes."
          right={<KYCBadge isKYCVerified={currentUser?.isKYCVerified} />}
        />

        <TxBanner message={txMsg} />

        <StatRow items={[
          { label: 'Pending finalisation', value: pendingFinalize.length, accent: 'text-land-700' },
          { label: 'Active disputes',      value: disputes.length,        accent: 'text-rose2' },
          { label: 'Total parcels',        value: parcels.length },
          { label: 'KYC',                  value: currentUser?.isKYCVerified ? '✓' : '—', accent: currentUser?.isKYCVerified ? 'text-land-700' : 'text-muted' },
        ]} />

        <Tabs items={tabs} active={tab} onChange={setTab} />

        {loading ? <Spinner /> : (
          <>
            {tab === 'finalize' && (
              pendingFinalize.length === 0 ? (
                <Empty title="Nothing to finalise." hint="Transfers where the seller has acknowledged payment queue here." />
              ) : (
                <div className="space-y-6">
                  {pendingFinalize.map(p => {
                    const sd = stampDutyInfo[p.id];
                    return (
                      <div key={p.id} className="panel">
                        <LandCard parcel={p} actions={
                          <>
                            <button className="btn-primary text-xs py-1.5 px-3" disabled={txPending} onClick={() => finalize(p.id)}>
                              Finalise transfer
                            </button>
                            {p.paymentProofCid && (
                              <a href={getIPFSUrl(p.paymentProofCid)} target="_blank" rel="noreferrer"
                                 className="text-xs text-land-700 border-b border-land-700/30 hover:text-land-800 self-center ml-auto pb-0.5">
                                Payment receipt
                              </a>
                            )}
                          </>
                        } />

                        {sd && (
                          <div className="mt-5 p-4 bg-vellum/60 border border-bone rounded-sm">
                            <p className="eyebrow mb-4">Stamp duty breakdown</p>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                              <Field k={`Stamp duty · ${sd.rates?.stampDutyPercent}%`} v={formatINR(sd.stampDuty * 100)} />
                              <Field k={`Reg. fee · ${sd.rates?.regFeePercent}%`}     v={formatINR(sd.registrationFee * 100)} />
                              <Field k={`Cess · ${sd.rates?.cessPercent}%`}           v={formatINR(sd.cess * 100)} />
                              <Field k="Total"                                       v={formatINR(sd.totalFees * 100)} highlight />
                            </div>
                            {sd.isUndervalued && (
                              <div className="mt-4 p-3 bg-rose2/10 border border-rose2/30 rounded-sm text-xs text-rose2">
                                <strong>Undervaluation flagged:</strong> declared {formatINR(p.declaredValue)} vs circle-rate {formatINR(sd.circleValue)}. Review before approving.
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )
            )}

            {tab === 'disputes' && (
              disputes.length === 0 ? (
                <Empty title="No active disputes." hint="Any parcel flagged by a KYC-verified user lands here with full context." />
              ) : (
                <div className="space-y-6">
                  {disputes.map(({ parcel: p, dispute: d }) => (
                    <div key={p.id} className="panel">
                      <LandCard parcel={p} />
                      <div className="mt-5 p-4 bg-rose2/5 border border-rose2/30 rounded-sm">
                        <p className="eyebrow mb-3 text-rose2" style={{ }}>Active dispute</p>
                        <p className="text-sm text-ink">
                          Flagged by <span className="font-mono text-xs">{shortAddress(d.flaggedBy)}</span>
                        </p>
                        <p className="text-sm text-slate2 mt-1">Reason: {d.reason}</p>
                        <div className="mt-4 flex gap-3 items-end flex-wrap">
                          <div className="flex-1 min-w-[240px]">
                            <label className="label">Resolution</label>
                            <input
                              className="input"
                              placeholder="Resolution summary…"
                              value={resolveData[p.id] || ''}
                              onChange={e => setResolveData(prev => ({ ...prev, [p.id]: e.target.value }))}
                            />
                          </div>
                          <button className="btn-primary text-xs py-2.5 px-4" disabled={txPending} onClick={() => resolveDispute(p.id)}>
                            Resolve
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}

            {tab === 'all' && (
              parcels.length === 0 ? (
                <Empty title="No land parcels registered yet." />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {parcels.map(p => <LandCard key={p.id} parcel={p} />)}
                </div>
              )
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Field({ k, v, highlight }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.18em] text-muted">{k}</p>
      <p className={`font-serif text-lg font-semibold tracking-tightest mt-1 ${highlight ? 'text-land-700' : 'text-ink'}`}>
        {v}
      </p>
    </div>
  );
}
