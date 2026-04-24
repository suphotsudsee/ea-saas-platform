# 🔧 Stripe Setup Guide — TradeCandle v11 EA SaaS Platform

## ภาพรวม

Platform ใช้ **Stripe** สำหรับ:
- 💳 Checkout sessions (ซื้อ subscription)
- 🔄 Recurring billing (เรียกเก็บเงินรายเดือนอัตโนมัติ)
- 🔔 Webhooks (แจ้งเตือนเมื่อมีการชำระเงิน/ยกเลิก)
- 👤 Customer management (สร้าง/จัดการ Stripe customers)

---

## 🚀 Quick Setup (5 ขั้นตอน)

### 1️⃣ สมัคร Stripe Account

1. ไปที่ **https://dashboard.stripe.com/register**
2. สมัครด้วยอีเมล
3. ยืนยันอีเมล + เปิดใช้งานบัญชี
4. (สำหรับไทย) ตั้งค่า **THB** เป็นสกุลเงินหลักใน Settings → Business settings → Currency

### 2️⃣ ดาวน์โหลด API Keys

1. ไปที่ **https://dashboard.stripe.com/apikeys**
2. คัดลอก:
   - **Publishable key** (`pk_test_...` สำหรับ test, `pk_live_...` สำหรับ production)
   - **Secret key** (`sk_test_...` / `sk_live_...`)

3. ใส่ใน `.env`:
```env
STRIPE_PUBLIC_KEY=pk_test_51Abc...
STRIPE_SECRET_KEY=sk_test_51Abc...
```

### 3️⃣ สร้าง Products & Prices

ไปที่ **https://dashboard.stripe.com/products** → **Add product**

สร้าง 3 products:

| Product | Name | Price | Billing |
|---------|------|-------|---------|
| 1 | TradeCandle Starter | 990 ฿ | Monthly recurring |
| 2 | TradeCandle Pro | 2,490 ฿ | Monthly recurring |
| 3 | TradeCandle Elite | 4,990 ฿ | Monthly recurring |

**สำคัญ:** คัดลอก `price_id` (`price_xxx`) ของแต่ละ product มาใส่ `.env`:

```env
STRIPE_STARTER_PRICE_ID=price_1Abc...
STRIPE_PRO_PRICE_ID=price_1Def...
STRIPE_ELITE_PRICE_ID=price_1Ghi...
```

### 4️⃣ ตั้ง Webhook

#### สำหรับ Local Development:
```bash
# ติดตั้ง Stripe CLI
# macOS:  brew install stripe/stripe-cli/stripe
# Windows: scoop install stripe

# Login
stripe login

# Forward webhook ไปยัง localhost
stripe listen --forward-to localhost:3000/api/subscriptions/webhook
```

คัดลอก `whsec_xxx` จาก output ใส่ใน `.env`:
```env
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

#### สำหรับ Production:
ไปที่ **https://dashboard.stripe.com/webhooks** → **Add endpoint**

- **Endpoint URL:** `https://tradecandle.ai/api/subscriptions/webhook`
- **Events to listen for:**
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_succeeded`
  - `invoice.payment_failed`

### 5️⃣ Seed Packages & ทดสอบ

```bash
# ใน PowerShell (ไม่ใช่ WSL)
cd C:\fullstack\ea-saas-platform
npx prisma generate
npx prisma db push
npx tsx scripts/seed-packages.ts
```

---

## 💡 การทำงานของระบบ

### Checkout Flow
```
User → เลือก Package → POST /api/subscriptions/checkout
                            ↓
                    Stripe Checkout Session
                            ↓
                    User จ่ายเงิน (Stripe)
                            ↓
                    Webhook: checkout.session.completed
                            ↓
                    Create Subscription + License Key
                            ↓
                    User เห็น License Key ใน Dashboard
```

### Webhook Events ที่รองรับ
| Event | ทำอะไร |
|-------|---------|
| `checkout.session.completed` | สร้าง Subscription + License |
| `customer.subscription.updated` | อัปเดต status (ACTIVE, PAST_DUE) |
| `customer.subscription.deleted` | ยกเลิก Subscription + ปิด License |
| `invoice.payment_succeeded` | บันทึก Payment + ต่ออายุ License |
| `invoice.payment_failed` | แจ้งเตือน + mark PAST_DUE |

### Database Models
```
User → Subscription → Package
                    → License
         → Payment
```

---

## 🧪 ทดสอบด้วย Stripe Test Mode

1. ใช้ `pk_test_...` และ `sk_test_...` ใน `.env`
2. ใช้บัตรทดสอบ: `4242 4242 4242 4242` (visa) วันหมดอายุอะไรก็ได้ในอนาคต
3. สร้าง test products ใน Blockchain Explorer (test mode)
4. รัน `stripe listen --forward-to localhost:3000/api/subscriptions/webhook`
5. ทดสอบซื้อผ่านหน้าเว็บ

---

## ⚠️ ข้อควรระวัง

1. **อย่าลืมเปลี่ยนจาก test → live keys** เมื่อ deploy production
2. **Webhook secret** จะต่างกันระหว่าง test และ live — ต้องอัปเดตด้วย
3. **THB currency** — ต้องเปิดใช้ใน Blockchain Explorer (Settings → Currencies)
4. **ตั้งชื่อ Product** เป็นภาษาอังกฤษใน Stripe (แสดงในใบเสร็จ)

---

## 📁 ไฟล์ที่เกี่ยวข้อง

| ไฟล์ | หน้าที่ |
|------|--------|
| `src/api/services/billing.service.ts` | Stripe client, checkout, webhooks |
| `src/api/routes/subscriptions/checkout/route.ts` | POST /api/subscriptions/checkout |
| `src/api/routes/subscriptions/webhook/route.ts` | POST /api/subscriptions/webhook |
| `src/api/routes/subscriptions/portal/route.ts` | Customer portal (manage subscription) |
| `scripts/seed-packages.ts` | Seed 3 pricing packages |
| `prisma/schema.prisma` | Package + Subscription models |
| `.env` | Stripe keys |

---

*สร้างเมื่อ: เม.ย. 2026*