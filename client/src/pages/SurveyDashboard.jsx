import React, { useState, useEffect, useCallback } from 'react';
import { useWeb3 } from '../contexts/Web3Context';
import Navbar from '../components/Navbar';
import LandCard from '../components/LandCard';
import { KYCBadge } from '../components/StatusBadge';
import { PageHeader, Tabs, StatRow, Empty, Spinner, TxBanner } from '../components/DashboardChrome';
import { parseLandParcel, formatCoord } from '../utils/contractHelpers';

export default function SurveyDashboard() {
  const { landRegistry, currentUser, sendTx, txPending } = useWeb3();

  const [parcels, setParcels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab,     setTab]     = useState('pending');
  const [txMsg,   setTxMsg]   = useState('');

  const loadParcels = useCallback(async () => {
    if (!landRegistry) return;
    try {
      setLoading(true);
      setParcels((await landRegistry.getAllParcels()).map(parseLandParcel));
    } catch (err) { console.error('loadParcels:', err); }
    finally { setLoading(false); }
  }, [landRegistry]);

  useEffect(() => { loadParcels(); }, [loadParcels]);

  const doTx = async (fn, msg) => {
    try { setTxMsg(''); await fn(); setTxMsg(msg); await loadParcels(); }
    catch (err) { setTxMsg('Error: ' + (err?.reason || err?.message || 'Transaction failed.')); }
  };

  const approve = (id) => doTx(() => sendTx(landRegistry.approveAsSurveyOfficer(id)), 'Survey approval granted');

  const pendingSurvey = parcels.filter(p => p.status === 4);
  const approved      = parcels.filter(p => p.status >= 5);

  const tabs = [
    { id: 'pending', label: `Pending survey · ${pendingSurvey.length}` },
    { id: 'history', label: `Approved · ${approved.length}` },
  ];

  return (
    <div className="min-h-screen bg-paper flex flex-col">
      <Navbar />
      <div className="max-w-7xl mx-auto w-full px-6 sm:px-10 py-10">
        <PageHeader
          eyebrow="Survey & Settlement department"
          title="Survey Officer desk"
          subtitle="Confirm GPS coordinates and survey area match the registered parcel before Sub-Registrar finalisation."
          right={<KYCBadge isKYCVerified={currentUser?.isKYCVerified} />}
        />

        <TxBanner message={txMsg} />

        <StatRow items={[
          { label: 'Pending survey', value: pendingSurvey.length, accent: 'text-clay-500' },
          { label: 'Approved',       value: approved.length,      accent: 'text-land-700' },
          { label: 'Total parcels',  value: parcels.length },
          { label: 'KYC',            value: currentUser?.isKYCVerified ? '✓' : '—', accent: currentUser?.isKYCVerified ? 'text-land-700' : 'text-muted' },
        ]} />

        <Tabs items={tabs} active={tab} onChange={setTab} />

        {loading ? <Spinner /> : (
          <>
            {tab === 'pending' && (
              pendingSurvey.length === 0 ? (
                <Empty title="Nothing awaiting survey." hint="Parcels that cleared Patwari approval queue here for GPS verification." />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {pendingSurvey.map(p => (
                    <LandCard key={p.id} parcel={p} actions={
                      <>
                        <button className="btn-primary text-xs py-1.5 px-3" disabled={txPending} onClick={() => approve(p.id)}>
                          Survey approve
                        </button>
                        <span className="font-mono text-[11px] text-muted ml-auto">
                          {formatCoord(p.latitude)}, {formatCoord(p.longitude)}
                        </span>
                      </>
                    } />
                  ))}
                </div>
              )
            )}

            {tab === 'history' && (
              approved.length === 0 ? (
                <Empty title="No approval history yet." hint="Your approved parcels accumulate here." />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {approved.map(p => <LandCard key={p.id} parcel={p} />)}
                </div>
              )
            )}
          </>
        )}
      </div>
    </div>
  );
}
