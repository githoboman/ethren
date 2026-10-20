// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract MockVerifier {
    struct MerkleProofEntry { bytes32 hash; bool isLeft; }
    struct MerkleProof { bytes32 root; MerkleProofEntry[] siblings; }
    struct ContinuityProof { bytes32 lowerEndpointDigest; bytes32[] roots; }
    function verify(uint64, uint64, bytes calldata, MerkleProof calldata, ContinuityProof calldata) external pure virtual returns (bool) { return true; }
}

contract MockFailVerifier is MockVerifier {
    function verify(uint64, uint64, bytes calldata, MerkleProof calldata, ContinuityProof calldata) external pure override returns (bool) { return false; }
}
