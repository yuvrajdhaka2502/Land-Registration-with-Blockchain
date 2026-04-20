// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title CircleRateOracle
 * @notice Stores district-level circle rates (guideline values) and calculates
 *         stamp duty, registration fee, and cess for land transactions.
 *
 * Circle rates are government-mandated minimum property values per locality.
 * Any transaction declared below the circle rate is automatically flagged for
 * undervaluation — a common tax evasion tactic in Indian real estate.
 *
 * Oracle pattern: The off-chain backend periodically calls `updateCircleRate()`
 * to keep on-chain rates in sync with state revenue department data.
 *
 * Rates for 3 states: Rajasthan (RJ), Maharashtra (MH), Karnataka (KA)
 */
contract CircleRateOracle {

    // ── Structs ──────────────────────────────────────────────────────────────

    struct StampDutyBreakdown {
        uint256 stampDuty;         // in paisa
        uint256 registrationFee;   // in paisa
        uint256 cess;              // in paisa
        uint256 totalFees;         // in paisa
        uint256 stampDutyRate;     // basis points (e.g. 600 = 6%)
        uint256 regFeeRate;        // basis points
        uint256 cessRate;          // basis points
    }

    struct CircleRateInfo {
        uint256 ratePerSqFt;       // in paisa per sq.ft
        uint256 lastUpdated;       // block.timestamp
        bool    exists;
    }

    // ── State ────────────────────────────────────────────────────────────────

    address public owner;
    address public oracleAddress;

    // key = keccak256(stateCode, districtCode) → rate info
    mapping(bytes32 => CircleRateInfo) public circleRates;

    // State-level stamp duty rates in basis points (1% = 100 bp)
    // stateCode hash → rates
    mapping(bytes32 => uint256) public stampDutyRates;
    mapping(bytes32 => uint256) public registrationFeeRates;
    mapping(bytes32 => uint256) public cessRates;

    // ── Events ───────────────────────────────────────────────────────────────

    event CircleRateUpdated(
        string stateCode,
        string districtCode,
        uint256 ratePerSqFt,
        uint256 timestamp
    );

    // ── Modifiers ────────────────────────────────────────────────────────────

    modifier onlyOwner() {
        require(msg.sender == owner, "CircleRateOracle: not owner");
        _;
    }

    modifier onlyOracle() {
        require(
            msg.sender == oracleAddress || msg.sender == owner,
            "CircleRateOracle: not authorized"
        );
        _;
    }

    // ── Constructor ──────────────────────────────────────────────────────────

    constructor(address _oracleAddress) {
        owner         = msg.sender;
        oracleAddress = _oracleAddress;

        // ── Pre-seed state-level stamp duty rates ────────────────────────
        // Rajasthan: 6% stamp duty + 1% reg fee + 0.5% cess
        bytes32 rjKey = keccak256(abi.encodePacked("RJ"));
        stampDutyRates[rjKey]       = 600;  // 6.00%
        registrationFeeRates[rjKey] = 100;  // 1.00%
        cessRates[rjKey]            = 50;   // 0.50%

        // Maharashtra: 5% stamp duty + 1% reg fee + 1% cess (metro surcharge)
        bytes32 mhKey = keccak256(abi.encodePacked("MH"));
        stampDutyRates[mhKey]       = 500;
        registrationFeeRates[mhKey] = 100;
        cessRates[mhKey]            = 100;

        // Karnataka: 5% stamp duty + 1% reg fee + 0.5% cess
        bytes32 kaKey = keccak256(abi.encodePacked("KA"));
        stampDutyRates[kaKey]       = 500;
        registrationFeeRates[kaKey] = 100;
        cessRates[kaKey]            = 50;
    }

    // ── Oracle functions ─────────────────────────────────────────────────────

    /**
     * @notice Update the circle rate for a state+district pair.
     * @param _stateCode    2-letter state code (e.g. "RJ").
     * @param _districtCode 2-letter district code (e.g. "JP").
     * @param _ratePerSqFt  Rate in paisa per sq.ft (e.g. 350000 = Rs 3,500/sqft).
     */
    function updateCircleRate(
        string memory _stateCode,
        string memory _districtCode,
        uint256 _ratePerSqFt
    ) external onlyOracle {
        bytes32 key = _getKey(_stateCode, _districtCode);
        circleRates[key] = CircleRateInfo({
            ratePerSqFt: _ratePerSqFt,
            lastUpdated: block.timestamp,
            exists:      true
        });
        emit CircleRateUpdated(_stateCode, _districtCode, _ratePerSqFt, block.timestamp);
    }

    // ── View functions ───────────────────────────────────────────────────────

    /**
     * @notice Get circle rate for a state+district.
     * @return ratePerSqFt in paisa.
     */
    function getCircleRate(
        string memory _stateCode,
        string memory _districtCode
    ) external view returns (uint256) {
        bytes32 key = _getKey(_stateCode, _districtCode);
        require(circleRates[key].exists, "CircleRateOracle: rate not found");
        return circleRates[key].ratePerSqFt;
    }

    /**
     * @notice Calculate stamp duty breakdown for a transaction.
     * @param _stateCode    State code.
     * @param _declaredValue Transaction value in paisa.
     * @return breakdown StampDutyBreakdown struct with all fee components.
     */
    function calculateStampDuty(
        string memory _stateCode,
        uint256 _declaredValue
    ) external view returns (StampDutyBreakdown memory) {
        bytes32 stateKey = keccak256(abi.encodePacked(_stateCode));

        uint256 sdRate  = stampDutyRates[stateKey];
        uint256 rfRate  = registrationFeeRates[stateKey];
        uint256 csRate  = cessRates[stateKey];

        require(sdRate > 0, "CircleRateOracle: state rates not configured");

        uint256 sd = (_declaredValue * sdRate) / 10000;
        uint256 rf = (_declaredValue * rfRate) / 10000;
        uint256 cs = (_declaredValue * csRate) / 10000;

        return StampDutyBreakdown({
            stampDuty:        sd,
            registrationFee:  rf,
            cess:             cs,
            totalFees:        sd + rf + cs,
            stampDutyRate:    sdRate,
            regFeeRate:       rfRate,
            cessRate:         csRate
        });
    }

    /**
     * @notice Check if a declared value is below the circle rate for the parcel.
     * @param _stateCode    State code.
     * @param _districtCode District code.
     * @param _areaInSqFt   Parcel area.
     * @param _declaredValue Declared transaction value in paisa.
     * @return isUndervalued True if declared value < circle rate * area.
     * @return circleValue   The minimum acceptable value in paisa.
     */
    function checkUndervaluation(
        string memory _stateCode,
        string memory _districtCode,
        uint256 _areaInSqFt,
        uint256 _declaredValue
    ) external view returns (bool isUndervalued, uint256 circleValue) {
        bytes32 key = _getKey(_stateCode, _districtCode);
        if (!circleRates[key].exists) {
            return (false, 0);
        }
        circleValue = circleRates[key].ratePerSqFt * _areaInSqFt;
        isUndervalued = _declaredValue < circleValue;
    }

    // ── Admin ────────────────────────────────────────────────────────────────

    function setOracleAddress(address _newOracle) external onlyOwner {
        oracleAddress = _newOracle;
    }

    // ── Internal ─────────────────────────────────────────────────────────────

    function _getKey(
        string memory _stateCode,
        string memory _districtCode
    ) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(_stateCode, _districtCode));
    }
}
