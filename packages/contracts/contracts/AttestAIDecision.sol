// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@gluwa/usc-contracts/contracts/decoding/EvmV1Decoder.sol";

interface INativeQueryVerifier {
    struct MerkleProofEntry { bytes32 hash; bool isLeft; }
    struct MerkleProof { bytes32 root; MerkleProofEntry[] siblings; }
    struct ContinuityProof { bytes32 lowerEndpointDigest; bytes32[] roots; }
    function verify(uint64 chainKey, uint64 height, bytes calldata encodedTransaction, MerkleProof calldata merkleProof, ContinuityProof calldata continuityProof) external view returns (bool);
}

contract AttestAIDecision {
    address public constant VERIFIER = 0x0000000000000000000000000000000000000FD2;
    uint64 public immutable expectedChainKey;
    bytes32 public constant MARKET_SIGNAL_EVENT = keccak256("MarketSignal(uint256,bytes32,int256,uint256,uint256)");
    address public immutable sourceContract;
    address public immutable expectedSourceSender;
    mapping(bytes32 => bool) public processedQueries;

    enum Action { BUY, HOLD, SELL }

    event VerifiedSignalAccepted(bytes32 indexed queryKey, bytes32 indexed sourceTxHash, bytes32 proofDigest);
    event DecisionRecorded(bytes32 indexed queryKey, Action action, uint8 confidence, uint8 riskScore, bytes32 sourceTxHash);

    constructor(uint64 chainKey, address expectedSourceContract, address sourceSender) {
        require(chainKey != 0, "chain key required");
        require(expectedSourceContract != address(0), "source contract required");
        require(sourceSender != address(0), "source sender required");
        expectedChainKey = chainKey;
        sourceContract = expectedSourceContract;
        expectedSourceSender = sourceSender;
    }

    function verifyAndRecord(uint64 chainKey, uint64 blockHeight, bytes calldata encodedTransaction, INativeQueryVerifier.MerkleProof calldata merkleProof, INativeQueryVerifier.ContinuityProof calldata continuityProof, bytes32 sourceTxHash, Action action, uint8 confidence, uint8 riskScore) external {
        require(chainKey == expectedChainKey, "wrong source chain");
        require(confidence <= 100 && riskScore <= 100, "score out of range");
        EvmV1Decoder.ReceiptFields memory receipt = EvmV1Decoder.decodeReceiptFields(encodedTransaction);
        require(receipt.receiptStatus == 1, "source transaction failed");
        EvmV1Decoder.CommonTxFields memory txFields = EvmV1Decoder.decodeCommonTxFields(encodedTransaction);
        require(txFields.from == expectedSourceSender, "wrong source sender");
        require(txFields.to == sourceContract, "wrong source contract");
        require(bytes4(txFields.data) == bytes4(keccak256("emitSignal(bytes32,int256,uint256)")), "wrong source function");
        bytes32 asset;
        int256 price;
        uint256 liquidity;
        bytes memory sourceCallData = txFields.data;
        assembly ("memory-safe") {
            asset := mload(add(sourceCallData, 36))
            price := mload(add(sourceCallData, 68))
            liquidity := mload(add(sourceCallData, 100))
        }
        require(asset != bytes32(0) && price > 0 && liquidity > 0, "invalid signal payload");
        EvmV1Decoder.LogEntry[] memory logs = EvmV1Decoder.getLogsByEventSignature(receipt, MARKET_SIGNAL_EVENT);
        require(logs.length == 1, "invalid signal payload");
        require(logs[0].address_ == sourceContract && logs[0].topics.length == 3, "invalid signal log");
        (int256 loggedPrice, uint256 loggedLiquidity, uint256 timestamp) = abi.decode(logs[0].data, (int256, uint256, uint256));
        require(loggedPrice == price && loggedLiquidity == liquidity && timestamp > 0, "invalid signal data");
        bytes32 queryKey = keccak256(abi.encodePacked(chainKey, blockHeight, _calculateTransactionIndex(merkleProof.siblings)));
        require(!processedQueries[queryKey], "query already processed");
        require(INativeQueryVerifier(VERIFIER).verify(chainKey, blockHeight, encodedTransaction, merkleProof, continuityProof), "proof verification failed");
        processedQueries[queryKey] = true;
        bytes32 proofDigest = keccak256(abi.encode(chainKey, blockHeight, encodedTransaction, merkleProof.root, continuityProof.lowerEndpointDigest, continuityProof.roots));
        emit VerifiedSignalAccepted(queryKey, sourceTxHash, proofDigest);
        emit DecisionRecorded(queryKey, action, confidence, riskScore, sourceTxHash);
    }

    function _calculateTransactionIndex(INativeQueryVerifier.MerkleProofEntry[] calldata siblings) internal pure returns (uint256 index) {
        for (uint256 i = 0; i < siblings.length; ++i) if (!siblings[i].isLeft) index |= (uint256(1) << i);
    }
}
