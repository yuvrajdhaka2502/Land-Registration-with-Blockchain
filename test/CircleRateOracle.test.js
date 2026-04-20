const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CircleRateOracle", function () {
  let circleRateOracle;
  let owner, oracleWallet, user1;

  beforeEach(async function () {
    [owner, oracleWallet, user1] = await ethers.getSigners();

    const Factory = await ethers.getContractFactory("CircleRateOracle");
    circleRateOracle = await Factory.deploy(oracleWallet.address);
    await circleRateOracle.waitForDeployment();
  });

  describe("Pre-seeded Stamp Duty Rates", function () {
    it("Rajasthan rates: 6% stamp duty, 1% reg fee, 0.5% cess", async function () {
      const result = await circleRateOracle.calculateStampDuty("RJ", 10000000); // 1 lakh in paisa
      expect(result.stampDutyRate).to.equal(600);
      expect(result.regFeeRate).to.equal(100);
      expect(result.cessRate).to.equal(50);
      // 10000000 * 600 / 10000 = 600000
      expect(result.stampDuty).to.equal(600000);
      expect(result.registrationFee).to.equal(100000);
      expect(result.cess).to.equal(50000);
      expect(result.totalFees).to.equal(750000);
    });

    it("Maharashtra rates: 5% stamp duty, 1% reg fee, 1% cess", async function () {
      const result = await circleRateOracle.calculateStampDuty("MH", 10000000);
      expect(result.stampDutyRate).to.equal(500);
      expect(result.registrationFee).to.equal(100000);
      expect(result.cess).to.equal(100000);
    });

    it("Karnataka rates: 5% stamp duty, 1% reg fee, 0.5% cess", async function () {
      const result = await circleRateOracle.calculateStampDuty("KA", 10000000);
      expect(result.stampDutyRate).to.equal(500);
      expect(result.cessRate).to.equal(50);
    });

    it("should revert for unconfigured state", async function () {
      await expect(circleRateOracle.calculateStampDuty("XX", 100000))
        .to.be.revertedWith("CircleRateOracle: state rates not configured");
    });
  });

  describe("Circle Rate Updates", function () {
    it("oracle can update circle rate", async function () {
      await expect(
        circleRateOracle.connect(oracleWallet).updateCircleRate("RJ", "JP", 350000)
      ).to.emit(circleRateOracle, "CircleRateUpdated")
        .withArgs("RJ", "JP", 350000, await ethers.provider.getBlock("latest").then(b => b.timestamp + 1) || expect.anything());

      const rate = await circleRateOracle.getCircleRate("RJ", "JP");
      expect(rate).to.equal(350000);
    });

    it("owner can also update circle rate", async function () {
      await circleRateOracle.connect(owner).updateCircleRate("KA", "BN", 750000);
      const rate = await circleRateOracle.getCircleRate("KA", "BN");
      expect(rate).to.equal(750000);
    });

    it("non-oracle cannot update", async function () {
      await expect(
        circleRateOracle.connect(user1).updateCircleRate("RJ", "JP", 100000)
      ).to.be.revertedWith("CircleRateOracle: not authorized");
    });

    it("getCircleRate reverts for missing rate", async function () {
      await expect(circleRateOracle.getCircleRate("XX", "YY"))
        .to.be.revertedWith("CircleRateOracle: rate not found");
    });
  });

  describe("Undervaluation Detection", function () {
    beforeEach(async function () {
      // Set circle rate: Rs 3,500/sqft = 350000 paisa
      await circleRateOracle.connect(oracleWallet).updateCircleRate("RJ", "JP", 350000);
    });

    it("detects undervaluation when declared < circle rate * area", async function () {
      // Area: 1000 sqft, circle value: 350000 * 1000 = 350000000 paisa (Rs 35 lakh)
      // Declared: 200000000 paisa (Rs 20 lakh) — undervalued
      const [isUndervalued, circleValue] = await circleRateOracle.checkUndervaluation(
        "RJ", "JP", 1000, 200000000
      );
      expect(isUndervalued).to.be.true;
      expect(circleValue).to.equal(350000000n);
    });

    it("returns false when declared >= circle value", async function () {
      const [isUndervalued] = await circleRateOracle.checkUndervaluation(
        "RJ", "JP", 1000, 400000000
      );
      expect(isUndervalued).to.be.false;
    });

    it("returns false for missing district rate", async function () {
      const [isUndervalued, circleValue] = await circleRateOracle.checkUndervaluation(
        "XX", "YY", 1000, 100000
      );
      expect(isUndervalued).to.be.false;
      expect(circleValue).to.equal(0);
    });
  });

  describe("Admin Functions", function () {
    it("owner can change oracle address", async function () {
      await circleRateOracle.connect(owner).setOracleAddress(user1.address);
      expect(await circleRateOracle.oracleAddress()).to.equal(user1.address);
    });

    it("non-owner cannot change oracle address", async function () {
      await expect(circleRateOracle.connect(user1).setOracleAddress(user1.address))
        .to.be.revertedWith("CircleRateOracle: not owner");
    });
  });
});
