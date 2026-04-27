# 11 — Offer Design (Thai)

---

## 💰 Offer Architecture — TradeCandle EA v12

---

## 1. PriceMember (Pricing Tiers)

### 🥉 Starter — 990$/month

**ตลาดGoal:** Tradingเดอร์มือใหม่Atเพิ่งGet Started
**Goal:** ให้ลองUsePerformanceิตภัณฑ์ Createความคุ้นเคย

| Feature | Details |
|---|---|
| EA v12 เวอร์ชันเต็ม | ✅ รวม |
| MT5 Accounts | 1 Accounts |
| SaaS Dashboard | ✅ Basic (StatusการTrading, PnL) |
| Kill Switch | ✅ รวม |
| Auto Risk Management | ✅ รวม |
| Line OA สนับสนุน | ✅ ตอบภายใน 24 ชม. |
| 6 PA/SMC Smart Money Filters | ❌ Noรวม (Use 3 FilterBasic) |
| 3-Wave Cashout Pro | ❌ Noรวม (Use TP Single) |
| สัมมนาOnline | ❌ Noรวม |
| Coaching | ❌ Noรวม |

**PriceCompare:**
- 990$/month = 33$/days = "Priceกาแฟ 1 แก้วต่อdays"

---

### ⭐ Pro — 2,490$/month (แนะนำ!)

**ตลาดGoal:** Tradingเดอร์ระดับกลางAtต้องการFeatureครบ
**Goal:** แพ็กเกจหลัก Create Deposit Orderได้ส่วนใหญ่

| Feature | Details |
|---|---|
| EA v12 เวอร์ชันเต็ม | ✅ รวม |
| MT5 Accounts | 3 Accounts |
| SaaS Dashboard | ✅ เต็มFormat (ครบAllFunction) |
| Kill Switch | ✅ รวม |
| Auto Risk Management | ✅ รวม |
| Line OA สนับสนุน | ✅ Priority ตอบภายใน 4 ชม. |
| 6 PA/SMC Smart Money Filters | ✅ รวมAll 6 Filter |
| 3-Wave Cashout Pro | ✅ รวม |
| สัมมนาOnline | ✅ รายmonth (1 ครั้ง/month) |
| Coaching | ❌ Noรวม |

**PriceCompare:**
- 2,490$/month = 83$/days = "Priceอาหารกลางdays 1 มื้อต่อdays"
- ประหยัดกว่า Starter 3 Accounts: 990 x 3 = 2,970$ (ประหยัด 480$)

---

### 💎 Elite — 4,990$/month

**ตลาดGoal:** Tradingเดอร์Professionalandผู้ลงทุนระดับHigh
**Goal:** บริการระดับพรีเHasยม Createความภักดี

| Feature | Details |
|---|---|
| EA v12 เวอร์ชันเต็ม | ✅ รวม |
| MT5 Accounts | 10 Accounts |
| SaaS Dashboard | ✅ VIP (ครบ + Reportsพิเศษ) |
| Kill Switch | ✅ รวม |
| Auto Risk Management | ✅ รวม |
| Line OA สนับสนุน | ✅ VIP 24/7 ตอบภายใน 1 ชม. |
| 6 PA/SMC Smart Money Filters | ✅ รวมAll 6 Filter |
| 3-Wave Cashout Pro | ✅ รวม |
| สัมมนาOnline | ✅ NoLimited |
| 1-on-1 Coaching | ✅ 2 ชม./month |
| กลยุทธ์พิเศษ Elite | ✅ รวม |
| Early Access Featureใหม่ | ✅ รวม |
| VIP Community | ✅ Group Line VIP |

**PriceCompare:**
- 4,990$/month = 166$/days = "Priceดินเนอร์ 1 มื้อต่อdays"
- Coaching เทียบกับภายนอก: ประหยัดกว่าจ้าง Coach แยก (2,000-5,000$/ชม.)

---

## 2. โOnัสandของแถม (Bonuses)

### 🎁 โOnัสSign Upใหม่ (Allแพ็กเกจ)

| โOnัส | Details | มูลค่า |
|---|---|---|
| Free Trial 14 days | Noต้องผูกCredit Card | 330-1,663$ |
| คู่มือ "TradingGoldฉบับProfessional" | PDF 30 Page | 490$ |
| วิดีโอ "Settings EA ใน 10 minutes" | วิดีโอสอนSettings | 290$ |

### 🎁 โOnัสExclusive Pro

