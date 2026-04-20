# Project Stage Plan: Decentralized Land Registration System

> Based on PRD: `updatedGuide.md`  
> Tech Stack: Hardhat · Solidity ^0.8.20 · React 18 · Tailwind CSS · Ethers.js v6 · IPFS (Pinata) · Node.js + Express (Oracle)

---

## Overview

The project is divided into **4 stages**, each producing a working, demo-able increment. Each stage builds on the previous one without breaking existing functionality.

| Stage | Theme | Contracts | Frontend | Oracle |
|-------|-------|-----------|----------|--------|
| 1 | Core Foundation | UserRegistry + LandRegistry v1 | 3 dashboards, wallet connect, IPFS | None |
| 2 | Multi-Dept Workflow + KYC | LandRegistry v2 (multi-sig), AadhaarOracle | 5 dashboards, approval chain, OTP | Aadhaar mock |
| 3 | Mutation + Disputes + Circle Rates | LandRegistry v3, CircleRateOracle | Stamp duty UI, EC generator | Circle Rate mock |
| 4 | Map + Polish + Tests | No new contracts | Leaflet map, ULPIN, PDF download, full polish | Both oracles |

---

## Stage 1 — Core Foundation ✅

**Goal:** End-to-end demo where a seller registers land, a buyer requests it, an admin approves, and ownership updates on-chain. Single-admin model (no multi-department split yet).

### Contracts
- [x] **`UserRegistry.sol`** — User registration with Role enum (`Seller`, `Buyer`, `Patwari`, `SurveyOfficer`, `SubRegistrar`), KYC status (manually set by admin), keccak256 Aadhaar hash storage.
- [x] **`LandRegistry.sol` (v1)** — Full state machine (`REGISTERED → VERIFIED → REQUEST_PENDING → SELLER_APPROVED → SURVEY_APPROVED → PAYMENT_UPLOADED → PAYMENT_CONFIRMED → MUTATION_COMPLETE`). Single admin handles all approval steps. ULPIN generation (`STATE-DISTRICT-NNNNNN`). IPFS CID storage.

### Frontend
- [x] MetaMask wallet connection
- [x] User registration page (name, email, phone, role selection)
- [x] **Seller Dashboard** — Add land form (state, district, tehsil, survey number, area, GPS coords, IPFS document upload), My Lands list, Incoming requests, Payment acknowledgment
- [x] **Buyer Dashboard** — Land gallery (verified lands), Send transfer request, Track request status, Upload payment proof
- [x] **Admin Dashboard** — Pending KYC verifications (mark verified), Pending land verifications, Pending admin approvals, Finalize completed transfers

### Backend / Oracle
- None (admin manually handles KYC in Stage 1)

### Hardhat Setup
- [x] `package.json` (root) with Hardhat + toolbox
- [x] `hardhat.config.js` — local network on port 8545, chainId 31337, artifacts exported to `client/src/artifacts/`
- [x] `scripts/deploy.js` — deploys both contracts, writes addresses to `client/src/config/deployedContracts.json`

### What Stage 1 Demonstrates
- DApp architecture (wallet → contract → frontend)
- User role management and KYC gating
- Land registration with IPFS document upload
- 8-step transfer workflow (simplified single-admin)
- State machine with enum-based status
- Event emission and on-chain audit trail

---

## Stage 2 — Multi-Department Workflow + KYC Oracle ✅

**Goal:** Upgrade from single-admin to three-department approval chain. Add Aadhaar KYC oracle. This is where the project diverges from all existing open-source implementations.

### Contracts
- [x] **`LandRegistry.sol` (v2)** — Refactor: split `approveTransferAsAdmin()` into `approveAsPatwari()`, `approveAsSurveyOfficer()`, `finalApproval()`. Add role modifiers: `onlyPatwari`, `onlySurveyOfficer`, `onlySubRegistrar`. Enforce sequential approval order. Emit per-department events.
- [x] **`AadhaarOracle.sol`** — Oracle pattern: backend calls `confirmVerification(wallet)`. Stores `keccak256(aadhaar)` on-chain. `onlyOracle` modifier restricts who can call it.

