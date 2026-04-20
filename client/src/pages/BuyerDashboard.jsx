import React, { useState, useEffect, useCallback } from 'react';
import { useWeb3 } from '../contexts/Web3Context';
import Navbar from '../components/Navbar';
import LandCard from '../components/LandCard';
import { LandStatusBadge, KYCBadge } from '../components/StatusBadge';
import { PageHeader, Tabs, StatRow, Empty, Spinner, TxBanner } from '../components/DashboardChrome';
import { parseLandParcel, formatINR } from '../utils/contractHelpers';
import { uploadToIPFS } from '../utils/pinata';
import AadhaarKYC from '../components/AadhaarKYC';

const PROGRESS_STEPS = [
  { status: 2, label: 'Requested' },
  { status: 3, label: 'Seller' },
  { status: 5, label: 'Govt' },
  { status: 6, label: 'Paid' },
  { status: 7, label: 'Confirmed' },
  { status: 9, label: 'Mutated' },
];

function TransferProgress({ currentStatus }) {
  return (
    <div className="flex items-center gap-0 mt-4">
      {PROGRESS_STEPS.map((step, i) => {
        const done   = currentStatus >= step.status;
        const active = currentStatus === step.status;
        return (
          <React.Fragment key={step.status}>
            <div className="flex flex-col items-center flex-1 min-w-0">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 border ${
                done   ? 'bg-land-600 border-land-600 text-paper' :
                active ? 'bg-paper border-land-600 text-land-700' :
                         'bg-paper border-bone text-muted'
              }`}>{done ? '✓' : i + 1}</div>
              <span className="text-[10px] text-slate2 mt-1.5 text-center leading-tight hidden sm:block tracking-wide">
                {step.label}
              </span>
            </div>
            {i < PROGRESS_STEPS.length - 1 && (
              <div className={`flex-1 h-px mb-4 ${currentStatus > step.status ? 'bg-land-600' : 'bg-bone'}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function PaymentUploadModal({ parcel, onClose, onSuccess }) {
  const { landRegistry, sendTx } = useWeb3();
  const [file,    setFile]    = useState(null);
  const [loading, setLoading] = useState(false);
  const [err,     setErr]     = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) { setErr('Select a payment receipt.'); return; }
    try {
      setLoading(true);
      const cid = await uploadToIPFS(file, `PaymentReceipt_Land${parcel.id}`);
      await sendTx(landRegistry.uploadPaymentProof(parcel.id, cid));
      onSuccess(); onClose();
    } catch (error) { setErr(error?.reason || error?.message || 'Upload failed.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-ink/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-paper border border-bone rounded-sm w-full max-w-md animate-rise">
        <div className="flex items-center justify-between px-6 py-5 border-b border-bone">
          <div>
            <p className="eyebrow mb-1">Payment proof</p>
            <h2 className="font-serif text-2xl font-semibold text-ink tracking-tightest">Upload receipt</h2>
          </div>
          <button onClick={onClose} className="text-muted hover:text-ink text-2xl leading-none px-2">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-vellum/60 border border-bone rounded-sm p-4 text-sm">
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted">Parcel</p>
            <p className="chip-ulpin mt-1">{parcel.ulpin}</p>
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted mt-4">Amount due</p>
            <p className="font-serif text-2xl font-semibold text-ink tracking-tightest leading-none mt-1">
              {formatINR(parcel.declaredValue)}
            </p>
            <p className="text-xs text-slate2 mt-3">Pay via UPI/NEFT/DD to the seller. Upload the receipt below.</p>
          </div>
          {err && <div className="p-3 rounded-sm bg-rose2/10 border border-rose2/30 text-rose2 text-sm">{err}</div>}
          <div>
            <label className="label">Receipt (PDF / image)</label>
            <input
              type="file" accept=".pdf,.jpg,.jpeg,.png"
              onChange={e => setFile(e.target.files[0])}
              className="block w-full text-sm text-slate2 file:mr-4 file:py-2 file:px-4 file:rounded-sm file:border file:border-ink/25 file:bg-transparent file:text-sm file:font-medium file:text-ink hover:file:bg-ink hover:file:text-paper cursor-pointer file:cursor-pointer"
              required disabled={loading}
            />
          </div>
          <div className="flex justify-end gap-3 border-t border-bone pt-4">
            <button type="button" onClick={onClose} className="btn-secondary" disabled={loading}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? (
                <>
                  <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-paper" />
                  Uploading
                </>
              ) : 'Record on chain'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function BuyerDashboard() {
  const { landRegistry, account, currentUser, sendTx, txPending } = useWeb3();

  const [availableLands, setAvailableLands] = useState([]);
  const [myRequests,     setMyRequests]     = useState([]);
  const [ownedLands,     setOwnedLands]     = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [txMsg,          setTxMsg]          = useState('');
  const [payModal,       setPayModal]       = useState(null);
  const [tab,            setTab]            = useState('browse');

  const loadData = useCallback(async () => {
    if (!landRegistry || !account) return;
    try {
      setLoading(true);
      const all = (await landRegistry.getAllParcels()).map(parseLandParcel);
      const me = account.toLowerCase();
      setMyRequests(all.filter(p => p.pendingBuyer?.toLowerCase() === me && p.status >= 2 && p.status <= 8));
      setOwnedLands(all.filter(p => p.owner?.toLowerCase() === me && p.status === 9));
      setAvailableLands(all.filter(p => p.status === 1 && p.encumbrance === 0 && p.owner?.toLowerCase() !== me));
    } catch (err) { console.error('loadData:', err); }
    finally { setLoading(false); }
  }, [landRegistry, account]);

  useEffect(() => { loadData(); }, [loadData]);

  const doTx = async (fn, msg) => {
    try { setTxMsg(''); await fn(); setTxMsg(msg); await loadData(); }
    catch (err) { setTxMsg('Error: ' + (err?.reason || err?.message || 'Transaction failed.')); }
  };

  const requestTransfer = (id) => doTx(() => sendTx(landRegistry.requestTransfer(id)), 'Purchase request sent');

  const tabs = [
    { id: 'browse',   label: `Browse · ${availableLands.length}` },
    { id: 'requests', label: `My requests · ${myRequests.length}` },
    { id: 'owned',    label: `Owned · ${ownedLands.length}` },
  ];

  return (
    <div className="min-h-screen bg-paper flex flex-col">
      <Navbar />
      <div className="max-w-7xl mx-auto w-full px-6 sm:px-10 py-10">
        <PageHeader
          eyebrow="Buyer"
          title={`Good to have you back, ${currentUser?.name || ''}`}
          subtitle="Browse verified parcels, track your purchase requests, and complete payments."
          right={<KYCBadge isKYCVerified={currentUser?.isKYCVerified} />}
        />

        {!currentUser?.isKYCVerified && (
          <div className="mb-6"><AadhaarKYC onVerified={loadData} /></div>
        )}

        <TxBanner message={txMsg} />

        <StatRow items={[
          { label: 'Verified for sale', value: availableLands.length },
          { label: 'Active requests',   value: myRequests.length, accent: 'text-clay-500' },
          { label: 'Owned parcels',     value: ownedLands.length, accent: 'text-land-700' },
          { label: 'KYC',               value: currentUser?.isKYCVerified ? '✓' : '—', accent: currentUser?.isKYCVerified ? 'text-land-700' : 'text-muted' },
        ]} />

        <Tabs items={tabs} active={tab} onChange={setTab} />

        {loading ? <Spinner /> : (
          <>
            {tab === 'browse' && (
              availableLands.length === 0 ? (
                <Empty title="No verified parcels available right now." hint="Come back after a seller registers and a Patwari verifies their land." />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {availableLands.map(p => (
                    <LandCard key={p.id} parcel={p} actions={
                      currentUser?.isKYCVerified && (
                        <button className="btn-primary text-xs py-1.5 px-3" disabled={txPending} onClick={() => requestTransfer(p.id)}>
                          Request purchase
                        </button>
                      )
                    } />
                  ))}
                </div>
              )
            )}

            {tab === 'requests' && (
              myRequests.length === 0 ? (
                <Empty title="No active requests." hint="Purchase requests you send will appear here with live progress." />
              ) : (
                <div className="space-y-5">
                  {myRequests.map(p => (
                    <div key={p.id} className="panel">
                      <div className="flex items-start justify-between mb-3 gap-4 flex-wrap">
                        <div>
                          <p className="chip-ulpin">{p.ulpin}</p>
                          <p className="text-xs text-slate2 mt-2">
                            Survey <span className="font-mono text-ink">{p.surveyNumber}</span> ·
                            {' '}{p.areaInSqFt.toLocaleString('en-IN')} sq·ft
                          </p>
                        </div>
                        <LandStatusBadge status={p.status} />
                      </div>
                      <TransferProgress currentStatus={p.status} />

                      {p.status === 5 && (
                        <div className="mt-6 pt-5 border-t border-bone flex items-center justify-between gap-4 flex-wrap">
                          <p className="text-sm text-slate2 max-w-md">
                            All approvals complete. Pay via UPI/NEFT and upload the receipt to finalise.
                          </p>
                          <button className="btn-primary text-xs py-1.5 px-3" disabled={txPending} onClick={() => setPayModal(p)}>
                            Upload payment proof
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )
            )}

            {tab === 'owned' && (
              ownedLands.length === 0 ? (
                <Empty title="You don't own any parcels yet." hint="Completed transfers will appear here with full provenance." />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {ownedLands.map(p => <LandCard key={p.id} parcel={p} />)}
                </div>
              )
            )}
          </>
        )}
      </div>

      {payModal && <PaymentUploadModal parcel={payModal} onClose={() => setPayModal(null)} onSuccess={loadData} />}
    </div>
  );
}
