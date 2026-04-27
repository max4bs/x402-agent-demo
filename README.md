# x402 Agent-to-Agent Payment Demo

A minimal demo of two AI agents exchanging value over HTTP using the [x402 payment protocol](https://github.com/coinbase/x402). A **buyer agent** automatically pays a **seller agent** in USDC on Base Sepolia to unlock a paywalled API response — no human in the loop.

## What is x402?

x402 is an open protocol that revives the HTTP 402 "Payment Required" status code. When a client hits a paywalled endpoint, the server responds with `402` and payment instructions. The client signs a payment authorization and retries — the server verifies it and returns the content.

This demo uses the **Exact EVM scheme**, which leverages [EIP-3009](https://eips.ethereum.org/EIPS/eip-3009) (`TransferWithAuthorization`). The buyer signs an off-chain authorization; the x402 facilitator at `x402.org` executes the on-chain USDC transfer atomically when the server settles the payment.

## What's in this repo

| File | Role |
|------|------|
| `server.js` | Seller agent — Express server with a paywalled `/weather` endpoint |
| `agent.js` | Buyer agent — creates a CDP wallet, gets testnet USDC, pays the seller |
| `.env.example` | Template for required environment variables |

## Prerequisites

- [Node.js](https://nodejs.org) v18 or higher
- A free [Coinbase Developer Platform (CDP)](https://portal.cdp.coinbase.com) account
- CDP API credentials (API Key ID, API Key Secret, Wallet Secret)

## Setup

**1. Clone the repo**


   ```bash
   git clone https://github.com/max4bs/x402-agent-demo.git
   cd x402-agent-demo

**2. Install dependencies**
   npm install

3. Configure environment variables

Copy the example file and fill in your CDP credentials:


cp .env.example .env
Then open .env and replace the placeholder values with your real credentials from the CDP Portal:


CDP_API_KEY_ID=your-api-key-id-here
CDP_API_KEY_SECRET=your-api-key-secret-here
CDP_WALLET_SECRET=your-wallet-secret-here
Running the demo
You need two terminal windows, both in the project folder.

Terminal 1 — start the seller server:


node server.js
You should see:


Server listening at http://localhost:4021
Terminal 2 — run the buyer agent:


node agent.js
Expected output

🤖 Creating buyer agent wallet on Base Sepolia...
✅ Wallet address: 0x...

💧 Requesting testnet USDC from faucet...
✅ Faucet tx: https://sepolia.basescan.org/tx/0x...
⏳ Waiting 5s for confirmation...

🔍 Checking balances...
Balances: [...]

📡 Calling seller at http://localhost:4021/weather
💳 Got 402 — decoding payment instructions...
💰 Price: 1000 units of USDC
📬 Pay to: 0x...

✍️  Signing payment authorization...
📡 Retrying request with payment...
✅ Payment accepted! Weather data: { "report": { "weather": "sunny", "temperature": 70 } }
The first run funds the wallet from the testnet faucet. On subsequent runs it skips the faucet if the wallet already has a balance.

How it works

Buyer agent                    Seller server              x402 Facilitator
     |                               |                          |
     |-- GET /weather -------------->|                          |
     |<-- 402 + PAYMENT-REQUIRED ----|                          |
     |                               |                          |
     |-- sign EIP-3009 auth -------> (off-chain, no gas)       |
     |                               |                          |
     |-- GET /weather                |                          |
     |   + PAYMENT-SIGNATURE ------->|                          |
     |                               |-- verify + settle ------>|
     |                               |<-- tx confirmed ---------|
     |<-- 200 + weather data --------|                          |
Resources
x402 Protocol — spec and packages
Coinbase CDP Portal — get your API keys
Base Sepolia Explorer — verify transactions
EIP-3009 — the transfer authorization standard used for payment


---
