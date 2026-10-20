import { applyGuardrails, SignalInput } from "./risk.js";

export type Decision = { action: "BUY" | "HOLD" | "SELL"; confidence: number; riskScore: number; reasoning: string; guardrails: string[]; demo: boolean };

export function decide(input: SignalInput, demo = true): Decision {
  const guardrails = applyGuardrails(input);
  if (!guardrails.accepted) return { action: "HOLD", confidence: 100 - guardrails.riskScore, riskScore: guardrails.riskScore, reasoning: "Guardrails blocked the decision until the signal is safe to evaluate.", guardrails: guardrails.reasons, demo };
  const action = input.priceChangePercent > 3 ? "BUY" : input.priceChangePercent < -3 ? "SELL" : "HOLD";
  const confidence = Math.min(95, 60 + Math.round(Math.abs(input.priceChangePercent) * 5));
  return { action, confidence, riskScore: guardrails.riskScore, reasoning: `Verified signal supports ${action} under the deterministic momentum policy.`, guardrails: [], demo };
}