| โOnัส | Details | มูลค่า |
|---|---|---|
| สัมมนา "Smart Money กับGold" | Online 1 ชม. | 990$ |
| เทมเพลต Risk Management | Google Sheet | 290$ |

### 🎁 โOnัสExclusive Elite

| โOnัส | Details | มูลค่า |
|---|---|---|
| 1-on-1 Coaching 2 ชม. | ปรึกษากลยุทธ์ExclusiveItem | 4,000$ |
| Group Line VIP | แลกเปลี่ยนกับMember Elite | NoHasมูลค่า |
| Early Access v13 | UseFeatureใหม่ก่อนใคร | NoHasมูลค่า |

**มูลค่าโOnัสรวม:**
- Starter: 1,110$ (มูลค่าโOnัส > ค่าสมัชิก 1 month!)
- Pro: 2,090$ (โOnัสเกือบเท่าค่าสมัชิก)
- Elite: 5,090$ (โOnัสเกินค่าสมัชิก!)

---

## 3. Upsell Path (เส้นทางAddยอดขาย)

### 3.1 Upsell Ladder (บันไดAddยอดขาย)

```
Starter (990$/month)
    ↓ หลัง 1-2 month: เห็นว่า 3 FilterNoพอ
Pro (2,490$/month)
    ↓ หลัง 3-4 month: ต้องการAccountsAdd + Coaching
Elite (4,990$/month)
```

### 3.2 จังหวะ Upsell

| จังหวะ | วิธีการ | เงื่อนไข |
|---|---|---|
| ทันทีหลังSign Up | One-Time Offer: ลด 20% สมัชิก 6 month | Sign Up Starter/Pro |
| หลังUse 7 days | เสนอ Upgrade → Pro Has 6 Filters + 3-Wave | Member Starter |
| หลังUse 30 days | เสนอ Upgrade → Elite Has Coaching | Member Pro |
| หลังUse 90 days | เสนอสมัชิกปี ลด 25% | MemberAllระดับ |
| เมื่อใกล้หมดTrial | เสนอสมัชิกReadyโOnัสAdd | Trial User |

### 3.3 Cross-Sell (ขายเสริม)

| Performanceิตภัณฑ์เสริม | Price | เสนอเมื่อ |
|---|---|---|
| คอร์ส "Smart Money Mastery" | 2,990$ (One-time) | สมัชิก Starter Allคน |
| บริMT5 Settings + EA | 500$ (One-time) | สมัชิกใหม่Allคน |
| VPS For MT5 | 490$/month | MemberAtต้องการรัน 24/7 |
| Custom Risk Profile | 1,490$ (One-time) | Member Pro/Elite |

---

## 4. การรับประTogether (Guarantee)

### 🛡️ "Free Trial 14 days — Noพอใจคืนเงิน"

**นโยบายรับประTogether:**

```
✅ Free Trial 14 days ก่อนตัดสินใจสมัชิก
✅ Noต้องผูกCredit CardEpisodeทดลอง
✅ หลังสมัชิก: คืนเงิน 100% ภายใน 7 daysFirst
✅ NoHasQuestion — แค่แจ้งผ่าน Line OrEmail
✅ Cancelได้AllTime NoHasสัญญาผูกพัน
```

**เงื่อนไข:**
- Free Trial 14 days: NoHasค่าUseจ่าย Noต้องผูกบัตร
- คืนเงิน 100%: ภายใน 7 daysหลังสมัชิก NoHasเงื่อนไข
- หลัง 7 days: สามารถCancelได้ แต่Noคืนเงินmonthนั้น

**Messageการตลาด:**
```
🛡️ NoHasความเสี่ยง! 
Free Trial 14 days Noต้องผูกบัตร
หลังสมัชิก: คืนเงิน 100% ภายใน 7 days
Noพอใจ? คืนเงินทันที NoHasQuestion
```

---

## 5. ItemTriggerความเร่งด่วน (Scarcity Triggers)

### ⏰ ItemTriggerTypeต่างๆ

#### 5.1 AmountLimited (Quantity Scarcity)

```
🔥 OpenรับMemberใหม่Limited monthThisเพียง 100 คน
toรักษาYouภาพการสนับสนุน
เมื่อครบ 100 คน จะCloseรับชั่วคราว

[เหลือ 67 Atนั่ง] ← Updateเรียลไทม์
```

**กลไก:** ประกาศAmountLimited 100 คน/month ShowAmountAtเหลือOnWebsite

#### 5.2 TimeLimited (Time Scarcity)

