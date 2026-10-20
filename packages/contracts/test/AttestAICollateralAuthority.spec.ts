import { expect } from "chai";
import { ethers, network } from "hardhat";

const chainKey = 1n;
const sourceVault = "0x00000000000000000000000000000000000000a1";
const owner = "0x00000000000000000000000000000000000000b2";
const otherOwner = "0x00000000000000000000000000000000000000c3";
const otherVault = "0x00000000000000000000000000000000000000d4";
const proof = { root: ethers.ZeroHash, siblings: [] };
const continuity = { lowerEndpointDigest: ethers.ZeroHash, roots: [] };
const coder = ethers.AbiCoder.defaultAbiCoder();

enum FactType { DEPOSIT, WITHDRAWAL }
enum Regime { TREND, RANGE, HIGH_VOLATILITY, RISK_OFF }
enum Action { BUY, HOLD, SELL, REFER }

async function expectRevert(action: Promise<unknown>, reason: string) {
  try { await action; throw new Error("expected revert"); } catch (error) {
    expect(String(error)).to.include("revert");
    expect(String(error)).to.include(reason);
  }
}

function sourceEvent(factType: FactType, eventOwner = owner, asset = ethers.ZeroAddress, amount = 1000n, nonce = 0n, emitter = sourceVault, signature?: string) {
  const eventName = factType === FactType.DEPOSIT ? "CollateralDeposited" : "CollateralWithdrawn";
  return [emitter, [signature ?? ethers.id(`${eventName}(address,address,uint256,uint256)`), ethers.zeroPadValue(eventOwner, 32), ethers.zeroPadValue(asset, 32), ethers.zeroPadValue(ethers.toBeHex(nonce), 32)], coder.encode(["uint256"], [amount])];
}

function encodedSource({
  factType = FactType.DEPOSIT,
  status = 1,
  to = sourceVault,
  from = owner,
  amount = 1000n,
  callAmount = amount,
  value = factType === FactType.DEPOSIT ? amount : 0n,
  logs = [sourceEvent(factType, from, ethers.ZeroAddress, amount, 0n, to)],
}: {
  factType?: FactType;
  status?: number;
  to?: string;
  from?: string;
  amount?: bigint;
  callAmount?: bigint;
  value?: bigint;
  logs?: unknown[];
} = {}) {
  const data = factType === FactType.DEPOSIT
    ? ethers.id("deposit()").slice(0, 10)
    : ethers.concat([ethers.id("withdraw(uint256)").slice(0, 10), coder.encode(["uint256"], [callAmount])]);
  const common = coder.encode(["uint64", "uint64", "address", "bool", "address", "uint256", "bytes"], [1, 100000, from, false, to, value, data]);
  const legacy = coder.encode(["uint128", "uint256", "bytes32", "bytes32"], [1, 27, ethers.ZeroHash, ethers.ZeroHash]);
  const receipt = coder.encode(["uint8", "uint64", "tuple(address address_, bytes32[] topics, bytes data)[]", "bytes"], [status, 21000, logs, "0x"]);
  return coder.encode(["uint8", "bytes[]"], [0, [common, legacy, receipt]]);
}

async function deploy(verifierResult = true) {
  const [deployer] = await ethers.getSigners();
  const decoder = await (await ethers.getContractFactory("EvmV1Decoder")).deploy();
  await decoder.waitForDeployment();
  const verifier = await (await ethers.getContractFactory(verifierResult ? "MockVerifier" : "MockFailVerifier")).deploy();
  await verifier.waitForDeployment();
  await network.provider.send("hardhat_setCode", ["0x0000000000000000000000000000000000000FD2", await ethers.provider.getCode(await verifier.getAddress())]);
  const authority = await (await ethers.getContractFactory("AttestAICollateralAuthority", { libraries: { EvmV1Decoder: await decoder.getAddress() } })).deploy(chainKey, sourceVault, deployer.address, 2000, 300n, 500n);
  await authority.waitForDeployment();
  return authority;
}

function verifyArgs(encodedTransaction = encodedSource(), overrides: Partial<{ chainKey: bigint; blockHeight: bigint; factType: FactType; owner: string; asset: string; amount: bigint; nonce: bigint }> = {}) {
  return [
    overrides.chainKey ?? chainKey,
    overrides.blockHeight ?? 10n,
    encodedTransaction,
    proof,
    continuity,
    overrides.factType ?? FactType.DEPOSIT,
    overrides.owner ?? owner,
    overrides.asset ?? ethers.ZeroAddress,
    overrides.amount ?? 1000n,
    overrides.nonce ?? 0n,
  ] as const;
}

