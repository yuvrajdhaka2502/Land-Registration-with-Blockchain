const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("AadhaarOracle", function () {
  let userRegistry, aadhaarOracle;
  let owner, oracleWallet, user1, user2;
  const aadhaarHash = ethers.keccak256(ethers.toUtf8Bytes("123456789012"));

  beforeEach(async function () {
    [owner, oracleWallet, user1, user2] = await ethers.getSigners();

    const URFactory = await ethers.getContractFactory("UserRegistry");
    userRegistry = await URFactory.deploy();
    await userRegistry.waitForDeployment();

    const AOFactory = await ethers.getContractFactory("AadhaarOracle");
    aadhaarOracle = await AOFactory.deploy(
      await userRegistry.getAddress(),
      oracleWallet.address
    );
    await aadhaarOracle.waitForDeployment();

    // Link oracle to UserRegistry
    await userRegistry.connect(owner).setAadhaarOracle(await aadhaarOracle.getAddress());

    // Register a test user
    await userRegistry.connect(user1).registerUser("Alice", "alice@test.com", "999", 1);
  });

  describe("Verification Request", function () {
    it("registered user can request verification", async function () {
      await expect(aadhaarOracle.connect(user1).requestVerification())
        .to.emit(aadhaarOracle, "VerificationRequested")
        .withArgs(user1.address);
      expect(await aadhaarOracle.isVerificationPending(user1.address)).to.be.true;
    });

    it("unregistered user cannot request verification", async function () {
      await expect(aadhaarOracle.connect(user2).requestVerification())
        .to.be.revertedWith("AadhaarOracle: wallet not registered");
    });

    it("already verified user cannot request again", async function () {
      await aadhaarOracle.connect(user1).requestVerification();
      await aadhaarOracle.connect(oracleWallet).confirmVerification(user1.address, aadhaarHash);
      await expect(aadhaarOracle.connect(user1).requestVerification())
        .to.be.revertedWith("AadhaarOracle: already verified");
    });
  });

  describe("Verification Confirmation (Oracle Callback)", function () {
    beforeEach(async function () {
      await aadhaarOracle.connect(user1).requestVerification();
    });

    it("oracle wallet can confirm verification", async function () {
      await expect(aadhaarOracle.connect(oracleWallet).confirmVerification(user1.address, aadhaarHash))
        .to.emit(aadhaarOracle, "VerificationConfirmed")
        .withArgs(user1.address, aadhaarHash);

      // Check KYC is now verified in UserRegistry
      expect(await userRegistry.isKYCVerified(user1.address)).to.be.true;
      expect(await aadhaarOracle.isVerificationPending(user1.address)).to.be.false;
    });

    it("non-oracle wallet cannot confirm", async function () {
      await expect(
        aadhaarOracle.connect(user2).confirmVerification(user1.address, aadhaarHash)
      ).to.be.revertedWith("AadhaarOracle: caller is not oracle");
    });

    it("cannot confirm without prior request", async function () {
      await expect(
        aadhaarOracle.connect(oracleWallet).confirmVerification(user2.address, aadhaarHash)
      ).to.be.revertedWith("AadhaarOracle: verification not requested");
    });

    it("stores Aadhaar hash on confirmation", async function () {
      await aadhaarOracle.connect(oracleWallet).confirmVerification(user1.address, aadhaarHash);
      expect(await aadhaarOracle.aadhaarHashes(user1.address)).to.equal(aadhaarHash);
    });
  });

  describe("Admin Functions", function () {
    it("owner can change oracle address", async function () {
      await expect(aadhaarOracle.connect(owner).setOracleAddress(user2.address))
        .to.emit(aadhaarOracle, "OracleAddressUpdated")
        .withArgs(oracleWallet.address, user2.address);
      expect(await aadhaarOracle.oracleAddress()).to.equal(user2.address);
    });

    it("non-owner cannot change oracle address", async function () {
      await expect(aadhaarOracle.connect(user1).setOracleAddress(user2.address))
        .to.be.revertedWith("AadhaarOracle: caller is not owner");
    });
  });
});
