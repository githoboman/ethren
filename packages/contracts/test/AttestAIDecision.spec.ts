import { expect } from "chai";
import { ethers, network } from "hardhat";

const chainKey = 7n;
const sourceContract = "0x00000000000000000000000000000000000000a1";
const sourceSender = "0x00000000000000000000000000000000000000b2";
const sourceTxHash = ethers.zeroPadValue("0x01", 32);
const coder = ethers.AbiCoder.defaultAbiCoder();

async function expectRevert(action: Promise<unknown>, reason?: string) {
  try { await action; throw new Error("expected revert"); } catch (error) {
    const message = String(error);
    expect(message).to.include("revert");
    if (reason) expect(message).to.include(reason);
  }
}

function encodedSource(status: number, to = sourceContract, from = sourceSender, sourceData?: string, logs: unknown[] = []) {
  const data = sourceData ?? ethers.concat([ethers.id("emitSignal(bytes32,int256,uint256)").slice(0, 10), coder.encode(["bytes32", "int256", "uint256"], [ethers.id("ETH"), 100, 250000])]);
  const common = coder.encode(["uint64", "uint64", "address", "bool", "address", "uint256", "bytes"], [1, 100000, from, false, to, 0, data]);
  const legacy = coder.encode(["uint128", "uint256", "bytes32", "bytes32"], [1, 27, ethers.ZeroHash, ethers.ZeroHash]);
  const receipt = coder.encode(["uint8", "uint64", "tuple(address address_, bytes32[] topics, bytes data)[]", "bytes"], [status, 21000, logs, "0x"]);
  return coder.encode(["uint8", "bytes[]"], [0, [common, legacy, receipt]]);
}

function validLogs() {
  return [[sourceContract, [ethers.id("MarketSignal(uint256,bytes32,int256,uint256,uint256)"), ethers.zeroPadValue("0x01", 32), ethers.id("ETH")], coder.encode(["int256", "uint256", "uint256"], [100, 250000, 1])]];
}

async function deploy(result: boolean) {
  const [deployer] = await ethers.getSigners();
  const decoder = await (await ethers.getContractFactory("EvmV1Decoder")).deploy();
  await decoder.waitForDeployment();
  const verifier = await (await ethers.getContractFactory(result ? "MockVerifier" : "MockFailVerifier")).deploy();
  await verifier.waitForDeployment();
  await network.provider.send("hardhat_setCode", ["0x0000000000000000000000000000000000000FD2", await ethers.provider.getCode(await verifier.getAddress())]);
  const target = await (await ethers.getContractFactory("AttestAIDecision", { libraries: { EvmV1Decoder: await decoder.getAddress() } })).deploy(chainKey, sourceContract, sourceSender);
  await target.waitForDeployment();
  return { target, deployer };
}

describe("AttestAIDecision", () => {
  it("rejects the wrong source chain", async () => {
    const { target } = await deploy(true);
    await expectRevert(target.verifyAndRecord(8, 1, "0x", { root: ethers.ZeroHash, siblings: [] }, { lowerEndpointDigest: ethers.ZeroHash, roots: [] }, sourceTxHash, 1, 80, 10));
  });

  it("rejects malformed payloads", async () => {
    const { target } = await deploy(true);
    await expectRevert(target.verifyAndRecord(chainKey, 1, encodedSource(1, sourceContract, sourceSender, "0x12345678", []), { root: ethers.ZeroHash, siblings: [] }, { lowerEndpointDigest: ethers.ZeroHash, roots: [] }, sourceTxHash, 1, 80, 10));
  });

  it("rejects the wrong source contract", async () => {
    const { target } = await deploy(true);
    await expectRevert(target.verifyAndRecord(chainKey, 1, encodedSource(1, "0x00000000000000000000000000000000000000c3", sourceSender), { root: ethers.ZeroHash, siblings: [] }, { lowerEndpointDigest: ethers.ZeroHash, roots: [] }, sourceTxHash, 1, 80, 10), "wrong source contract");
  });

  it("rejects failed source transactions before accepting proof data", async () => {
    const { target } = await deploy(true);
    await expectRevert(target.verifyAndRecord(chainKey, 1, encodedSource(0, sourceContract, sourceSender, undefined, validLogs()), { root: ethers.ZeroHash, siblings: [] }, { lowerEndpointDigest: ethers.ZeroHash, roots: [] }, sourceTxHash, 1, 80, 10), "source transaction failed");
  });

  it("rejects invalid proofs", async () => {
    const { target } = await deploy(false);
    await expectRevert(target.verifyAndRecord(chainKey, 1, encodedSource(1, sourceContract, sourceSender, undefined, validLogs()), { root: ethers.ZeroHash, siblings: [] }, { lowerEndpointDigest: ethers.ZeroHash, roots: [] }, sourceTxHash, 1, 80, 10), "proof verification failed");
  });

  it("rejects a replayed proof", async () => {
    const { target } = await deploy(true);
    const args = [chainKey, 1, encodedSource(1, sourceContract, sourceSender, undefined, validLogs()), { root: ethers.ZeroHash, siblings: [] }, { lowerEndpointDigest: ethers.ZeroHash, roots: [] }, sourceTxHash, 1, 80, 10] as const;
    await target.verifyAndRecord(...args);
    await expectRevert(target.verifyAndRecord(...args), "query already processed");
  });
});
