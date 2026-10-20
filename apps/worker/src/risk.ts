export type SignalInput = { price: number; liquidity: number; priceChangePercent: number; sourceVerified: boolean };
export type GuardrailResult = { accepted: boolean; riskScore: number; reasons: string[] };

export function applyGuardrails(input: SignalInput): GuardrailResult {
  const reasons: string[] = [];
  if (!input.sourceVerified) reasons.push("Source data is not cryptographically verified");
  if (input.price <= 0) reasons.push("Price must be positive");
  if (input.liquidity < 100000) reasons.push("Liquidity is below the minimum threshold");
  if (Math.abs(input.priceChangePercent) > 20) reasons.push("Price movement exceeds the volatility threshold");
  const riskScore = Math.min(100, (input.liquidity < 100000 ? 45 : 10) + Math.min(45, Math.abs(input.priceChangePercent) * 2) + (input.sourceVerified ? 0 : 50));
  return { accepted: reasons.length === 0, riskScore, reasons };
}
