# 💰 USDT Payment Setup Guide — TradeCandle
## USDT Payment System (ERC-20 / TRC-20 / BEP-20) Instead of Credit Card

---

## 1. System Overview

When the user chooses a plan → the system creates a **Deposit Address** → the user sends USDT to the address → 
the system verifies on-chain → activates the license immediately

**Primary network:** ERC-20 (Ethereum) — wallet `0x7b0bCf03c2f622bcb4e5e1B0f4A243a66A3f9b90`
**Backup networks:** TRC-20 (Tron), BEP-20 (BSC)

### Advantages of USDT over Credit Card
- ❌ No Stripe fees (2.9% + 30¢)
- ❌ No chargeback costs
- ✅ Receive funds instantly in wallet
- ✅ Ideal for the crypto trading market

---

## 2. Settings `.env`

```env
# ─── USDT Payment (ERC-20 Ethereum) ─────────────────
USDT_ERC20_ADDRESS=0x7b0bCf03c2f622bcb4e5e1B0f4A243a66A3f9b90
USDT_ERC20_CONTRACT=0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48
USDT_NETWORK=ERC20
USDT_ERC20_CONFIRMATIONS_REQUIRED=12
USDT_DEPOSIT_EXPIRY_HOURS=24

# Optional: Additional networks
USDT_TRC20_ADDRESS=
USDT_BEP20_ADDRESS=
USDT_TRC20_CONTRACT=TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t

# Webhook / Verification
TRONGRID_WEBHOOK_SECRET=ETH...KEY=            # Etherscan API key for auto-verification
ADMIN_API_KEY=change...2024
```

---

## 3. ERC-20 Auto-Verification (Etherscan API)

### 3.1 Sign Up for Etherscan API Key
1. Go to https://etherscan.io/register
2. Create account → My API Keys → Add
3. Enter the API Key in `.env` → `ETHERSCAN_API_KEY`

### 3.2 Auto Verification Method
1. When the user sends USDT to wallet `0x7b0b...9b90`
2. The system polls Etherscan API every 30 seconds to check for new transactions
3. Verify: tx to = wallet address + matching amount + confirmations ≥ 12
4. Automatically activate subscription

### 3.3 Cron Job For Auto-Verify
Add in `next.config.js` or use `node-cron`:

```typescript
// src/api/services/usdt-verify-cron.ts
// Polls Etherscan every 30 seconds for new USDT ERC-20 transfers
```

---

## 4. Manual Verification (Admin API)

If not using Etherscan auto-verify, you can verify manually:

```bash
# Verify deposit manually
curl -X POST https://tradecandle.ai/api/payments/verify \
  -H "Authorization: Bearer *** \
  -H "Content-Type: application/json" \
  -d '{
    "paymentId": "clxxx...",
    "txHash": "0xabc123...",
    "fromAddress": "0xdef456...",
    "amount": 9.90
  }'
```

---

## 5. API Endpoints

### POST `/api/payments/create-deposit`
Create deposit request (choose network)

```json
{
  "packageId": "pkg_starter",
  "network": "ERC-20"    // or "TRC-20", "BEP-20"
}
```

Response:
```json
{
  "paymentId": "clxxx...",
  "depositAddress": "0x7b0bCf03c2f622bcb4e5e1B0f4A243a66A3f9b90",
  "network": "ERC-20",
  "amount": 9.90,
  "currency": "USDT",
  "expiresAt": "2024-01-15T12:00:00Z",
  "paymentMemo": "TC3A7B2C9D1E4F"
}
```

### POST `/api/payments/verify`
Verify deposit (admin)

### GET `/api/payments/history`
View Payment History

### POST `/api/payments/webhook/tron`
TronGrid webhook (for TRC-20 auto-verify)

### POST `/api/payments/webhook/eth` (to be added in the future)
Etherscan webhook for ERC-20 auto-verify

---

## 6. Pricing Plans (USDT)

| Package | Price/month | USDT (ERC-20) |
|---------|-----------|---------------|
| Starter | 990 $ | ~29.90 USDT |
| Pro | 2,490 $ | ~74.90 USDT |
| Elite | 4,990 $ | ~149.90 USDT |

> 💡 USDT price calculated from exchange rate 1 USDT ≈ 33.15 $ (can be adjusted automatically)

---

## 7. Important Notes

- **Gas fees:** ERC-20 USDT has higher gas fees than TRC-20 (≈ $2-5 per transaction) — inform users about gas fees
- **Confirmations:** Wait for 12 confirmations (≈ 3 minutes) before activating
- **Address verification:** Verify the address carefully — Ethereum addresses start with `0x`
- **Amount matching:** The user must transfer USDT in the exact amount specified (accept ±1%)
- **Wallet security:** Keep the wallet private key secure — use a hardware wallet for production