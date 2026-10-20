// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract AttestAICollateralVault {
    address public constant NATIVE_ASSET = address(0);

    mapping(address => uint256) public collateral;
    mapping(address => uint256) public nextNonce;

    event CollateralDeposited(address indexed owner, address indexed asset, uint256 indexed nonce, uint256 amount);
    event CollateralWithdrawn(address indexed owner, address indexed asset, uint256 indexed nonce, uint256 amount);

    function deposit() external payable returns (uint256 nonce) {
        require(msg.value > 0, "deposit required");
        nonce = nextNonce[msg.sender]++;
        collateral[msg.sender] += msg.value;
        emit CollateralDeposited(msg.sender, NATIVE_ASSET, nonce, msg.value);
    }

    function withdraw(uint256 amount) external returns (uint256 nonce) {
        require(amount > 0, "amount required");
        uint256 currentCollateral = collateral[msg.sender];
        require(currentCollateral >= amount, "insufficient collateral");
        nonce = nextNonce[msg.sender]++;
        collateral[msg.sender] = currentCollateral - amount;
        emit CollateralWithdrawn(msg.sender, NATIVE_ASSET, nonce, amount);
        (bool sent,) = payable(msg.sender).call{value: amount}("");
        require(sent, "withdrawal failed");
    }
}
