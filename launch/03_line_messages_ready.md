# 7C — 3 ข้อความ Line OA Broadcast (ส่งได้เลย)
## TradeCandle v11 — Copy → วาง → ส่ง

---

## 💬 ข้อความที่ 1: Teaser (ก่อนเปิดตัว 2 วัน — วันจันทร์ 19:00)

### Line Broadcast — Flex Message

```
สวัสดีครับ 🙏

มีของดีจะประกาศวันพุธนี้! 👀

เคยเทรดทองแล้วกำไรหายไประหว่างทางไหมครับ?
หรือนั่งดูกราฟทั้งคืนแต่ยังเทรดไม่ได้เรื่อง?

วันพุธนี้ เรามีเรื่องจะบอก 🤫

📌 กดเพิ่มเพื่อนเลย → จะได้รับสิทธิพิเศษก่อนใคร!
```

### 🔧 Line API Format (สำหรับ broadcast endpoint):

```json
{
  "messages": [
    {
      "type": "flex",
      "altText": "มีของดีจะประกาศวันพุธนี้!",
      "contents": {
        "type": "bubble",
        "body": {
          "type": "box",
          "layout": "vertical",
          "contents": [
            {
              "type": "text",
              "text": "🔥 มีของดีจะประกาศ",
              "weight": "bold",
              "size": "xl",
              "color": "#D4AF37"
            },
            {
              "type": "text",
              "text": "วันพุธนี้!",
              "weight": "bold",
              "size": "lg",
              "color": "#FFFFFF",
              "margin": "sm"
            },
            {
              "type": "separator",
              "margin": "lg"
            },
            {
              "type": "text",
              "text": "เคยเทรดทองแล้วกำไรหายไประหว่างทาง?\nหรือนั่งดูกราฟทั้งคืนแต่ยังเทรดไม่ได้เรื่อง?\n\nเรามีคำตอบให้ 👀",
              "size": "md",
              "color": "#B0B0B0",
              "margin": "lg",
              "wrap": true
            }
          ]
        },
        "footer": {
          "type": "box",
          "layout": "vertical",
          "contents": [
            {
              "type": "button",
              "action": {
                "type": "uri",
                "label": "⭐ รับสิทธิพิเศษก่อนใคร",
                "uri": "https://tradecandle.ai/?utm_source=line&utm_medium=broadcast&utm_campaign=launch_teaser"
              },
              "style": "primary",
              "color": "#D4AF37"
            }
          ]
        }
      }
    }
  ]
}
```

**📌 Expected:** 80% open → 5% click

---

## 💬 ข้อความที่ 2: Launch Day (วันเปิดตัว — วันพุธ 10:00)

### Line Broadcast — Flex Message

```
🚀 เปิดตัวแล้ว! TradeCandle v11

AI เทรดทองอัตโนมัติบน MT5
✅ 3-Wave Cashout — ปิดกำไร 3 รอบ
✅ 6 Smart Money ฟิลเตอร์ — อ่านทรงสตรัคเจอร์ให้
✅ Dashboard คุมจากมือถือ + Kill Switch

⚡ ส่วนลด 20% เฉพาะ 4 วันนี้!
Starter: 990 → 792 ฿/เดือน
Pro ⭐: 2,490 → 1,992 ฿/เดือน
Elite: 4,990 → 3,992 ฿/เดือน

🎁 LINE EXCLUSIVE: เพิ่ม 3 วันฟรี (รวม 10 วันฟรี!)
ไม่ต้องใส่USDT ✅

กดลิงก์เลย 👇
```

### 🔧 Line API Format:

