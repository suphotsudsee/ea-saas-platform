# 08 — Competitor Analysis
## TradeCandle v11 vs คู่แข่ง EA ขายทอง

---

## 🔍 คู่แข่งหลัก (Direct Competitors)

### 1. Forex Fury
| รายการ | Forex Fury | TradeCandle v11 |
|--------|-----------|----------------|
| **ราคา** | $439/ปี (one-time option) | 990฿/เดือน (~$29) |
| **Platform** | MT4 + MT5 | MT5 |
| **สินค้า** | ขาย EA 5 คู่เงิน (รวม XAUUSD) | ขาย EA เฉพาะ XAUUSD |
| **TP/SL** | Conventional single TP | 3-Wave Cashout ✅ |
| **PA/SMC** | ไม่มี | 6 filters + Confluence Gate ✅ |
| **Dashboard** | ไม่มี (local MT5 เท่านั้น) | SaaS Dashboard real-time ✅ |
| **Kill Switch** | ไม่มี | มี ✅ |
| **Heartbeat** | ไม่มี | มี ✅ |
| **Risk Mgmt** | EA-side only | Platform-level + EA-side ✅ |
| **ล็อค/ผูกบัญชี** | ผูก account number | License Key + Heartbeat ✅ |
| **Support** | Email (ช้า) | Line OA (ไว) ✅ |
| **ภาษาไทย** | ไม่มี | มี ✅ |

**จุดอ่อน Forex Fury:** ราคาแพง ไม่มี dashboard ไม่มี Thai support  
**จุดแข็ง:** แบรนด์ดัง มีมากกว่า 5 ปี

---

### 2. Forex Steam
| รายการ | Forex Steam | TradeCandle v11 |
|--------|------------|----------------|
| **ราคา** | $299/ปี | 990฿/เดือน |
| **Platform** | MT4 + MT5 | MT5 |
| **กลยุทธ์** | Scalping M1-M5 | Swing/Trend M5-H1 |
| **TP/SL** | Fixed pip (20-30) | ATR dynamic ✅ |
| **PA/SMC** | ไม่มี | มี ✅ |
| **Dashboard** | ไม่มี | มี ✅ |
| **Backtest** | ผลลัพธ์ดีแต่มี curve fitting สงสัย | ผลจริง + Sharpe verified |

**จุดอ่อน:** Scalping = spread-sensitive, fixed pip = ไม่ปรับตาม market  
**จุดแข็ง:** ราคาถูกกว่า มี MT4

---

### 3. GPS Forex Robot
| รายการ | GPS Forex Robot | TradeCandle v11 |
|--------|----------------|----------------|
| **ราคา** | $149 (one-time!) | Monthly SaaS |
| **Platform** | MT4 + MT5 | MT5 |
| **กลยุทธ์** | Grid + Recovery | 3-Wave + PA/SMC |
| **ความเสี่ยง** | สูงมาก (Grid ไม่มีขอบเขต) | ต่ำ-กลาง (BE + Trail + DD limit) ✅ |
| **Drawdown** | 30-60% (เคย 80%+) | <15% ✅ |
| **Dashboard** | ไม่มี | มี ✅ |

**จุดอ่อน:** ราคาถูกแต่อันตราย — Grid = ขาดทุนรุนแรงถ้าผิดทิศ  
**จุดแข็ง:** One-time ถูกมาก (แต่คุณภาพต่ำ)

---

### 4. EA ไทย (ช่องทาง Facebook/Pantip)
| รายการ | EA ไทยทั่วไป | TradeCandle v11 |
|--------|-------------|----------------|
| **ราคา** | 500-3,000 บาท (one-time) | 990฿/เดือน SaaS |
| **คุณภาพ** | ส่วนใหญ่ low quality | มาตรฐานสากล ✅ |
| **Source Code** | บางครั้งมี (แต่สปากเก็ตตี้) | Clean MQL5 ✅ |
| **Support** | แชท Line (ช้า/หาย) | Line OA + Dashboard ✅ |
| **อัปเดต** | ไม่ค่อยมี | Auto config sync ✅ |
| **Transparency** | ไม่มี backtest จริง | Verified backtest ✅ |

**จุดอ่อน EA ไทย:** ไม่มี dashboard ไม่มี license ระบบ คุณภาพไม่สม่ำเสมอ  
**จุดแข็ง:** ถูก one-time คนไทยทำ

---

## 🔴 Indirect Competitors (คู่แข่งทางอ้อม)

### 5. Copy Trading (eToro, NAGA)
- ก๊อปปี้เทรดเดอร์อื่นแทนใช้ EA
- **จุดอ่อน:** ต้องเชื่อใจคน ไม่มีควบคุม ค่าธรรมเนียมสูง
- **TradeCandle ดีกว่า:** ควบคุมเอง + EA ทำงานตามกฎ

### 6. Signal Groups (Telegram/Discord)
- รับสัญญาณแล้วเทรดเอง
- **จุดอ่อน:** ต้องนั่งรอ พลาดบ่อย สัญญาณไม่คงเดชา
- **TradeCandle ดีกว่า:** อัตโนมัติ ไม่พลาดจังหวะ

### 7. Manual Trading + Course
- อยากเรียนเทรดเอง
- **จุดอ่อน:** ใช้เวลานาน โอกาสผิดพลาดสูง
- **TradeCandle ดีกว่า:** AI ทำให้ ผู้ใช้ยังเรียนรู้จาก Dashboard ได้

---

## 📊 Competitive Matrix

```
              คุณภาพสูง
                  │
    [TradeCandle] │
      ★ v11      │
                  │
   ──────────────┼────────────── นวัตกรรมสูง
                  │
    [EA ไทย]     │  [Forex Fury]
                  │  [Forex Steam]
    [GPS Robot]  │
                  │
              คุณภาพต่ำ
```

**จุดยืน TradeCandle:** Premium quality + High innovation + Affordable price  
= **"SaaS EA ระดับสากล ราคาไทย"**

---

## 🎯 How to Win (กลยุทธ์เอาชนะคู่แข่ง)

| คู่แข่ง | จุดโจมตี | ข้อความหลัก |
|--------|---------|-----------|
| Forex Fury | แพง + ไม่มี dashboard | "ดีกว่าในราคา 1/15" |
| Forex Steam | Fixed SL/TP + Scalping | "ATR dynamic ปรับตามตลาด" |
| GPS Robot | Grid = อันตราย | "3-Wave = กำไรบางส่วนเสมอ" |
| EA ไทย | คุณภาพไม่แน่นอน | "มาตรฐานสากล + SaaS Dashboard" |
| Copy Trading | ไม่มีควบคุม | "EA คุณเอง คุมได้ หยุดได้" |
| Signal Groups | พลาดจังหวะ | "อัตโนมัติ ไม่พลาด 24/5" |

---

*สร้างเมื่อ: เม.ย. 2026 | 7 คู่แข่ง วิเคราะห์ | USP หลัก: 3-Wave + PA/SMC + SaaS Dashboard*