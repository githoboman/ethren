import { buildDemoTrace } from "./relay.js";
import { decide } from "./decision.js";
import { evaluateProposal } from "./authority.js";
import { proposalFromLocalFixture } from "./regime.js";

const trace = await buildDemoTrace("0x0000000000000000000000000000000000000000000000000000000000000000");
const decision = decide({ price: 100, liquidity: 250000, priceChangePercent: 4, sourceVerified: true });
const adaptiveProposal = proposalFromLocalFixture({ fixtureId: "fixture:trend-001", observedAt: "2026-09-13T00:00:00Z", priceChangePercent: 4, realizedVolatilityPercent: 3, trendStrength: 0.8 });
const authority = evaluateProposal(adaptiveProposal, { amount: 1000, verificationState: "LOCALLY_VALIDATED" }, { collateralAllocationBps: 2000, perTradeCap: 300, absoluteBudgetCap: 500 });
console.log(JSON.stringify({ trace, decision, adaptivePrototype: { proposal: adaptiveProposal, authority, realMoneyExecution: "DISABLED" } }, null, 2));