```
⏰ OfferOpenItemสิ้นสุดใน:

[COUNTDOWN TIMER: days ชม. นาท. seconds]

หลังDate __/__/____ PriceจะReturn/Reverseเป็นปกติ
Starter: 990$ → 1,490$
Pro: 2,490$ → 3,490$
Elite: 4,990$ → 6,990$
```

**กลไก:** ลดPriceOpenItem 30-40% Forผู้สมัชิกยุคFirst

#### 5.3 โOnัสLimitedTime (Bonus Scarcity)

```
🎁 โOnัสพิเศษFor 50 คนFirst:
✅ คู่มือ "TradingGoldฉบับProfessional" (มูลค่า 490$)
✅ วิดีโอ "Settings EA ใน 10 minutes" (มูลค่า 290$)
✅ เทมเพลต Risk Management (มูลค่า 290$)

รวมมูลค่า 1,070$ → Free! (Exclusive 50 คนFirst)
```

**กลไก:** ให้โOnัสพิเศษForผู้สมัชิกยุคFirst

#### 5.4 Price Founding Member (Price Lock)

```
🌟 สมัชิกยุคFirst = PriceMemberตลอดชีพ!

สมัชิก 100 คนFirstจะได้Price Founding Member
PriceThisจะNoAddตลอดอายุMember
แม้ว่าPriceปกติจะAddในอนาคต

✅ Starter Founding: 990$ (Priceปกติ 1,490$)
✅ Pro Founding: 2,490$ (Priceปกติ 3,490$)
✅ Elite Founding: 4,990$ (Priceปกติ 6,990$)
```

**กลไก:** ล็อกPriceMemberตลอดชีพForผู้สมัชิกยุคFirst

---

## 6. Offer ArchitectureStyleเต็ม (Complete Offer Architecture)

### ภาพรวม Offer Stack

```
┌─────────────────────────────────────────┐
│  💎 ELITE — 4,990$/month              │
│  ┌─────────────────────────────────────┐│
│  │  ⭐ PRO — 2,490$/month            ││
│  │  ┌─────────────────────────────────┐││
│  │  │  🥉 STARTER — 990$/month       │││
│  │  │  ┌─────────────────────────────┐│││
│  │  │  │  🆓 TRIAL — Free 14 days    ││││
│  │  │  │  • EA v12 (3 Filter)     ││││
│  │  │  │  • 1 MT5 Accounts              ││││
│  │  │  │  • Dashboard Basic       ││││
│  │  │  │  • Kill Switch              ││││
│  │  │  └─────────────────────────────┘│││
│  │  │  + 6 Filters + 3-Wave + 3 Accounts│││
│  │  └─────────────────────────────────┘││
│  │  + Coaching + VIP + 10 Accounts        ││
│  └─────────────────────────────────────┘│
│  + โOnัส + รับประTogether + ItemTrigger    │
└─────────────────────────────────────────┘
```

### ลำดับการนำเสนอ (Offer Sequence)

**ขั้นAt 1: ทดลองFree 14 days**
→ NoHasความเสี่ยง ลองUseก่อน

**ขั้นAt 2: Starter 990$/month**
→ Get StartedEnterถึงได้ง่าย

**ขั้นAt 3: Pro 2,490$/month (แนะนำ!)**
→ Featureครบ คุ้มค่าAtสุด

**ขั้นAt 4: Elite 4,990$/month**
→ ForProfessionalAtต้องการAllอย่าง

**ขั้นAt 5: Upsell / Cross-sell**
→ หลังสมัชิกAlready ตามด้วยOfferAdd

---

## 7. กลยุทธ์Priceเชิงจิตวิทยา (Pricing Psychology)

### 7.1 Anchoring Effect

```
❌ ค่าสมัชิกรายmonth: 990$ - 4,990$
❌ ค่าสมัชิกรายปี (คำนวณเป็นmonth): 743$ - 3,743$

✅ ShowPriceรายปีReadyส่วนลด:
Starter: 990$/month → 7,430$/ปี (ประหยัด 4,450$!)
Pro: 2,490$/month → 19,900$/ปี (ประหยัด 9,880$!)
Elite: 4,990$/month → 39,900$/ปี (ประหยัด 19,880$!)
```

### 7.2 Decoy Effect

