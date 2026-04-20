# BhuChain — Decentralised Land Registry

A full-stack decentralised application that models India's land-titling
workflow on Ethereum. Four modular smart contracts, an off-chain oracle
backend, and a React client with a public parcel map.

<img alt="Solidity" src="https://img.shields.io/badge/Solidity-0.8.20-171612?style=for-the-badge&logo=solidity&logoColor=FAF7F0">
<img alt="Hardhat" src="https://img.shields.io/badge/Hardhat-viaIR-F9DC5C?style=for-the-badge">
<img alt="React" src="https://img.shields.io/badge/React-18-1F5D4C?style=for-the-badge&logo=react&logoColor=FAF7F0">
<img alt="Ethers" src="https://img.shields.io/badge/Ethers-v6-171612?style=for-the-badge">
<img alt="License" src="https://img.shields.io/badge/license-MIT-C87A2F?style=for-the-badge">

---

## Why

Land titling in India is paper-heavy, mutation (Dakhil Kharij) takes
weeks, and disputes often surface only *after* a transfer. BhuChain puts
the Record of Rights, the encumbrance certificate, the stamp-duty ledger
and the multi-department approval chain on one public ledger — and lets
any citizen verify title instantly.

## Architecture

### Smart contracts (four, modular)

| Contract | Responsibility |
| --- | --- |
| `UserRegistry` | Role-gated registration (Seller, Buyer, Patwari, Survey Officer, Sub-Registrar) |
| `AadhaarOracle` | On-chain intent + off-chain OTP confirmation; stores `keccak256(aadhaar)` only |
| `CircleRateOracle` | Government circle rates per state / district; drives undervaluation detection |
| `LandRegistry v3` | Parcel storage, 10-step `LandStatus` machine, 3-signature transfer, disputes, on-chain Dakhil Kharij |

**State machine (LandStatus):**
`REGISTERED → VERIFIED → FOR_SALE → BUYER_REQUESTED → REVENUE_APPROVED → SURVEY_APPROVED → PAYMENT_PENDING → PAYMENT_DONE → TRANSFER_FINAL → MUTATION_COMPLETE`

**Encumbrance:** `Clear | Disputed | Mortgaged | CourtOrder`. Any
KYC-verified citizen can flag a dispute, which freezes every transfer
action until the Sub-Registrar records a resolution on-chain.

### Oracle backend

An Express server on `:3001` that simulates Aadhaar OTP delivery,
serves stamp-duty / registration-fee / cess breakdowns per state, and
exposes circle-rate lookups. Every answer is deterministic and
auditable; nothing on-chain is taken on trust.

### Client

React 18 + Ethers v6 + Tailwind + Leaflet + Pinata IPFS. Five
role-gated dashboards, a public parcel search with a monochrome map,
and tooling pages (stamp-duty calculator, encumbrance certificate
generator, dispute filing). The design system lives under
`client/src/index.css` and `client/tailwind.config.js`.

## Features

- **ULPIN** auto-generation, aligned with India's 2025 Unique Land Parcel ID standard.
- **Aadhaar KYC oracle** — OTP confirmation off-chain, hash binding on-chain.
- **Stamp duty** with itemised breakdown (duty · reg. fee · cess) and circle-rate-based undervaluation flagging.
- **Three-signature transfer**: Patwari (revenue) → Survey Officer (GPS) → Sub-Registrar (finalisation).
- **On-chain Dakhil Kharij** (mutation) as a dedicated post-finalisation step.
- **Encumbrance Certificate** generator — rebuilds title and dispute history from chain events, prints as PDF.
- **Dispute / freeze mechanism** open to any KYC-verified citizen.
- **Public Leaflet map** with diamond markers colour-coded by status and encumbrance.
- **IPFS** (Pinata) for sale deeds and payment proofs.
- **57 Hardhat tests** across all four contracts.

## Quick start

Prerequisites: Node 18+, npm, MetaMask. Hardhat runs a local chain; no
Ganache or Truffle needed.

```bash
# 1. Install dependencies
npm install
cd client && npm install && cd ..
cd oracle && npm install && cd ..

# 2. Start a local chain (in its own terminal)
npx hardhat node

# 3. Deploy contracts (in a second terminal)
npx hardhat run scripts/deploy.js --network localhost

# 4. Start the oracle backend (in a third terminal)
cd oracle && npm start

# 5. Start the client (in a fourth terminal)
cd client && npm start
```

Point MetaMask at `http://127.0.0.1:8545` (chain ID 31337) and import
one of the Hardhat-provided private keys.

## Repository layout

```
contracts/            Solidity sources (UserRegistry, AadhaarOracle, CircleRateOracle, LandRegistry)
scripts/              Deployment + seed scripts
test/                 57 Hardhat tests
oracle/               Express oracle backend (:3001)
client/               React 18 frontend
hardhat.config.js     Solidity 0.8.20, viaIR enabled
```

## Testing

```bash
npx hardhat test
```

## License

MIT — see `LICENSE`.
