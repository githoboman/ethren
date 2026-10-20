import { AdaptiveProposal } from "./authority.js";

export type LocalMarketFixture = {
  fixtureId: string;
  observedAt: string;
  priceChangePercent: number;
  realizedVolatilityPercent: number;
  trendStrength: number;
};

export function proposalFromLocalFixture(fixture: LocalMarketFixture): AdaptiveProposal {
  const regime = fixture.realizedVolatilityPercent >= 8
    ? "HIGH_VOLATILITY"
    : fixture.priceChangePercent <= -5
      ? "RISK_OFF"
      : fixture.trendStrength >= 0.7
        ? "TREND"
        : "RANGE";
  const action = regime === "TREND" && fixture.priceChangePercent > 0 ? "BUY" : "HOLD";
  return {
    regime,
    action,
    confidence: Math.min(90, Math.round(55 + fixture.trendStrength * 35)),
    requestedAllocation: action === "BUY" ? 100 : 0,
    reasons: [
      regime === "TREND"
        ? "Local fixture shows positive momentum with sustained trend strength."
        : "Local fixture does not support a bounded trend allocation.",
    ],
    provenance: {
      model: "deterministic-regime-fixture-v1",
      marketDataSource: fixture.fixtureId,
      marketDataState: "LOCAL_FIXTURE",
      observedAt: fixture.observedAt,
      reliable: true,
    },
  };
}
