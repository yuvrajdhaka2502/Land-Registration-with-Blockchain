// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./UserRegistry.sol";

/**
 * @title LandRegistry (v3 — Stage 2+3 combined)
 * @notice Core contract for the decentralized land registration system.
 *
 * Stage 2 upgrades (from v1):
 *   - Multi-department approval: approveAsPatwari(), approveAsSurveyOfficer(), finalApproval()
 *   - Role-gated modifiers: onlyPatwari, onlySurveyOfficer, onlySubRegistrar
 *   - Sequential approval enforcement
 *
 * Stage 3 upgrades:
 *   - completeMutation() — Patwari updates Record of Rights (Dakhil Kharij)
 *   - flagDispute() / resolveDispute() — encumbrance + dispute mechanism
 *   - TransferRecord / DisputeRecord structs for encumbrance history
 *   - onlyClearEncumbrance guard on all transfer functions
 */
contract LandRegistry {

    // ── Enums ────────────────────────────────────────────────────────────────

    enum LandStatus {
        REGISTERED,         // 0  — seller submitted, awaiting Patwari verification
        VERIFIED,           // 1  — Patwari verified; available for buyer requests
        REQUEST_PENDING,    // 2  — buyer sent a request, awaiting seller response
        SELLER_APPROVED,    // 3  — seller accepted the buyer's request
        PATWARI_APPROVED,   // 4  — Revenue Dept approval
        SURVEY_APPROVED,    // 5  — Survey Dept approval
        PAYMENT_UPLOADED,   // 6  — buyer uploaded off-chain payment proof to IPFS
        PAYMENT_CONFIRMED,  // 7  — seller acknowledged receipt of payment
        TRANSFER_COMPLETE,  // 8  — Sub-Registrar finalized transfer on-chain
        MUTATION_COMPLETE   // 9  — Patwari completed Dakhil Kharij (Record of Rights)
    }

    enum EncumbranceStatus {
        Clear,      // 0
        Disputed,   // 1
        Mortgaged,  // 2
        CourtOrder  // 3
    }

    // ── Structs ──────────────────────────────────────────────────────────────

    struct TransferRecord {
        address from;
        address to;
        uint256 timestamp;
        uint256 declaredValue;
    }

    struct DisputeRecord {
        address flaggedBy;
        string  reason;
        uint256 timestamp;
        bool    resolved;
        string  resolution;
        address resolvedBy;
        uint256 resolvedAt;
    }

    struct LandParcel {
        uint256          id;
        string           ulpin;
        address          owner;
        address          recordOfRightsHolder;
        address          pendingBuyer;
        string           stateCode;
        string           districtCode;
        string           tehsil;
        string           surveyNumber;
        uint256          areaInSqFt;
        int256           latitude;
        int256           longitude;
        uint256          declaredValue;
        LandStatus       status;
        EncumbranceStatus encumbrance;
        string           saleDeedCid;
        string           paymentProofCid;
    }

    // ── State ────────────────────────────────────────────────────────────────

    UserRegistry public userRegistry;
    address       public admin;
    uint256       public parcelCount;

    mapping(uint256 => LandParcel) public parcels;
    uint256[]                      public allParcelIds;
    mapping(address => uint256[])  public ownerParcelIds;

    // Encumbrance history
    mapping(uint256 => TransferRecord[]) public transferHistory;
    mapping(uint256 => DisputeRecord[])  public disputeHistory;

    // ── Events ───────────────────────────────────────────────────────────────

    event LandRegistered(uint256 indexed parcelId, address indexed owner, string ulpin);
    event LandVerified(uint256 indexed parcelId, address indexed verifiedBy);
    event TransferRequested(uint256 indexed parcelId, address indexed buyer);
    event RequestApproved(uint256 indexed parcelId, address indexed seller);
    event RequestRejected(uint256 indexed parcelId, address indexed seller);
    event PatwariApproved(uint256 indexed parcelId, address indexed patwari);
    event SurveyApproved(uint256 indexed parcelId, address indexed surveyOfficer);
    event SubRegistrarApproved(uint256 indexed parcelId, address indexed subRegistrar);
    event PaymentProofUploaded(uint256 indexed parcelId, string cid);
    event PaymentAcknowledged(uint256 indexed parcelId);
    event OwnershipTransferred(uint256 indexed parcelId, address indexed from, address indexed to);
    event MutationCompleted(uint256 indexed parcelId, address indexed newOwner);
    event DisputeFlagged(uint256 indexed parcelId, address indexed flaggedBy, string reason);
    event DisputeResolved(uint256 indexed parcelId, address indexed resolvedBy, string resolution);

    // ── Modifiers ────────────────────────────────────────────────────────────

    modifier onlyAdmin() {
        require(msg.sender == admin, "LandRegistry: caller is not admin");
        _;
    }

    modifier onlyParcelOwner(uint256 _parcelId) {
        require(parcels[_parcelId].owner == msg.sender, "LandRegistry: not the parcel owner");
        _;
    }

    modifier onlyKYCVerified() {
        require(userRegistry.isKYCVerified(msg.sender), "LandRegistry: KYC not verified");
        _;
    }

    modifier parcelExists(uint256 _parcelId) {
        require(_parcelId > 0 && _parcelId <= parcelCount, "LandRegistry: parcel does not exist");
        _;
    }

    modifier onlyClearEncumbrance(uint256 _parcelId) {
        require(
            parcels[_parcelId].encumbrance == EncumbranceStatus.Clear,
            "LandRegistry: land is encumbered"
        );
        _;
    }

    modifier onlyPatwari() {
        require(
            userRegistry.getUserRole(msg.sender) == UserRegistry.Role.Patwari,
            "LandRegistry: caller is not Patwari"
        );
        _;
    }

    modifier onlySurveyOfficer() {
        require(
            userRegistry.getUserRole(msg.sender) == UserRegistry.Role.SurveyOfficer,
            "LandRegistry: caller is not Survey Officer"
        );
        _;
    }

    modifier onlySubRegistrar() {
        require(
            userRegistry.getUserRole(msg.sender) == UserRegistry.Role.SubRegistrar,
            "LandRegistry: caller is not Sub-Registrar"
        );
        _;
    }

    // ── Constructor ──────────────────────────────────────────────────────────

    constructor(address _userRegistry) {
        admin        = msg.sender;
        userRegistry = UserRegistry(_userRegistry);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // STEP 1: Seller registers land
    // ═══════════════════════════════════════════════════════════════════════════

    function registerLand(
        string memory _stateCode,
        string memory _districtCode,
        string memory _tehsil,
        string memory _surveyNumber,
        uint256 _areaInSqFt,
        int256  _latitude,
        int256  _longitude,
        uint256 _declaredValue,
        string  memory _saleDeedCid
    ) external onlyKYCVerified returns (uint256) {
        require(
            userRegistry.getUserRole(msg.sender) == UserRegistry.Role.Seller,
            "LandRegistry: only sellers can register land"
        );
        require(_areaInSqFt > 0, "LandRegistry: area must be positive");
        require(bytes(_saleDeedCid).length > 0, "LandRegistry: sale deed CID required");

        parcelCount++;
        uint256 newId = parcelCount;

        string memory ulpin = _generateULPIN(_stateCode, _districtCode, newId);

        parcels[newId] = LandParcel({
            id:                   newId,
            ulpin:                ulpin,
            owner:                msg.sender,
            recordOfRightsHolder: msg.sender,
            pendingBuyer:         address(0),
            stateCode:            _stateCode,
            districtCode:         _districtCode,
            tehsil:               _tehsil,
            surveyNumber:         _surveyNumber,
            areaInSqFt:           _areaInSqFt,
            latitude:             _latitude,
            longitude:            _longitude,
            declaredValue:        _declaredValue,
            status:               LandStatus.REGISTERED,
            encumbrance:          EncumbranceStatus.Clear,
            saleDeedCid:          _saleDeedCid,
            paymentProofCid:      ""
        });

        allParcelIds.push(newId);
        ownerParcelIds[msg.sender].push(newId);

        emit LandRegistered(newId, msg.sender, ulpin);
        return newId;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // STEP 2: Patwari verifies land (Revenue Dept)
    // ═══════════════════════════════════════════════════════════════════════════

    function verifyLand(uint256 _parcelId)
        external
        onlyKYCVerified
        onlyPatwari
        parcelExists(_parcelId)
    {
        require(
            parcels[_parcelId].status == LandStatus.REGISTERED,
            "LandRegistry: parcel is not in REGISTERED state"
        );
        parcels[_parcelId].status = LandStatus.VERIFIED;
        emit LandVerified(_parcelId, msg.sender);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // STEP 3: Buyer requests transfer
    // ═══════════════════════════════════════════════════════════════════════════

    function requestTransfer(uint256 _parcelId)
        external
        onlyKYCVerified
        parcelExists(_parcelId)
        onlyClearEncumbrance(_parcelId)
    {
        require(
            userRegistry.getUserRole(msg.sender) == UserRegistry.Role.Buyer,
            "LandRegistry: only buyers can request a transfer"
        );
        require(
            parcels[_parcelId].status == LandStatus.VERIFIED,
            "LandRegistry: parcel is not available"
        );
        require(
            parcels[_parcelId].owner != msg.sender,
            "LandRegistry: cannot request own parcel"
        );

        parcels[_parcelId].status       = LandStatus.REQUEST_PENDING;
        parcels[_parcelId].pendingBuyer = msg.sender;

        emit TransferRequested(_parcelId, msg.sender);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // STEP 4: Seller approves or rejects
    // ═══════════════════════════════════════════════════════════════════════════

    function approveRequest(uint256 _parcelId)
        external
        onlyParcelOwner(_parcelId)
        parcelExists(_parcelId)
    {
        require(
            parcels[_parcelId].status == LandStatus.REQUEST_PENDING,
            "LandRegistry: no pending request"
        );
        parcels[_parcelId].status = LandStatus.SELLER_APPROVED;
        emit RequestApproved(_parcelId, msg.sender);
    }

    function rejectRequest(uint256 _parcelId)
        external
        onlyParcelOwner(_parcelId)
        parcelExists(_parcelId)
    {
        require(
            parcels[_parcelId].status == LandStatus.REQUEST_PENDING,
            "LandRegistry: no pending request"
        );
        parcels[_parcelId].status       = LandStatus.VERIFIED;
        parcels[_parcelId].pendingBuyer = address(0);
        emit RequestRejected(_parcelId, msg.sender);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // STEP 5: Patwari approves transfer (Revenue Dept — 1st approval)
    // ═══════════════════════════════════════════════════════════════════════════

    function approveAsPatwari(uint256 _parcelId)
        external
        onlyKYCVerified
        onlyPatwari
        parcelExists(_parcelId)
        onlyClearEncumbrance(_parcelId)
    {
        require(
            parcels[_parcelId].status == LandStatus.SELLER_APPROVED,
            "LandRegistry: seller has not approved yet"
        );
        parcels[_parcelId].status = LandStatus.PATWARI_APPROVED;
        emit PatwariApproved(_parcelId, msg.sender);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // STEP 6: Survey Officer approves (Survey & Settlement Dept — 2nd approval)
    // ═══════════════════════════════════════════════════════════════════════════

    function approveAsSurveyOfficer(uint256 _parcelId)
        external
        onlyKYCVerified
        onlySurveyOfficer
        parcelExists(_parcelId)
        onlyClearEncumbrance(_parcelId)
    {
        require(
            parcels[_parcelId].status == LandStatus.PATWARI_APPROVED,
            "LandRegistry: Patwari has not approved yet"
        );
        parcels[_parcelId].status = LandStatus.SURVEY_APPROVED;
        emit SurveyApproved(_parcelId, msg.sender);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // STEP 7: Buyer uploads payment proof
    // ═══════════════════════════════════════════════════════════════════════════

    function uploadPaymentProof(uint256 _parcelId, string memory _paymentCid)
        external
        parcelExists(_parcelId)
    {
        LandParcel storage p = parcels[_parcelId];
        require(p.pendingBuyer == msg.sender, "LandRegistry: not the pending buyer");
        require(
            p.status == LandStatus.SURVEY_APPROVED,
            "LandRegistry: approvals not yet complete"
        );
        require(bytes(_paymentCid).length > 0, "LandRegistry: payment CID required");

        p.paymentProofCid = _paymentCid;
        p.status          = LandStatus.PAYMENT_UPLOADED;
        emit PaymentProofUploaded(_parcelId, _paymentCid);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // STEP 8: Seller acknowledges payment
    // ═══════════════════════════════════════════════════════════════════════════

    function acknowledgePayment(uint256 _parcelId)
        external
        onlyParcelOwner(_parcelId)
        parcelExists(_parcelId)
    {
        require(
            parcels[_parcelId].status == LandStatus.PAYMENT_UPLOADED,
            "LandRegistry: payment proof not uploaded yet"
        );
        parcels[_parcelId].status = LandStatus.PAYMENT_CONFIRMED;
        emit PaymentAcknowledged(_parcelId);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // STEP 9: Sub-Registrar finalizes transfer (Registration Dept — 3rd approval)
    // ═══════════════════════════════════════════════════════════════════════════

    function finalApproval(uint256 _parcelId)
        external
        onlyKYCVerified
        onlySubRegistrar
        parcelExists(_parcelId)
        onlyClearEncumbrance(_parcelId)
    {
        LandParcel storage p = parcels[_parcelId];
        require(
            p.status == LandStatus.PAYMENT_CONFIRMED,
            "LandRegistry: payment not confirmed by seller"
        );

        address previousOwner = p.owner;
        address newOwner      = p.pendingBuyer;

        // Update ownership
        p.owner        = newOwner;
        p.pendingBuyer = address(0);
        p.status       = LandStatus.TRANSFER_COMPLETE;

        ownerParcelIds[newOwner].push(_parcelId);

        // Record transfer in history
        transferHistory[_parcelId].push(TransferRecord({
            from:          previousOwner,
            to:            newOwner,
            timestamp:     block.timestamp,
            declaredValue: p.declaredValue
        }));

        emit OwnershipTransferred(_parcelId, previousOwner, newOwner);
        emit SubRegistrarApproved(_parcelId, msg.sender);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // STEP 10: Patwari completes mutation (Dakhil Kharij)
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Patwari updates the Record of Rights to reflect the new owner.
     *         This is the mandatory 2025 reform step — ownership transfer is
     *         incomplete until mutation is recorded.
     */
    function completeMutation(uint256 _parcelId)
        external
        onlyKYCVerified
        onlyPatwari
        parcelExists(_parcelId)
    {
        LandParcel storage p = parcels[_parcelId];
        require(
            p.status == LandStatus.TRANSFER_COMPLETE,
            "LandRegistry: transfer not yet complete"
        );

        p.recordOfRightsHolder = p.owner;
        p.status               = LandStatus.MUTATION_COMPLETE;

        emit MutationCompleted(_parcelId, p.owner);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // DISPUTE MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Any KYC-verified user can flag a dispute on a parcel.
     *         Immediately freezes the parcel from all transfers.
     */
    function flagDispute(uint256 _parcelId, string memory _reason)
        external
        onlyKYCVerified
        parcelExists(_parcelId)
    {
        require(bytes(_reason).length > 0, "LandRegistry: reason required");
        require(
            parcels[_parcelId].encumbrance == EncumbranceStatus.Clear,
            "LandRegistry: already encumbered"
        );

        parcels[_parcelId].encumbrance = EncumbranceStatus.Disputed;

        disputeHistory[_parcelId].push(DisputeRecord({
            flaggedBy:  msg.sender,
            reason:     _reason,
            timestamp:  block.timestamp,
            resolved:   false,
            resolution: "",
            resolvedBy: address(0),
            resolvedAt: 0
        }));

        emit DisputeFlagged(_parcelId, msg.sender, _reason);
    }

    /**
     * @notice Only Sub-Registrar can resolve disputes and clear encumbrance.
     */
    function resolveDispute(uint256 _parcelId, string memory _resolution)
        external
        onlyKYCVerified
        onlySubRegistrar
        parcelExists(_parcelId)
    {
        require(
            parcels[_parcelId].encumbrance == EncumbranceStatus.Disputed,
            "LandRegistry: no active dispute"
        );
        require(bytes(_resolution).length > 0, "LandRegistry: resolution required");

        parcels[_parcelId].encumbrance = EncumbranceStatus.Clear;

        // Mark the last dispute as resolved
        DisputeRecord[] storage disputes = disputeHistory[_parcelId];
        if (disputes.length > 0) {
            DisputeRecord storage lastDispute = disputes[disputes.length - 1];
            lastDispute.resolved   = true;
            lastDispute.resolution = _resolution;
            lastDispute.resolvedBy = msg.sender;
            lastDispute.resolvedAt = block.timestamp;
        }

        emit DisputeResolved(_parcelId, msg.sender, _resolution);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // READ / VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════

    function getLand(uint256 _parcelId)
        external view parcelExists(_parcelId) returns (LandParcel memory)
    {
        return parcels[_parcelId];
    }

    function getAllParcels() external view returns (LandParcel[] memory) {
        LandParcel[] memory result = new LandParcel[](parcelCount);
        for (uint256 i = 0; i < parcelCount; i++) {
            result[i] = parcels[i + 1];
        }
        return result;
    }

    function getOwnerParcelIds(address _owner) external view returns (uint256[] memory) {
        return ownerParcelIds[_owner];
    }

    function getAvailableParcels() external view returns (LandParcel[] memory) {
        uint256 count = 0;
        for (uint256 i = 1; i <= parcelCount; i++) {
            if (
                parcels[i].status == LandStatus.VERIFIED &&
                parcels[i].encumbrance == EncumbranceStatus.Clear
            ) {
                count++;
            }
        }
        LandParcel[] memory result = new LandParcel[](count);
        uint256 idx = 0;
        for (uint256 i = 1; i <= parcelCount; i++) {
            if (
                parcels[i].status == LandStatus.VERIFIED &&
                parcels[i].encumbrance == EncumbranceStatus.Clear
            ) {
                result[idx++] = parcels[i];
            }
        }
        return result;
    }

    /**
     * @notice Get the full transfer history for a parcel (Encumbrance Certificate data).
     */
    function getTransferHistory(uint256 _parcelId)
        external view parcelExists(_parcelId)
        returns (TransferRecord[] memory)
    {
        return transferHistory[_parcelId];
    }

    /**
     * @notice Get the full dispute history for a parcel.
     */
    function getDisputeHistory(uint256 _parcelId)
        external view parcelExists(_parcelId)
        returns (DisputeRecord[] memory)
    {
        return disputeHistory[_parcelId];
    }

    // ── Internal Helpers ─────────────────────────────────────────────────────

    function _generateULPIN(
        string memory _stateCode,
        string memory _districtCode,
        uint256 _id
    ) internal pure returns (string memory) {
        return string(
            abi.encodePacked(
                _toUpperBytes(_stateCode),
                "-",
                _toUpperBytes(_districtCode),
                "-",
                _padUint(_id, 6)
            )
        );
    }

    function _padUint(uint256 _num, uint256 _digits) internal pure returns (bytes memory) {
        bytes memory result = new bytes(_digits);
        uint256 n = _num;
        for (uint256 i = _digits; i > 0; i--) {
            result[i - 1] = bytes1(uint8(48 + (n % 10)));
            n /= 10;
        }
        return result;
    }

    function _toUpperBytes(string memory _str) internal pure returns (bytes memory) {
        bytes memory b = bytes(_str);
        bytes memory upper = new bytes(b.length);
        for (uint256 i = 0; i < b.length; i++) {
            uint8 c = uint8(b[i]);
            if (c >= 97 && c <= 122) {
                upper[i] = bytes1(c - 32);
            } else {
                upper[i] = b[i];
            }
        }
        return upper;
    }
}
