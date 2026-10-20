import { describe, expect, it } from "vitest";
import { applyGuardrails } from "./risk.js";
import { decide } from "./decision.js";
import { calculateAuthority, evaluateProposal, parseAdaptiveProposal } from "./authority.js";
import { proposalFromLocalFixture } from "./regime.js";

const policy = { collateralAllocationBps: 2000, perTradeCap: 300, absoluteBudgetCap: 500 };
const validProposal = {
  regime: "TREND" as const,
  action: "BUY" as const,
  confidence: 82,
  requestedAllocation: 200,
  reasons: ["Momentum is positive within the observed regime."],
  provenance: { model: "test-model", marketDataSource: "test-feed", marketDataState: "LIVE" as const, observedAt: "2026-09-13T00:00:00Z", reliable: true },
};

describe("risk guardrails", () => {
  it("blocks unverified data before an AI decision", () => {
    const result = decide({ price: 100, liquidity: 250000, priceChangePercent: 4, sourceVerified: false });
    expect(result.action).toBe("HOLD");
    expect(result.guardrails).toContain("Source data is not cryptographically verified");
  });

  it("accepts a verified liquid signal", () => {
    expect(applyGuardrails({ price: 100, liquidity: 250000, priceChangePercent: 4, sourceVerified: true }).accepted).toBe(true);
  });
});

describe("verified collateral authority", () => {
  it("accepts a proposal inside the current budget", () => {
    const result = evaluateProposal(validProposal, { amount: 1000, verificationState: "ONCHAIN_VERIFIED" }, policy);
    expect(result.accepted).toBe(true);
    expect(result.maxProposalAllocation).toBe(200);
  });

  it("blocks a proposal above the current budget", () => {
    const result = evaluateProposal({ ...validProposal, requestedAllocation: 201 }, { amount: 1000, verificationState: "ONCHAIN_VERIFIED" }, policy);
    expect(result.accepted).toBe(false);
    expect(result.guardrailAction).toBe("HOLD");
  });

  it("grants no authority for missing or locally validated collateral", () => {
    expect(calculateAuthority({ amount: 1000, verificationState: "MISSING" }, policy).authorityBudget).toBe(0);
    expect(calculateAuthority({ amount: 1000, verificationState: "LOCALLY_VALIDATED" }, policy).authorityBudget).toBe(0);
  });

  it("reduces authority when verified collateral decreases", () => {
    expect(calculateAuthority({ amount: 3000, verificationState: "ONCHAIN_VERIFIED" }, policy).maxProposalAllocation).toBe(300);
    expect(calculateAuthority({ amount: 1000, verificationState: "ONCHAIN_VERIFIED" }, policy).maxProposalAllocation).toBe(200);
  });

  it("converts malformed or unreliable AI output to REFER with zero allocation", () => {
    const result = parseAdaptiveProposal({ action: "BUY", requestedAllocation: 1000 });
    expect(result.action).toBe("REFER");
    expect(result.requestedAllocation).toBe(0);
    expect(result.confidence).toBe(0);
    const unreliable = parseAdaptiveProposal({ ...validProposal, provenance: { ...validProposal.provenance, reliable: false } });
    expect(unreliable.action).toBe("REFER");
    expect(unreliable.requestedAllocation).toBe(0);
  });

  it("does not allow an AI label or confidence score to bypass guardrails", () => {
    const result = evaluateProposal({ ...validProposal, regime: "RISK_OFF", confidence: 100, requestedAllocation: 10_000 }, { amount: 1000, verificationState: "ONCHAIN_VERIFIED" }, policy);
    expect(result.accepted).toBe(false);
    expect(result.guardrailAction).toBe("HOLD");
  });

  it("labels deterministic regime inputs as local fixtures", () => {
    const proposal = proposalFromLocalFixture({ fixtureId: "fixture:trend-001", observedAt: "2026-09-13T00:00:00Z", priceChangePercent: 4, realizedVolatilityPercent: 3, trendStrength: 0.8 });
    expect(proposal.regime).toBe("TREND");
    expect(proposal.provenance.marketDataState).toBe("LOCAL_FIXTURE");
  });
});
