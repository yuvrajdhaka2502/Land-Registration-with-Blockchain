/**
 * Oracle Backend Server
 *
 * Endpoints:
 *   POST /verify-aadhaar   — Lookup identity, generate OTP
 *   POST /confirm-otp      — Verify OTP, call AadhaarOracle.confirmVerification() on-chain
 *   GET  /circle-rate       — Return circle rate for state+district
 *   GET  /stamp-duty        — Calculate stamp duty breakdown
 *   GET  /test-identities   — List test Aadhaar numbers (for demo convenience)
 *
 * Runs on port 3001 (React dev server uses 3000).
 */

require("dotenv").config({ path: __dirname + "/.env" });
const express = require("express");
const cors    = require("cors");
const { ethers } = require("ethers");
const { findIdentity, TEST_IDENTITIES } = require("./aadhaarDB");

const app  = express();
const PORT = process.env.ORACLE_PORT || 3001;

app.use(cors());
app.use(express.json());

// ── Blockchain connection ─────────────────────────────────────────────────────

const RPC_URL         = process.env.RPC_URL || "http://127.0.0.1:8545";
const ORACLE_PRIV_KEY = process.env.ORACLE_PRIVATE_KEY;

let provider, oracleSigner, aadhaarOracleContract;

async function initBlockchain() {
  if (!ORACLE_PRIV_KEY) {
    console.warn("WARNING: ORACLE_PRIVATE_KEY not set. On-chain KYC will fail.");
    console.warn("Copy Account #1's private key from 'npm run node' into oracle/.env");
    return;
  }

  provider     = new ethers.JsonRpcProvider(RPC_URL);
  oracleSigner = new ethers.Wallet(ORACLE_PRIV_KEY, provider);
  console.log(`Oracle wallet: ${oracleSigner.address}`);

  // Load contract addresses and ABI
  try {
    const deployed = require("../client/src/config/deployedContracts.json");
    const abi      = require("../client/src/artifacts/AadhaarOracle.json").abi;
    aadhaarOracleContract = new ethers.Contract(deployed.AadhaarOracle, abi, oracleSigner);
    console.log(`AadhaarOracle contract: ${deployed.AadhaarOracle}`);
  } catch (err) {
    console.warn("Could not load contract config. Run 'npm run deploy' first.");
  }
}

// ── OTP Store (in-memory, expires after 5 minutes) ────────────────────────────

const otpStore = new Map(); // key: walletAddress → { otp, aadhaar, expiresAt }

function generateOTP() {
  return String(Math.floor(100000 + Math.random() * 900000)); // 6-digit
}

// ── Endpoint: POST /verify-aadhaar ────────────────────────────────────────────

app.post("/verify-aadhaar", (req, res) => {
  const { aadhaarNumber, walletAddress } = req.body;

  if (!aadhaarNumber || !walletAddress) {
    return res.status(400).json({ error: "aadhaarNumber and walletAddress are required." });
  }

  if (!/^\d{12}$/.test(aadhaarNumber)) {
    return res.status(400).json({ error: "Aadhaar must be a 12-digit number." });
  }

  if (!ethers.isAddress(walletAddress)) {
    return res.status(400).json({ error: "Invalid wallet address." });
  }

  const identity = findIdentity(aadhaarNumber);
  if (!identity) {
    return res.status(404).json({ error: "Aadhaar number not found in test database." });
  }

  const otp = generateOTP();
  otpStore.set(walletAddress.toLowerCase(), {
    otp,
    aadhaar: aadhaarNumber,
    name: identity.name,
    expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
  });

  console.log(`OTP generated for ${walletAddress}: ${otp} (Aadhaar: ${aadhaarNumber})`);

  // In production, OTP would be sent via SMS. For demo, we return it.
  res.json({
    success: true,
    message: `OTP sent to phone ending ...${identity.phone.slice(-4)}`,
    name: identity.name,
    // For demo convenience, include OTP in response (production would SMS it)
    demoOTP: otp,
  });
});

// ── Endpoint: POST /confirm-otp ──────────────────────────────────────────────

