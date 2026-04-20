import React, { useState, useEffect, useCallback } from 'react';
import { useWeb3 } from '../contexts/Web3Context';
import Navbar from '../components/Navbar';
import LandCard from '../components/LandCard';
import { KYCBadge } from '../components/StatusBadge';
import { PageHeader, Tabs, StatRow, Empty, Spinner, TxBanner } from '../components/DashboardChrome';
import { parseLandParcel, shortAddress } from '../utils/contractHelpers';

export default function PatwariDashboard() {
  const { landRegistry, currentUser, sendTx, txPending } = useWeb3();

  const [parcels, setParcels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab,     setTab]     = useState('verify');
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

  const verify   = (id) => doTx(() => sendTx(landRegistry.verifyLand(id)),       'Land verified');
  const approve  = (id) => doTx(() => sendTx(landRegistry.approveAsPatwari(id)), 'Revenue approval granted');
  const mutate   = (id) => doTx(() => sendTx(landRegistry.completeMutation(id)), 'Mutation (Dakhil Kharij) complete');

  const pendingVerify   = parcels.filter(p => p.status === 0);
  const pendingApproval = parcels.filter(p => p.status === 3);
  const pendingMutation = parcels.filter(p => p.status === 8);

  const tabs = [
    { id: 'verify',   label: `Verify · ${pendingVerify.length}` },
    { id: 'approve',  label: `Approvals · ${pendingApproval.length}` },
    { id: 'mutation', label: `Mutations · ${pendingMutation.length}` },
  ];

  return (
    <div className="min-h-screen bg-paper flex flex-col">
      <Navbar />
      <div className="max-w-7xl mx-auto w-full px-6 sm:px-10 py-10">
        <PageHeader
          eyebrow="Revenue department"
          title="Patwari desk"
          subtitle="Verify new registrations, approve transfers, and complete mutation — Record of Rights lives here."
          right={<KYCBadge isKYCVerified={currentUser?.isKYCVerified} />}
        />

        <TxBanner message={txMsg} />

        <StatRow items={[
          { label: 'Pending verification', value: pendingVerify.length,   accent: 'text-clay-500' },
          { label: 'Pending approval',     value: pendingApproval.length, accent: 'text-land-700' },
          { label: 'Pending mutation',     value: pendingMutation.length, accent: 'text-ink' },
          { label: 'Total parcels',        value: parcels.length },
        ]} />

        <Tabs items={tabs} active={tab} onChange={setTab} />

        {loading ? <Spinner /> : (
          <>
            {tab === 'verify' && (
              pendingVerify.length === 0 ? (
                <Empty title="Nothing to verify." hint="Newly registered parcels awaiting Revenue Dept verification will appear here." />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {pendingVerify.map(p => (
                    <LandCard key={p.id} parcel={p} actions={
                      <button className="btn-primary text-xs py-1.5 px-3" disabled={txPending} onClick={() => verify(p.id)}>
                        Verify
                      </button>
                    } />
                  ))}
                </div>
              )
            )}

            {tab === 'approve' && (
              pendingApproval.length === 0 ? (
                <Empty title="No transfers awaiting approval." hint="Transfers that cleared the seller's approval will queue here." />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {pendingApproval.map(p => (
                    <LandCard key={p.id} parcel={p} actions={
                      <>
                        <button className="btn-primary text-xs py-1.5 px-3" disabled={txPending} onClick={() => approve(p.id)}>
                          Revenue approve
                        </button>
                        <span className="font-mono text-[11px] text-muted ml-auto">
                          Buyer {shortAddress(p.pendingBuyer)}
                        </span>
                      </>
                    } />
                  ))}
                </div>
              )
            )}

            {tab === 'mutation' && (
              pendingMutation.length === 0 ? (
                <Empty title="No parcels pending mutation." hint="Finalised transfers awaiting Dakhil Kharij queue here." />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {pendingMutation.map(p => (
                    <LandCard key={p.id} parcel={p} actions={
                      <button className="btn-primary text-xs py-1.5 px-3" disabled={txPending} onClick={() => mutate(p.id)}>
                        Complete Dakhil Kharij
                      </button>
                    } />
                  ))}
                </div>
              )
            )}
          </>
        )}
      </div>
    </div>
  );
}
