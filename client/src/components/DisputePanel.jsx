import React, { useState } from 'react';
import { useWeb3 } from '../contexts/Web3Context';

export default function DisputePanel({ onSuccess }) {
  const { landRegistry, sendTx, txPending } = useWeb3();

  const [parcelId, setParcelId] = useState('');
  const [reason,   setReason]   = useState('');
  const [loading,  setLoading]  = useState(false);
  const [msg,      setMsg]      = useState('');

  const flagDispute = async () => {
    const id = parseInt(parcelId);
    if (!id || id < 1) { setMsg("Error: Enter a valid parcel ID."); return; }
    if (!reason.trim()) { setMsg("Error: Reason is required."); return; }
    setMsg('');
    setLoading(true);

    try {
      await sendTx(landRegistry.flagDispute(id, reason));
      setMsg("Dispute flagged — parcel is now frozen from all transfers.");
      setParcelId('');
      setReason('');
      if (onSuccess) onSuccess();
    } catch (err) {
      setMsg("Error: " + (err?.reason || err?.message || "Transaction failed."));
    } finally {
      setLoading(false);
    }
  };

  const isError = msg.startsWith('Error');

  return (
    <div className="panel space-y-6">
      <div>
        <p className="eyebrow mb-2">Encumbrance filing</p>
        <h3 className="font-serif text-2xl font-semibold text-ink tracking-tightest">Flag a dispute</h3>
        <p className="text-sm text-slate2 mt-2 max-w-prose">
          Any KYC-verified citizen can place an encumbrance against a parcel. The parcel is frozen from
          every transfer action until the Sub-Registrar records a resolution on-chain.
        </p>
      </div>

      {msg && (
        <div className={`p-4 rounded-sm text-sm border-l-2 ${
          isError
            ? 'bg-rose2/10 border-rose2 text-rose2'
            : 'bg-land-50 border-land-600 text-land-800'
        }`}>
          {msg}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div>
          <label className="label">Parcel ID</label>
          <input
            className="input"
            type="number"
            placeholder="e.g. 1"
            value={parcelId}
            onChange={e => setParcelId(e.target.value)}
            min="1"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Reason for dispute</label>
          <input
            className="input"
            placeholder="e.g. Ownership contested by heir"
            value={reason}
            onChange={e => setReason(e.target.value)}
          />
        </div>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-bone">
        <p className="text-xs text-muted max-w-md">
          Filing a frivolous dispute may attract penalties once governance modules ship.
        </p>
        <button
          className="btn-danger text-xs py-2 px-4"
          onClick={flagDispute}
          disabled={loading || txPending}
        >
          {loading ? "Filing…" : "File dispute"}
        </button>
      </div>
    </div>
  );
}
