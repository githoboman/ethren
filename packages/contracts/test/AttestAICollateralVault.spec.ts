import { expect } from "chai";
import { ethers } from "hardhat";

async function expectRevert(action: Promise<unknown>, reason?: string) {
  try { await action; throw new Error("expected revert"); } catch (error) {
    expect(String(error)).to.include("revert");
    if (reason) expect(String(error)).to.include(reason);
  }
}

describe("AttestAICollateralVault", () => {
  it("tracks native test collateral through deposit and withdrawal events", async () => {
    const [owner] = await ethers.getSigners();
    const vault = await (await ethers.getContractFactory("AttestAICollateralVault")).deploy();
    await vault.waitForDeployment();
    await vault.connect(owner).deposit({ value: ethers.parseEther("2") });
    expect(await vault.collateral(owner.address)).to.equal(ethers.parseEther("2"));
    expect(await vault.nextNonce(owner.address)).to.equal(1n);
    await vault.connect(owner).withdraw(ethers.parseEther("0.5"));
    expect(await vault.collateral(owner.address)).to.equal(ethers.parseEther("1.5"));
    expect(await vault.nextNonce(owner.address)).to.equal(2n);
  });

  it("prevents withdrawals above deposited collateral", async () => {
    const vault = await (await ethers.getContractFactory("AttestAICollateralVault")).deploy();
    await vault.waitForDeployment();
    await expectRevert(vault.withdraw(1));
  });
});
