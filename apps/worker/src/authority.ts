export type VerificationState = "ONCHAIN_VERIFIED" | "LOCALLY_VALIDATED" | "SIMULATED" | "MISSING";
export type MarketRegime = "TREND" | "RANGE" | "HIGH_VOLATILITY" | "RISK_OFF";
export type AdaptiveAction = "BUY" | "HOLD" | "SELL" | "REFER";
export type MarketDataState = "LIVE" | "LOCAL_FIXTURE";

export type ProposalProvenance = {
  model: string;
  marketDataSource: string;
  marketDataState: MarketDataState;
  observedAt: string;
  reliable: boolean;
};

export type AdaptiveProposal = {
  regime: MarketRegime;
  action: AdaptiveAction;
  confidence: number;
  requestedAllocation: number;
  reasons: string[];
  provenance: ProposalProvenance;
};

export type AuthorityPolicy = {
  collateralAllocationBps: number;
  perTradeCap: number;
  absoluteBudgetCap: number;
};

export type VerifiedCollateral = {
  amount: number;
  verificationState: VerificationState;
};

export type AuthorityResult = {
  accepted: boolean;
  guardrailAction: AdaptiveAction;
  authorityBudget: number;
  maxProposalAllocation: number;
  reasons: string[];
};

const regimes = new Set<MarketRegime>(["TREND", "RANGE", "HIGH_VOLATILITY", "RISK_OFF"]);
const actions = new Set<AdaptiveAction>(["BUY", "HOLD", "SELL", "REFER"]);
const dataStates = new Set<MarketDataState>(["LIVE", "LOCAL_FIXTURE"]);

function fallback(reason: string): AdaptiveProposal {
  return {
    regime: "RISK_OFF",
    action: "REFER",
    confidence: 0,
    requestedAllocation: 0,
    reasons: [reason],
    provenance: {
      model: "unavailable",
      marketDataSource: "unavailable",
      marketDataState: "LOCAL_FIXTURE",
      observedAt: "unavailable",
      reliable: false,
    },
  };
}

export function parseAdaptiveProposal(value: unknown): AdaptiveProposal {
  if (!value || typeof value !== "object") return fallback("AI output is missing or malformed");
  const candidate = value as Record<string, unknown>;
  const provenance = candidate.provenance as Record<string, unknown> | undefined;
  const validReasons = Array.isArray(candidate.reasons)
    && candidate.reasons.length > 0
    && candidate.reasons.length <= 3
    && candidate.reasons.every((reason) => typeof reason === "string" && reason.trim().length > 0 && reason.length <= 160);
  const validProvenance = provenance
    && typeof provenance.model === "string" && provenance.model.length > 0
    && typeof provenance.marketDataSource === "string" && provenance.marketDataSource.length > 0
    && typeof provenance.marketDataState === "string" && dataStates.has(provenance.marketDataState as MarketDataState)
    && typeof provenance.observedAt === "string" && provenance.observedAt.length > 0
    && provenance.reliable === true;
  if (
    typeof candidate.regime !== "string" || !regimes.has(candidate.regime as MarketRegime)
    || typeof candidate.action !== "string" || !actions.has(candidate.action as AdaptiveAction)
    || typeof candidate.confidence !== "number" || !Number.isInteger(candidate.confidence) || candidate.confidence < 0 || candidate.confidence > 100
    || typeof candidate.requestedAllocation !== "number" || !Number.isFinite(candidate.requestedAllocation) || candidate.requestedAllocation < 0
    || !validReasons
    || !validProvenance
  ) return fallback("AI output failed schema or provenance validation");
  if ((candidate.action === "HOLD" || candidate.action === "REFER") && candidate.requestedAllocation !== 0) {
    return fallback("Non-trading AI actions cannot request capital");
  }
  return candidate as unknown as AdaptiveProposal;
}

export function calculateAuthority(collateral: VerifiedCollateral, policy: AuthorityPolicy) {
  if (collateral.verificationState !== "ONCHAIN_VERIFIED" || collateral.amount <= 0) {
    return { authorityBudget: 0, maxProposalAllocation: 0 };
  }
  const percentageBudget = collateral.amount * policy.collateralAllocationBps / 10_000;
  const authorityBudget = Math.min(percentageBudget, policy.absoluteBudgetCap);
  return { authorityBudget, maxProposalAllocation: Math.min(authorityBudget, policy.perTradeCap) };
}

export function evaluateProposal(proposal: AdaptiveProposal, collateral: VerifiedCollateral, policy: AuthorityPolicy): AuthorityResult {
  const { authorityBudget, maxProposalAllocation } = calculateAuthority(collateral, policy);
  const reasons: string[] = [];
  if (collateral.verificationState !== "ONCHAIN_VERIFIED") reasons.push("Collateral is not USC onchain verified");
  if (collateral.amount <= 0) reasons.push("No verified collateral authority is available");
  if (proposal.action === "BUY" || proposal.action === "SELL") {
    if (proposal.requestedAllocation <= 0) reasons.push("Trading proposals require a positive allocation");
    if (proposal.requestedAllocation > maxProposalAllocation) reasons.push("Requested allocation exceeds the current risk budget");
  } else if (proposal.requestedAllocation !== 0) {
    reasons.push("Non-trading proposals must request zero allocation");
  }
  return {
    accepted: reasons.length === 0,
    guardrailAction: reasons.length === 0 ? proposal.action : "HOLD",
    authorityBudget,
    maxProposalAllocation,
    reasons,
  };
}