### Frontend
- [x] Three separate official dashboards: **Patwari**, **Survey Officer**, **Sub-Registrar** (each sees only their pending items)
- [x] Approval progress bar on Seller + Buyer dashboard (shows which department has approved)
- [x] **Aadhaar KYC flow** — Enter 12-digit Aadhaar → receive OTP → verify → wallet marked KYC-verified on-chain

### Backend / Oracle
- [x] Express server (`oracle/server.js`) — two endpoints:
  - `POST /verify-aadhaar` — accepts `{aadhaarNumber, walletAddress}`, returns simulated OTP
  - `POST /confirm-otp` — verifies OTP, calls `AadhaarOracle.confirmVerification()` on-chain
- [x] Pre-seeded test identity database (≥10 Aadhaar numbers mapped to names)
- [x] OTP stored in-memory, expires after 5 minutes

### What Stage 2 Demonstrates
- Oracle design pattern (Chainlink architecture, same concept)
- Multi-signature approval pattern (three independent parties)
- Privacy-preserving KYC (keccak256 hash, never raw Aadhaar)
- Role-Based Access Control (RBAC) with Solidity modifiers
- Sequential approval enforcement (revert if out of order)

---

## Stage 3 — On-Chain Mutation + Disputes + Circle Rate Oracle ✅

**Goal:** Add the novel features that distinguish this project: mandatory mutation (2025 reform), dispute/encumbrance system, and circle rate oracle with stamp duty calculator.

