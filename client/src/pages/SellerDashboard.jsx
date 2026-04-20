import React, { useState, useEffect, useCallback } from 'react';
import { useWeb3 } from '../contexts/Web3Context';
import Navbar from '../components/Navbar';
import LandCard from '../components/LandCard';
import { KYCBadge } from '../components/StatusBadge';
import { PageHeader, Tabs, StatRow, Empty, Spinner, TxBanner } from '../components/DashboardChrome';
import { parseLandParcel, shortAddress } from '../utils/contractHelpers';
import { uploadToIPFS } from '../utils/pinata';
import AadhaarKYC from '../components/AadhaarKYC';

const toChainCoord = (v) => Math.round(parseFloat(v) * 1_000_000);

const STATES = [
  { code: 'RJ', name: 'Rajasthan',   districts: [{ code: 'JP', name: 'Jaipur' }, { code: 'JO', name: 'Jodhpur' }, { code: 'UD', name: 'Udaipur' }] },
  { code: 'MH', name: 'Maharashtra', districts: [{ code: 'MU', name: 'Mumbai' }, { code: 'PU', name: 'Pune' },    { code: 'NA', name: 'Nagpur' }] },
  { code: 'KA', name: 'Karnataka',   districts: [{ code: 'BN', name: 'Bengaluru' }, { code: 'MY', name: 'Mysuru' }, { code: 'MN', name: 'Mangaluru' }] },
];

