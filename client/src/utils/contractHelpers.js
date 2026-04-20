/**
 * Shared helpers for reading/formatting smart contract data.
 */

// ── Land Status ────────────────────────────────────────────────────────────────

export const LAND_STATUS = {
  0: "REGISTERED",
  1: "VERIFIED",
  2: "REQUEST_PENDING",
  3: "SELLER_APPROVED",
  4: "PATWARI_APPROVED",
  5: "SURVEY_APPROVED",
  6: "PAYMENT_UPLOADED",
  7: "PAYMENT_CONFIRMED",
  8: "TRANSFER_COMPLETE",
  9: "MUTATION_COMPLETE",
};

export const LAND_STATUS_LABEL = {
  0: "Submitted",
  1: "Verified",
  2: "Request Pending",
  3: "Seller Approved",
  4: "Patwari Approved",
  5: "Survey Approved",
  6: "Payment Uploaded",
  7: "Payment Confirmed",
  8: "Transfer Complete",
  9: "Mutation Complete",
};

export const LAND_STATUS_COLOR = {
  0: "bg-vellum text-slate2 border-bone",
  1: "bg-land-50 text-land-700 border-land-100",
  2: "bg-clay-50 text-clay-500 border-clay-100",
  3: "bg-clay-50 text-clay-700 border-clay-100",
  4: "bg-land-50 text-land-700 border-land-100",
  5: "bg-land-50 text-land-700 border-land-100",
  6: "bg-vellum text-slate2 border-bone",
  7: "bg-vellum text-slate2 border-bone",
  8: "bg-land-100 text-land-800 border-land-200",
  9: "bg-ink text-paper border-ink",
};

// ── Encumbrance Status ──────────────────────────────────────────────────────────

export const ENCUMBRANCE_STATUS = {
  0: "Clear",
  1: "Disputed",
  2: "Mortgaged",
  3: "Court Order",
};

export const ENCUMBRANCE_COLOR = {
  0: "bg-land-50 text-land-700 border-land-100",
  1: "bg-rose2/10 text-rose2 border-rose2/30",
  2: "bg-clay-50 text-clay-500 border-clay-100",
  3: "bg-rose2/10 text-rose2 border-rose2/40",
};

// ── User Role ───────────────────────────────────────────────────────────────────

export const USER_ROLE = {
  0: "None",
  1: "Seller",
  2: "Buyer",
  3: "Patwari",
  4: "Survey Officer",
  5: "Sub-Registrar",
};

export const USER_ROLE_COLOR = {
  1: "bg-land-50 text-land-700 border-land-100",
  2: "bg-clay-50 text-clay-700 border-clay-100",
  3: "bg-vellum text-slate2 border-bone",
  4: "bg-vellum text-slate2 border-bone",
  5: "bg-ink text-paper border-ink",
};

// ── Formatting helpers ──────────────────────────────────────────────────────────

/** Convert paisa (INR × 100) to a formatted INR string: e.g. 5000000n → "₹50,000" */
export function formatINR(paisa) {
  if (paisa === undefined || paisa === null) return "—";
  const rupees = Number(paisa) / 100;
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(rupees);
}

/** Convert GPS int (lat × 1e6) back to decimal degrees string */
export function formatCoord(coord) {
  if (coord === undefined || coord === null) return "—";
  return (Number(coord) / 1_000_000).toFixed(6);
}

/** Shorten a wallet address for display: 0xAbCd…1234 */
export function shortAddress(addr) {
  if (!addr) return "—";
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

/**
 * Parse a raw LandParcel struct returned by ethers.js into a plain JS object.
 * Ethers v6 returns BigInt for uint/int fields — convert them for display.
 */
export function parseLandParcel(raw) {
  return {
    id:                   Number(raw.id),
    ulpin:                raw.ulpin,
    owner:                raw.owner,
    recordOfRightsHolder: raw.recordOfRightsHolder,
    pendingBuyer:         raw.pendingBuyer,
    stateCode:            raw.stateCode,
    districtCode:         raw.districtCode,
    tehsil:               raw.tehsil,
    surveyNumber:         raw.surveyNumber,
    areaInSqFt:           Number(raw.areaInSqFt),
    latitude:             Number(raw.latitude),
    longitude:            Number(raw.longitude),
    declaredValue:        raw.declaredValue, // keep BigInt for formatting
    status:               Number(raw.status),
    encumbrance:          Number(raw.encumbrance),
    saleDeedCid:          raw.saleDeedCid,
    paymentProofCid:      raw.paymentProofCid,
  };
}

/**
 * Parse a raw User struct returned by ethers.js.
 */
export function parseUser(raw) {
  return {
    walletAddress: raw.walletAddress,
    name:          raw.name,
    email:         raw.email,
    phone:         raw.phone,
    role:          Number(raw.role),
    isKYCVerified: raw.isKYCVerified,
    aadhaarHash:   raw.aadhaarHash,
    isRegistered:  raw.isRegistered,
  };
}
