const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("LandRegistry", function () {
  let userRegistry, landRegistry;
  let admin, seller, buyer, patwari, surveyOfficer, subRegistrar;
  const aadhaarHash = ethers.keccak256(ethers.toUtf8Bytes("123456789012"));

  async function registerAndVerify(signer, name, role) {
    await userRegistry.connect(signer).registerUser(name, `${name}@test.com`, "9999", role);
    await userRegistry.connect(admin).setKYCVerified(signer.address, aadhaarHash);
  }

  beforeEach(async function () {
    [admin, seller, buyer, patwari, surveyOfficer, subRegistrar] = await ethers.getSigners();

    const URFactory = await ethers.getContractFactory("UserRegistry");
    userRegistry = await URFactory.deploy();
    await userRegistry.waitForDeployment();

    const LRFactory = await ethers.getContractFactory("LandRegistry");
    landRegistry = await LRFactory.deploy(await userRegistry.getAddress());
    await landRegistry.waitForDeployment();

    // Register and KYC-verify all test accounts
    await registerAndVerify(seller, "Seller", 1);
    await registerAndVerify(buyer, "Buyer", 2);
    await registerAndVerify(patwari, "Patwari", 3);
    await registerAndVerify(surveyOfficer, "SurveyOfficer", 4);
    await registerAndVerify(subRegistrar, "SubRegistrar", 5);
  });

  describe("Land Registration", function () {
    it("seller should register land and get ULPIN", async function () {
      const tx = await landRegistry.connect(seller).registerLand(
        "RJ", "JP", "Jaipur North", "142/B", 1200, 26912434, 75787270, 500000000, "Qm123"
      );
      const receipt = await tx.wait();
      const parcel = await landRegistry.getLand(1);
      expect(parcel.ulpin).to.equal("RJ-JP-000001");
      expect(parcel.owner).to.equal(seller.address);
      expect(parcel.status).to.equal(0); // REGISTERED
      expect(parcel.encumbrance).to.equal(0); // Clear
    });

    it("should emit LandRegistered event", async function () {
      await expect(
        landRegistry.connect(seller).registerLand("RJ", "JP", "Jaipur", "142", 1200, 26000000, 75000000, 100000, "cid1")
      ).to.emit(landRegistry, "LandRegistered");
    });

    it("buyer should not register land", async function () {
      await expect(
        landRegistry.connect(buyer).registerLand("RJ", "JP", "Test", "1", 100, 26000000, 75000000, 100000, "cid")
      ).to.be.revertedWith("LandRegistry: only sellers can register land");
    });

    it("should reject registration without KYC", async function () {
      const [,,,,,,, unverified] = await ethers.getSigners();
      await userRegistry.connect(unverified).registerUser("NoKYC", "no@kyc.com", "000", 1);
      await expect(
        landRegistry.connect(unverified).registerLand("RJ", "JP", "Test", "1", 100, 26000000, 75000000, 100000, "cid")
      ).to.be.revertedWith("LandRegistry: KYC not verified");
    });
  });

  describe("Full 10-Step Transfer Workflow", function () {
    beforeEach(async function () {
      // Register a land parcel
      await landRegistry.connect(seller).registerLand(
        "RJ", "JP", "Jaipur North", "142/B", 1200, 26912434, 75787270, 500000000, "QmSaleDeed"
      );
    });

    it("Step 2: Patwari verifies land", async function () {
      await landRegistry.connect(patwari).verifyLand(1);
      expect((await landRegistry.getLand(1)).status).to.equal(1); // VERIFIED
    });

    it("Step 2: Non-Patwari cannot verify", async function () {
      await expect(landRegistry.connect(buyer).verifyLand(1))
        .to.be.revertedWith("LandRegistry: caller is not Patwari");
    });

    it("Step 3: Buyer requests transfer", async function () {
      await landRegistry.connect(patwari).verifyLand(1);
      await landRegistry.connect(buyer).requestTransfer(1);
      const p = await landRegistry.getLand(1);
      expect(p.status).to.equal(2); // REQUEST_PENDING
      expect(p.pendingBuyer).to.equal(buyer.address);
    });

    it("Step 3: Owner cannot request own parcel", async function () {
      await landRegistry.connect(patwari).verifyLand(1);
      await expect(landRegistry.connect(seller).requestTransfer(1))
        .to.be.revertedWith("LandRegistry: only buyers can request a transfer");
    });

    it("Step 4: Seller approves request", async function () {
      await landRegistry.connect(patwari).verifyLand(1);
      await landRegistry.connect(buyer).requestTransfer(1);
      await landRegistry.connect(seller).approveRequest(1);
      expect((await landRegistry.getLand(1)).status).to.equal(3); // SELLER_APPROVED
    });

    it("Step 4: Seller can reject request", async function () {
      await landRegistry.connect(patwari).verifyLand(1);
      await landRegistry.connect(buyer).requestTransfer(1);
      await landRegistry.connect(seller).rejectRequest(1);
      const p = await landRegistry.getLand(1);
      expect(p.status).to.equal(1); // back to VERIFIED
      expect(p.pendingBuyer).to.equal(ethers.ZeroAddress);
    });

    it("Steps 5-10: Complete transfer workflow", async function () {
      // Step 2: Verify
      await landRegistry.connect(patwari).verifyLand(1);
      // Step 3: Request
      await landRegistry.connect(buyer).requestTransfer(1);
      // Step 4: Seller approves
      await landRegistry.connect(seller).approveRequest(1);
      // Step 5: Patwari approves
      await landRegistry.connect(patwari).approveAsPatwari(1);
      expect((await landRegistry.getLand(1)).status).to.equal(4);
      // Step 6: Survey Officer approves
      await landRegistry.connect(surveyOfficer).approveAsSurveyOfficer(1);
      expect((await landRegistry.getLand(1)).status).to.equal(5);
      // Step 7: Buyer uploads payment proof
      await landRegistry.connect(buyer).uploadPaymentProof(1, "QmPaymentReceipt");
      expect((await landRegistry.getLand(1)).status).to.equal(6);
      // Step 8: Seller acknowledges payment
      await landRegistry.connect(seller).acknowledgePayment(1);
      expect((await landRegistry.getLand(1)).status).to.equal(7);
      // Step 9: Sub-Registrar finalizes
      await landRegistry.connect(subRegistrar).finalApproval(1);
      const after9 = await landRegistry.getLand(1);
      expect(after9.status).to.equal(8); // TRANSFER_COMPLETE
      expect(after9.owner).to.equal(buyer.address);
      // Step 10: Patwari completes mutation
      await landRegistry.connect(patwari).completeMutation(1);
      const after10 = await landRegistry.getLand(1);
      expect(after10.status).to.equal(9); // MUTATION_COMPLETE
      expect(after10.recordOfRightsHolder).to.equal(buyer.address);
    });

    it("should enforce sequential approval order", async function () {
      await landRegistry.connect(patwari).verifyLand(1);
      await landRegistry.connect(buyer).requestTransfer(1);
      await landRegistry.connect(seller).approveRequest(1);

      // Survey officer cannot approve before Patwari
      await expect(landRegistry.connect(surveyOfficer).approveAsSurveyOfficer(1))
        .to.be.revertedWith("LandRegistry: Patwari has not approved yet");
    });

    it("should record transfer history", async function () {
      // Complete full workflow
      await landRegistry.connect(patwari).verifyLand(1);
      await landRegistry.connect(buyer).requestTransfer(1);
      await landRegistry.connect(seller).approveRequest(1);
      await landRegistry.connect(patwari).approveAsPatwari(1);
      await landRegistry.connect(surveyOfficer).approveAsSurveyOfficer(1);
      await landRegistry.connect(buyer).uploadPaymentProof(1, "QmPay");
      await landRegistry.connect(seller).acknowledgePayment(1);
      await landRegistry.connect(subRegistrar).finalApproval(1);

      const history = await landRegistry.getTransferHistory(1);
      expect(history.length).to.equal(1);
      expect(history[0].from).to.equal(seller.address);
      expect(history[0].to).to.equal(buyer.address);
    });
  });

  describe("Dispute Management", function () {
    beforeEach(async function () {
      await landRegistry.connect(seller).registerLand(
        "RJ", "JP", "Jaipur", "100", 1000, 26000000, 75000000, 100000, "cid"
      );
      await landRegistry.connect(patwari).verifyLand(1);
    });

    it("KYC-verified user can flag dispute", async function () {
      await landRegistry.connect(buyer).flagDispute(1, "Ownership contested");
      const p = await landRegistry.getLand(1);
      expect(p.encumbrance).to.equal(1); // Disputed
    });

    it("dispute freezes transfers", async function () {
      await landRegistry.connect(buyer).flagDispute(1, "Contested");
      await expect(landRegistry.connect(buyer).requestTransfer(1))
        .to.be.revertedWith("LandRegistry: land is encumbered");
    });

    it("Sub-Registrar can resolve dispute", async function () {
      await landRegistry.connect(buyer).flagDispute(1, "Contested");
      await landRegistry.connect(subRegistrar).resolveDispute(1, "Resolved — ownership confirmed.");
      const p = await landRegistry.getLand(1);
      expect(p.encumbrance).to.equal(0); // Clear
    });

    it("non-SubRegistrar cannot resolve dispute", async function () {
      await landRegistry.connect(buyer).flagDispute(1, "Contested");
      await expect(
        landRegistry.connect(patwari).resolveDispute(1, "Resolved")
      ).to.be.revertedWith("LandRegistry: caller is not Sub-Registrar");
    });

    it("dispute history is recorded", async function () {
      await landRegistry.connect(buyer).flagDispute(1, "Boundary issue");
      await landRegistry.connect(subRegistrar).resolveDispute(1, "Survey confirms boundaries.");
      const history = await landRegistry.getDisputeHistory(1);
      expect(history.length).to.equal(1);
      expect(history[0].resolved).to.be.true;
      expect(history[0].resolution).to.equal("Survey confirms boundaries.");
    });
  });

  describe("View Functions", function () {
    it("getAllParcels returns all registered parcels", async function () {
      await landRegistry.connect(seller).registerLand("RJ", "JP", "T1", "1", 100, 0, 0, 100, "c1");
      await landRegistry.connect(seller).registerLand("MH", "MU", "T2", "2", 200, 0, 0, 200, "c2");
      const all = await landRegistry.getAllParcels();
      expect(all.length).to.equal(2);
    });

    it("getAvailableParcels returns only verified + clear parcels", async function () {
      await landRegistry.connect(seller).registerLand("RJ", "JP", "T1", "1", 100, 0, 0, 100, "c1");
      await landRegistry.connect(seller).registerLand("RJ", "JP", "T2", "2", 200, 0, 0, 200, "c2");
      await landRegistry.connect(patwari).verifyLand(1);
      // Only parcel 1 is verified
      const available = await landRegistry.getAvailableParcels();
      expect(available.length).to.equal(1);
      expect(available[0].id).to.equal(1);
    });

    it("getOwnerParcelIds returns correct IDs", async function () {
      await landRegistry.connect(seller).registerLand("RJ", "JP", "T1", "1", 100, 0, 0, 100, "c1");
      await landRegistry.connect(seller).registerLand("RJ", "JP", "T2", "2", 200, 0, 0, 200, "c2");
      const ids = await landRegistry.getOwnerParcelIds(seller.address);
      expect(ids.length).to.equal(2);
    });
  });
});
