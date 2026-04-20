/**
 * Deployment script — deploys all 4 contracts and seeds circle rate data.
 *
 * Deployment order:
 *   1. UserRegistry (no deps)
 *   2. AadhaarOracle (needs UserRegistry + oracle wallet)
 *   3. CircleRateOracle (needs oracle wallet)
 *   4. LandRegistry (needs UserRegistry)
 *
 * After deployment:
 *   - Links AadhaarOracle to UserRegistry (so oracle can call setKYCVerified)
 *   - Seeds circle rates for test districts
 *   - Writes all addresses to client/src/config/deployedContracts.json
 *   - Copies ABIs to client/src/artifacts/
 */

const { ethers } = require("hardhat");
const fs   = require("fs");
const path = require("path");

async function main() {
  const signers = await ethers.getSigners();
  const deployer = signers[0];

  // On Sepolia (or any non-localhost network) we only have the keys from .env
  // so the oracle wallet defaults to signers[1] if present, else signers[0]
  const network = hre.network.name;
  const oracleWallet = signers.length > 1 ? signers[1] : signers[0];

  console.log(`\n=== Deploying BhuChain Land Registration System (${network}) ===`);
  console.log(`Deployer (Admin):  ${deployer.address}`);
  console.log(`Oracle Backend:    ${oracleWallet.address}`);
  console.log(`Deployer balance:  ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} ETH\n`);

  // ── 1. Deploy UserRegistry ──────────────────────────────────────────────
  console.log("1/4  Deploying UserRegistry...");
  const UserRegistryFactory = await ethers.getContractFactory("UserRegistry");
  const userRegistry = await UserRegistryFactory.deploy();
  await userRegistry.waitForDeployment();
  const userRegistryAddress = await userRegistry.getAddress();
  console.log(`     UserRegistry deployed at: ${userRegistryAddress}`);

  // ── 2. Deploy AadhaarOracle ─────────────────────────────────────────────
  console.log("2/4  Deploying AadhaarOracle...");
  const AadhaarOracleFactory = await ethers.getContractFactory("AadhaarOracle");
  const aadhaarOracle = await AadhaarOracleFactory.deploy(userRegistryAddress, oracleWallet.address);
  await aadhaarOracle.waitForDeployment();
  const aadhaarOracleAddress = await aadhaarOracle.getAddress();
  console.log(`     AadhaarOracle deployed at: ${aadhaarOracleAddress}`);

  // Link AadhaarOracle → UserRegistry (so oracle can call setKYCVerified)
  await userRegistry.setAadhaarOracle(aadhaarOracleAddress);
  console.log("     Linked AadhaarOracle to UserRegistry");

  // ── 3. Deploy CircleRateOracle ──────────────────────────────────────────
  console.log("3/4  Deploying CircleRateOracle...");
  const CircleRateOracleFactory = await ethers.getContractFactory("CircleRateOracle");
  const circleRateOracle = await CircleRateOracleFactory.deploy(oracleWallet.address);
  await circleRateOracle.waitForDeployment();
  const circleRateOracleAddress = await circleRateOracle.getAddress();
  console.log(`     CircleRateOracle deployed at: ${circleRateOracleAddress}`);

  // Seed circle rates for test districts (rate in paisa per sq.ft)
  const circleRates = [
    // Rajasthan
    { state: "RJ", district: "JP", rate: 350000 },  // Rs 3,500/sqft
    { state: "RJ", district: "JO", rate: 180000 },
    { state: "RJ", district: "UD", rate: 220000 },
    // Maharashtra
    { state: "MH", district: "MU", rate: 1200000 }, // Rs 12,000/sqft
    { state: "MH", district: "PU", rate: 650000 },
    { state: "MH", district: "NA", rate: 280000 },
    // Karnataka
    { state: "KA", district: "BN", rate: 750000 },  // Rs 7,500/sqft
    { state: "KA", district: "MY", rate: 350000 },
    { state: "KA", district: "MN", rate: 300000 },
  ];

  console.log("     Seeding circle rates...");
  for (const cr of circleRates) {
    await circleRateOracle.updateCircleRate(cr.state, cr.district, cr.rate);
  }
  console.log(`     Seeded ${circleRates.length} district circle rates`);

  // ── 4. Deploy LandRegistry ──────────────────────────────────────────────
  console.log("4/4  Deploying LandRegistry...");
  const LandRegistryFactory = await ethers.getContractFactory("LandRegistry");
  const landRegistry = await LandRegistryFactory.deploy(userRegistryAddress);
  await landRegistry.waitForDeployment();
  const landRegistryAddress = await landRegistry.getAddress();
  console.log(`     LandRegistry deployed at: ${landRegistryAddress}`);

  // ── 5. Write addresses to client config ─────────────────────────────────
  const chainId = (await ethers.provider.getNetwork()).chainId;
  const deployedContracts = {
    network:          network,
    chainId:          Number(chainId),
    deployedAt:       new Date().toISOString(),
    deployer:         deployer.address,
    oracleWallet:     oracleWallet.address,
    UserRegistry:     userRegistryAddress,
    AadhaarOracle:    aadhaarOracleAddress,
    CircleRateOracle: circleRateOracleAddress,
    LandRegistry:     landRegistryAddress,
  };

  const clientConfigDir = path.join(__dirname, "../client/src/config");
  if (!fs.existsSync(clientConfigDir)) {
    fs.mkdirSync(clientConfigDir, { recursive: true });
  }

  const configPath = path.join(clientConfigDir, "deployedContracts.json");
  fs.writeFileSync(configPath, JSON.stringify(deployedContracts, null, 2));
  console.log(`\nContract addresses saved to: ${configPath}`);

  // ── 6. Copy ABI files to client ─────────────────────────────────────────
  const artifactsDir = path.join(__dirname, "../client/src/artifacts");
  if (!fs.existsSync(artifactsDir)) {
    fs.mkdirSync(artifactsDir, { recursive: true });
  }

  const contracts = ["UserRegistry", "LandRegistry", "AadhaarOracle", "CircleRateOracle"];
  for (const name of contracts) {
    const src  = path.join(__dirname, `../artifacts/contracts/${name}.sol/${name}.json`);
    const dest = path.join(artifactsDir, `${name}.json`);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, dest);
      console.log(`ABI copied: ${name}.json`);
    } else {
      console.warn(`ABI not found: ${src} — run 'npm run compile' first`);
    }
  }

  console.log("\n=== Deployment complete ===");
  console.log("\nOracle backend config:");
  console.log(`  ORACLE_PRIVATE_KEY = ${oracleWallet.address} (Account #1)`);
  console.log("  Copy Account #1's private key from 'npm run node' output into oracle/.env");
  console.log("\nMetaMask network:");
  console.log("  Network: Hardhat Local | RPC: http://127.0.0.1:8545 | Chain ID: 31337");
  console.log("\nTest accounts:");
  console.log("  #0 (Admin/Deployer) — import into MetaMask for admin ops");
  console.log("  #1 (Oracle Backend) — used by oracle server, do NOT import into MetaMask");
  console.log("  #2+ — use as Seller, Buyer, or Officials");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