app.post("/confirm-otp", async (req, res) => {
  const { otp, walletAddress } = req.body;

  if (!otp || !walletAddress) {
    return res.status(400).json({ error: "otp and walletAddress are required." });
  }

  const key    = walletAddress.toLowerCase();
  const stored = otpStore.get(key);

  if (!stored) {
    return res.status(400).json({ error: "No OTP request found. Request verification first." });
  }

  if (Date.now() > stored.expiresAt) {
    otpStore.delete(key);
    return res.status(400).json({ error: "OTP expired. Request a new one." });
  }

  if (stored.otp !== otp) {
    return res.status(400).json({ error: "Invalid OTP." });
  }

  // OTP is valid — call on-chain oracle
  otpStore.delete(key);

  if (!aadhaarOracleContract) {
    return res.status(500).json({ error: "Oracle contract not initialized. Check server config." });
  }

  try {
    const aadhaarHash = ethers.keccak256(ethers.toUtf8Bytes(stored.aadhaar));
    console.log(`Confirming verification on-chain for ${walletAddress}...`);

    const tx = await aadhaarOracleContract.confirmVerification(walletAddress, aadhaarHash);
    await tx.wait();

    console.log(`Verification confirmed on-chain. TX: ${tx.hash}`);

    res.json({
      success: true,
      message: "KYC verification confirmed on-chain.",
      txHash: tx.hash,
      name: stored.name,
    });
  } catch (err) {
    console.error("On-chain confirmation failed:", err.reason || err.message);
    res.status(500).json({
      error: "On-chain confirmation failed: " + (err.reason || err.message),
    });
  }
});

// ── Endpoint: GET /circle-rate ────────────────────────────────────────────────

const CIRCLE_RATES = {
  "RJ-JP": 3500, "RJ-JO": 1800, "RJ-UD": 2200,
  "MH-MU": 12000, "MH-PU": 6500, "MH-NA": 2800,
  "KA-BN": 7500, "KA-MY": 3500, "KA-MN": 3000,
};

app.get("/circle-rate", (req, res) => {
  const { stateCode, districtCode } = req.query;
  if (!stateCode || !districtCode) {
    return res.status(400).json({ error: "stateCode and districtCode are required." });
  }

  const key = `${stateCode.toUpperCase()}-${districtCode.toUpperCase()}`;
  const rate = CIRCLE_RATES[key];

  if (!rate) {
    return res.status(404).json({ error: `Circle rate not found for ${key}.` });
  }

  res.json({ stateCode, districtCode, ratePerSqFt: rate, unit: "INR" });
});

// ── Endpoint: GET /stamp-duty ─────────────────────────────────────────────────

const STAMP_DUTY_RATES = {
  RJ: { stampDuty: 6.0, regFee: 1.0, cess: 0.5 },
  MH: { stampDuty: 5.0, regFee: 1.0, cess: 1.0 },
  KA: { stampDuty: 5.0, regFee: 1.0, cess: 0.5 },
};

app.get("/stamp-duty", (req, res) => {
  const { stateCode, declaredValue } = req.query;
  if (!stateCode || !declaredValue) {
    return res.status(400).json({ error: "stateCode and declaredValue (in INR) are required." });
  }

  const rates = STAMP_DUTY_RATES[stateCode.toUpperCase()];
  if (!rates) {
    return res.status(404).json({ error: `Stamp duty rates not configured for ${stateCode}.` });
  }

  const amount = parseFloat(declaredValue);
  const sd     = Math.round(amount * rates.stampDuty / 100);
  const rf     = Math.round(amount * rates.regFee / 100);
  const cs     = Math.round(amount * rates.cess / 100);

  res.json({
    stateCode,
    declaredValue: amount,
    stampDuty: sd,
    registrationFee: rf,
    cess: cs,
    totalFees: sd + rf + cs,
    rates: {
      stampDutyPercent: rates.stampDuty,
      regFeePercent: rates.regFee,
      cessPercent: rates.cess,
    },
  });
});

// ── Endpoint: GET /test-identities ────────────────────────────────────────────

app.get("/test-identities", (_req, res) => {
  res.json(TEST_IDENTITIES.map(id => ({
    aadhaar: id.aadhaar,
    name: id.name,
    phone: `...${id.phone.slice(-4)}`,
  })));
});

// ── Health check ──────────────────────────────────────────────────────────────

app.get("/health", (_req, res) => {
  res.json({ status: "ok", oracle: !!aadhaarOracleContract });
});

// ── Start ─────────────────────────────────────────────────────────────────────

initBlockchain().then(() => {
  app.listen(PORT, () => {
    console.log(`\nOracle backend running on http://localhost:${PORT}`);
    console.log("Endpoints:");
    console.log("  POST /verify-aadhaar  — Start KYC (aadhaarNumber + walletAddress)");
    console.log("  POST /confirm-otp     — Confirm OTP (otp + walletAddress)");
    console.log("  GET  /circle-rate     — Circle rate lookup (?stateCode=RJ&districtCode=JP)");
    console.log("  GET  /stamp-duty      — Stamp duty calc (?stateCode=RJ&declaredValue=5000000)");
    console.log("  GET  /test-identities — List test Aadhaar numbers");
    console.log("  GET  /health          — Server status\n");
  });
});