function AddLandModal({ onClose, onSuccess }) {
  const { landRegistry, sendTx } = useWeb3();
  const [form,    setForm]    = useState({ stateCode: '', districtCode: '', tehsil: '', surveyNumber: '', areaInSqFt: '', latitude: '', longitude: '', declaredValue: '' });
  const [file,    setFile]    = useState(null);
  const [loading, setLoading] = useState(false);
  const [err,     setErr]     = useState('');

  const districts = STATES.find(s => s.code === form.stateCode)?.districts || [];
  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault(); setErr('');
    if (!file) { setErr('Upload a sale deed document.'); return; }
    const { stateCode, districtCode, tehsil, surveyNumber, areaInSqFt, latitude, longitude, declaredValue } = form;
    if (!stateCode || !districtCode || !tehsil || !surveyNumber || !areaInSqFt || !latitude || !longitude || !declaredValue) {
      setErr('All fields are required.'); return;
    }
    try {
      setLoading(true);
      const cid = await uploadToIPFS(file, `SaleDeed_${surveyNumber}`);
      await sendTx(landRegistry.registerLand(
        stateCode, districtCode, tehsil, surveyNumber,
        Number(areaInSqFt), toChainCoord(latitude), toChainCoord(longitude),
        Math.round(parseFloat(declaredValue) * 100), cid
      ));
      onSuccess(); onClose();
    } catch (error) {
      setErr(error?.reason || error?.message || 'Transaction failed.');
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-ink/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-paper border border-bone rounded-sm w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-rise">
        <div className="flex items-center justify-between px-6 py-5 border-b border-bone">
          <div>
            <p className="eyebrow mb-1">New parcel</p>
            <h2 className="font-serif text-2xl font-semibold text-ink tracking-tightest">Register a land parcel</h2>
          </div>
          <button onClick={onClose} className="text-muted hover:text-ink text-2xl leading-none px-2">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {err && <div className="p-3 rounded-sm bg-rose2/10 border border-rose2/30 text-rose2 text-sm">{err}</div>}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">State</label>
              <select className="input" name="stateCode" value={form.stateCode} onChange={handleChange} required disabled={loading}>
                <option value="">Select state</option>
                {STATES.map(s => <option key={s.code} value={s.code}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">District</label>
              <select className="input" name="districtCode" value={form.districtCode} onChange={handleChange} required disabled={loading || !form.stateCode}>
                <option value="">Select district</option>
                {districts.map(d => <option key={d.code} value={d.code}>{d.name}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Tehsil / Block</label>
              <input className="input" name="tehsil" placeholder="Jaipur North" value={form.tehsil} onChange={handleChange} required disabled={loading} />
            </div>
            <div>
              <label className="label">Survey / Khasra</label>
              <input className="input" name="surveyNumber" placeholder="142/B" value={form.surveyNumber} onChange={handleChange} required disabled={loading} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Area (sq.ft)</label>
              <input className="input" type="number" name="areaInSqFt" placeholder="1200" value={form.areaInSqFt} onChange={handleChange} required disabled={loading} min="1" />
            </div>
            <div>
              <label className="label">Declared value (₹)</label>
              <input className="input" type="number" name="declaredValue" placeholder="4500000" value={form.declaredValue} onChange={handleChange} required disabled={loading} min="1" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Latitude</label>
              <input className="input" type="number" step="0.000001" name="latitude" placeholder="26.912434" value={form.latitude} onChange={handleChange} required disabled={loading} />
            </div>
            <div>
              <label className="label">Longitude</label>
              <input className="input" type="number" step="0.000001" name="longitude" placeholder="75.787270" value={form.longitude} onChange={handleChange} required disabled={loading} />
            </div>
          </div>

          <div>
            <label className="label">Sale deed (PDF / image)</label>
            <input
              type="file" accept=".pdf,.jpg,.jpeg,.png"
              onChange={e => setFile(e.target.files[0])}
              className="block w-full text-sm text-slate2 file:mr-4 file:py-2 file:px-4 file:rounded-sm file:border file:border-ink/25 file:bg-transparent file:text-sm file:font-medium file:text-ink hover:file:bg-ink hover:file:text-paper cursor-pointer file:cursor-pointer"
              required disabled={loading}
            />
            <p className="text-xs text-muted mt-1.5">Uploaded to IPFS via Pinata. Max 10 MB.</p>
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-bone">
            <button type="button" onClick={onClose} className="btn-secondary" disabled={loading}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? (
                <>
                  <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-paper" />
                  Uploading
                </>
              ) : 'Register parcel'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function SellerDashboard() {
  const { landRegistry, account, currentUser, sendTx, txPending } = useWeb3();
  const [parcels,   setParcels]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [txMsg,     setTxMsg]     = useState('');
  const [tab,       setTab]       = useState('all');

  const loadParcels = useCallback(async () => {
    if (!landRegistry || !account) return;
    try {
      setLoading(true);
      const ids    = await landRegistry.getOwnerParcelIds(account);
      const loaded = await Promise.all(ids.map(id => landRegistry.getLand(id)));
      setParcels(loaded.map(parseLandParcel));
    } catch (err) {
      console.error('loadParcels:', err);
    } finally { setLoading(false); }
  }, [landRegistry, account]);

  useEffect(() => { loadParcels(); }, [loadParcels]);

  const doTx = async (fn, msg) => {
    try { setTxMsg(''); await fn(); setTxMsg(msg); await loadParcels(); }
    catch (err) { setTxMsg('Error: ' + (err?.reason || err?.message || 'Transaction failed.')); }
  };

  const pending     = parcels.filter(p => p.status === 2);
  const awaitingAck = parcels.filter(p => p.status === 6);

  const approve = (id) => doTx(() => sendTx(landRegistry.approveRequest(id)),  'Request approved');
  const reject  = (id) => doTx(() => sendTx(landRegistry.rejectRequest(id)),   'Request rejected');
  const ack     = (id) => doTx(() => sendTx(landRegistry.acknowledgePayment(id)), 'Payment acknowledged');

  const tabs = [
    { id: 'all',     label: `All parcels · ${parcels.length}` },
    { id: 'pending', label: `Incoming requests · ${pending.length}` },
    { id: 'ack',     label: `Awaiting ack · ${awaitingAck.length}` },
  ];

  return (
    <div className="min-h-screen bg-paper flex flex-col">
      <Navbar />
      <div className="max-w-7xl mx-auto w-full px-6 sm:px-10 py-10">
        <PageHeader
          eyebrow="Seller"
          title={`Good to have you back, ${currentUser?.name || ''}`}
          subtitle="Register parcels, respond to purchase requests, and acknowledge payments."
          right={
            <>
              <KYCBadge isKYCVerified={currentUser?.isKYCVerified} />
              {currentUser?.isKYCVerified && (
                <button onClick={() => setShowModal(true)} className="btn-primary">+ New parcel</button>
              )}
            </>
          }
        />

        {!currentUser?.isKYCVerified && (
          <div className="mb-6"><AadhaarKYC onVerified={loadParcels} /></div>
        )}

        <TxBanner message={txMsg} />

        <StatRow items={[
          { label: 'Total parcels',    value: parcels.length },
          { label: 'Pending requests', value: pending.length,     accent: 'text-clay-500' },
          { label: 'Awaiting ack',     value: awaitingAck.length, accent: 'text-land-700' },
          { label: 'KYC',              value: currentUser?.isKYCVerified ? '✓' : '—', accent: currentUser?.isKYCVerified ? 'text-land-700' : 'text-muted' },
        ]} />

        <Tabs items={tabs} active={tab} onChange={setTab} />

        {loading ? <Spinner /> : (
          <>
            {tab === 'all' && (
              parcels.length === 0 ? (
                <Empty
                  title="No parcels yet."
                  hint="Register your first parcel to start the on-chain registration flow."
                  action={currentUser?.isKYCVerified && <button onClick={() => setShowModal(true)} className="btn-primary">Register a parcel</button>}
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {parcels.map(p => <LandCard key={p.id} parcel={p} />)}
                </div>
              )
            )}

            {tab === 'pending' && (
              pending.length === 0 ? (
                <Empty title="No incoming requests." hint="Buyers' requests for your verified parcels will appear here." />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {pending.map(p => (
                    <LandCard key={p.id} parcel={p} actions={
                      <>
                        <button className="btn-primary text-xs py-1.5 px-3" disabled={txPending} onClick={() => approve(p.id)}>Approve</button>
                        <button className="btn-danger text-xs py-1.5 px-3"  disabled={txPending} onClick={() => reject(p.id)}>Reject</button>
                        <span className="font-mono text-[11px] text-muted ml-auto">Buyer {shortAddress(p.pendingBuyer)}</span>
                      </>
                    } />
                  ))}
                </div>
              )
            )}

            {tab === 'ack' && (
              awaitingAck.length === 0 ? (
                <Empty title="Nothing to acknowledge." hint="Parcels where a buyer has uploaded payment proof will appear here." />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {awaitingAck.map(p => (
                    <LandCard key={p.id} parcel={p} actions={
                      <button className="btn-primary text-xs py-1.5 px-3" disabled={txPending} onClick={() => ack(p.id)}>
                        Acknowledge payment
                      </button>
                    } />
                  ))}
                </div>
              )
            )}
          </>
        )}
      </div>

      {showModal && <AddLandModal onClose={() => setShowModal(false)} onSuccess={loadParcels} />}
    </div>
  );
}
