# 7C — 3 Message Line OA Broadcast (SubmitRight Away)
## TradeCandle v11 — Copy → Paste → Submit

---

## 💬 MessageAt 1: Teaser (ก่อนOpenItem 2 days — daysMonday 19:00)

### Line Broadcast — Flex Message

```
Hello 🙏

Great News to AnnouncedaysWednesdayThis! 👀

เคยGold TradingAlreadyProfitLost Along the Wayไหมครับ?
Orนั่งViewChartAllคืนแต่ยังTradingNoได้About?

daysWednesdayThis เราHasAboutจะบอก 🤫

📌 กดAddFriendsเลย → จะได้รับสิทธิพิเศษก่อนใคร!
```

### 🔧 Line API Format (For broadcast endpoint):

```json
{
  "messages": [
    {
      "type": "flex",
      "altText": "Great News to AnnouncedaysWednesdayThis!",
      "contents": {
        "type": "bubble",
        "body": {
          "type": "box",
          "layout": "vertical",
          "contents": [
            {
              "type": "text",
              "text": "🔥 Great News to Announce",
              "weight": "bold",
              "size": "xl",
              "color": "#D4AF37"
            },
            {
              "type": "text",
              "text": "daysWednesdayThis!",
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
              "text": "เคยGold TradingAlreadyProfitLost Along the Way?\nOrนั่งViewChartAllคืนแต่ยังTradingNoได้About?\n\nเราHasคำตอบให้ 👀",
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

## 💬 MessageAt 2: Launch Day (daysOpenItem — daysWednesday 10:00)

### Line Broadcast — Flex Message

```
🚀 OpenItemAlready! TradeCandle v11

AI Automated Gold TradingOn MT5
✅ 3-Wave Cashout — CloseProfit 3 Round
✅ 6 Smart Money Filter — ReadStructureให้
✅ Dashboard Controlfromมือถือ + Kill Switch

⚡ ส่วนลด 20% Exclusive 4 daysThis!
Starter: 990 → 792 $/month
Pro ⭐: 2,490 → 1,992 $/month
Elite: 4,990 → 3,992 $/month

🎁 LINE EXCLUSIVE: Add 3 daysFree (รวม 10 daysFree!)
Noต้องใส่USDT ✅

กดLinkเลย 👇
```

### 🔧 Line API Format:

```json
{
  "messages": [
    {
      "type": "flex",
      "altText": "🚀 TradeCandle v11 OpenItemAlready! ส่วนลด 20% + LINE Exclusive +3 daysFree",
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
              "text": "🚀 OpenItemAlready!",
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
              "text": "AI Automated Gold Trading • 3-Wave Cashout • Smart Money Filter • Dashboard + Kill Switch",
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
                  "text": "⚡ ส่วนลด 20% Exclusive 4 days!",
                  "weight": "bold",
                  "size": "md",
                  "color": "#00C853"
                },
                {
                  "type": "text",
                  "text": "Starter: 990 → 792$/month",
                  "size": "sm",
                  "color": "#FFFFFF",
                  "margin": "sm"
                },
                {
                  "type": "text",
                  "text": "Pro ⭐: 2,490 → 1,992$/month",
                  "size": "sm",
                  "color": "#D4AF37",
                  "margin": "sm"
                },
                {
                  "type": "text",
                  "text": "Elite: 4,990 → 3,992$/month",
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
                  "text": "Add 3 daysFree = 10 daysFree!\nNoต้องใส่USDT ✅",
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
                "label": "🔥 ทดลอง 10 daysFree (LINE Exclusive)",
                "uri": "https://tradecandle.ai/?utm_source=line&utm_medium=broadcast&utm_campaign=launch_day&utm_content=line_exclusive"
              },
              "style": "primary",
              "color": "#D4AF37"
            },
            {
              "type": "button",
              "action": {
                "type": "uri",
                "label": "ViewPriceAll",
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

## 💬 MessageAt 3: Urgency (ก่อนหมดโปรโมชั่น 1 days — daysSunday 10:00 + 18:00)

### Line Broadcast — Flex Message

```
⏰ เหลือ 24 ชั่วโมง!

ส่วนลด 20% หมดเขตคืนThis 23:59 ⏰

Starter: 792$/month (ปกติ 990$)
Pro ⭐: 1,992$/month (ปกติ 2,490$)
Elite: 3,992$/month (ปกติ 4,990$)

ผ่าน LINE ได้Add 3 daysFree = 10 days!
Noต้องจ่ายก่อน Cancelได้Allเมื่อ

IfยังNoแน่ใจ ถามเราก่อนได้ 👇
```

### 🔧 Line API Format:

```json
{
  "messages": [
    {
      "type": "flex",
      "altText": "⏰ เหลือ 24 ชม.! ส่วนลด 20% หมดเขตคืนThis!",
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
              "text": "ส่วนลด 20% หมดเขตคืนThis 23:59",
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
                  "text": "Starter: 792$/month",
                  "size": "md",
                  "color": "#FFFFFF",
                  "decoration": "none"
                },
                {
                  "type": "text",
                  "text": "Pro ⭐: 1,992$/month",
                  "size": "md",
                  "color": "#D4AF37",
                  "margin": "sm"
                },
                {
                  "type": "text",
                  "text": "Elite: 3,992$/month",
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
                  "text": "🎁 LINE Exclusive: Add 3 daysFree = 10 days!",
                  "weight": "bold",
                  "size": "sm",
                  "color": "#D4AF37",
                  "wrap": true
                },
                {
                  "type": "text",
                  "text": "Noต้องจ่ายก่อน • Cancelได้Allเมื่อ ✅",
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
                "label": "⚡ Subscribe Now ก่อนหมดTime!",
                "uri": "https://tradecandle.ai/?utm_source=line&utm_medium=broadcast&utm_campaign=launch_urgency"
              },
              "style": "primary",
              "color": "#D4AF37"
            },
            {
              "type": "button",
              "action": {
                "type": "uri",
                "label": "💬 ถามBefore Signing Up",
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

**📌 Submit 2 Round:** 10:00 (เช้า) + 18:00 (เย็น)
**📌 Expected:** 90% open → 20% click → 8% convert

---

## 💬 Messageประจำmonth (Template — SubmitAllmonth)

```
📊 Reportsประจำmonth [month]

Win Rate: 68% 📈
Net Profit: +$[amount]
Max Drawdown: [X]%

💡 เคล็ดลับmonthThis:
[ใส่เคล็ดลับการGold Trading]

ต้องการUpgradeแพ็กเกจ? 📈
https://tradecandle.ai/#pricing?utm_source=line&utm_medium=monthly
```

---

## 📋 Submit Line Broadcast ผ่าน API:

```bash
# Submit broadcast message
npx tsx scripts/line-manage.ts broadcast '{"type":"text","text":"MessageAtนี่"}'

# Submit Flex Message (MessageAt 1, 2, Or 3)
# Use Line API Console Or broadcast endpoint

# เช็คAmountFollowers
npx tsx scripts/line-manage.ts followers

# TestSubmitหาItemเอง
npx tsx scripts/line-manage.ts test
```