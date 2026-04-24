# 💰 USDT Payment Setup Guide — TradeCandle
## ระบบชำระเงินด้วย USDT (ERC-20 / TRC-20 / BEP-20) แทนบัตรเครดิต

---

## 1. ภาพรวมระบบ

เมื่อผู้ใช้เลือกแพ็คเกจ → ระบบสร้าง **Deposit Address** → ผู้ใช้โอน USDT ไปยัง address → 
ระบบตรวจสอบ on-chain → activate license ทันที

**เครือข่ายหลัก:** ERC-20 (Ethereum) — wallet `0x7b0bCf03c2f622bcb4e5e1B0f4A243a66A3f9b90`
**เครือข่ายสำรอง:** TRC-20 (Tron), BEP-20 (BSC)

### ข้อดีของ USDT แทนบัตรเครดิต
- ❌ ไม่มี Stripe fees (2.9% + 30¢)
- ❌ ไม่ต้องจ่ายค่า chargeback
- ✅ รับเงินทันทีใน wallet
- ✅ เหมาะกับตลาด crypto trading

---

## 2. ตั้งค่า `.env`

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
TRONGRID_WEBHOOK_SECRET=
ETHERSCAN_API_KEY=            # Etherscan API key for auto-verification
ADMIN_API_KEY=change_me_admin_api_key_2024
```

---

## 3. ERC-20 Auto-Verification (Etherscan API)

### 3.1 สมัคร Etherscan API Key
1. ไปที่ https://etherscan.io/register
2. สร้าง account → My API Keys → Add
3. ใส่ API Key ใน `.env` → `ETHERSCAN_API_KEY`

### 3.2 วิธี Verify อัตโนมัติ
1. เมื่อผู้ใช้โอน USDT มาที่ wallet `0x7b0b...9b90`
2. ระบบ poll Etherscan API ทุก 30 วินาที เพื่อตรวจสอบ transaction ใหม่
3. ตรวจสอบ: tx to = wallet address + amount ตรง + confirmations ≥ 12
4. อัตโนมัติ activate subscription

### 3.3 Cron Job สำหรับ Auto-Verify
เพิ่มใน `next.config.js` หรือใช้ `node-cron`:

```typescript
// src/api/services/usdt-verify-cron.ts
// Polls Etherscan every 30 seconds for new USDT ERC-20 transfers
```

---

## 4. Manual Verification (Admin API)

หากไม่ได้ใช้ Etherscan auto-verify สามารถ verify ด้วยตนเอง:

```bash
# Verify deposit manually
curl -X POST https://tradecandle.ai/api/payments/verify \
  -H "Authorization: Bearer ADMIN_API_KEY" \
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
สร้าง deposit request (เลือก network)

```json
{
  "packageId": "pkg_starter",
  "network": "ERC-20"    // หรือ "TRC-20", "BEP-20"
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
ดูประวัติการชำระเงิน

### POST `/api/payments/webhook/tron`
TronGrid webhook (สำหรับ TRC-20 auto-verify)

### POST `/api/payments/webhook/eth` (เพิ่มในอนาคต)
Etherscan webhook สำหรับ ERC-20 auto-verify

---

## 6. ราคาแพ็คเกจ (USDT)

| แพ็คเกจ | ราคา/เดือน | USDT (ERC-20) |
|---------|-----------|---------------|
| Starter | 990 ฿ | ~29.90 USDT |
| Pro | 2,490 ฿ | ~74.90 USDT |
| Elite | 4,990 ฿ | ~149.90 USDT |

> 💡 ราคา USDT คำนวณจากอัตราแลกเปลี่ยน 1 USDT ≈ 33.15 ฿ (ปรับอัตโนมัติได้)

---

## 7. ข้อควรระวัง

- **Gas fees:** ERC-20 USDT มี gas fees สูงกว่า TRC-20 (≈ $2-5 ต่อ transaction) — แจ้งผู้ใช้ให้คำนึงถึง gas fees
- **Confirmations:** รอ 12 confirmations (≈ 3 นาที) ก่อน activate
- **Address verification:** ตรวจสอบ address ให้ถูกต้อง — Ethereum address ขึ้นต้นด้วย `0x`
- **Amount matching:** ผู้ใช้ต้องโอน USDT ในจำนวนที่ตรงกับ amount ที่ระบุ (ยอมรับ ±1%)
- **Wallet security:** เก็บ private key ของ wallet อย่างปลอดภัย — ใช้ hardware wallet สำหรับ production