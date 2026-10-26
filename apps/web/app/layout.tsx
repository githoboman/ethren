import type { Metadata } from "next";
import "./styles.css";

export const metadata: Metadata = {
  title: "AttestAI | AI Agent Trust & Collateral Layer on BOT Chain",
  description:
    "Verified Collateral. Adaptive Intelligence. Autonomous AI agent decision and bounded risk authority protocol on BOT Chain Mainnet (Chain ID 677) and Testnet (Chain ID 968).",
  keywords: [
    "BOT Chain",
    "BOT Chain Mainnet",
    "BOT Chain Testnet",
    "AI Agent",
    "Collateral Vault",
    "Web3 AI",
    "Autonomous Agents",
    "DePIN",
    "Risk Guardrails",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      </head>
      <body>{children}</body>
    </html>
  );
}