```json
{
  "messages": [
    {
      "type": "flex",
      "altText": "🚀 TradeCandle v11 เปิดตัวแล้ว! ส่วนลด 20% + LINE Exclusive +3 วันฟรี",
      "contents": {
        "type": "bubble",
        "hero": {
          "type": "image",
          "url": "https://tradecandle.ai/images/pricing-cards.png",
          "size": "full",
          "aspectRatio": "20:13",
          "aspectMode": "fit"
        },
        "body": {
          "type": "box",
          "layout": "vertical",
          "contents": [
            {
              "type": "text",
              "text": "🚀 เปิดตัวแล้ว!",
              "weight": "bold",
              "size": "xl",
              "color": "#D4AF37"
            },
            {
              "type": "text",
              "text": "TradeCandle v11",
              "weight": "bold",
              "size": "lg",
              "color": "#FFFFFF"
            },
            {
              "type": "text",
              "text": "AI เทรดทองอัตโนมัติ • 3-Wave Cashout • Smart Money ฟิลเตอร์ • Dashboard + Kill Switch",
              "size": "sm",
              "color": "#B0B0B0",
              "wrap": true,
              "margin": "sm"
            },
            {
              "type": "separator",
              "margin": "lg"
            },
            {
              "type": "box",
              "layout": "vertical",
              "margin": "lg",
              "contents": [
                {
                  "type": "text",
                  "text": "⚡ ส่วนลด 20% เฉพาะ 4 วัน!",
                  "weight": "bold",
                  "size": "md",
                  "color": "#00C853"
                },
                {
                  "type": "text",
                  "text": "Starter: 990 → 792฿/เดือน",
                  "size": "sm",
                  "color": "#FFFFFF",
                  "margin": "sm"
                },
                {
                  "type": "text",
                  "text": "Pro ⭐: 2,490 → 1,992฿/เดือน",
                  "size": "sm",
                  "color": "#D4AF37",
                  "margin": "sm"
                },
                {
                  "type": "text",
                  "text": "Elite: 4,990 → 3,992฿/เดือน",
                  "size": "sm",
                  "color": "#FFFFFF",
                  "margin": "sm"
                }
              ]
            },
            {
              "type": "box",
              "layout": "vertical",
              "margin": "lg",
              "backgroundColor": "#1A1A2E",
              "cornerRadius": "8px",
              "paddingAll": "12px",
              "contents": [
                {
                  "type": "text",
                  "text": "🎁 LINE EXCLUSIVE",
                  "weight": "bold",
                  "size": "md",
                  "color": "#D4AF37"
                },
                {
                  "type": "text",
                  "text": "เพิ่ม 3 วันฟรี = 10 วันฟรี!\nไม่ต้องใส่USDT ✅",
                  "size": "sm",
                  "color": "#FFFFFF",
                  "margin": "xs",
                  "wrap": true
                }
              ]
            }
          ]
        },
        "footer": {
          "type": "box",
          "layout": "vertical",
          "contents": [
            {
              "type": "button",
              "action": {
                "type": "uri",
                "label": "🔥 ทดลอง 10 วันฟรี (LINE Exclusive)",
                "uri": "https://tradecandle.ai/?utm_source=line&utm_medium=broadcast&utm_campaign=launch_day&utm_content=line_exclusive"
              },
              "style": "primary",
              "color": "#D4AF37"
            },
            {
              "type": "button",
              "action": {
                "type": "uri",
                "label": "ดูราคาทั้งหมด",
                "uri": "https://tradecandle.ai/#pricing?utm_source=line&utm_medium=broadcast&utm_campaign=launch_day"
              },
              "style": "secondary",
              "color": "#333333"
            }
          ]
        }
      }
    }
  ]
}
```

**📌 Expected:** 85% open → 15% click → 5% convert

---

## 💬 ข้อความที่ 3: Urgency (ก่อนหมดโปรโมชั่น 1 วัน — วันอาทิตย์ 10:00 + 18:00)

### Line Broadcast — Flex Message

```
⏰ เหลือ 24 ชั่วโมง!

ส่วนลด 20% หมดเขตคืนนี้ 23:59 ⏰

Starter: 792฿/เดือน (ปกติ 990฿)
Pro ⭐: 1,992฿/เดือน (ปกติ 2,490฿)
Elite: 3,992฿/เดือน (ปกติ 4,990฿)

ผ่าน LINE ได้เพิ่ม 3 วันฟรี = 10 วัน!
ไม่ต้องจ่ายก่อน ยกเลิกได้ทุกเมื่อ

ถ้ายังไม่แน่ใจ ถามเราก่อนได้ 👇
```

### 🔧 Line API Format:

