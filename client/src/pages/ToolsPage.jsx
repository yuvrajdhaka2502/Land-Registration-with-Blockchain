import React, { useState } from 'react';
import Navbar from '../components/Navbar';
import StampDutyCalculator from '../components/StampDutyCalculator';
import EncumbranceCertificate from '../components/EncumbranceCertificate';
import DisputePanel from '../components/DisputePanel';
import { PageHeader, Tabs } from '../components/DashboardChrome';
import { useWeb3 } from '../contexts/Web3Context';

export default function ToolsPage() {
  const { currentUser } = useWeb3();
  const [tab, setTab] = useState('stamp');

  const tabs = [
    { id: 'stamp', label: 'Stamp duty calculator' },
    { id: 'ec',    label: 'Encumbrance certificate' },
    ...(currentUser?.isKYCVerified ? [{ id: 'dispute', label: 'Flag a dispute' }] : []),
  ];

  return (
    <div className="min-h-screen bg-paper flex flex-col">
      <Navbar />
      <div className="max-w-5xl mx-auto w-full px-6 sm:px-10 py-10">
        <PageHeader
          eyebrow="Public utilities"
          title="Tools"
          subtitle="Public utilities powered by on-chain data and the Circle Rate Oracle. Instant, tamper-proof, citizen-facing."
        />
        <Tabs items={tabs} active={tab} onChange={setTab} />

        {tab === 'stamp'   && <StampDutyCalculator />}
        {tab === 'ec'      && <EncumbranceCertificate />}
        {tab === 'dispute' && <DisputePanel />}
      </div>
    </div>
  );
}
