import * as dotenv from "dotenv";
dotenv.config();

import { CdpClient } from "@coinbase/cdp-sdk";
import { x402Client } from "@x402/core/client";
import { ExactEvmScheme } from "@x402/evm/exact/client";

const cdp = new CdpClient();
const SELLER_URL = "http://localhost:4021/weather";

async function run() {
  console.log("🤖 Creating buyer agent wallet on Base Sepolia...");
  const account = await cdp.evm.getOrCreateAccount({ name: "buyer-agent" });
  console.log("✅ Wallet address:", account.address);

  console.log("\n💧 Requesting testnet USDC from faucet...");
  try {
    const faucetResponse = await cdp.evm.requestFaucet({
      address: account.address,
      network: "base-sepolia",
      token: "usdc",
    });
    console.log(`✅ Faucet tx: https://sepolia.basescan.org/tx/${faucetResponse.transactionHash}`);
    console.log("⏳ Waiting 5s for confirmation...");
    await new Promise((resolve) => setTimeout(resolve, 5000));
  } catch (e) {
    console.log("ℹ️  Faucet error:", e.message);
    console.log("⚠️  Proceeding anyway — wallet may already have funds");
  }

  console.log("\n🔍 Checking balances...");
  const { balances } = await cdp.evm.listTokenBalances({
    address: account.address,
    network: "base-sepolia",
  });
  console.log("Balances:", JSON.stringify(balances, (_, v) => (typeof v === "bigint" ? v.toString() : v), 2));

  // Set up the x402 payment client.
  // ExactEvmScheme signs an EIP-3009 authorization (off-chain) rather than
  // submitting a raw transfer — the x402.org facilitator executes it on-chain.
  const client = new x402Client();
  client.register("eip155:84532", new ExactEvmScheme(account));

  console.log("\n📡 Calling seller at", SELLER_URL);
  const res = await fetch(SELLER_URL);

  if (res.status === 402) {
    console.log("💳 Got 402 — decoding payment instructions...");

    const paymentRequiredHeader = res.headers.get("payment-required");
    const paymentRequired = JSON.parse(
      Buffer.from(paymentRequiredHeader, "base64").toString("utf8")
    );

    const accepts = paymentRequired.accepts[0];
    console.log(`💰 Price: ${accepts.amount} units of USDC`);
    console.log(`📬 Pay to: ${accepts.payTo}`);

    console.log("\n✍️  Signing payment authorization...");
    const paymentPayload = await client.createPaymentPayload(paymentRequired);
    const encodedPayment = Buffer.from(JSON.stringify(paymentPayload)).toString("base64");

    console.log("📡 Retrying request with payment...");
    const paidRes = await fetch(SELLER_URL, {
      headers: { "PAYMENT-SIGNATURE": encodedPayment },
    });

    if (paidRes.ok) {
      const data = await paidRes.json();
      console.log("✅ Payment accepted! Weather data:", JSON.stringify(data, null, 2));
    } else {
      const error = await paidRes.text();
      console.log("❌ Payment rejected:", paidRes.status, error);
    }
  } else {
    const data = await res.json();
    console.log("✅ Got data without payment:", data);
  }
}

run().catch(console.error);
