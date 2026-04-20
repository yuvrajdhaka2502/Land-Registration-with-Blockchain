// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./UserRegistry.sol";

/**
 * @title AadhaarOracle
 * @notice Oracle pattern for Aadhaar-based KYC verification.
 *
 * Architecture (mirrors Chainlink's request-response model):
 *   1. User enters 12-digit Aadhaar on the frontend.
 *   2. Frontend calls the off-chain Oracle backend (Express server).
 *   3. Backend validates identity + OTP, then calls `confirmVerification()`
 *      using the oracle's private key.
 *   4. This contract updates UserRegistry's KYC status on-chain.
 *
 * The `onlyOracle` modifier ensures only the trusted backend wallet can
 * call the verification function — same trust model as Chainlink nodes.
 */
contract AadhaarOracle {

    // ── State ────────────────────────────────────────────────────────────────

    address public owner;
    address public oracleAddress;       // backend wallet authorised to call confirmVerification
    UserRegistry public userRegistry;

    mapping(address => bool)    public verificationRequested;
    mapping(address => bytes32) public aadhaarHashes;  // wallet → keccak256(aadhaar)

    // ── Events ───────────────────────────────────────────────────────────────

    event VerificationRequested(address indexed wallet);
    event VerificationConfirmed(address indexed wallet, bytes32 aadhaarHash);
    event OracleAddressUpdated(address indexed oldOracle, address indexed newOracle);

    // ── Modifiers ────────────────────────────────────────────────────────────

    modifier onlyOwner() {
        require(msg.sender == owner, "AadhaarOracle: caller is not owner");
        _;
    }

    modifier onlyOracle() {
        require(msg.sender == oracleAddress, "AadhaarOracle: caller is not oracle");
        _;
    }

    // ── Constructor ──────────────────────────────────────────────────────────

    constructor(address _userRegistry, address _oracleAddress) {
        owner         = msg.sender;
        userRegistry  = UserRegistry(_userRegistry);
        oracleAddress = _oracleAddress;
    }

    // ── User-facing: request verification ────────────────────────────────────

    /**
     * @notice User calls this to signal intent to verify.
     *         The frontend then sends the Aadhaar number to the off-chain backend.
     */
    function requestVerification() external {
        require(
            userRegistry.isRegistered(msg.sender),
            "AadhaarOracle: wallet not registered"
        );
        require(
            !userRegistry.isKYCVerified(msg.sender),
            "AadhaarOracle: already verified"
        );

        verificationRequested[msg.sender] = true;
        emit VerificationRequested(msg.sender);
    }

    // ── Oracle callback: confirm verification ────────────────────────────────

    /**
     * @notice Called by the oracle backend after successful OTP verification.
     * @param _wallet      The user's wallet address.
     * @param _aadhaarHash keccak256 of the 12-digit Aadhaar number.
     */
    function confirmVerification(address _wallet, bytes32 _aadhaarHash)
        external
        onlyOracle
    {
        require(
            verificationRequested[_wallet],
            "AadhaarOracle: verification not requested"
        );

        aadhaarHashes[_wallet] = _aadhaarHash;
        verificationRequested[_wallet] = false;

        // Update KYC status in UserRegistry
        userRegistry.setKYCVerified(_wallet, _aadhaarHash);

        emit VerificationConfirmed(_wallet, _aadhaarHash);
    }

    // ── Admin functions ──────────────────────────────────────────────────────

    function setOracleAddress(address _newOracle) external onlyOwner {
        emit OracleAddressUpdated(oracleAddress, _newOracle);
        oracleAddress = _newOracle;
    }

    // ── View functions ───────────────────────────────────────────────────────

    function isVerificationPending(address _wallet) external view returns (bool) {
        return verificationRequested[_wallet];
    }
}