```
Starter: 990$/month — 1 Accounts, 3 Filter
Pro: 2,490$/month — 3 Accounts, 6 Filter, 3-Wave Cashout ← คุ้มAtสุด!
Elite: 4,990$/month — 10 Accounts, VIP, Coaching

→ Pro Viewคุ้มAtสุดเมื่อเทียบกับ Starter Atได้น้อยกว่ามาก
   and Elite Atแพงกว่า 2 เท่า
```

### 7.3 Price Comparison

```
ComparePrice TradeCandle กับทางเลือกอื่น:

📚 คอร์สTrading: 5,000-50,000$ (ครั้งSingle, ยังต้องTradingเอง)
📱 SignalsTrading: 500-5,000$/month (ต้องรอSignals, ล่าช้า)
🌍 EA ต่างCountry: 3,500-17,500$ (Buyขาด, NoHasLanguageThai)
📊 Copy Trading: ค่าธรรมเนียม 20-30% ของProfit

🥇 TradeCandle: Beginner 990$/month (Automated, LanguageThai, Dashboard)
```

### 7.4 Daily Cost Framing

```
Starter: 990$/month = 33$/days = แก้วกาแฟ 1 แก้ว
Pro: 2,490$/month = 83$/days = ข้าวกลางdays 1 มื้อ
Elite: 4,990$/month = 166$/days = ขนมปัง+กาแฟยามบ่าย
```

---

## 8. OfferตามPeriodTime (Time-Based Offers)

### 8.1 PeriodOpenItem (Launch Period)

```
🎁 OfferOpenItem — For 100 คนFirst:
✅ ทดลองFree 14 days (ปกติ 7 days)
✅ Price Founding Member ล็อกตลอดชีพ
✅ โOnัสAdd: เทมเพลต Risk Management (มูลค่า 290$)
✅ Noต้องผูกCredit Card
```

### 8.2 Periodเทศกาล (Seasonal Promotions)

```
🎁 SubmitเสริมการขายPeriodเทศกาล:

🎵 สงกรานต์ (April): ลด 20% สมัชิก 3 month
👨 daysพ่อ (ธันวาคม): ลด 15% สมัชิก 6 month
🎄 ปีใหม่ (มกราคม): ลด 25% สมัชิกปี
🪷 daysสำคัญGoldUp: โปรโมชั่นพิเศษ
```

### 8.3 Period Retention (Return/ReverseมาUseใหม่)

```
🎁 Return/ReverseมาUse TradeCandle อีกครั้ง!

เราเห็นว่าYouหยุดสมัชิกมา ___ daysAlready
เราอยากให้YouReturn/Reverseมาด้วยOfferพิเศษ:

✅ ลด 30% monthFirst
✅ Free Coaching 1 ชม. (มูลค่า 2,000$)
✅ NoHasค่าSign Upซ้ำ

→ กดtoReturn/ReverseมาUseใหม่: tradecandle.ai/comeback
```

---

## 9. การสื่อสารOffer (Offer Messaging Framework)

### 9.1 สูตรMessageหลัก (Core Offer Message)

```
TradeCandle EA v12 ช่วยให้YouTradingGoldAutomated
ด้วย 6 Smart Money Filters + 3-Wave Cashout + SaaS Dashboard
Profit $4,858 | ชนะ 74.75% | Max Drawdown $544
Get Started 990$/month — ทดลองFree 14 days!
```

### 9.2 สูตร Elevator Pitch (30 seconds)

```
TradeCandle v12 คือระบบTradingGoldAutomated on MT5
AtUse 6 Filter Smart Money AnalyzePointEnterแม่นย์
CloseProfitเป็น 3 คลื่นกับ 3-Wave Cashout
andHas Dashboard Controlเรียลไทม์Ready Kill Switch ฉุกเฉิน
ทดลองFree 14 days Get Started 990$/month
```

### 9.3 สูตรMessageขาย (Sales Message)

```
Problem: TradingGoldLoss เพราะEnterผิดPoint Profitน้อย นั่งเฝ้าจอเหนื่อย

ทางออก: TradeCandle EA v12
• 6 Smart Money Filters → EnterPointแม่นย์
• 3-Wave Cashout → CloseProfit 3 ระดับ Noโลภจนเสียหมด
• SaaS Dashboard → ViewStatusเรียลไทม์ Noต้องเฝ้าจอ
• Kill Switch → กดButtonSingleCloseAllระบบ

หลักฐาน: 819 Round Backtest | Profit $4,858 | WR 74.75%

Offer: ทดลองFree 14 days | Beginner 990$/month | คืนเงิน 7 days

→ ตัดสินใจAt: tradecandle.ai
```