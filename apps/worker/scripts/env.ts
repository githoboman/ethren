import { config } from "dotenv";
import { resolve } from "node:path";

config({ path: resolve(process.cwd(), "../../.env") });

export function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

export function proofBuilderUrl(): string {
  return required("CREDITCOIN_PROOF_BUILDER_URL");
}
