const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("UserRegistry", function () {
  let userRegistry, admin, user1, user2, oracle;

  beforeEach(async function () {
    [admin, user1, user2, oracle] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("UserRegistry");
    userRegistry = await Factory.deploy();
    await userRegistry.waitForDeployment();
  });

  describe("Registration", function () {
    it("should register a new user with correct details", async function () {
      await userRegistry.connect(user1).registerUser("Alice", "alice@test.com", "9999999999", 1);
      const user = await userRegistry.getUserDetails(user1.address);
      expect(user.name).to.equal("Alice");
      expect(user.email).to.equal("alice@test.com");
      expect(user.phone).to.equal("9999999999");
      expect(user.role).to.equal(1); // Seller
      expect(user.isRegistered).to.be.true;
      expect(user.isKYCVerified).to.be.false;
    });

    it("should emit UserRegistered event", async function () {
      await expect(userRegistry.connect(user1).registerUser("Alice", "alice@test.com", "9999", 1))
        .to.emit(userRegistry, "UserRegistered")
        .withArgs(user1.address, 1, "Alice");
    });

    it("should reject duplicate registration", async function () {
      await userRegistry.connect(user1).registerUser("Alice", "a@b.com", "123", 1);
      await expect(
        userRegistry.connect(user1).registerUser("Bob", "b@c.com", "456", 2)
      ).to.be.revertedWith("UserRegistry: already registered");
    });

    it("should reject role None (0)", async function () {
      await expect(
        userRegistry.connect(user1).registerUser("Alice", "a@b.com", "123", 0)
      ).to.be.revertedWith("UserRegistry: invalid role");
    });

    it("should allow all 5 role types", async function () {
      const signers = await ethers.getSigners();
      for (let role = 1; role <= 5; role++) {
        await userRegistry.connect(signers[role + 2]).registerUser(`User${role}`, `u${role}@t.com`, "000", role);
        expect(await userRegistry.getUserRole(signers[role + 2].address)).to.equal(role);
      }
    });
  });

  describe("KYC Verification", function () {
    beforeEach(async function () {
      await userRegistry.connect(user1).registerUser("Alice", "a@b.com", "123", 1);
    });

    it("admin should set KYC verified with Aadhaar hash", async function () {
      const hash = ethers.keccak256(ethers.toUtf8Bytes("123456789012"));
      await userRegistry.connect(admin).setKYCVerified(user1.address, hash);
      expect(await userRegistry.isKYCVerified(user1.address)).to.be.true;
      const user = await userRegistry.getUserDetails(user1.address);
      expect(user.aadhaarHash).to.equal(hash);
    });

    it("should emit KYCVerified event", async function () {
      const hash = ethers.keccak256(ethers.toUtf8Bytes("123456789012"));
      await expect(userRegistry.connect(admin).setKYCVerified(user1.address, hash))
        .to.emit(userRegistry, "KYCVerified")
        .withArgs(user1.address);
    });

    it("should reject non-admin caller", async function () {
      const hash = ethers.keccak256(ethers.toUtf8Bytes("123456789012"));
      await expect(
        userRegistry.connect(user2).setKYCVerified(user1.address, hash)
      ).to.be.revertedWith("UserRegistry: caller is not admin or oracle");
    });

    it("should reject double KYC verification", async function () {
      const hash = ethers.keccak256(ethers.toUtf8Bytes("123456789012"));
      await userRegistry.connect(admin).setKYCVerified(user1.address, hash);
      await expect(
        userRegistry.connect(admin).setKYCVerified(user1.address, hash)
      ).to.be.revertedWith("UserRegistry: already KYC verified");
    });

    it("oracle should also be able to verify KYC", async function () {
      await userRegistry.connect(admin).setAadhaarOracle(oracle.address);
      const hash = ethers.keccak256(ethers.toUtf8Bytes("123456789012"));
      await userRegistry.connect(oracle).setKYCVerified(user1.address, hash);
      expect(await userRegistry.isKYCVerified(user1.address)).to.be.true;
    });
  });

  describe("Role Assignment", function () {
    it("admin should assign/change role", async function () {
      await userRegistry.connect(user1).registerUser("Alice", "a@b.com", "123", 1);
      await userRegistry.connect(admin).assignRole(user1.address, 3); // Promote to Patwari
      expect(await userRegistry.getUserRole(user1.address)).to.equal(3);
    });

    it("non-admin should not assign role", async function () {
      await userRegistry.connect(user1).registerUser("Alice", "a@b.com", "123", 1);
      await expect(
        userRegistry.connect(user2).assignRole(user1.address, 3)
      ).to.be.revertedWith("UserRegistry: caller is not admin");
    });
  });

  describe("View Functions", function () {
    it("isRegistered returns false for unregistered address", async function () {
      expect(await userRegistry.isRegistered(user1.address)).to.be.false;
    });

    it("getAdmin returns deployer address", async function () {
      expect(await userRegistry.getAdmin()).to.equal(admin.address);
    });
  });
});
