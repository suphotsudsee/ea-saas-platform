# 7E — Launch Day Checklist (วันเปิดตัว)
## TradeCandle v11 — Step-by-step for Wednesday D-Day

---

## 🌅 Pre-Launch (วันจันทร์-อังคาร ก่อนเปิดตัว)

### 💻 Technical Setup
- [ ] Deploy landing page to production (`tradecandle.ai`)
- [ ] Test all CTA buttons link to signup page
- [ ] Test USDT checkout flow (all 3 tiers)
- [ ] Test trial signup (7-day free, no credit card)
- [ ] Set up FB Pixel + GA4 (verify via DevTools Network tab)
- [ ] Set up UTM parameters in all links
- [ ] Test Line OA webhook (auto-reply working)
- [ ] Test Line Rich Menu (4 buttons, all links work)
- [ ] Set up email sequence (5 emails ready)
- [ ] Create FB Page post drafts (5 posts saved, not published)
- [ ] Create TikTok drafts (3 videos uploaded, not published)
- [ ] Create Line Broadcast messages (3 messages in draft)

### 📱 Social Setup
- [ ] FB Page: Profile photo + cover photo set
- [ ] FB Page: About section filled (TradeCandle v11, link, contact)
- [ ] TikTok: Profile set (photo, bio, link in bio)
- [ ] Line OA: Rich Menu set (2500×1686 PNG)
- [ ] Line OA: Auto-reply messages set (price, trial, help, guide)
- [ ] Join 5+ Thai trading FB Groups (gold/forex/EA related)

### 💰 Ad Setup (FB Ads Manager)
- [ ] Create Custom Audience: All website visitors (180 days)
- [ ] Create Custom Audience: Engagement on FB Page (365 days)
- [ ] Create Lookalike Audience: 1% Thailand (from Custom Audience)
- [ ] Create Ad Set 1: Target 28-50, Thai, gold/forex interest, Lookalike
- [ ] Create Ad Set 2: Retargeting (website visitors + engaged)
- [ ] Create Ad 1: Pain-Point Carousel (not yet active)
- [ ] Create Ad 2: Social Proof Video 30s (not yet active)
- [ ] Create Ad 3: Myth-Busting Single Image (not yet active)
- [ ] Set daily budget: 1,500฿/day total (split across ad sets)
- [ ] Set conversion event: `Subscribe` (for optimization)

---

## 🚀 Launch Day (วันพุธ) — Hour by Hour

### 08:00 — Final Checks
- [ ] Open `tradecandle.ai` — check it loads
- [ ] Test signup flow: click CTA → fill form → success
- [ ] Test USDT: click Pro plan → checkout → (cancel before pay)
- [ ] Check GA4 real-time: should see yourself
- [ ] Check FB Pixel: use Pixel Helper extension
- [ ] Backup: `pg_dump` database just in case
- [ ] Have a phone number / Line ready for customer questions

### 09:30 — FB Launch Post
- [ ] Publish FB Post: Launch announcement (Post from 7A)
- [ ] Pin post to top of page
- [ ] Share to 5+ FB Groups (adapt content, don't just copy)
- [ ] Reply to every comment within 30 minutes

### 10:00 — Line + TikTok + Ads
- [ ] Send Line Broadcast #2 (Launch Day — Flex Message)
- [ ] Publish TikTok Clip 2 (Myth-Busting)
- [ ] Publish IG Reels (same video)
- [ ] Activate FB Ad 1 (Pain-Point) — budget: 750฿/day
- [ ] Activate FB Ad 2 (Social Proof) — budget: 750฿/day
- [ ] Post Twitter/X thread: "เปิดตัวแล้ว!"

### 12:00 — Mid-Day Check
- [ ] Check FB Ads Manager: impressions, CTR, CPC
- [ ] Pause any ad with CTR < 1% after 1,000 impressions
- [ ] Check Line OA: reply to all messages
- [ ] Check landing page: visitors in GA4 real-time
- [ ] Check sign-ups: how many trials started?
- [ ] Screenshot ad performance for reference

### 15:00 — Afternoon Push
- [ ] Post FB Groups: "TradeCandle เปิดตัวแล้ว! ใครลองแล้วบอกมา"
- [ ] Reply to all new comments/DMs
- [ ] Check ad spend vs sign-ups (ROAS estimate)

### 17:00 — Evening Content
- [ ] Publish FB Post: Urgency "เหลือ 3 วัน! 20% off"
- [ ] Check ad performance — increase budget for winners
- [ ] If any ad has CTR > 4%: increase budget 30%

### 19:00 — Prime Time
- [ ] Post FB Groups: Launch message (adapted)
- [ ] Share TikTok to other platforms
- [ ] Monitor landing page traffic spike

### 21:00 — Wrap Up
- [ ] Reply to ALL remaining comments/DMs
- [ ] Take screenshots of Day 1 metrics
- [ ] Note best-performing content for future reference
- [ ] Set alarm for 09:00 tomorrow — check ads + reply

---

## 📊 Day 1 Metrics to Track

| Metric | Target | Actual |
|--------|--------|--------|
| Landing page visits | 1,000 | ___ |
| Trial sign-ups | 50 | ___ |
| Paid conversions | 10 | ___ |
| FB Ad spend | 1,500฿ | ___ |
| CTR (average) | ≥ 2.5% | ___ |
| CPC (average) | ≤ 15฿ | ___ |
| Line broadcast open rate | 85% | ___ |
| Line click rate | 15% | ___ |

---

## 🛑 Emergency Procedures

### ถ้าเว็บล่น / ช้า
```bash
# เช็ค Vercel deployment
vercel logs --follow

# เช็ค database connection
npx prisma studio

# Quick fix: restart if needed
vercel --prod
```

### ถ้า USDT Payment ไม่ทำงาน
- ตรวจสอบ USDT_TRC20_ADDRESS ใน `.env` ถูกต้อง
- ตรวจสอบ TronGrid webhook URL และ secret
- ตรวจสอบ `docs/USDT_PAYMENT_SETUP.md`
- ตรวจสอบ STRIPE_SECRET_KEY และ NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ใน `.env`
- ตรวจสอบ webhook URL ใน Blockchain Explorer
- ตรวจสอบ `docs/STRIPE_SETUP.md`

### ถ้า Line OA ไม่ตอบ
- เช็ค LINE_CHANNEL_ACCESS_TOKEN และ LINE_CHANNEL_SECRET ใน `.env`
- เช็ค webhook URL ใน Line Developer Console
- ตอบด้วยมือชั่วคราว

### ถ้า FB Ads ไม่แสดง
- ตรวจสอบ Pixel ติดแล้ว (Pixel Helper extension)
- ตรวจสอบ ad status: Active
- ตรวจสอบ audience size: ≥ 1,000
- รอ 2-4 ชม.หลังเปิด ad ใหม่

### ถ้าไม่มีคนสมัครเลย
- เช็ค landing page load speed (< 3 sec)
- เช็ค CTA buttons working
- เช็ค mobile responsive
- เพิ่ม ad budget 20-30%
- เปลี่ยน ad creative