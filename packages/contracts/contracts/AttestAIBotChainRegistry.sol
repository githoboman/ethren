// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title AttestAIBotChainRegistry
 * @notice Trust & Collateral Authority Layer for Autonomous AI Financial Agents on BOT Chain.
 * @dev Deployed on BOT Chain Testnet (Chain ID 968) and BOT Chain Mainnet (Chain ID 677).
 *      Guarantees that an AI Agent cannot self-authorize trades or risk allocations
 *      exceeding deterministically verified collateral deposited on BOT Chain.
 */
contract AttestAIBotChainRegistry {
    // ---------------------------------------------------------
    // Enums & Structs
    // ---------------------------------------------------------
    enum MarketRegime { TREND, RANGE, HIGH_VOLATILITY, RISK_OFF }
    enum Action { BUY, HOLD, SELL, REFER }

    struct DecisionRecord {
        bytes32 decisionId;
        address operator;
        string assetPair;
        MarketRegime regime;
        Action action;
        uint8 confidence;
        uint8 riskScore;
        uint256 requestedAllocation;
        uint256 authorizedAllocation;
        bool guardrailPassed;
        string reasoning;
        uint256 timestamp;
        uint256 blockNumber;
    }

    // ---------------------------------------------------------
    // Constants & Immutables
    // ---------------------------------------------------------
    uint256 public constant PROTOCOL_BUDGET_BPS = 2000; // 20.00% of verified collateral
    uint256 public constant BPS_DIVISOR = 10000;
    uint256 public constant MAX_PER_TRADE_CAP = 10 ether; // 10 BOT absolute cap per trade
    string public constant NETWORK_NAME = "BOT Chain";

    // ---------------------------------------------------------
    // State Variables
    // ---------------------------------------------------------
    mapping(address => uint256) public verifiedCollateral;
    mapping(bytes32 => DecisionRecord) public decisions;
    bytes32[] public decisionIds;
    uint256 public totalDecisionsCount;

    // ---------------------------------------------------------
    // Events
    // ---------------------------------------------------------
    event CollateralDeposited(
        address indexed operator,
        uint256 amount,
        uint256 totalCollateral,
        uint256 newAuthorityBudget
    );

    event CollateralWithdrawn(
        address indexed operator,
        uint256 amount,
        uint256 remainingCollateral,
        uint256 newAuthorityBudget
    );

    event DecisionRecorded(
        bytes32 indexed decisionId,
        address indexed operator,
        string assetPair,
        MarketRegime regime,
        Action action,
        uint8 confidence,
        uint256 authorizedAllocation,
        bool guardrailPassed,
        uint256 timestamp
    );

    // ---------------------------------------------------------
    // Collateral Management
    // ---------------------------------------------------------
    /**
     * @notice Deposit native BOT as collateral to authorize autonomous AI agent decision-making.
     */
    function depositCollateral() external payable returns (uint256 newAuthorityBudget) {
        require(msg.value > 0, "Deposit amount must be greater than zero");
        verifiedCollateral[msg.sender] += msg.value;
        newAuthorityBudget = getAuthorityBudget(msg.sender);

        emit CollateralDeposited(
            msg.sender,
            msg.value,
            verifiedCollateral[msg.sender],
            newAuthorityBudget
        );
    }

    /**
     * @notice Withdraw deposited BOT collateral, reducing the agent's risk authority immediately.
     * @param amount Amount of BOT to withdraw in wei.
     */
    function withdrawCollateral(uint256 amount) external returns (uint256 newAuthorityBudget) {
        require(amount > 0, "Amount must be greater than zero");
        uint256 current = verifiedCollateral[msg.sender];
        require(current >= amount, "Insufficient verified collateral");

        verifiedCollateral[msg.sender] = current - amount;
        newAuthorityBudget = getAuthorityBudget(msg.sender);

        emit CollateralWithdrawn(
            msg.sender,
            amount,
            verifiedCollateral[msg.sender],
            newAuthorityBudget
        );

        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "Withdrawal transfer failed");
    }

    // ---------------------------------------------------------
    // Decision Recording & Guardrail Verification
    // ---------------------------------------------------------
    /**
     * @notice Evaluates and records an autonomous AI agent decision bounded by on-chain guardrails.
     * @param assetPair Asset pair symbol (e.g. "BOT/USD", "BOT/USDT").
     * @param regime Market regime determined by the AI model.
     * @param action Proposed action (BUY, HOLD, SELL, REFER).
     * @param confidence Confidence score (0 to 100).
     * @param riskScore Risk score (0 to 100).
     * @param requestedAllocation Proposed allocation in wei.
     * @param reasoning Context/rationale generated by the AI agent.
     */
    function recordDecision(
        string calldata assetPair,
        MarketRegime regime,
        Action action,
        uint8 confidence,
        uint8 riskScore,
        uint256 requestedAllocation,
        string calldata reasoning
    ) external returns (bytes32 decisionId, bool guardrailPassed, uint256 authorizedAllocation) {
        require(confidence <= 100, "Confidence must be <= 100");
        require(riskScore <= 100, "Risk score must be <= 100");

        uint256 budget = getAuthorityBudget(msg.sender);

        // Guardrail evaluation:
        // If regime is RISK_OFF or action is REFER, allocation must be 0.
        // Requested allocation cannot exceed current verified collateral budget or per-trade cap.
        if (regime == MarketRegime.RISK_OFF || action == Action.REFER || action == Action.HOLD) {
            authorizedAllocation = 0;
            guardrailPassed = true;
        } else if (requestedAllocation <= budget && requestedAllocation <= MAX_PER_TRADE_CAP) {
            authorizedAllocation = requestedAllocation;
            guardrailPassed = true;
        } else {
            // Guardrail triggers: clamp to allowable budget or 0
            if (budget > 0) {
                authorizedAllocation = budget < MAX_PER_TRADE_CAP ? budget : MAX_PER_TRADE_CAP;
            } else {
                authorizedAllocation = 0;
            }
            guardrailPassed = false;
        }

        decisionId = keccak256(
            abi.encodePacked(
                msg.sender,
                assetPair,
                block.timestamp,
                block.number,
                totalDecisionsCount
            )
        );

        decisions[decisionId] = DecisionRecord({
            decisionId: decisionId,
            operator: msg.sender,
            assetPair: assetPair,
            regime: regime,
            action: action,
            confidence: confidence,
            riskScore: riskScore,
            requestedAllocation: requestedAllocation,
            authorizedAllocation: authorizedAllocation,
            guardrailPassed: guardrailPassed,
            reasoning: reasoning,
            timestamp: block.timestamp,
            blockNumber: block.number
        });

        decisionIds.push(decisionId);
        totalDecisionsCount++;

        emit DecisionRecorded(
            decisionId,
            msg.sender,
            assetPair,
            regime,
            action,
            confidence,
            authorizedAllocation,
            guardrailPassed,
            block.timestamp
        );
    }

    // ---------------------------------------------------------
    // View Functions
    // ---------------------------------------------------------
    /**
     * @notice Computes the maximum authorized risk budget for an operator.
     * @dev 20% of verified collateral, capped at MAX_PER_TRADE_CAP.
     */
    function getAuthorityBudget(address operator) public view returns (uint256) {
        uint256 col = verifiedCollateral[operator];
        if (col == 0) return 0;
        uint256 budget = (col * PROTOCOL_BUDGET_BPS) / BPS_DIVISOR;
        if (budget > MAX_PER_TRADE_CAP) {
            return MAX_PER_TRADE_CAP;
        }
        return budget;
    }

    function getOperatorProfile(address operator) external view returns (
        uint256 collateral,
        uint256 authorityBudget,
        uint256 maxPerTradeCap
    ) {
        collateral = verifiedCollateral[operator];
        authorityBudget = getAuthorityBudget(operator);
        maxPerTradeCap = MAX_PER_TRADE_CAP;
    }

    function getDecision(bytes32 decisionId) external view returns (DecisionRecord memory) {
        return decisions[decisionId];
    }

    function getRecentDecisionIds(uint256 limit) external view returns (bytes32[] memory) {
        uint256 total = decisionIds.length;
        if (total == 0) return new bytes32[](0);
        uint256 count = limit < total ? limit : total;
        bytes32[] memory result = new bytes32[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = decisionIds[total - 1 - i];
        }
        return result;
    }

    receive() external payable {
        if (msg.value > 0) {
            verifiedCollateral[msg.sender] += msg.value;
            emit CollateralDeposited(
                msg.sender,
                msg.value,
                verifiedCollateral[msg.sender],
                getAuthorityBudget(msg.sender)
            );
        }
    }
}
