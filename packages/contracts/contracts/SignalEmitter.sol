// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract SignalEmitter {
    event MarketSignal(uint256 indexed signalId, bytes32 indexed asset, int256 price, uint256 liquidity, uint256 timestamp);

    uint256 public nextSignalId;

    function emitSignal(bytes32 asset, int256 price, uint256 liquidity) external returns (uint256 signalId) {
        signalId = nextSignalId++;
        emit MarketSignal(signalId, asset, price, liquidity, block.timestamp);
    }
}
