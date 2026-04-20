/**
 * Pre-seeded test identity database for simulated Aadhaar KYC.
 *
 * In production this would be UIDAI's Authentication API.
 * For the demo, we have 10 test identities that can be used
 * to verify any wallet address.
 */

const TEST_IDENTITIES = [
  { aadhaar: "123456789012", name: "Rajan Sharma",     phone: "9876543210" },
  { aadhaar: "234567890123", name: "Priya Mehta",      phone: "9876543211" },
  { aadhaar: "345678901234", name: "Amit Patel",       phone: "9876543212" },
  { aadhaar: "456789012345", name: "Sunita Devi",      phone: "9876543213" },
  { aadhaar: "567890123456", name: "Vikram Singh",     phone: "9876543214" },
  { aadhaar: "678901234567", name: "Neha Gupta",       phone: "9876543215" },
  { aadhaar: "789012345678", name: "Rahul Kumar",      phone: "9876543216" },
  { aadhaar: "890123456789", name: "Anita Verma",      phone: "9876543217" },
  { aadhaar: "901234567890", name: "Deepak Joshi",     phone: "9876543218" },
  { aadhaar: "112233445566", name: "Kavita Reddy",     phone: "9876543219" },
];

// Lookup by Aadhaar number
function findIdentity(aadhaarNumber) {
  return TEST_IDENTITIES.find(id => id.aadhaar === aadhaarNumber) || null;
}

module.exports = { TEST_IDENTITIES, findIdentity };
