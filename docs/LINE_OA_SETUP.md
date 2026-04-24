# Line OA Setup — TradeCandle v11

## ขั้นตอนตั้ง Line Official Account

### 1. สร้าง Line OA

1. ไปที่ [Line Official Account Manager](https://manager.line.biz/)
2. สร้างบัญชีใหม่ — ชื่อ: **TradeCandle**
3. เลือกแผน: **Standard** (ฟรี ข้อความได้ไม่จำกัด)
4. กรอกข้อมูล:
   - ชื่อแสดง: `TradeCandle`
   - หมวดหมู่: การเงิน/ลงทุน
   - อีเมล: support@tradecandle.ai
   - รูปโปรไฟล์: โลโก้ TradeCandle

### 2. เปิด Messaging API

1. ไปที่ **Settings → Messaging API**
2. เปิดใช้ Messaging API
3. เลือกแผน: **Developer (ฟรี)** หรือ **Pro** (ถ้าต้องการข้อความมากกว่า)
4. คัดลอกค่า:
   - **Channel Access Token** → `.env` ใส่เป็น `LINE_CHANNEL_ACCESS_TOKEN`
   - **Channel Secret** → `.env` ใส่เป็น `LINE_CHANNEL_SECRET`

### 3. ตั้ง Webhook URL

1. ใน Messaging API Settings:
   - Webhook URL: `https://tradecandle.ai/api/line/webhook`
   - เปิด **Use webhook**: ✅
   - เปิด **Auto-reply messages**: ❌ (ปิด! เราจะตอบเอง)
   - เปิด **Greeting messages**: ❌ (ปิด! เราจะส่งเอง)

2. ถ้า dev ที่ local:
   ```
   ngrok http 3000
   # วาง webhook URL: https://<ngrok-id>.ngrok-free.app/api/line/webhook
   ```

### 4. เพิ่ม Environment Variables

เพิ่มใน `.env`:

```env
# Line OA
LINE_CHANNEL_ACCESS_TOKEN=your_channel_access_token_here
LINE_CHANNEL_SECRET=your_channel_secret_here
ADMIN_API_KEY=tc-admin-secret-change-this
```

### 5. สร้าง Rich Menu

```bash
cd /mnt/c/fullstack/ea-saas-platform
npx tsx scripts/setup-line-rich-menu.ts
```

สร้างรูป Rich Menu ขนาด 2500x1686 px:

```
┌─────────────────┬─────────────────┐
│    สมัครใช้       │    ดูราคา        │
│  tradecandle.ai  │  #pricing       │
│   (ส้ม/ทอง)       │   (ทอง/เขียว)    │
├─────────────────┼─────────────────┤
│   Dashboard      │    ช่วยเหลือ      │
│   /dashboard     │  พิมพ์ "ช่วย"     │
│   (เขียว)        │   (น้ำเงิน)       │
└─────────────────┴─────────────────┘
```

อัปโหลดรูป:

```bash
curl -X POST \
  -H "Authorization: Bearer $LINE_CHANNEL_ACCESS_TOKEN" \
  -H "Content-Type: image/png" \
  --data-binary @rich-menu-image.png \
  "https://api.line.me/v2/bot/richmenu/{RICH_MENU_ID}/content"
```

ตั้งเป็น default:

```bash
curl -X POST \
  -H "Authorization: Bearer $LINE_CHANNEL_ACCESS_TOKEN" \
  "https://api.line.me/v2/bot/user/all/richmenu/{RICH_MENU_ID}"
```

### 6. ทดสอบ Webhook

```bash
# ทดสอบ GET endpoint
curl https://tradecandle.ai/api/line/webhook

# ทดสอบ broadcast (ต้องมี server รัน)
curl -X POST http://localhost:3000/api/line/broadcast \
  -H "x-api-key: tc-admin-secret-change-this" \
  -H "Content-Type: application/json" \
  -d '{"type": "custom", "text": "สวัสดีจาก TradeCandle!"}'
```

### 7. ส่ง Broadcast ตามแคมเปญ

```bash
# Teaser (ก่อนเปิดตัว 2 วัน)
curl -X POST http://localhost:3000/api/line/broadcast \
  -H "x-api-key: tc-admin-secret" \
  -H "Content-Type: application/json" \
  -d '{"type": "teaser"}'

# Launch Day
curl -X POST http://localhost:3000/api/line/broadcast \
  -H "x-api-key: tc-admin-secret" \
  -H "Content-Type: application/json" \
  -d '{"type": "launch"}'

# Urgency / Promo
curl -X POST http://localhost:3000/api/line/broadcast \
  -H "x-api-key: tc-admin-secret" \
  -H "Content-Type: application/json" \
  -d '{"type": "urgency", "promoCode": "LAUNCH20", "endDate": "30 เมษายน 2568"}'

# Monthly Report
curl -X POST http://localhost:3000/api/line/broadcast \
  -H "x-api-key: tc-admin-secret" \
  -H "Content-Type: application/json" \
  -d '{"type": "monthly", "winRate": "68%", "profitLoss": "+2,450 USD", "trades": 45}'

# Push to specific user
curl -X PUT http://localhost:3000/api/line/broadcast \
  -H "x-api-key: tc-admin-secret" \
  -H "Content-Type: application/json" \
  -d '{"to": "U1234567890abcdef", "type": "launch"}'
```

### 8. Auto-Reply Features

เมื่อคีย์เวิร์ดในแชท:
- `ราคา` / `price` / `แพ็คเกจ` → แสดงตารางราคา
- `ทดลอง` / `trial` / `free` → แสดงวิธีทดลองฟรี 7 วัน
- `ช่วย` / `help` / `?` → แสดงเมนูช่วยเหลือ
- `วิธีใช้` / `how` / `guide` → แสดงคู่มือเริ่มต้น
- เพิ่มเพื่อน → ส่งข้อความต้อนรับ

### 9. QR Code + เพิ่มเพื่อน

เอา Line OA QR Code ไปวางบน:
- Landing Page (`https://tradecandle.ai`) → เพิ่มปุ่ม "Add Line"
- Facebook Page → วาง QR ในโพสต์
- ใบปลิว/นามบัตร

```
Line OA Link: https://lin.ee/tradecandle  (ตั้งใน Line OA Manager)
QR Code: สร้างได้จาก Line OA Manager → Settings → Add Friends
```

## ไฟล์ที่สร้าง

| ไฟล์ | หน้าที่ |
|------|---------|
| `src/api/services/line.service.ts` | Line API service (push, broadcast, templates, webhook handler) |
| `src/api/routes/line/webhook/route.ts` | Webhook endpoint (รับ events จาก Line) |
| `src/api/routes/line/broadcast/route.ts` | Broadcast API (ส่งข้อความถึงทุกคนหรือคนใดคน) |
| `scripts/setup-line-rich-menu.ts` | สร้าง Rich Menu |
| `scripts/line-manage.ts` | CLI ส่ง broadcast, ดู followers, ฯลฯ |
| `docs/LINE_OA_SETUP.md` | คู่มือนี้ |