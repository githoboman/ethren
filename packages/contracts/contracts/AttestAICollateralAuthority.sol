// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@gluwa/usc-contracts/contracts/decoding/EvmV1Decoder.sol";

interface ICollateralNativeQueryVerifier {
    struct MerkleProofEntry { bytes32 hash; bool isLeft; }
    struct MerkleProof { bytes32 root; MerkleProofEntry[] siblings; }
    struct ContinuityProof { bytes32 lowerEndpointDigest; bytes32[] roots; }
    function verify(uint64 chainKey, uint64 height, bytes calldata encodedTransaction, MerkleProof calldata merkleProof, ContinuityProof calldata continuityProof) external view returns (bool);
}

contract AttestAICollateralAuthority {
    address public constant VERIFIER = 0x0000000000000000000000000000000000000FD2;
    address public constant NATIVE_ASSET = address(0);
    bytes32 public constant DEPOSIT_EVENT = keccak256("CollateralDeposited(address,address,uint256,uint256)");
    bytes32 public constant WITHDRAWAL_EVENT = keccak256("CollateralWithdrawn(address,address,uint256,uint256)");
    bytes4 public constant DEPOSIT_SELECTOR = bytes4(keccak256("deposit()"));
    bytes4 public constant WITHDRAWAL_SELECTOR = bytes4(keccak256("withdraw(uint256)"));

    uint64 public immutable expectedChainKey;
    address public immutable sourceVault;
    address public immutable authorizedAgent;
    uint16 public immutable collateralBudgetBps;
    uint256 public immutable perTradeCap;
    uint256 public immutable absoluteBudgetCap;

    mapping(address => uint256) public verifiedCollateral;
    mapping(bytes32 => bool) public processedQueries;
    mapping(address => mapping(uint256 => bool)) public processedNonces;

    enum FactType { DEPOSIT, WITHDRAWAL }
    enum Regime { TREND, RANGE, HIGH_VOLATILITY, RISK_OFF }
    enum Action { BUY, HOLD, SELL, REFER }

    event CollateralFactVerified(
        bytes32 indexed queryKey,
        address indexed owner,
        uint256 indexed nonce,
        FactType factType,
        address asset,
        uint256 amount,
        uint256 verifiedBalance,
        uint256 authorityBudget,
        bytes32 proofDigest
    );
    event AgentProposalRecorded(
        address indexed owner,
        Regime regime,
        Action action,
        uint8 confidence,
        uint256 requestedAllocation,
        uint256 currentBudget,
        bytes32 reasonsHash,
        bytes32 provenanceHash
    );

    constructor(uint64 chainKey, address expectedVault, address agent, uint16 budgetBps, uint256 tradeCap, uint256 budgetCap) {
        require(chainKey != 0, "chain key required");
        require(expectedVault != address(0), "source vault required");
        require(agent != address(0), "agent required");
        require(budgetBps > 0 && budgetBps <= 10_000, "invalid budget percentage");
        require(tradeCap > 0 && budgetCap > 0, "caps required");
        expectedChainKey = chainKey;
        sourceVault = expectedVault;
        authorizedAgent = agent;
        collateralBudgetBps = budgetBps;
        perTradeCap = tradeCap;
        absoluteBudgetCap = budgetCap;
    }

    function verifyCollateralFact(
        uint64 chainKey,
        uint64 blockHeight,
        bytes calldata encodedTransaction,
        ICollateralNativeQueryVerifier.MerkleProof calldata merkleProof,
        ICollateralNativeQueryVerifier.ContinuityProof calldata continuityProof,
        FactType factType,
        address owner,
        address asset,
        uint256 amount,
        uint256 nonce
    ) external {
        require(chainKey == expectedChainKey, "wrong source chain");
        require(owner != address(0), "owner required");
        require(asset == NATIVE_ASSET, "wrong asset");
        require(amount > 0, "amount required");

        EvmV1Decoder.ReceiptFields memory receipt = EvmV1Decoder.decodeReceiptFields(encodedTransaction);
        require(receipt.receiptStatus == 1, "source transaction failed");
        EvmV1Decoder.CommonTxFields memory txFields = EvmV1Decoder.decodeCommonTxFields(encodedTransaction);
        require(txFields.to == sourceVault, "wrong source vault");
        require(txFields.from == owner, "wrong owner");

        bytes32 eventSignature;
        if (factType == FactType.DEPOSIT) {
            require(bytes4(txFields.data) == DEPOSIT_SELECTOR, "wrong source function");
            require(txFields.value == amount, "wrong amount");
            require(txFields.data.length == 4, "invalid deposit calldata");
            eventSignature = DEPOSIT_EVENT;
        } else {
            require(bytes4(txFields.data) == WITHDRAWAL_SELECTOR, "wrong source function");
            require(txFields.value == 0, "invalid withdrawal value");
            require(txFields.data.length == 36, "invalid withdrawal calldata");
            bytes memory withdrawalData = txFields.data;
            uint256 requestedAmount;
            assembly ("memory-safe") { requestedAmount := mload(add(withdrawalData, 36)) }
            require(requestedAmount == amount, "wrong amount");
            eventSignature = WITHDRAWAL_EVENT;
        }

        EvmV1Decoder.LogEntry[] memory logs = EvmV1Decoder.getLogsByEventSignature(receipt, eventSignature);
        require(logs.length == 1, "wrong emitter or event");
        EvmV1Decoder.LogEntry memory sourceLog = logs[0];
        require(sourceLog.address_ == sourceVault && sourceLog.topics.length == 4, "wrong emitter or event");
        require(_topicAddress(sourceLog.topics[1]) == owner, "wrong event owner");
        require(_topicAddress(sourceLog.topics[2]) == asset, "wrong event asset");
        require(uint256(sourceLog.topics[3]) == nonce, "wrong event nonce");
        require(abi.decode(sourceLog.data, (uint256)) == amount, "wrong event amount");

        bytes32 queryKey = keccak256(abi.encodePacked(chainKey, blockHeight, _calculateTransactionIndex(merkleProof.siblings)));
        require(!processedQueries[queryKey], "query already processed");
        require(!processedNonces[owner][nonce], "event nonce already processed");
        if (factType == FactType.WITHDRAWAL) require(verifiedCollateral[owner] >= amount, "insufficient verified collateral");
        require(ICollateralNativeQueryVerifier(VERIFIER).verify(chainKey, blockHeight, encodedTransaction, merkleProof, continuityProof), "proof verification failed");

        processedQueries[queryKey] = true;
        processedNonces[owner][nonce] = true;
        if (factType == FactType.DEPOSIT) verifiedCollateral[owner] += amount;
        else verifiedCollateral[owner] -= amount;

        bytes32 proofDigest = keccak256(abi.encode(chainKey, blockHeight, encodedTransaction, merkleProof.root, continuityProof.lowerEndpointDigest, continuityProof.roots));
        emit CollateralFactVerified(queryKey, owner, nonce, factType, asset, amount, verifiedCollateral[owner], authorityBudget(owner), proofDigest);
    }

    function authorityBudget(address owner) public view returns (uint256) {
        uint256 percentageBudget = verifiedCollateral[owner] * collateralBudgetBps / 10_000;
        return percentageBudget < absoluteBudgetCap ? percentageBudget : absoluteBudgetCap;
    }

    function maxProposalAllocation(address owner) public view returns (uint256) {
        uint256 budget = authorityBudget(owner);
        return budget < perTradeCap ? budget : perTradeCap;
    }

    function recordAgentProposal(
        address owner,
        Regime regime,
        Action action,
        uint8 confidence,
        uint256 requestedAllocation,
        bytes32 reasonsHash,
        bytes32 provenanceHash
    ) external {
        require(msg.sender == authorizedAgent, "unauthorized agent");
        require(confidence <= 100, "confidence out of range");
        require(provenanceHash != bytes32(0), "provenance required");
        uint256 currentBudget = maxProposalAllocation(owner);
        if (action == Action.HOLD || action == Action.REFER) require(requestedAllocation == 0, "non-trading action must allocate zero");
        else {
            require(currentBudget > 0, "no verified authority");
            require(requestedAllocation > 0, "allocation required");
            require(requestedAllocation <= currentBudget, "proposal exceeds authority");
        }
        emit AgentProposalRecorded(owner, regime, action, confidence, requestedAllocation, currentBudget, reasonsHash, provenanceHash);
    }

    function _topicAddress(bytes32 topic) internal pure returns (address) {
        require(uint256(topic) >> 160 == 0, "malformed address topic");
        return address(uint160(uint256(topic)));
    }

    function _calculateTransactionIndex(ICollateralNativeQueryVerifier.MerkleProofEntry[] calldata siblings) internal pure returns (uint256 index) {
        for (uint256 i = 0; i < siblings.length; ++i) if (!siblings[i].isLeft) index |= (uint256(1) << i);
    }
}