```json
{
  "messages": [
    {
      "type": "flex",
      "altText": "⏰ เหลือ 24 ชม.! ส่วนลด 20% หมดเขตคืนนี้!",
      "contents": {
        "type": "bubble",
        "body": {
          "type": "box",
          "layout": "vertical",
          "contents": [
            {
              "type": "text",
              "text": "⏰ เหลือ 24 ชั่วโมง!",
              "weight": "bold",
              "size": "xxl",
              "color": "#FF4444"
            },
            {
              "type": "text",
              "text": "ส่วนลด 20% หมดเขตคืนนี้ 23:59",
              "weight": "bold",
              "size": "lg",
              "color": "#D4AF37",
              "margin": "sm"
            },
            {
              "type": "separator",
              "margin": "lg"
            },
            {
              "type": "box",
              "layout": "vertical",
              "margin": "lg",
              "contents": [
                {
                  "type": "text",
                  "text": "Starter: 792฿/เดือน",
                  "size": "md",
                  "color": "#FFFFFF",
                  "decoration": "none"
                },
                {
                  "type": "text",
                  "text": "Pro ⭐: 1,992฿/เดือน",
                  "size": "md",
                  "color": "#D4AF37",
                  "margin": "sm"
                },
                {
                  "type": "text",
                  "text": "Elite: 3,992฿/เดือน",
                  "size": "md",
                  "color": "#FFFFFF",
                  "margin": "sm"
                }
              ]
            },
            {
              "type": "box",
              "layout": "vertical",
              "margin": "lg",
              "backgroundColor": "#1A1A2E",
              "cornerRadius": "8px",
              "paddingAll": "12px",
              "contents": [
                {
                  "type": "text",
                  "text": "🎁 LINE Exclusive: เพิ่ม 3 วันฟรี = 10 วัน!",
                  "weight": "bold",
                  "size": "sm",
                  "color": "#D4AF37",
                  "wrap": true
                },
                {
                  "type": "text",
                  "text": "ไม่ต้องจ่ายก่อน • ยกเลิกได้ทุกเมื่อ ✅",
                  "size": "xs",
                  "color": "#B0B0B0",
                  "margin": "xs"
                }
              ]
            }
          ]
        },
        "footer": {
          "type": "box",
          "layout": "vertical",
          "contents": [
            {
              "type": "button",
              "action": {
                "type": "uri",
                "label": "⚡ สมัครเลย ก่อนหมดเวลา!",
                "uri": "https://tradecandle.ai/?utm_source=line&utm_medium=broadcast&utm_campaign=launch_urgency"
              },
              "style": "primary",
              "color": "#D4AF37"
            },
            {
              "type": "button",
              "action": {
                "type": "uri",
                "label": "💬 ถามก่อนสมัคร",
                "uri": "https://line.me/ti/p/@tradecandle"
              },
              "style": "secondary",
              "color": "#333333"
            }
          ]
        }
      }
    }
  ]
}
```

**📌 ส่ง 2 รอบ:** 10:00 (เช้า) + 18:00 (เย็น)
**📌 Expected:** 90% open → 20% click → 8% convert

---

## 💬 ข้อความประจำเดือน (Template — ส่งทุกเดือน)

```
📊 รายงานประจำเดือน [เดือน]

Win Rate: 68% 📈
Net Profit: +$[amount]
Max Drawdown: [X]%

💡 เคล็ดลับเดือนนี้:
[ใส่เคล็ดลับการเทรดทอง]

ต้องการอัพเกรดแพ็กเกจ? 📈
https://tradecandle.ai/#pricing?utm_source=line&utm_medium=monthly
```

---

## 📋 ส่ง Line Broadcast ผ่าน API:

```bash
# ส่ง broadcast message
npx tsx scripts/line-manage.ts broadcast '{"type":"text","text":"ข้อความที่นี่"}'

# ส่ง Flex Message (ข้อความที่ 1, 2, หรือ 3)
# ใช้ Line API Console หรือ broadcast endpoint

# เช็คจำนวนผู้ติดตาม
npx tsx scripts/line-manage.ts followers

# ทดสอบส่งหาตัวเอง
npx tsx scripts/line-manage.ts test
```