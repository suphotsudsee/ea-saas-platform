# 📊 Analytics Setup Guide — TradeCandle

คู่มือตั้งค่า Google Analytics 4 + Facebook Pixel + Google Tag Manager สำหรับเว็บ tradecandle.ai

---

## 1. Google Analytics 4 (GA4)

### สร้าง GA4 Property
1. เข้า [Google Analytics](https://analytics.google.com/)
2. คลิก **Create Account** → ตั้งชื่อ `TradeCandle`
3. เลือก **Web** → ใส่ URL `tradecandle.ai`
4. ได้ **Measurement ID** รูปแบบ `G-XXXXXXXXXX`

### ใส่ค่าใน `.env`
```bash
NEXT_PUBLIC_GA4_MEASUREMENT_ID=G-XXXXXXXXXX
```

### เชื่อมกับ Search Console (SEO)
1. เข้า GA4 → **Admin** → **Property settings** → **Search Console**
2. Link Google Search Console → เลือก `tradecandle.ai`
3. จะเห็นข้อมูล organic search ใน GA4 ภายใน 24-48 ชม.

### Events ที่ติดมาอัตโนมัติ
| Event | ตอนไหน | ค่า |
|-------|---------|-----|
| `cta_click` | กดปุ่ม CTA ทุกปุ่ม | `cta_name`, `cta_location` |
| `begin_checkout` | กดเลือกแพ็กเกจ | `plan`, `value` |
| `purchase` | จ่ายเงินสำเร็จ | `value`, `currency`, `plan` |
| `subscribe` | สมัครสำเร็จ | `plan`, `value` |
| `trial_start` | เริ่มทดลองใช้ | `plan`, `user_id` |
| `sign_up` | สมัครสมาชิก | `method`, `plan` |
| `video_play` | เล่นวิดีโอ | `video_name` |
| `line_add_friend` | กดเพิ่มเพื่อน Line | — |
| `kill_switch` | กด Kill Switch | `action`, `account_id` |
| `dashboard_view` | เข้าแดชบอร์ด | `section` |

### สร้าง Custom Conversions ใน GA4
1. เข้า **Admin** → **Conversions** → **New conversion event**
2. เพิ่ม events เหล่านี้เป็น conversion:
   - `purchase`
   - `subscribe`
   - `trial_start`
   - `sign_up`
   - `begin_checkout`

---

## 2. Facebook Pixel

### สร้าง FB Pixel
1. เข้า [Meta Business Suite](https://business.facebook.com/)
2. **Events Manager** → **Connect Data** → **Web** → **Facebook Pixel**
3. ตั้งชื่อ `TradeCandle Pixel` → เลือก `Manual Install`
4. ได้ **Pixel ID** รูปแบบตัวเลข เช่น `123456789012345`

### ใส่ค่าใน `.env`
```bash
NEXT_PUBLIC_FB_PIXEL_ID=123456789012345
```

### Standard Events ที่ติดอัตโนมัติ
| FB Event | Mapping จาก Analytics |
|----------|----------------------|
| `PageView` | ทุกหน้า |
| `CompleteRegistration` | `sign_up` |
| `InitiateCheckout` | `begin_checkout` |
| `Purchase` | `purchase` |
| `Subscribe` | `subscribe` |
| `StartTrial` | `trial_start` |
| `ViewContent` | `view_item`, `video_play` |
| `Contact` | `contact` |
| `AddToWishlist` | `line_add_friend` |

### สร้าง Custom Conversions ใน FB
1. **Events Manager** → **Custom Conversions** → **Create**
2. สร้าง:
   - `Purchase THB`: event `Purchase`, rule `value > 0`
   - `Trial Signup`: event `StartTrial`
   - `Line Friend`: event `AddToWishlist`

### Conversions API (CAPI) — แนะนำทำ
เพื่อรับข้อมูลแม่นขึ้น (โดยเฉพาะหลัง iOS 14.5):
1. **Events Manager** → **Conversions API** → **Set up manually**
2. ใส่ Access Token ใน `.env`:
```bash
FB_CAPI_ACCESS_TOKEN=your_access_token_here
```
3. Server-side events จะถูกส่งจาก `/api/webhooks/stripe` อัตโนมัติเมื่อจ่ายเงินสำเร็จ

---

## 3. Google Tag Manager (Optional)

GTM ช่วยจัดการ tags ทั้งหมดจากที่เดียว แนะนำถ้ามีหลาย ads platform

### สร้าง GTM Container
1. เข้า [Google Tag Manager](https://tagmanager.google.com/)
2. สร้าง Account → Container `tradecandle.ai` → **Web**
3. ได้ **GTM ID** รูปแบบ `GTM-XXXXXXX`

### ใส่ค่าใน `.env`
```bash
NEXT_PUBLIC_GTM_ID=GTM-XXXXXXX
```

### ใส่ GA4 + FB Pixel ใน GTM
1. **Tags** → **New** → เลือก **Google Analytics: GA4 Configuration**
   - Measurement ID: `G-XXXXXXXXXX`
2. **Tags** → **New** → เลือก **Custom HTML**
   - วาง FB Pixel code
3. **Triggers**: All Pages

---

## 4. ตรวจสอบว่าติดแล้ว

### วิธีทดสอบ GA4
```bash
# เปิดเว็บ localhost:3000
# เปิด DevTools → Network → กรอง "google-analytics"
# จะเห็น request ส่งข้อมูลไป GA4
```

### วิธีทดสอบ FB Pixel
```bash
# ติดตั้ง Facebook Pixel Helper extension
# เปิดเว็บ → จะเห็น Pixel ID + PageView event
```

### วิธีทดสอบ Events
```bash
# เปิด DevTools → Console
# จะเห็น log: [Analytics] cta_click {cta_name: "hero_free_trial", ...}
# (ในโหมด development เท่านั้น)
```

### ทดสอบด้วย gtag console
```javascript
// เปิด DevTools Console แล้วพิมพ์:
window.gtag('event', 'test_event', { test_param: 'hello' });
// → ดูใน GA4 DebugView
```

---

## 5. Retargeting Setup

### FB Custom Audiences
หลังติด Pixel แล้ว สร้าง Custom Audiences:
1. **All Website Visitors** — 180 วัน
2. **Pricing Page Visitors** — rule: `url contains /#pricing`
3. **Checkout Starters** — event: `InitiateCheckout`
4. **Trial Users** — event: `StartTrial`
5. **Purchasers** — event: `Purchase`

### Lookalike Audiences
สร้างจาก:
- Purchasers (1% Thailand)
- Trial Users (1% Thailand)

---

## 6. สรุป `.env` ที่ต้องตั้งค่า

```bash
# ─── Analytics ────────────────────────────
NEXT_PUBLIC_GA4_MEASUREMENT_ID=G-XXXXXXXXXX    # ← เปลี่ยนเป็นของจริง
NEXT_PUBLIC_FB_PIXEL_ID=000000000000000         # ← เปลี่ยนเป็นของจริง
NEXT_PUBLIC_GTM_ID=                             # ← ถ้าใช้ GTM ใส่ GTM-XXXXXXX
NEXT_PUBLIC_SITE_URL=https://tradecandle.ai

# ─── FB Conversions API (optional) ───────
FB_CAPI_ACCESS_TOKEN=                           # ← ถ้าใช้ CAPI
```

---

## 📁 ไฟล์ที่เกี่ยวข้อง

| ไฟล์ | หน้าที่ |
|------|---------|
| `src/lib/analytics.tsx` | Provider + Hooks + Script components |
| `src/lib/consent.tsx` | Cookie consent banner (GDPR/CCPA) |
| `src/lib/landing-tracking.ts` | Landing page + Dashboard + Conversion tracking hooks |
| `src/app/layout.tsx` | เรียก Analytics ที่ root layout |
| `next.config.js` | CSP headers สำหรับ GA4 + FB Pixel |
| `.env` | Analytics IDs |