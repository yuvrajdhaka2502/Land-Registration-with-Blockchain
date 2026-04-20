import React, { useState } from 'react';
import { useWeb3 } from '../contexts/Web3Context';

const STATES = [
  { code: "RJ", name: "Rajasthan" },
  { code: "MH", name: "Maharashtra" },
  { code: "KA", name: "Karnataka" },
];

export default function StampDutyCalculator() {
  const { oracleUrl } = useWeb3();

  const [stateCode,     setStateCode]     = useState('');
  const [declaredValue, setDeclaredValue] = useState('');
  const [result,        setResult]        = useState(null);
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState('');

  const calculate = async () => {
    if (!stateCode || !declaredValue) { setError("Select a state and enter a declared value."); return; }
    setError('');
    setLoading(true);

    try {
      const resp = await fetch(`${oracleUrl}/stamp-duty?stateCode=${stateCode}&declaredValue=${declaredValue}`);
      const data = await resp.json();
      if (!resp.ok) { setError(data.error || "Calculation failed."); return; }
      setResult(data);
    } catch {
      setError(`Could not reach oracle backend. Make sure it's running on ${oracleUrl}.`);
    } finally {
      setLoading(false);
    }
  };

  const formatINR = (val) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(val);

  return (
    <div className="panel space-y-6">
      <div>
        <p className="eyebrow mb-2">Fee estimate</p>
        <h3 className="font-serif text-2xl font-semibold text-ink tracking-tightest">Stamp duty calculator</h3>
        <p className="text-sm text-slate2 mt-2 max-w-prose">
          Pulls live rates from the Circle Rate Oracle and itemises stamp duty, registration fee,
          and cess before you commit a deed to chain.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-sm text-sm bg-rose2/10 border-l-2 border-rose2 text-rose2">{error}</div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label className="label">State</label>
          <select className="input" value={stateCode} onChange={e => setStateCode(e.target.value)}>
            <option value="">Select a state</option>
            {STATES.map(s => <option key={s.code} value={s.code}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Transaction value (INR)</label>
          <input
            className="input"
            type="number"
            placeholder="e.g. 5,000,000"
            value={declaredValue}
            onChange={e => setDeclaredValue(e.target.value)}
            min="1"
          />
        </div>
      </div>

      <button className="btn-primary text-xs py-2.5 px-5" onClick={calculate} disabled={loading}>
        {loading ? "Calculating…" : "Calculate"}
      </button>

      {result && (
        <div className="mt-2 p-5 bg-vellum/60 border border-bone rounded-sm">
          <div className="flex items-baseline justify-between mb-5">
            <p className="eyebrow">Fee breakdown · {STATES.find(s => s.code === result.stateCode)?.name}</p>
            <p className="text-xs text-muted">
              on {formatINR(result.declaredValue)}
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Line label={`Stamp duty · ${result.rates.stampDutyPercent}%`} value={formatINR(result.stampDuty)} />
            <Line label={`Reg. fee · ${result.rates.regFeePercent}%`}     value={formatINR(result.registrationFee)} />
            <Line label={`Cess · ${result.rates.cessPercent}%`}           value={formatINR(result.cess)} />
            <Line label="Total payable"                                   value={formatINR(result.totalFees)} highlight />
          </div>

          <p className="text-xs text-muted mt-5 pt-4 border-t border-bone/80">
            Rates sourced from on-chain CircleRateOracle; values update as state governments revise notifications.
          </p>
        </div>
      )}
    </div>
  );
}

function Line({ label, value, highlight }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.18em] text-muted">{label}</p>
      <p className={`font-serif text-xl font-semibold tracking-tightest mt-1 ${highlight ? 'text-land-700' : 'text-ink'}`}>
        {value}
      </p>
    </div>
  );
}