### Contracts
- [x] **`LandRegistry.sol` (v3)** — Add:
  - `completeMutation(parcelId)` — Patwari updates Record of Rights, sets `MUTATION_COMPLETE`
  - `flagDispute(parcelId, reason)` — any KYC-verified user can freeze a parcel
  - `resolveDispute(parcelId, resolution)` — Sub-Registrar only
  - `onlyClearEncumbrance` modifier on all transfer functions
  - `getEncumbranceHistory(parcelId)` — returns `TransferRecord[]` + `DisputeRecord[]`
  - `recordOfRights` mapping (separate from `owner` — Revenue dept's record)
  - `TransferRecord` and `DisputeRecord` structs added to parcel struct
- [x] **`CircleRateOracle.sol`** — `mapping(bytes32 => uint256)` keyed by `keccak256(stateCode+districtCode)`. `updateCircleRate()` (oracle only), `getCircleRate()`, `calculateStampDuty()` returning struct with stampDuty, registrationFee, cess, totalFees (all in paisa).

### Frontend
- [x] **Stamp Duty Calculator** — Input state + sale amount → show breakdown (duty + fee + cess in INR)
- [x] **Undervaluation Warning** — Sub-Registrar dashboard shows warning if declared value < circle rate
- [x] **Dispute Panel** — Any user can flag a dispute; Sub-Registrar dashboard has resolution UI
- [x] **Encumbrance Certificate** — On-chain query shows full transfer + dispute history; "Download as PDF" option
- [x] Patwari mutation step — Separate button for `completeMutation` after Sub-Registrar approval

### Backend / Oracle
- [x] `GET /circle-rate` endpoint — serves mock district rates for Rajasthan, Maharashtra, Karnataka
- [x] Circle rate seeding script — populates oracle contract with test data

### What Stage 3 Demonstrates
- On-chain Mutation (Dakhil Kharij) — 2025 India reform, no existing open-source project has this
- Guard/Modifier pattern (`onlyClearEncumbrance`)
- Second oracle (Circle Rate) demonstrating oracle reusability
- State-wise stamp duty calculation with real INR rates
- Encumbrance Certificate replacing 30-day manual government process
- Dispute mechanism with automatic transfer freeze

---

## Stage 4 — Map Visualization + UI Polish + Tests ✅

**Goal:** Complete the visual showcase features (Leaflet map, ULPIN display, EC PDF), polish the UI for demo readiness, and write comprehensive Hardhat tests.

### Contracts
- [x] No new contracts. Minor cleanup: add `NatSpec` comments, optimize gas, run `hardhat test` suite.

### Frontend
- [x] **Leaflet.js Map** (`react-leaflet`) — All parcels rendered as color-coded markers:
  - Green: `MUTATION_COMPLETE` (available)
  - Blue: Any in-progress state (`REQUEST_PENDING` → `TRANSFER_COMPLETE`)
  - Red: `encumbrance != Clear`
  - Click marker → popup with ULPIN, owner, area, status, link to documents
- [x] ULPIN displayed prominently on all land cards and parcel detail pages
- [x] **Encumbrance Certificate PDF** — `react-to-pdf` or `jsPDF` renders formatted EC from on-chain data
- [x] **Payment proof upload flow** — Drag-and-drop receipt upload to IPFS, display linked from Patwari/Sub-Registrar dashboard
- [x] Full responsive design (mobile-friendly Tailwind breakpoints)
- [x] Loading states, skeleton loaders, error boundaries, MetaMask error handling
- [x] Transaction confirmation modals (show tx hash, link to block explorer)
- [x] End-to-end demo mode: one-click seeder script that pre-populates test data

### Testing
- [x] `test/UserRegistry.test.js` — registration, role assignment, KYC gating
- [x] `test/LandRegistry.test.js` — full 10-step workflow, state machine transitions, encumbrance guards, access control
- [x] `test/AadhaarOracle.test.js` — oracle call pattern, onlyOracle modifier
- [x] `test/CircleRateOracle.test.js` — rate updates, stamp duty calculation, undervaluation detection
- [x] Integration test: full transfer from registration to mutation completion

### What Stage 4 Demonstrates
- Interactive geospatial visualization (Leaflet + OpenStreetMap)
- ULPIN as a digital land parcel identifier (conceptually similar to NFT tokenId)
- Comprehensive Hardhat test coverage
- Production-quality UI/UX design
- Complete demo flow for course presentation

---

## Cross-Stage Architecture Notes

### Contract Upgradeability Strategy
- Stage 1 → Stage 2: `LandRegistry` is redeployed; `UserRegistry` remains unchanged
- Stage 2 → Stage 3: `LandRegistry` redeployed; `AadhaarOracle` remains unchanged; `CircleRateOracle` added
- Stage 3 → Stage 4: No contract changes; only frontend and tests

### Key Design Patterns (PRD Section 8)
| Pattern | Introduced In |
|---------|--------------|
| State Machine | Stage 1 |
| Role-Based Access Control (RBAC) | Stage 1 |
| Event Emission | Stage 1 |
| Oracle Pattern | Stage 2 |
| Multi-Signature | Stage 2 |
| Guard Modifier | Stage 3 |

### File Layout (Final)
```
Land-Registration-with-Blockchain/
├── contracts/
│   ├── UserRegistry.sol          # Stage 1
│   ├── LandRegistry.sol          # Updated each stage
│   ├── AadhaarOracle.sol         # Stage 2
│   └── CircleRateOracle.sol      # Stage 3
├── scripts/
│   ├── deploy.js                 # Main deploy script
│   └── seedTestData.js           # Stage 4 demo seeder
├── test/
│   ├── UserRegistry.test.js      # Stage 4
│   ├── LandRegistry.test.js      # Stage 4
│   ├── AadhaarOracle.test.js     # Stage 4
│   └── CircleRateOracle.test.js  # Stage 4
├── oracle/                       # Stage 2
│   ├── server.js
│   ├── aadhaarDB.js
│   └── package.json
├── client/
│   ├── src/
│   │   ├── artifacts/            # Auto-generated by Hardhat
│   │   ├── config/
│   │   │   └── deployedContracts.json
│   │   ├── contexts/
│   │   │   └── Web3Context.jsx
│   │   ├── utils/
│   │   │   ├── contractHelpers.js
│   │   │   └── pinata.js
│   │   ├── components/
│   │   │   ├── Navbar.jsx
│   │   │   ├── Sidebar.jsx
│   │   │   ├── StatusBadge.jsx
│   │   │   └── LandCard.jsx
│   │   └── pages/
│   │       ├── Home.jsx
│   │       ├── RegisterUser.jsx
│   │       ├── SellerDashboard.jsx
│   │       ├── BuyerDashboard.jsx
│   │       └── AdminDashboard.jsx
│   │       # Stage 2+:
│   │       ├── PatwariDashboard.jsx
│   │       ├── SurveyDashboard.jsx
│   │       ├── SubRegistrarDashboard.jsx
│   │       # Stage 3+:
│   │       └── PublicLandSearch.jsx
│   └── package.json
├── package.json                  # Hardhat root
├── hardhat.config.js
├── stage.md                      # This file
├── setup.md
└── updatedGuide.md               # PRD
```