describe("AttestAICollateralAuthority", () => {
  it("accepts a valid USC-verified deposit fact and derives bounded authority", async () => {
    const authority = await deploy();
    await authority.verifyCollateralFact(...verifyArgs());
    expect(await authority.verifiedCollateral(owner)).to.equal(1000n);
    expect(await authority.authorityBudget(owner)).to.equal(200n);
    expect(await authority.maxProposalAllocation(owner)).to.equal(200n);
  });

  it("rejects the wrong chain key", async () => {
    const authority = await deploy();
    await expectRevert(authority.verifyCollateralFact(...verifyArgs(encodedSource(), { chainKey: 2n })), "");
  });

  it("rejects the wrong source vault", async () => {
    const authority = await deploy();
    await expectRevert(authority.verifyCollateralFact(...verifyArgs(encodedSource({ to: otherVault, logs: [sourceEvent(FactType.DEPOSIT, owner, ethers.ZeroAddress, 1000n, 0n, otherVault)] }))), "wrong source vault");
  });

  it("rejects the wrong emitter or event signature", async () => {
    const authority = await deploy();
    await expectRevert(authority.verifyCollateralFact(...verifyArgs(encodedSource({ logs: [sourceEvent(FactType.DEPOSIT, owner, ethers.ZeroAddress, 1000n, 0n, otherVault)] }))), "wrong emitter or event");
    await expectRevert(authority.verifyCollateralFact(...verifyArgs(encodedSource({ logs: [sourceEvent(FactType.DEPOSIT, owner, ethers.ZeroAddress, 1000n, 0n, sourceVault, ethers.id("DifferentEvent(address,address,uint256,uint256)"))] }))), "wrong emitter or event");
  });

  it("rejects mismatched owner, asset, and amount semantics", async () => {
    const authority = await deploy();
    await expectRevert(authority.verifyCollateralFact(...verifyArgs(encodedSource(), { owner: otherOwner })), "wrong owner");
    await expectRevert(authority.verifyCollateralFact(...verifyArgs(encodedSource(), { asset: otherVault })), "");
    await expectRevert(authority.verifyCollateralFact(...verifyArgs(encodedSource(), { amount: 999n })), "wrong amount");
  });

  it("rejects mismatched calldata, transaction value, event nonce, and event payload", async () => {
    const authority = await deploy();
    const withdrawal = encodedSource({ factType: FactType.WITHDRAWAL, value: 1n, logs: [sourceEvent(FactType.WITHDRAWAL, owner, ethers.ZeroAddress, 1000n, 0n)] });
    await expectRevert(authority.verifyCollateralFact(...verifyArgs(withdrawal, { factType: FactType.WITHDRAWAL })), "invalid withdrawal value");
    const wrongCallAmount = encodedSource({ factType: FactType.WITHDRAWAL, callAmount: 999n, logs: [sourceEvent(FactType.WITHDRAWAL, owner, ethers.ZeroAddress, 1000n, 0n)] });
    await expectRevert(authority.verifyCollateralFact(...verifyArgs(wrongCallAmount, { factType: FactType.WITHDRAWAL })), "wrong amount");
    const wrongNonce = encodedSource({ logs: [sourceEvent(FactType.DEPOSIT, owner, ethers.ZeroAddress, 1000n, 1n)] });
    await expectRevert(authority.verifyCollateralFact(...verifyArgs(wrongNonce)), "wrong event nonce");
    const wrongPayload = encodedSource({ logs: [[sourceVault, sourceEvent(FactType.DEPOSIT)[1], coder.encode(["uint256"], [999n])]] });
    await expectRevert(authority.verifyCollateralFact(...verifyArgs(wrongPayload)), "wrong event amount");
  });

  it("rejects a failed source receipt and an invalid USC proof", async () => {
    const authority = await deploy();
    await expectRevert(authority.verifyCollateralFact(...verifyArgs(encodedSource({ status: 0 }))), "source transaction failed");
    const failingAuthority = await deploy(false);
    await expectRevert(failingAuthority.verifyCollateralFact(...verifyArgs()), "proof verification failed");
  });

  it("rejects replayed queries and replayed owner nonces", async () => {
    const authority = await deploy();
    await authority.verifyCollateralFact(...verifyArgs());
    await expectRevert(authority.verifyCollateralFact(...verifyArgs()), "query already processed");
    await expectRevert(authority.verifyCollateralFact(...verifyArgs(encodedSource(), { blockHeight: 11n })), "event nonce already processed");
  });

  it("rejects a withdrawal above verified collateral and duplicate withdrawal facts", async () => {
    const authority = await deploy();
    const excessiveWithdrawal = encodedSource({ factType: FactType.WITHDRAWAL, amount: 1001n, logs: [sourceEvent(FactType.WITHDRAWAL, owner, ethers.ZeroAddress, 1001n, 1n)] });
    await expectRevert(authority.verifyCollateralFact(...verifyArgs(excessiveWithdrawal, { blockHeight: 11n, factType: FactType.WITHDRAWAL, amount: 1001n, nonce: 1n })), "insufficient verified collateral");
    await authority.verifyCollateralFact(...verifyArgs());
    const withdrawal = encodedSource({ factType: FactType.WITHDRAWAL, amount: 400n, logs: [sourceEvent(FactType.WITHDRAWAL, owner, ethers.ZeroAddress, 400n, 1n)] });
    const withdrawalArgs = verifyArgs(withdrawal, { blockHeight: 11n, factType: FactType.WITHDRAWAL, amount: 400n, nonce: 1n });
    await authority.verifyCollateralFact(...withdrawalArgs);
    await expectRevert(authority.verifyCollateralFact(...withdrawalArgs), "query already processed");
  });

  it("reduces authority after a verified withdrawal", async () => {
    const authority = await deploy();
    await authority.verifyCollateralFact(...verifyArgs(encodedSource({ amount: 3000n, logs: [sourceEvent(FactType.DEPOSIT, owner, ethers.ZeroAddress, 3000n)] }), { amount: 3000n }));
    expect(await authority.authorityBudget(owner)).to.equal(500n);
    expect(await authority.maxProposalAllocation(owner)).to.equal(300n);
    const withdrawal = encodedSource({ factType: FactType.WITHDRAWAL, amount: 2000n, logs: [sourceEvent(FactType.WITHDRAWAL, owner, ethers.ZeroAddress, 2000n, 1n)] });
    await authority.verifyCollateralFact(...verifyArgs(withdrawal, { blockHeight: 11n, factType: FactType.WITHDRAWAL, amount: 2000n, nonce: 1n }));
    expect(await authority.authorityBudget(owner)).to.equal(200n);
    expect(await authority.maxProposalAllocation(owner)).to.equal(200n);
  });

  it("accepts an in-budget proposal and blocks an over-budget proposal", async () => {
    const authority = await deploy();
    await authority.verifyCollateralFact(...verifyArgs());
    await authority.recordAgentProposal(owner, Regime.TREND, Action.BUY, 80, 200, ethers.id("trend evidence"), ethers.id("local-fixture-v1"));
    await expectRevert(authority.recordAgentProposal(owner, Regime.TREND, Action.BUY, 80, 201, ethers.id("trend evidence"), ethers.id("local-fixture-v1")), "proposal exceeds authority");
  });

  it("grants no trading authority without verified collateral", async () => {
    const authority = await deploy();
    expect(await authority.maxProposalAllocation(owner)).to.equal(0n);
    await expectRevert(authority.recordAgentProposal(owner, Regime.RANGE, Action.BUY, 60, 1, ethers.id("range evidence"), ethers.id("local-fixture-v1")), "no verified authority");
  });

  it("does not let AI action labels bypass allocation guardrails", async () => {
    const authority = await deploy();
    await authority.verifyCollateralFact(...verifyArgs());
    await expectRevert(authority.recordAgentProposal(owner, Regime.RISK_OFF, Action.SELL, 99, 1000, ethers.id("model request"), ethers.id("model-output-v1")), "proposal exceeds authority");
    await expectRevert(authority.recordAgentProposal(owner, Regime.RISK_OFF, Action.REFER, 99, 1, ethers.id("model request"), ethers.id("model-output-v1")), "non-trading action must allocate zero");
  });

  it("rejects proposals from an unconfigured agent", async () => {
    const authority = await deploy();
    const [, outsider] = await ethers.getSigners();
    await expectRevert(authority.connect(outsider).recordAgentProposal(owner, Regime.RANGE, Action.HOLD, 50, 0, ethers.id("hold"), ethers.id("model-output-v1")), "unauthorized agent");
  });
});
