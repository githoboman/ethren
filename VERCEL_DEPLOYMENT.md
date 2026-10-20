# Deploying AttestAI to Vercel

The frontend is fully configured and ready for 1-click deployment on Vercel.

---

## Option 1: Deploy Directly from Git (Recommended)

1. Push this repository to your GitHub / GitLab / Bitbucket.
2. Go to [Vercel Dashboard](https://vercel.com/new).
3. Select your repository and click **Import**.
4. Configure Project Settings:
   - **Framework Preset**: `Next.js`
   - **Root Directory**: `apps/web` *(or leave as `./` — both work automatically thanks to our `vercel.json` config!)*
   - **Build Command**: `next build` *(if Root Directory is `apps/web`)* or `pnpm --filter @attestai/web build` *(if Root Directory is `./`)*
   - **Output Directory**: `.next` *(if `apps/web`)* or `apps/web/.next`
5. Click **Deploy**.

---

## Option 2: Deploy Using Vercel CLI

```bash
# 1. Install Vercel CLI (if not already installed)
npm i -g vercel

# 2. Deploy from the repository root
vercel

# 3. For production release:
vercel --prod
```

---

## Environment Variables (Optional)

The application includes working fallback defaults configured directly for BOT Chain Testnet in `apps/web/app/botchain.ts`. However, if you wish to override them in the Vercel Dashboard under **Project Settings → Environment Variables**:

| Variable | Recommended Value | Description |
|---|---|---|
| `NEXT_PUBLIC_BOTCHAIN_TESTNET_RPC` | `https://rpc.bohr.life` | BOT Chain Testnet JSON-RPC |
| `NEXT_PUBLIC_BOTCHAIN_CHAIN_ID` | `968` | BOT Chain Testnet Chain ID |
| `NEXT_PUBLIC_COLLATERAL_VAULT` | `0x31b1B13bbe6aABE678083E3525042e52172619D2` | Deployed Vault Contract |
| `NEXT_PUBLIC_DECISION_REGISTRY` | `0xb0F7D964e32287958FD5E89dEf5A13b1C2d1d066` | Deployed Decision Registry |
| `NEXT_PUBLIC_EXPLORER_URL` | `https://scan.bohr.life` | BOTScan Testnet Explorer |

---

## Live Contracts on BOT Chain Testnet

- **Collateral Vault**: [`0x31b1B13bbe6aABE678083E3525042e52172619D2`](https://scan.bohr.life/address/0x31b1B13bbe6aABE678083E3525042e52172619D2)
- **Decision Registry**: [`0xb0F7D964e32287958FD5E89dEf5A13b1C2d1d066`](https://scan.bohr.life/address/0xb0F7D964e32287958FD5E89dEf5A13b1C2d1d066)
- **Signal Emitter**: [`0xD805B37516b5474d754C49052223487a09BBF263`](https://scan.bohr.life/address/0xD805B37516b5474d754C49052223487a09BBF263)
- **Faucet**: [https://faucet.botchain.ai/basic](https://faucet.botchain.ai/basic)
