# Setup & Run Guide — BhuChain Land Registration DApp

> **Stack:** Hardhat · Solidity 0.8.20 · React 18 · Tailwind CSS · Ethers.js v6 · MetaMask · Pinata IPFS · Node.js/Express Oracle  
> **Contracts:** UserRegistry · AadhaarOracle · CircleRateOracle · LandRegistry

---

## Prerequisites

Install these once on your machine if not already present.

### 1. Node.js (v18 or v20 LTS)

Download from [nodejs.org](https://nodejs.org/).

```bash
node -v   # should print v18.x or v20.x
npm -v    # should print 9.x or 10.x
```

### 2. MetaMask Browser Extension

Install from [metamask.io](https://metamask.io/) in Chrome, Brave, or Firefox.

### 3. Pinata Account (free — for IPFS document uploads)

Sign up at [app.pinata.cloud](https://app.pinata.cloud).

1. Go to **API Keys** → **New Key**
2. Enable **pinFileToIPFS**
3. Copy the **API Key** and **Secret Key**
4. Paste them into `client/.env` (Step 5 below)

---

## One-Time Project Setup

### Step 1 — Install dependencies (3 directories)

```bash
# Project root (Hardhat)
npm install

# Client (React frontend)
cd client
npm install
cd ..

# Oracle backend
cd oracle
npm install
cd ..
```

### Step 2 — Compile the smart contracts

```bash
npm run compile
```

You should see:
```
Compiled 4 Solidity files successfully
```

### Step 3 — Configure environment files

#### Oracle backend (`oracle/.env`)

The oracle server needs a private key to call on-chain functions. By default, it uses Account #1 from Hardhat's test accounts:

```bash
# oracle/.env (pre-configured with Account #1's key)
ORACLE_PRIVATE_KEY=0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d
RPC_URL=http://127.0.0.1:8545
ORACLE_PORT=3001
```

#### Client (`client/.env`)

```bash
# client/.env
REACT_APP_PINATA_API_KEY=your_pinata_api_key_here
REACT_APP_PINATA_SECRET_KEY=your_pinata_secret_key_here
REACT_APP_ORACLE_URL=http://localhost:3001
```

---

## Every Time You Start the Project

You need **4 terminals** open simultaneously.

### Terminal 1 — Start the Hardhat local blockchain

```bash
npm run node
```

This starts a local Ethereum node on `http://127.0.0.1:8545`.  
It prints 20 test accounts with private keys. **Keep this running.**

> Account #0 is the deployer/admin. Account #1 is the oracle backend.

### Terminal 2 — Deploy the contracts

```bash
npm run deploy
```

This deploys all 4 contracts:
1. **UserRegistry** — User registration + KYC
2. **AadhaarOracle** — Oracle-based KYC verification
3. **CircleRateOracle** — District rates + stamp duty (seeded with test data)
4. **LandRegistry** — Core land registry with multi-dept workflow

Addresses are saved to `client/src/config/deployedContracts.json`.

### Terminal 3 — Start the Oracle backend

```bash
cd oracle
npm start
```

Server starts on `http://localhost:3001` with endpoints:
- `POST /verify-aadhaar` — Start KYC verification
- `POST /confirm-otp` — Confirm OTP + on-chain verification
- `GET /circle-rate` — Circle rate lookup
- `GET /stamp-duty` — Stamp duty calculator
- `GET /test-identities` — List test Aadhaar numbers

### Terminal 4 — Start the React frontend

```bash
cd client
npm start
```

Browser opens at `http://localhost:3000`.

---

## MetaMask Setup (One Time)

### Add the Hardhat Local Network

| Field         | Value                   |
|---------------|-------------------------|
| Network Name  | Hardhat Local           |
| New RPC URL   | `http://127.0.0.1:8545` |
| Chain ID      | `31337`                 |
| Currency Symbol | ETH                   |

### Import Test Accounts

From Terminal 1 output:

| Account | Role | Usage |
|---------|------|-------|
| #0 | Admin/Deployer | Deploy contracts, manual admin ops |
| #1 | Oracle Backend | Used by oracle server (do NOT use in MetaMask) |
| #2 | Seller | Register and sell land |
| #3 | Buyer | Browse and purchase land |
| #4 | Patwari | Revenue dept official |
| #5 | Survey Officer | Survey dept official |
| #6 | Sub-Registrar | Registration dept official |

---

## Complete Demo Walkthrough (10-Step Transfer)

### Setup

Import Accounts #2–#6 into MetaMask. Register each with their respective role at `/register`.

### Step 1 — Register Users & KYC

1. Switch to **Account #2** → Register as **Seller**
2. On dashboard, use **Aadhaar KYC** panel → enter test number (e.g. `123456789012`) → get OTP → verify
3. Repeat for **Account #3** as **Buyer**
4. Register **Account #4** as **Patwari**, **#5** as **Survey Officer**, **#6** as **Sub-Registrar**
5. KYC-verify each (or use admin manual KYC for officials)

**Test Aadhaar numbers:** `123456789012`, `234567890123`, `345678901234`, etc.

### Step 2 — Seller: Register Land

1. Switch to **Account #2** (Seller) → click **+ Add Land**
2. Fill in state (RJ/MH/KA), district, tehsil, survey number, area, GPS, value
3. Upload a sample PDF → **Register Land**

### Step 3 — Patwari: Verify Land

1. Switch to **Account #4** (Patwari) → **Verify Lands** tab → **Verify Land**

### Step 4 — Buyer: Request Transfer

1. Switch to **Account #3** (Buyer) → **Browse Lands** → **Request Purchase**

### Step 5 — Seller: Approve Request

1. Switch to **Account #2** → **Incoming Requests** → **Approve**

### Step 6 — Patwari: Revenue Approval (1st)

1. Switch to **Account #4** → **Approvals** tab → **Approve (Revenue)**

### Step 7 — Survey Officer: Survey Approval (2nd)

1. Switch to **Account #5** (Survey Officer) → **Approve (Survey)**

### Step 8 — Buyer: Upload Payment Proof

1. Switch to **Account #3** → **My Requests** → **Upload Payment Proof**

### Step 9 — Seller: Acknowledge Payment

1. Switch to **Account #2** → **Acknowledge Payment Received**

### Step 10 — Sub-Registrar: Finalize Transfer

1. Switch to **Account #6** → **Finalize** tab → review stamp duty → **Finalize Transfer**

### Step 11 — Patwari: Complete Mutation (Dakhil Kharij)

1. Switch to **Account #4** → **Mutations** tab → **Complete Mutation (Dakhil Kharij)**
2. Status becomes **Mutation Complete** — buyer is now the owner in both ownership and revenue records

---

## Additional Features

### Interactive Map (`/map`)
- All parcels shown on Leaflet/OpenStreetMap map
- Color-coded: Green (available), Blue (in-progress), Red (disputed)
- Click markers for parcel details

### Tools Page (`/tools`)
- **Stamp Duty Calculator** — Select state + enter value → get breakdown
- **Encumbrance Certificate** — Enter parcel ID → full transfer + dispute history with Print/PDF option
- **Flag Dispute** — Any KYC-verified user can freeze a parcel

---

## Project File Structure

```
Land-Registration-with-Blockchain/
├── contracts/
│   ├── UserRegistry.sol          ← User + KYC management
│   ├── AadhaarOracle.sol         ← Oracle-based Aadhaar KYC
│   ├── CircleRateOracle.sol      ← District rates + stamp duty
│   └── LandRegistry.sol          ← Core registry (v3, multi-dept)
├── scripts/
│   └── deploy.js                 ← Deploys all 4 contracts + seeds data
├── test/
│   ├── UserRegistry.test.js
│   ├── LandRegistry.test.js
│   ├── AadhaarOracle.test.js
│   └── CircleRateOracle.test.js
├── oracle/
│   ├── server.js                 ← Express backend (KYC + Circle Rates)
│   ├── aadhaarDB.js              ← Pre-seeded test identities
│   ├── .env                      ← Oracle private key
│   └── package.json
├── client/
│   ├── .env.example              ← Template (Pinata + Oracle URL)
│   ├── tailwind.config.js
│   └── src/
│       ├── App.js                ← Router with role-based routing
│       ├── contexts/
│       │   └── Web3Context.jsx   ← MetaMask + all 4 contracts
│       ├── utils/
│       │   ├── contractHelpers.js
│       │   └── pinata.js
│       ├── components/
│       │   ├── Navbar.jsx
│       │   ├── LandCard.jsx
│       │   ├── StatusBadge.jsx
│       │   ├── AadhaarKYC.jsx        ← Oracle KYC flow
│       │   ├── StampDutyCalculator.jsx
│       │   ├── EncumbranceCertificate.jsx
│       │   └── DisputePanel.jsx
│       ├── pages/
│       │   ├── Home.jsx
│       │   ├── RegisterUser.jsx
│       │   ├── SellerDashboard.jsx
│       │   ├── BuyerDashboard.jsx
│       │   ├── PatwariDashboard.jsx      ← Revenue Dept
│       │   ├── SurveyDashboard.jsx       ← Survey Dept
│       │   ├── SubRegistrarDashboard.jsx ← Registration Dept
│       │   ├── PublicLandSearch.jsx       ← Map view
│       │   └── ToolsPage.jsx            ← Stamp duty, EC, disputes
│       ├── config/
│       │   └── deployedContracts.json
│       └── artifacts/
│           ├── UserRegistry.json
│           ├── LandRegistry.json
│           ├── AadhaarOracle.json
│           └── CircleRateOracle.json
├── package.json
├── hardhat.config.js
├── stage.md
├── setup.md                      ← This file
└── updatedGuide.md               ← PRD
```

---

## Running Tests

```bash
npm test
```

Runs 57 tests across all 4 contracts:
- UserRegistry: registration, KYC, role assignment
- LandRegistry: full 10-step workflow, dispute management, view functions
- AadhaarOracle: oracle pattern, onlyOracle modifier
- CircleRateOracle: rates, stamp duty calculation, undervaluation detection

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "Wrong network" | Switch MetaMask to Hardhat Local (Chain ID 31337) |
| "Contracts not loaded" | Run `npm run deploy` after `npm run node` |
| MetaMask shows 0 ETH | Import a test account private key from `npm run node` |
| KYC oracle fails | Start oracle backend: `cd oracle && npm start` |
| Pinata upload fails | Check `client/.env` has correct API keys; restart `npm start` |
| `npm install` fails in client/ | Try `npm install --legacy-peer-deps` |
| Port 3000 already in use | Set `PORT=3001 npm start` |
| Nonce too high | MetaMask → Settings → Advanced → Clear activity tab data |
| Stack too deep compilation | `viaIR: true` is already configured in hardhat.config.js |
