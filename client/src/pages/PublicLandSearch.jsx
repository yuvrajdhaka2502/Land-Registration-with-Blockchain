import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useWeb3 } from '../contexts/Web3Context';
import Navbar from '../components/Navbar';
import { LandStatusBadge, EncumbranceBadge } from '../components/StatusBadge';
import { Spinner } from '../components/DashboardChrome';
import { parseLandParcel, formatINR, formatCoord, shortAddress } from '../utils/contractHelpers';
import { getIPFSUrl } from '../utils/pinata';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Earthy palette aligned with parchment aesthetic
const STATUS_MARKER_COLOR = (status, encumbrance) => {
  if (encumbrance !== 0)          return '#B33A3A'; // rose2 — disputed
  if (status === 9 || status === 1) return '#1F5D4C'; // land-600 — available / mutated
  return '#C87A2F';                                 // clay-400 — in progress
};

export default function PublicLandSearch() {
  const { landRegistry } = useWeb3();

  const [parcels,  setParcels]  = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');
  const mapRef      = useRef(null);
  const mapInstance = useRef(null);
  const markersRef  = useRef([]);

  const loadParcels = useCallback(async () => {
    if (!landRegistry) return;
    try {
      setLoading(true);
      setParcels((await landRegistry.getAllParcels()).map(parseLandParcel));
    } catch (err) { console.error('loadParcels:', err); }
    finally { setLoading(false); }
  }, [landRegistry]);

  useEffect(() => { loadParcels(); }, [loadParcels]);

  useEffect(() => {
    if (mapInstance.current || !mapRef.current) return;

    const map = L.map(mapRef.current, { zoomControl: true }).setView([22.9734, 78.6569], 5);
    // Use a muted Stamen-toner-style tile for editorial feel (CartoDB positron-like monochrome)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap &middot; &copy; CARTO',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png', {
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map);

    mapInstance.current = map;
    return () => { map.remove(); mapInstance.current = null; };
  }, []);

  useEffect(() => {
    if (!mapInstance.current) return;
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    parcels.forEach(p => {
      const lat = p.latitude / 1_000_000;
      const lng = p.longitude / 1_000_000;
      if (lat === 0 && lng === 0) return;

      const color = STATUS_MARKER_COLOR(p.status, p.encumbrance);
      const icon = L.divIcon({
        html: `<div style="
          width: 12px; height: 12px;
          background: ${color};
          border: 2px solid #FAF7F0;
          border-radius: 1px;
          transform: rotate(45deg);
          box-shadow: 0 0 0 1px rgba(23,22,18,0.4);
        "></div>`,
        className: '',
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });

      const marker = L.marker([lat, lng], { icon })
        .addTo(mapInstance.current)
        .on('click', () => setSelected(p));

      marker.bindTooltip(p.ulpin, {
        direction: 'top', offset: [0, -10],
        className: 'font-mono text-[11px]',
      });
      markersRef.current.push(marker);
    });
  }, [parcels]);

  const filtered = parcels.filter(p => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      p.ulpin.toLowerCase().includes(q) ||
      p.stateCode.toLowerCase().includes(q) ||
      p.districtCode.toLowerCase().includes(q) ||
      p.tehsil.toLowerCase().includes(q) ||
      p.surveyNumber.toLowerCase().includes(q) ||
      p.owner.toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-paper flex flex-col">
      <Navbar />
      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Map */}
        <div className="lg:flex-1 h-[50vh] lg:h-auto relative">
          <div ref={mapRef} className="w-full h-full" />

          <div className="absolute bottom-4 left-4 bg-paper/95 backdrop-blur border border-bone rounded-sm p-4 z-[1000] shadow-deed">
            <p className="eyebrow mb-3">Legend</p>
            <div className="space-y-1.5">
              {[
                { color: '#1F5D4C', label: 'Available / mutated' },
                { color: '#C87A2F', label: 'Transfer in progress' },
                { color: '#B33A3A', label: 'Disputed / encumbered' },
              ].map(({ color, label }) => (
                <div key={color} className="flex items-center gap-2">
                  <span style={{ background: color }} className="w-2.5 h-2.5 inline-block rotate-45 border border-paper shadow-[0_0_0_1px_rgba(23,22,18,0.4)]" />
                  <span className="text-xs text-slate2">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <aside className="lg:w-[380px] border-l border-bone bg-paper overflow-y-auto" style={{ maxHeight: 'calc(100vh - 64px)' }}>
          <div className="p-5 border-b border-bone">
            <p className="eyebrow mb-3">Registry</p>
            <h2 className="font-serif text-2xl font-semibold text-ink tracking-tightest leading-tight">
              Every parcel, publicly searchable.
            </h2>
            <input
              className="input mt-4"
              placeholder="ULPIN, location, or owner…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <p className="text-xs text-muted mt-2">{filtered.length} parcel{filtered.length === 1 ? '' : 's'} matched</p>
          </div>

          {selected && (
            <div className="p-5 border-b border-bone bg-vellum/60 animate-rise">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="chip-ulpin">{selected.ulpin}</p>
                  <p className="text-xs text-slate2 mt-2">Survey <span className="font-mono text-ink">{selected.surveyNumber}</span></p>
                </div>
                <button onClick={() => setSelected(null)} className="text-muted hover:text-ink text-xl leading-none px-1">&times;</button>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <Cell k="Status"      v={<LandStatusBadge status={selected.status} />} />
                <Cell k="Encumbrance" v={<EncumbranceBadge encumbrance={selected.encumbrance} />} />
                <Cell k="Location"    v={`${selected.stateCode} · ${selected.districtCode}, ${selected.tehsil}`} />
                <Cell k="Area"        v={`${selected.areaInSqFt.toLocaleString('en-IN')} sq·ft`} />
                <Cell k="Value"       v={<span className="font-serif text-ink font-semibold">{formatINR(selected.declaredValue)}</span>} />
                <Cell k="Owner"       v={<span className="font-mono text-[11px] text-ink">{shortAddress(selected.owner)}</span>} />
                <Cell k="GPS"         v={<span className="font-mono text-[11px] text-ink">{formatCoord(selected.latitude)}, {formatCoord(selected.longitude)}</span>} colSpan />
              </div>
              {selected.saleDeedCid && (
                <a href={getIPFSUrl(selected.saleDeedCid)} target="_blank" rel="noreferrer"
                   className="inline-flex items-center gap-1 text-xs text-land-700 border-b border-land-700/30 hover:text-land-800 mt-4 pb-0.5">
                  Sale deed on IPFS
                </a>
              )}
            </div>
          )}

          <div className="divide-y divide-bone/60">
            {loading ? <Spinner size={6} /> : filtered.length === 0 ? (
              <div className="text-center py-16 text-slate2 text-sm">No parcels match.</div>
            ) : (
              filtered.map(p => (
                <button
                  key={p.id}
                  onClick={() => {
                    setSelected(p);
                    const lat = p.latitude / 1_000_000;
                    const lng = p.longitude / 1_000_000;
                    if (mapInstance.current && (lat !== 0 || lng !== 0)) {
                      mapInstance.current.setView([lat, lng], 14);
                    }
                  }}
                  className={`w-full text-left px-5 py-4 hover:bg-vellum/60 transition-colors ${
                    selected?.id === p.id ? 'bg-vellum/80' : ''
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="chip-ulpin">{p.ulpin}</span>
                    <LandStatusBadge status={p.status} />
                  </div>
                  <p className="text-xs text-slate2 mt-1.5">
                    {p.stateCode}-{p.districtCode} · {p.areaInSqFt.toLocaleString('en-IN')} sq·ft ·
                    {' '}<span className="text-ink">{formatINR(p.declaredValue)}</span>
                  </p>
                </button>
              ))
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

function Cell({ k, v, colSpan }) {
  return (
    <div className={colSpan ? 'col-span-2' : ''}>
      <p className="text-[10px] uppercase tracking-[0.18em] text-muted">{k}</p>
      <div className="mt-0.5 text-ink text-sm">{v}</div>
    </div>
  );
}
