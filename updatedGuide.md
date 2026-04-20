# Product Requirements Document: Decentralized Land Registration System for India

> **Project Type:** Decentralized Application (DApp)  
> **Demonstration:** Localhost (Hardhat)  
> **Blockchain:** Ethereum (Hardhat local network)  
> **Smart Contracts:** Solidity ^0.8.x  
> **Frontend:** React.js + Tailwind CSS  
> **Document Storage:** IPFS via Pinata (free tier)  
> **Wallet:** MetaMask  
> **Maps:** Leaflet.js + OpenStreetMap  

**Document Purpose:** This PRD serves as the single source of truth for the project's scope, architecture, features, and implementation plan. It is written for the course professor (to evaluate novelty and course-topic coverage) and for all team members (to understand what we are building, why each feature exists, and how the system fits together). AI coding agents should use this document to understand the full context of the project before generating or modifying any code.

---

## Table of Contents

1. [The Problem: Why This Project Exists](#1-the-problem-why-this-project-exists)
2. [How Land Registration Actually Works in India (2025)](#2-how-land-registration-actually-works-in-india-2025)
3. [What This DApp Does Differently](#3-what-this-dapp-does-differently)
4. [System Architecture](#4-system-architecture)
5. [User Roles and Personas](#5-user-roles-and-personas)
6. [Complete Transfer Workflow (The Core Transaction)](#6-complete-transfer-workflow-the-core-transaction)
7. [Feature Specifications](#7-feature-specifications)
   - 7.1 [Simulated Aadhaar KYC (Oracle Pattern)](#71-simulated-aadhaar-kyc-oracle-pattern)
   - 7.2 [Multi-Department Approval Chain](#72-multi-department-approval-chain)
   - 7.3 [On-Chain Mutation (Dakhil Kharij)](#73-on-chain-mutation-dakhil-kharij)
   - 7.4 [ULPIN with Map Visualization](#74-ulpin-with-map-visualization)
   - 7.5 [Encumbrance Certificate Generator](#75-encumbrance-certificate-generator)
   - 7.6 [Circle Rate Oracle and Stamp Duty Calculator](#76-circle-rate-oracle-and-stamp-duty-calculator)
   - 7.7 [Dispute Flagging and Encumbrance Status](#77-dispute-flagging-and-encumbrance-status)
   - 7.8 [IPFS Document Storage](#78-ipfs-document-storage)
8. [Smart Contract Architecture](#8-smart-contract-architecture)
9. [Technology Stack (Detailed)](#9-technology-stack-detailed)
10. [Course Topics Addressed](#10-course-topics-addressed)
11. [What Makes This Different from Existing Projects](#11-what-makes-this-different-from-existing-projects)
12. [Development Phases and Timeline](#12-development-phases-and-timeline)
13. [Future Enhancements](#13-future-enhancements)

---

## 1. The Problem: Why This Project Exists

Land ownership disputes are the single largest category of civil litigation in India. According to NITI Aayog, approximately **66% of all civil court cases** in the country are related to land and property. These cases take an average of **20 years** to resolve, affecting an estimated 10.5 million people and endangering investments valued at over ₹3.45 trillion. The Supreme Court of India, in the *Samiullah v. State of Bihar* case, specifically recommended exploring blockchain technology to create secure, transparent, and tamper-proof land records.

The root cause is structural: India's land administration is split across **three separate government departments** (Revenue, Survey & Settlement, and Registration) that operate in silos with their own databases. A sale deed registered at the Sub-Registrar's office may never get reflected in the Revenue department's Record of Rights, creating a gap that enables fraud, double-selling, and Benami (proxy ownership) transactions. The government's Digital India Land Records Modernization Programme (DILRMP) has digitized 95% of Record of Rights, but digitization alone does not solve the trust problem between departments that do not share a common ledger.

This project builds a working prototype of what a blockchain-based solution looks like: a shared, immutable ledger where all three departments operate on the same data, every action is auditable, and the registration-to-mutation pipeline is atomic rather than fragmented across offices.

---

## 2. How Land Registration Actually Works in India (2025)

Understanding the current system is essential for understanding why each feature in this DApp exists. The following is the actual step-by-step process a citizen goes through to buy land in India today:

### Step 1: Title Verification

The buyer (or their lawyer) obtains an Encumbrance Certificate (EC) from the Sub-Registrar's office, covering the past 13–30 years. They verify the seller's chain of ownership, check for pending litigation, and confirm there are no mortgages or liens. This step alone can take 15–30 days.

### Step 2: Sale Deed Drafting

A lawyer prepares the sale deed containing property details (survey number, area, boundaries, GPS coordinates where available), the agreed sale price, and terms. Both parties review and agree.

### Step 3: Stamp Duty Payment

The buyer pays stamp duty (3–10% of market value, varying by state) and registration fee (~1%) online or at a bank. E-stamp paper is purchased. The government's circle rate (minimum benchmark value per locality) determines the minimum taxable value.

### Step 4: Registration at Sub-Registrar

Both buyer and seller, plus two witnesses, visit the Sub-Registrar's office. Aadhaar-based biometric verification is conducted. Documents are submitted and the sale deed is registered. The Sub-Registrar issues a registered sale deed within 2–7 days.

### Step 5: Mutation (Dakhil Kharij)

This is the critical step most buyers historically skipped. From 2025, it is mandatory. The buyer applies at the Tehsil/Revenue office to have their name entered into the Record of Rights (RoR / Khatauni), replacing the seller's name. The Patwari/Lekhpal conducts a field inspection, and the Tehsildar approves the mutation. Until this is done, the seller's name persists in revenue records, enabling potential resale fraud. This takes 30–45 days.

> **The Critical Gap:** Registration (Step 4) and Mutation (Step 5) happen in different departments, different offices, different databases, and often weeks apart. This gap is where most land fraud occurs. Our DApp makes these steps happen on a single shared ledger, with mutation as an explicit on-chain step that must complete before ownership is fully transferred.

---

## 3. What This DApp Does Differently

Several blockchain-based land registration projects exist on GitHub and in academic papers. Nearly all follow the same pattern: a single admin approves transfers, payments are made in ETH, and the interface is a basic CRUD application. This project goes beyond that template in the following ways:

- **Multi-department workflow** — Models India's actual three-department process (Revenue → Survey → Registration) as a multi-signature smart contract pattern, rather than a single admin.

- **On-chain Mutation (Dakhil Kharij)** — Explicitly models the 2025 mandatory mutation reform. Ownership transfer is incomplete until mutation is recorded on-chain, closing the registration-mutation gap that causes real-world fraud. No existing open-source project implements this.

- **Oracle-based Aadhaar KYC** — Implements the oracle design pattern (the same architecture Chainlink uses) for identity verification, with privacy-preserving keccak256 hash storage. The mock backend can be swapped for UIDAI's real API without changing any on-chain code.

- **Circle Rate Oracle with auto-flagging** — A second oracle serves district-level guideline values. The smart contract auto-flags transactions where the declared value is suspiciously below the circle rate, addressing a common tax evasion tactic.

- **Instant Encumbrance Certificate** — Any user can query a parcel's complete transaction history on-chain and get an auto-generated encumbrance report. Replaces the 15–30 day manual process at Sub-Registrar offices.

- **Encumbrance checking with dispute freezing** — Any KYC-verified user can flag a dispute against a parcel, which immediately freezes it from transfers. Only the Sub-Registrar can resolve disputes. A modifier on every transfer function checks status.

- **ULPIN + GPS + interactive map** — Each parcel gets a unique identifier (STATE-DISTRICT-ID format) tagged with GPS coordinates. Leaflet.js map with color-coded markers: green (available), blue (in-progress), red (disputed).

- **State-wise stamp duty calculation** — Actual rates for 3 Indian states (Rajasthan, Maharashtra, Karnataka) with detailed breakdowns of stamp duty, registration fee, and cess in INR.

- **Off-chain payment with on-chain proof** — Mirrors how Indian transactions actually work. Payment via UPI/NEFT/DD, receipt uploaded to IPFS, hash stored on-chain. The Sub-Registrar verifies payment proof, not the payment itself.

- **Modern, accessible UI** — Clean React + Tailwind interface designed for non-technical users. Does not resemble a government portal.

---

## 4. System Architecture

The system follows a 3-tier decentralized architecture with an additional oracle layer for off-chain data integration.

### Tier 1: Frontend (Client Presentation Layer)

Built with React.js and Tailwind CSS. Five role-specific dashboards (Seller, Buyer, Patwari, Survey Officer, Sub-Registrar) plus a public land search/map view. Communicates with the blockchain via Ethers.js v6 and MetaMask. Leaflet.js renders the interactive parcel map using OpenStreetMap tiles.

### Tier 2: Smart Contract Layer (Blockchain)

Four Solidity contracts deployed on a Hardhat local Ethereum network:

- **UserRegistry.sol** — Manages user registration, role assignment (Seller, Buyer, Patwari, Survey Officer, Sub-Registrar), and KYC status. Stores only the keccak256 hash of Aadhaar numbers.

- **AadhaarOracle.sol** — Receives verification callbacks from the off-chain KYC backend. Implements the oracle pattern: the backend calls `confirmVerification(walletAddress)` after simulated Aadhaar OTP validation.

- **LandRegistry.sol** — The core contract. Handles land registration, transfer requests, multi-department approval chain, payment proof recording, ownership transfer, mutation, encumbrance management, and dispute flagging. Emits events for every state change.

- **CircleRateOracle.sol** — Stores district/tehsil-level guideline values (circle rates) updated by the oracle backend. Exposes `getCircleRate(stateCode, districtCode)` for stamp duty calculation and undervaluation flagging.

### Tier 3: Oracle Backend (Off-chain Services)

A lightweight Node.js + Express server that simulates two external data sources:

- **Aadhaar KYC Service** — Pre-seeded database of test identities. User enters 12-digit Aadhaar, receives simulated OTP, backend calls on-chain oracle to mark wallet as verified.

- **Circle Rate Service** — Serves district-level guideline values for 3 states. Called during stamp duty calculation. In production, this would connect to state revenue department APIs.

### Tier 4: Storage Layer (IPFS)

All supporting documents (sale deeds, survey maps, mutation records, payment receipts) are uploaded to IPFS via Pinata's free tier (1 GB storage, 500 files). Only the content hash (CID) is stored on-chain, keeping gas costs low while ensuring documents are tamper-proof. Officials can view uploaded documents directly from their dashboard before approving.

### Architecture Diagram

```
┌──────────────────────────────────────────────────────────┐
│          FRONTEND (React + Tailwind CSS)                  │
│  ┌──────────┐ ┌──────────┐ ┌───────────┐ ┌──────────┐   │
│  │  Buyer   │ │  Seller  │ │ Officials │ │  Public  │   │
│  │   Dash   │ │   Dash   │ │   Dash    │ │   Map    │   │
│  └────┬─────┘ └────┬─────┘ └─────┬─────┘ └────┬─────┘   │
│       └─────────────┴─────────────┴─────────────┘        │
│                    Ethers.js + MetaMask                   │
└────────────────────────────┬─────────────────────────────┘
                             │
┌────────────────────────────┴─────────────────────────────┐
│        SMART CONTRACTS (Solidity on Hardhat)              │
│  ┌────────────────┐  ┌────────────────┐                  │
│  │ UserRegistry   │  │ AadhaarOracle  │                  │
│  │ (KYC + Roles)  │  │ (Mock KYC)     │                  │
│  └───────┬────────┘  └───────┬────────┘                  │
│          │                   │                           │
│  ┌───────┴───────────────────┴──────────────────┐        │
│  │          LandRegistry (Core Contract)        │        │
│  │  registerLand()    | requestTransfer()       │        │
│  │  approveAsPatwari()| approveAsSurveyOfficer()│        │
│  │  finalApproval()   | completeMutation()      │        │
│  │  flagDispute()     | resolveDispute()        │        │
│  └──────────────────────────────────────────────┘        │
│  ┌─────────────────┐                                     │
│  │CircleRateOracle │                                     │
│  └─────────────────┘                                     │
└──────────┬───────────────────────────────┬───────────────┘
           │                               │
┌──────────┴──────────┐    ┌───────────────┴──────────┐
│  Oracle Backend     │    │  IPFS (Pinata)           │
│  (Node + Express)   │    │  Sale Deeds              │
│  - Aadhaar KYC      │    │  Survey Maps             │
│  - Circle Rates     │    │  Payment Receipts        │
└─────────────────────┘    └──────────────────────────┘
```

---

## 5. User Roles and Personas

| Role | Real-World Equivalent | What They Do in the DApp | Dashboard Features |
|------|----------------------|--------------------------|-------------------|
| **Seller** (Landowner) | Citizen who owns land | Registers land parcels, uploads documents to IPFS, approves buyer requests, acknowledges payment receipt | Profile, My Lands (with status), Add Land form, Incoming Requests, Payment Acknowledgment |
| **Buyer** | Citizen looking to purchase land | Browses verified lands on map/list, sends purchase requests, makes off-chain payment, uploads payment proof | Profile, Land Gallery + Map, My Requests (with progress bar), Owned Lands, Upload Payment Proof |
| **Patwari** | Revenue Dept (Lekhpal/Patwari) | Verifies seller's ownership against revenue records. First approval in the chain. Completes mutation after transfer. | Pending Verifications, Pending Mutations, Approval History |
| **Survey Officer** | Survey & Settlement Department | Verifies GPS coordinates and area match official survey records. Second approval in the chain. | Pending Surveys, Parcel Map View, Approval History |
| **Sub-Registrar** | Registration Department | Final legal registration. Verifies stamp duty payment and all prior approvals. Resolves disputes. Executes ownership transfer. | Pending Registrations, Stamp Duty Review, Dispute Resolution, Transfer History |

---

## 6. Complete Transfer Workflow (The Core Transaction)

This is the end-to-end sequence for a land sale. Each step maps to a specific smart contract function and a UI action. The workflow is designed to mirror India's actual multi-department process while eliminating the gaps between departments.

| Step | Who | Contract Function | What Happens |
|------|-----|-------------------|--------------|
| 1 | Seller | `registerLand()` | Seller enters land details (state, district, tehsil, survey number, area, GPS coordinates). Uploads sale deed and survey map to IPFS. Receives a ULPIN (e.g., RJ-JP-000142). Land status: `REGISTERED`. |
| 2 | Patwari | `verifyLand()` | Patwari reviews submitted details against revenue records. Verifies seller's ownership claim. If accurate, marks land as `VERIFIED`. Land appears on public map (green marker). |
| 3 | Buyer | `requestTransfer()` | Buyer browses verified lands (list + map view). Sends purchase request for a specific parcel. System checks: (a) buyer is KYC-verified, (b) land is not under dispute, (c) no pending transfer exists. Status: `REQUEST_PENDING`. |
| 4 | Seller | `approveRequest()` | Seller reviews buyer's request and profile. Accepts or rejects. If accepted, the transfer enters the official approval pipeline. Status: `SELLER_APPROVED`. |
| 5 | Patwari | `approveAsPatwari()` | Revenue records check: confirms seller is the rightful owner per RoR. First of three required approvals. Status: `PATWARI_APPROVED`. |
| 6 | Survey Officer | `approveAsSurveyOfficer()` | Boundary verification: confirms GPS coordinates and area match survey records. Second approval. Status: `SURVEY_APPROVED`. |
| 7 | Buyer | `uploadPaymentProof()` | Buyer completes off-chain payment (UPI/NEFT/DD). Uploads payment receipt to IPFS. IPFS CID is recorded on-chain. Stamp duty breakdown is displayed for reference. Status: `PAYMENT_UPLOADED`. |
| 8 | Seller | `acknowledgePayment()` | Seller confirms receipt of off-chain payment on the platform. Status: `PAYMENT_CONFIRMED`. |
| 9 | Sub-Registrar | `finalApproval()` | Reviews all three prior approvals and payment proof. Verifies stamp duty amount against circle rate oracle. If declared value is below circle rate, transaction is flagged for review. Executes ownership transfer on-chain. Status: `TRANSFER_COMPLETE`. Map marker changes to blue. |
| 10 | Patwari | `completeMutation()` | The final step. Patwari updates the Record of Rights on-chain, officially recording the buyer as the new owner in revenue records. This is the Dakhil Kharij step. Status: `MUTATION_COMPLETE`. Map marker returns to green (new owner). |

> **Why 10 steps, not 7?** Existing GitHub projects collapse this into ~5 steps with a single admin. Our 10-step workflow models reality: three independent departments must approve sequentially, payment happens off-chain with proof uploaded, and mutation is a separate mandatory step. This multi-signature pattern ensures no single point of failure or corruption.

### Land Parcel State Machine

```
REGISTERED → VERIFIED → REQUEST_PENDING → SELLER_APPROVED → PATWARI_APPROVED → SURVEY_APPROVED → PAYMENT_UPLOADED → PAYMENT_CONFIRMED → TRANSFER_COMPLETE → MUTATION_COMPLETE
```

At any point, a dispute can freeze the parcel:
```
Any State → DISPUTED (via flagDispute()) → Resolved back to previous state (via resolveDispute(), Sub-Registrar only)
```

---

## 7. Feature Specifications

### 7.1 Simulated Aadhaar KYC (Oracle Pattern)

Before any user can register land or request a transfer, they must complete KYC verification. The system uses an **oracle design pattern**: a Node.js backend simulates UIDAI's Aadhaar verification API with a pre-seeded database of test identities (12-digit numbers mapped to names and wallet addresses).

**Flow:**

1. User enters 12-digit Aadhaar number on the frontend.
2. Frontend sends the number to the Express backend.
3. Backend looks up the number in its test database, generates a simulated 6-digit OTP.
4. User enters OTP on the frontend.
5. Backend verifies OTP, then calls `AadhaarOracle.confirmVerification(walletAddress)` on-chain.
6. The oracle contract marks the user's wallet as KYC-verified in UserRegistry.
7. Only the `keccak256` hash of the Aadhaar number is stored on-chain — never the raw number.

**Why this matters:** This is the exact same architecture that Chainlink oracles use. The mock backend can be swapped for UIDAI's real Authentication API without changing any on-chain code. The privacy-preserving hash storage demonstrates awareness of India's Aadhaar data protection requirements.

**Implementation notes for AI agents:**
- The Express backend should have a `/verify-aadhaar` POST endpoint accepting `{ aadhaarNumber, walletAddress }`.
- The test database should contain at least 10 pre-seeded identities.
- OTP should be a random 6-digit number stored temporarily (in-memory, expires after 5 minutes).
- A `/confirm-otp` POST endpoint verifies the OTP and calls the on-chain oracle.
- The oracle contract should have an `onlyOracle` modifier restricting `confirmVerification()` to the backend's wallet address.

### 7.2 Multi-Department Approval Chain

Every land transfer requires sequential approval from three independent government roles, implemented as a **multi-signature pattern** in the smart contract. The transfer only completes when all three have approved:

- **Patwari** (Revenue) → Confirms seller's ownership in RoR
- **Survey Officer** (Survey & Settlement) → Confirms GPS/area match survey records
- **Sub-Registrar** (Registration) → Verifies stamp duty, issues final approval

Each official's dashboard shows **only their pending items**. A visual progress bar on the buyer's and seller's dashboard tracks approval status across all three departments in real time.

**Implementation notes for AI agents:**
- Use Solidity modifiers: `onlyPatwari`, `onlySurveyOfficer`, `onlySubRegistrar`.
- The approval functions must enforce sequential order (e.g., `approveAsSurveyOfficer()` reverts if Patwari hasn't approved yet).
- Emit events for each approval: `PatwariApproved(parcelId)`, `SurveyOfficerApproved(parcelId)`, `SubRegistrarApproved(parcelId)`.

### 7.3 On-Chain Mutation (Dakhil Kharij)

> **This feature has no equivalent in any existing open-source blockchain land registration project.**

From January 2025, Indian law mandates that registration alone does not confirm ownership. The buyer must complete **mutation (Dakhil Kharij)** — the process of updating the Record of Rights to replace the seller's name with the buyer's name. Without mutation, the seller's name persists in revenue records, enabling resale fraud.

In our DApp, mutation is modeled as a **separate on-chain step** that occurs after the Sub-Registrar's final approval. The Patwari must call `completeMutation(parcelId)` to update the `recordOfRights` mapping. Until this function is called, the land's status remains `TRANSFER_COMPLETE` (not `MUTATION_COMPLETE`), and the parcel is shown as "pending mutation" on the map (blue marker). Only after mutation does the parcel return to green with the new owner.

This design choice mirrors the 2025 reform and prevents the exact gap that causes real-world fraud: a registered sale deed that never gets reflected in revenue records.

**Implementation notes for AI agents:**
- `completeMutation(uint256 parcelId)` should:
  - Require `msg.sender` to be the assigned Patwari.
  - Require parcel status to be `TRANSFER_COMPLETE`.
  - Update `recordOfRights[parcelId]` mapping from old owner to new owner.
  - Set parcel status to `MUTATION_COMPLETE`.
  - Emit `MutationCompleted(parcelId, newOwner, timestamp)`.
- The `recordOfRights` mapping is separate from the `owner` field — it represents the revenue department's record, not just the registration department's record.

### 7.4 ULPIN with Map Visualization

Each registered land parcel receives a **Unique Land Parcel Identification Number (ULPIN)** in the format `STATE-DISTRICT-ID` (e.g., `RJ-JP-000142`), modeled after the government's 14-digit Bhu-Aadhaar initiative. Each parcel is tagged with GPS coordinates (latitude/longitude).

An interactive map (Leaflet.js + OpenStreetMap) displays all parcels with color-coded markers:
- **Green** — Available (verified, no pending transfer)
- **Blue** — Transfer in progress or pending mutation
- **Red** — Disputed or encumbered

Users can click any marker to view full land details, ownership history, and document links.

**Implementation notes for AI agents:**
- ULPIN generation should happen in the smart contract or as a deterministic function of `stateCode + districtCode + autoIncrementId`.
- State and district codes should use standard abbreviations (e.g., RJ for Rajasthan, JP for Jaipur).
- GPS coordinates are stored as `int256` (latitude and longitude multiplied by 1e6 to avoid floating point).
- The Leaflet map component should fetch all parcels from the contract and render markers with appropriate colors based on status.

### 7.5 Encumbrance Certificate Generator

Currently, obtaining an Encumbrance Certificate from a Sub-Registrar's office takes 15–30 days and costs ₹200–500. In our DApp, any user can call `getEncumbranceHistory(parcelId)` which returns the complete chain of:

- All ownership transfers (with timestamps, buyer/seller addresses, sale amounts)
- All dispute flags (who flagged, reason, resolution status)
- Current encumbrance status (Clear, Disputed, Mortgaged, Court Order)
- All linked IPFS documents (sale deeds, survey maps, payment receipts)

This is rendered as a downloadable report on the frontend. Because the data is on-chain and immutable, this EC is inherently more trustworthy than a manually-issued paper certificate.

**Implementation notes for AI agents:**
- Store transfer history as an array of structs: `TransferRecord { from, to, saleAmount, timestamp, ipfsCid }`.
- Store dispute history as an array of structs: `DisputeRecord { flaggedBy, reason, timestamp, resolved, resolution }`.
- `getEncumbranceHistory()` should return both arrays plus the current `EncumbranceStatus` enum value.
- The frontend should render this as a formatted report with a "Download as PDF" option.

### 7.6 Circle Rate Oracle and Stamp Duty Calculator

Indian states publish **circle rates** (also called guideline values or ready reckoner rates) — the minimum property value per sq.ft. by locality. Transactions declared below the circle rate are a common tax evasion tactic.

Our system uses a **second oracle** (alongside Aadhaar) that serves district/tehsil-level guideline values for three states:

| State | Stamp Duty | Registration Fee | Cess / Surcharge |
|-------|------------|-----------------|------------------|
| Rajasthan | 5–6% | 1% | 10% of stamp duty |
| Maharashtra | 5–6% | 1% (max ₹30,000) | 1% (metro surcharge) |
| Karnataka | 5% | 1% | 2% cess |

During the transfer process, the buyer sees a detailed breakdown of stamp duty, registration fee, and cess in INR. If the declared sale value is below the circle rate for that locality, the smart contract emits an `UndervaluationFlagged` event and the Sub-Registrar sees a warning on their dashboard. This does not block the transaction (the Sub-Registrar makes the final call) but ensures transparency.

**Implementation notes for AI agents:**
- `CircleRateOracle.sol` should store rates as `mapping(bytes32 => uint256)` where the key is `keccak256(abi.encodePacked(stateCode, districtCode))`.
- The Express backend should have a `/circle-rate` GET endpoint accepting `{ stateCode, districtCode }`.
- `calculateStampDuty(stateCode, saleAmount)` should return a struct: `{ stampDuty, registrationFee, cess, totalFees }` all in paisa (INR × 100) to avoid decimals.
- The `UndervaluationFlagged` event should include `parcelId, declaredValue, circleRateValue, difference`.

### 7.7 Dispute Flagging and Encumbrance Status

The smart contract maintains an **encumbrance status** for each parcel, with four possible values: `Clear`, `Disputed`, `Mortgaged`, `CourtOrder`.

Any KYC-verified user can flag a dispute against a parcel by calling `flagDispute(parcelId, reason)`. This immediately freezes the parcel from any transfers. A Solidity `modifier onlyClearEncumbrance` on every transfer function checks encumbrance status before proceeding. Only the Sub-Registrar role can resolve disputes by calling `resolveDispute(parcelId, resolution)`.

**Implementation notes for AI agents:**
```solidity
enum EncumbranceStatus { Clear, Disputed, Mortgaged, CourtOrder }

modifier onlyClearEncumbrance(uint256 parcelId) {
    require(parcels[parcelId].encumbrance == EncumbranceStatus.Clear, "Land is encumbered");
    _;
}

// Apply this modifier to: requestTransfer, approveRequest, approveAsPatwari,
// approveAsSurveyOfficer, finalApproval, completeMutation
```

### 7.8 IPFS Document Storage

All supporting documents are uploaded to IPFS via Pinata (free tier: 1 GB, 500 files). Only the content hash (CID) is stored on-chain, keeping gas costs minimal. Documents include: sale deeds, mutation records, survey maps, and payment receipts. Officials can view and verify uploaded documents directly from their dashboard before approving any step.

**Implementation notes for AI agents:**
- Use Pinata's REST API: `POST https://api.pinata.cloud/pinning/pinFileToIPFS` with the file as form data.
- Store the returned `IpfsHash` (CID) on-chain in the parcel struct.
- The frontend should link to `https://gateway.pinata.cloud/ipfs/{CID}` for document viewing.
- Each parcel should support multiple document CIDs: `string[] documentCids` in the struct.

---

## 8. Smart Contract Architecture

The system uses four Solidity contracts with clear separation of concerns:

| Contract | Responsibility | Key Functions |
|----------|---------------|---------------|
| **UserRegistry.sol** | User registration, role assignment (enum: Seller, Buyer, Patwari, SurveyOfficer, SubRegistrar), KYC status tracking | `registerUser()`, `assignRole()`, `setKYCVerified()`, `getUserDetails()`, `isKYCVerified()` |
| **AadhaarOracle.sol** | Receives verification callbacks from off-chain KYC backend. Stores `keccak256(aadhaar)` only. | `requestVerification()`, `confirmVerification()`, `onlyOracle` modifier |
| **LandRegistry.sol** | Core contract. Land registration, transfer workflow, multi-sig approvals, mutation, disputes, encumbrance, payment proof. | `registerLand()`, `requestTransfer()`, `approveAsPatwari()`, `approveAsSurveyOfficer()`, `finalApproval()`, `completeMutation()`, `flagDispute()`, `resolveDispute()`, `getEncumbranceHistory()` |
| **CircleRateOracle.sol** | Stores district-level guideline values. Updated by oracle backend. Used for stamp duty calculation and undervaluation detection. | `updateCircleRate()`, `getCircleRate()`, `calculateStampDuty()`, `onlyOracle` modifier |

### Key Design Patterns Used

- **Oracle Pattern** — Two oracles (Aadhaar KYC + Circle Rates) bridge off-chain data to on-chain contracts
- **Multi-Signature** — Three independent approvals required for any transfer
- **Role-Based Access Control** — Modifiers enforce that only the correct role can call each function
- **State Machine** — Each land parcel follows a strict state progression (`REGISTERED` → `VERIFIED` → `REQUEST_PENDING` → ... → `MUTATION_COMPLETE`)
- **Event Emission** — Every state change emits an event for frontend indexing and audit trail
- **Guard (Modifier) Pattern** — `onlyClearEncumbrance` prevents operations on disputed parcels

### Suggested Solidity Structs

```solidity
struct User {
    address walletAddress;
    string name;
    string email;
    string phone;
    Role role;
    bool isKYCVerified;
    bytes32 aadhaarHash; // keccak256 of Aadhaar number
    bool isRegistered;
}

enum Role { Seller, Buyer, Patwari, SurveyOfficer, SubRegistrar }

struct LandParcel {
    uint256 id;
    string ulpin;                    // e.g., "RJ-JP-000142"
    address owner;
    address recordOfRightsHolder;    // Revenue department's record (mutation)
    string stateCode;                // e.g., "RJ"
    string districtCode;             // e.g., "JP"
    string tehsil;
    string surveyNumber;
    uint256 areaInSqFt;
    int256 latitude;                 // multiplied by 1e6
    int256 longitude;                // multiplied by 1e6
    uint256 declaredValue;           // in paisa (INR × 100)
    LandStatus status;
    EncumbranceStatus encumbrance;
    string[] documentCids;           // IPFS CIDs
    TransferRecord[] transferHistory;
    DisputeRecord[] disputeHistory;
}

enum LandStatus {
    REGISTERED,
    VERIFIED,
    REQUEST_PENDING,
    SELLER_APPROVED,
    PATWARI_APPROVED,
    SURVEY_APPROVED,
    PAYMENT_UPLOADED,
    PAYMENT_CONFIRMED,
    TRANSFER_COMPLETE,
    MUTATION_COMPLETE
}

enum EncumbranceStatus { Clear, Disputed, Mortgaged, CourtOrder }

struct TransferRecord {
    address from;
    address to;
    uint256 saleAmount;
    uint256 timestamp;
    string paymentProofCid;
}

struct DisputeRecord {
    address flaggedBy;
    string reason;
    uint256 timestamp;
    bool resolved;
    string resolution;
}

struct TransferRequest {
    uint256 parcelId;
    address buyer;
    bool sellerApproved;
    bool patwariApproved;
    bool surveyOfficerApproved;
    bool subRegistrarApproved;
    bool paymentUploaded;
    bool paymentConfirmed;
    string paymentProofCid;
    bool mutationCompleted;
}
```

---

## 9. Technology Stack (Detailed)

| Layer | Technology | Notes |
|-------|-----------|-------|
| Blockchain Network | Hardhat local network | Modern replacement for Ganache/Truffle. Built-in `console.log` for Solidity debugging. |
| Smart Contracts | Solidity ^0.8.x | Latest stable compiler with built-in overflow checks and custom errors. |
| Frontend | React.js + Tailwind CSS | Component-based UI with utility-first CSS. Clean, modern, accessible design. |
| Blockchain Interaction | Ethers.js v6 + MetaMask | Lightweight library for contract calls. MetaMask handles wallet/signing. |
| Document Storage | IPFS via Pinata | Free tier: 1 GB, 500 files, 10 GB bandwidth. More than sufficient for demo. |
| Map Visualization | Leaflet.js + OpenStreetMap | Both fully free and open source. No API key required. |
| KYC + Rate Oracle | Node.js + Express | Lightweight backend for simulated oracles. Two endpoints: `/verify-aadhaar`, `/circle-rate`. |
| Testing | Hardhat + Chai + Ethers | Unit tests for all contract functions. Hardhat's local network for integration tests. |

**Cost: ₹0 (completely free).** Every tool in this stack is open-source or has a free tier sufficient for this project. Hardhat, Ethers.js, React, Tailwind, Leaflet, OpenStreetMap, MetaMask, Node.js, Express — all free. Pinata's free tier provides 1 GB storage and 500 files, which is more than enough for a course project demo with a handful of test documents.

---

## 10. Course Topics Addressed

| Course Topic | How This Project Addresses It |
|-------------|-------------------------------|
| Decentralised App Development | The entire project is a DApp with frontend, smart contracts, and wallet integration. |
| Smart Contracts Engineering | Four Solidity contracts with multi-sig, state machines, modifiers, events, and oracle patterns. |
| KYC / AML | Simulated Aadhaar-based identity verification using the oracle pattern, with privacy-preserving hash storage. |
| Digital Signatures | Every transaction is cryptographically signed via MetaMask. Aadhaar biometric verification is simulated. |
| Wallets | MetaMask integration for authentication, transaction signing, and gas fee management. |
| Security and Privacy | Role-based access control, encumbrance guards, keccak256 hashing of PII, dispute freezing. |
| Storage Solutions (IPFS) | Off-chain document storage on IPFS with on-chain CID references. Demonstrates content-addressing. |
| Blockchain Applications & Services | Direct application to India's land governance problem, backed by Supreme Court recommendation. |
| Distributed & Decentralised Trust | Three departments that don't trust each other's databases now share an immutable ledger. |
| Regulations & Policies | Models the 2025 mandatory mutation (Dakhil Kharij) reform and Registration Act, 1908 compliance. |
| Token Economy | Land parcels as unique digital assets with ULPIN identifiers (conceptually similar to NFTs). |
| Transaction Monitoring & Analysis | Event emission on every state change enables complete audit trails and encumbrance history queries. |

---

## 11. What Makes This Different from Existing Projects

| Feature | Typical GitHub Project | Our DApp |
|---------|----------------------|----------|
| Approval Model | Single admin (Land Inspector) | **Three independent departments (multi-signature pattern)** |
| Payment | ETH on-chain | **Off-chain INR (UPI/NEFT/DD) with on-chain proof** |
| Identity (KYC) | None or basic form | **Oracle-based simulated Aadhaar with OTP and hash storage** |
| Mutation | Not modeled | **Explicit on-chain step (2025 Dakhil Kharij reform)** |
| Encumbrance Check | Not available | **Instant on-chain query with full history (replaces 30-day EC)** |
| Circle Rate / Valuation | Not available | **Oracle-based district rates with undervaluation flagging** |
| Map Visualization | None | **Leaflet.js with GPS-tagged color-coded markers** |
| Stamp Duty | None or hardcoded | **State-wise calculation with detailed INR breakdown** |
| Dispute Mechanism | None | **On-chain flagging with automatic transfer freeze** |
| Tech Stack | Truffle + Ganache + Web3.js | **Hardhat + Ethers.js v6 (current industry standard)** |
| UI Design | Basic / government-style | **Modern React + Tailwind (accessible, classy)** |

---

## 12. Development Phases and Timeline

The project is divided into four phases, each producing a working increment. Phase 1 delivers a minimal but functional end-to-end demo. Subsequent phases add the features that differentiate this project from existing implementations.

### Phase 1: Core Foundation (Week 1–2)

**Goal:** A working end-to-end demo where a seller can register land, a buyer can request it, a single admin can approve the transfer, and ownership updates on-chain. Basic UI with wallet connection.

- Set up Hardhat project, configure local network, deploy first contract
- `UserRegistry.sol`: user registration with role enum, basic profile storage
- `LandRegistry.sol` (v1): `registerLand()`, `requestTransfer()`, `approveTransfer()` with single-admin model
- React frontend with MetaMask connection, registration form, seller dashboard, buyer land gallery
- Basic Tailwind styling (clean, modern layout — not final polish)
- IPFS integration via Pinata: upload sale deed, store CID on-chain

### Phase 2: Multi-Department Workflow + KYC (Week 3)

**Goal:** Upgrade from single-admin to three-department approval chain. Add Aadhaar KYC oracle. This is where the project diverges from all existing implementations.

- Refactor `LandRegistry.sol`: split `approveTransfer()` into `approveAsPatwari()`, `approveAsSurveyOfficer()`, `finalApproval()`
- Add role-based modifiers (`onlyPatwari`, `onlySurveyOfficer`, `onlySubRegistrar`)
- Implement state machine: `REGISTERED` → `VERIFIED` → `REQUEST_PENDING` → ... → `TRANSFER_COMPLETE`
- `AadhaarOracle.sol` + Express backend: simulated KYC with OTP flow, keccak256 hash storage
- Three separate official dashboards with role-specific pending items
- Progress bar on buyer/seller dashboard showing approval status across departments

### Phase 3: Mutation, Disputes, Circle Rates (Week 4)

**Goal:** Add the novel features: on-chain mutation, encumbrance/dispute system, circle rate oracle with stamp duty calculator and undervaluation flagging.

- `completeMutation()` function: Patwari updates Record of Rights after Sub-Registrar approval
- Mutation status tracking: `TRANSFER_COMPLETE` → `MUTATION_COMPLETE`
- `flagDispute()` / `resolveDispute()` with `onlyClearEncumbrance` modifier on all transfer functions
- `CircleRateOracle.sol` + Express endpoint with mock data for 3 states
- Stamp duty calculator UI: detailed breakdown of duty + registration fee + cess in INR
- `UndervaluationFlagged` event when declared value < circle rate
- `getEncumbranceHistory()`: on-chain query returning full parcel history

### Phase 4: Map, Polish, Testing (Week 5)

**Goal:** Add map visualization, ULPIN generation, UI polish, comprehensive testing, and demo preparation.

- Leaflet.js map integration with GPS-tagged parcels and color-coded markers
- ULPIN generation (`STATE-DISTRICT-ID` format) displayed on all land cards
- Encumbrance Certificate download feature (formatted report from on-chain data)
- Payment proof upload flow: buyer uploads receipt to IPFS, seller acknowledges
- UI polish: responsive design, loading states, error handling, transaction confirmations
- Hardhat + Chai unit tests for all contract functions
- End-to-end demo script: walk-through of complete 10-step transfer workflow

---

## 13. Future Enhancements

The following features are explicitly out of scope for this version but represent natural extensions that would increase the system's real-world applicability:

- **Inheritance / Succession Pathway** — Not all land transfers are sales. A flow where legal heirs can claim mutation after submitting death certificate and legal heir certificate would cover a massive real-world use case (joint Hindu family, Muslim succession law, etc.).

- **Power of Attorney (PoA) Registry** — An on-chain registry where PoAs are registered with expiry and revocation mechanisms. The smart contract would check PoA validity before allowing transactions executed via PoA, addressing a major source of Indian property fraud.

- **Benami Property Detection** — On-chain heuristics that flag suspicious patterns: same wallet registering many properties in different names, circular ownership transfers, or rapid re-transfers. Touches forensics and criminal activity detection topics.

- **DigiLocker / e-Sign Integration** — Replace the mock Aadhaar backend with actual DigiLocker API for document verification and e-Sign for legally binding digital signatures on sale deeds.

- **Cross-State Interoperability** — Currently, each state maintains separate land records. A cross-chain or cross-contract bridge that allows land records to be verified across state boundaries.

- **Registration Bill 2025 Compliance** — The draft Registration Bill 2025 proposes fully online registration with digital signatures, eliminating physical Sub-Registrar visits. This DApp essentially prototypes that vision and could be extended to model full compliance.

- **NRI Remote Registration** — Allow Non-Resident Indians to complete land registration remotely using digital signatures and video verification, aligned with the Registration Bill 2025 provisions.

---

> This project demonstrates how blockchain technology can address a real and pressing problem in Indian land governance. By modeling the actual multi-department workflow, implementing the 2025 mandatory mutation reform on-chain, and using oracle patterns for identity verification and property valuation, it goes significantly beyond existing open-source implementations. The system engages with 12+ course topics and produces a working localhost demo that could serve as a reference architecture for actual state-level blockchain land record pilots.
