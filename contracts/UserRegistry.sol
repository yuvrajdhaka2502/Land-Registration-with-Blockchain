// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title UserRegistry
 * @notice Manages user registration, role assignment, and KYC status for
 *         the decentralized land registration system.
 *
 * Stage 1:  Admin manually calls setKYCVerified() from the dashboard.
 * Stage 2+: AadhaarOracle.sol calls setKYCVerified() after OTP confirmation.
 */
contract UserRegistry {

    // ─── Enums ────────────────────────────────────────────────────────────────

    enum Role {
        None,           // 0 — unregistered / default
        Seller,         // 1 — land owner
        Buyer,          // 2 — prospective purchaser
        Patwari,        // 3 — Revenue Dept (Lekhpal / Patwari)
        SurveyOfficer,  // 4 — Survey & Settlement Dept
        SubRegistrar    // 5 — Registration Dept
    }

    // ─── Structs ──────────────────────────────────────────────────────────────

    struct User {
        address walletAddress;
        string  name;
        string  email;
        string  phone;
        Role    role;
        bool    isKYCVerified;
        bytes32 aadhaarHash;   // keccak256(aadhaarNumber) — raw number never stored
        bool    isRegistered;
    }

    // ─── State ────────────────────────────────────────────────────────────────

    address public admin;
    address public aadhaarOracle;   // Stage 2: oracle contract can also call setKYCVerified
    mapping(address => User) private users;

    // ─── Events ───────────────────────────────────────────────────────────────

    event UserRegistered(address indexed wallet, Role indexed role, string name);
    event KYCVerified(address indexed wallet);
    event RoleAssigned(address indexed wallet, Role newRole);

    // ─── Modifiers ────────────────────────────────────────────────────────────

    modifier onlyAdmin() {
        require(msg.sender == admin, "UserRegistry: caller is not admin");
        _;
    }

    modifier onlyAdminOrOracle() {
        require(
            msg.sender == admin || msg.sender == aadhaarOracle,
            "UserRegistry: caller is not admin or oracle"
        );
        _;
    }

    // ─── Constructor ──────────────────────────────────────────────────────────

    constructor() {
        admin = msg.sender;
    }

    // ─── Write Functions ──────────────────────────────────────────────────────

    /**
     * @notice Register a new user. Each wallet can only register once.
     * @param _name  Full name of the user.
     * @param _email Email address.
     * @param _phone Mobile number.
     * @param _role  Chosen role (cannot be None).
     */
    function registerUser(
        string memory _name,
        string memory _email,
        string memory _phone,
        Role _role
    ) external {
        require(!users[msg.sender].isRegistered, "UserRegistry: already registered");
        require(_role != Role.None, "UserRegistry: invalid role");

        users[msg.sender] = User({
            walletAddress: msg.sender,
            name:          _name,
            email:         _email,
            phone:         _phone,
            role:          _role,
            isKYCVerified: false,
            aadhaarHash:   bytes32(0),
            isRegistered:  true
        });

        emit UserRegistered(msg.sender, _role, _name);
    }

    /**
     * @notice Mark a wallet as KYC-verified and store the Aadhaar hash.
     *         Stage 1: called by admin manually.
     *         Stage 2: called by AadhaarOracle after OTP confirmation.
     * @param _wallet      Wallet address of the user being verified.
     * @param _aadhaarHash keccak256 hash of the user's 12-digit Aadhaar number.
     */
    function setKYCVerified(address _wallet, bytes32 _aadhaarHash) external onlyAdminOrOracle {
        require(users[_wallet].isRegistered, "UserRegistry: wallet not registered");
        require(!users[_wallet].isKYCVerified, "UserRegistry: already KYC verified");

        users[_wallet].isKYCVerified = true;
        users[_wallet].aadhaarHash   = _aadhaarHash;

        emit KYCVerified(_wallet);
    }

    /**
     * @notice Assign or change a user's role.
     *         Used to promote a registered user to a government official role.
     */
    function assignRole(address _wallet, Role _role) external onlyAdmin {
        require(users[_wallet].isRegistered, "UserRegistry: wallet not registered");
        require(_role != Role.None, "UserRegistry: invalid role");

        users[_wallet].role = _role;
        emit RoleAssigned(_wallet, _role);
    }

    /**
     * @notice Set the AadhaarOracle contract address so it can call setKYCVerified.
     */
    function setAadhaarOracle(address _oracle) external onlyAdmin {
        aadhaarOracle = _oracle;
    }

    // ─── Read Functions ───────────────────────────────────────────────────────

    function getUserDetails(address _wallet) external view returns (User memory) {
        return users[_wallet];
    }

    function isKYCVerified(address _wallet) external view returns (bool) {
        return users[_wallet].isKYCVerified;
    }

    function getUserRole(address _wallet) external view returns (Role) {
        return users[_wallet].role;
    }

    function isRegistered(address _wallet) external view returns (bool) {
        return users[_wallet].isRegistered;
    }

    function getAdmin() external view returns (address) {
        return admin;
    }
}
