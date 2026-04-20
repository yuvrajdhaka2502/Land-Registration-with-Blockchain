/**
 * Demo Seeder — Pre-populates test data for a quick demo.
 *
 * Creates:
 *   - 5 users (Seller, Buyer, Patwari, SurveyOfficer, SubRegistrar)
 *   - KYC-verifies all of them
 *   - 3 land parcels in different states
 *   - 1 parcel verified and available for purchase
 *
 * Usage:
 *   npx hardhat run scripts/seedTestData.js --network localhost
 */

const { ethers } = require("hardhat");

async function main() {
  const signers = await ethers.getSigners();
  const [admin, _oracle, seller, buyer, patwari, surveyOfficer, subRegistrar] = signers;

  // Load deployed contracts
  const deployed = require("../client/src/config/deployedContracts.json");
  const urABI = require("../client/src/artifacts/UserRegistry.json").abi;
  const lrABI = require("../client/src/artifacts/LandRegistry.json").abi;

  const userRegistry = new ethers.Contract(deployed.UserRegistry, urABI, admin);
  const landRegistry = new ethers.Contract(deployed.LandRegistry, lrABI, admin);

  const hash = ethers.keccak256(ethers.toUtf8Bytes("123456789012"));

  console.log("\n=== Seeding Test Data ===\n");

  // Register users
  const users = [
    { signer: seller,        name: "Rajan Sharma",  email: "rajan@test.com",  phone: "9876543210", role: 1 },
    { signer: buyer,         name: "Priya Mehta",   email: "priya@test.com",  phone: "9876543211", role: 2 },
    { signer: patwari,       name: "Vikram Singh",  email: "vikram@test.com", phone: "9876543212", role: 3 },
    { signer: surveyOfficer, name: "Neha Gupta",    email: "neha@test.com",   phone: "9876543213", role: 4 },
    { signer: subRegistrar,  name: "Deepak Joshi",  email: "deepak@test.com", phone: "9876543214", role: 5 },
  ];

  for (const u of users) {
    try {
      await userRegistry.connect(u.signer).registerUser(u.name, u.email, u.phone, u.role);
      await userRegistry.connect(admin).setKYCVerified(u.signer.address, hash);
      console.log(`Registered + KYC: ${u.name} (${["","Seller","Buyer","Patwari","Survey","SubRegistrar"][u.role]})`);
    } catch (err) {
      console.log(`Skipping ${u.name}: ${err.reason || "already registered"}`);
    }
  }

  // Register land parcels
  const parcels = [
    { state: "RJ", dist: "JP", tehsil: "Jaipur North",   survey: "142/B", area: 1200, lat: 26912434, lng: 75787270, value: 420000000, cid: "QmDemoSaleDeed1" },
    { state: "MH", dist: "PU", tehsil: "Kothrud",         survey: "87/A",  area: 800,  lat: 18520000, lng: 73856000, value: 520000000, cid: "QmDemoSaleDeed2" },
    { state: "KA", dist: "BN", tehsil: "Whitefield",      survey: "203",   area: 1500, lat: 12969000, lng: 77749000, value: 1125000000, cid: "QmDemoSaleDeed3" },
  ];

  for (const p of parcels) {
    try {
      await landRegistry.connect(seller).registerLand(
        p.state, p.dist, p.tehsil, p.survey, p.area, p.lat, p.lng, p.value, p.cid
      );
      console.log(`Land registered: ${p.state}-${p.dist} (${p.survey})`);
    } catch (err) {
      console.log(`Skipping parcel: ${err.reason || err.message}`);
    }
  }

  // Verify first parcel so it's browsable
  try {
    await landRegistry.connect(patwari).verifyLand(1);
    console.log("Parcel #1 verified by Patwari — available for purchase");
  } catch (err) {
    console.log(`Skipping verify: ${err.reason || err.message}`);
  }

  console.log("\n=== Seeding Complete ===");
  console.log("Seller:        ", seller.address);
  console.log("Buyer:         ", buyer.address);
  console.log("Patwari:       ", patwari.address);
  console.log("Survey Officer:", surveyOfficer.address);
  console.log("Sub-Registrar: ", subRegistrar.address);
  console.log("\nOpen http://localhost:3000 and connect with any account above.\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
