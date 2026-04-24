// ─── Line OA Webhook + Broadcast Service ──────────────────────────────────
// Handles Line Messaging API: webhook, push messages, rich menu
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';

// ─── Line API Config ────────────────────────────────────────────────────────

const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN || '';
const LINE_CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET || '';
const LINE_API_BASE = 'https://api.line.me/v2/bot';

function getLineHeaders() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
  };
}

// ─── Push Message ──────────────────────────────────────────────────────────

export async function pushMessage(to: string, messages: any[]) {
  const res = await fetch(`${LINE_API_BASE}/message/push`, {
    method: 'POST',
    headers: getLineHeaders(),
    body: JSON.stringify({ to, messages }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Line push failed (${res.status}): ${text}`);
  }
  return res.json();
}

// ─── Broadcast Message ─────────────────────────────────────────────────────

export async function broadcastMessage(messages: any[]) {
  const res = await fetch(`${LINE_API_BASE}/message/broadcast`, {
    method: 'POST',
    headers: getLineHeaders(),
    body: JSON.stringify({ messages }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Line broadcast failed (${res.status}): ${text}`);
  }
  return res.json();
}

// ─── Multicast (send to multiple users) ─────────────────────────────────────

export async function multicastMessage(to: string[], messages: any[]) {
  const res = await fetch(`${LINE_API_BASE}/message/multicast`, {
    method: 'POST',
    headers: getLineHeaders(),
    body: JSON.stringify({ to, messages }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Line multicast failed (${res.status}): ${text}`);
  }
  return res.json();
}

// ─── Message Templates ─────────────────────────────────────────────────────

export const LineTemplates = {
  // Teaser message (before launch)
  teaser: () => [
    {
      type: 'text',
      text: `━━━━━━━━━━━━━━━━━━

🔥 มีของดีจะประกาศ!

ใครเทรดทองแล้วเคย:
❌ กำไรหายไประหว่างทาง
❌ นั่งดูจอทั้งวัน พลาดจังหวะ
❌ ซื้อ EA มาใช้แล้วขาดทุน

พรุ่งนี้มีคำตอบ 🔓

อย่าพลาด! ติดตามพรุ่งนี้ 10:00

━━━━━━━━━━━━━━━━━━`,
    },
    {
      type: 'imagemap',
      baseUrl: 'https://tradecandle.ai/images/line-teaser', // replace with actual image URL
      altText: 'TradeCandle v11 — เปิดตัวพรุ่งนี้!',
      baseSize: { width: 1040, height: 560 },
      actions: [
        {
          type: 'uri',
          linkUri: 'https://tradecandle.ai',
          area: { x: 0, y: 0, width: 1040, height: 560 },
        },
      ],
    },
  ],

  // Launch day message
  launch: () => [
    {
      type: 'text',
      text: `🚀 เปิดตัวแล้ว!
TradeCandle v11
— AI เทรดทองอัตโนมัติ —

✅ 3-Wave Cashout
   ปิดกำไรเป็น 3 รอบ ไม่รอเต็ม 100%

✅ 6 Smart Money Filters
   อ่านทรงสตรัคเจอร์อัตโนมัติ

✅ SaaS Dashboard + Kill Switch
   ควบคุมจากมือถือ ทุกที่ ทุกเวลา

⭐ ทดลอง 7 วันฟรี — ไม่ต้องใส่บัตร`,
    },
    {
      type: 'template',
      altText: 'เลือกแพ็คเกจ',
      template: {
        type: 'buttons',
        thumbnailImageUrl: 'https://tradecandle.ai/images/line-launch.jpg', // replace
        title: 'TradeCandle v11',
        text: 'AI เทรดทองอัตโนมัติ',
        actions: [
          {
            type: 'uri',
            label: '🚀 เริ่มต้น 7 วันฟรี',
            uri: 'https://tradecandle.ai/register',
          },
          {
            type: 'uri',
            label: '📊 ดูแพ็คเกจ',
            uri: 'https://tradecandle.ai/#pricing',
          },
          {
            type: 'uri',
            label: '💬 สอบถาม',
            uri: 'https://lin.ee/tradecandle',
          },
        ],
      },
    },
  ],

  // Urgency / promo message
  urgency: (promoCode: string, endDate: string) => [
    {
      type: 'text',
      text: `⏰ สุดท้าย! หมดเขต ${endDate}

รับส่วนลด 20% ทุกแพ็คเกจ
ใช้โค้ด: ${promoCode}

Starter  990฿ → 792฿/เดือน
Pro      2,490฿ → 1,992฿/เดือน
Elite    4,990฿ → 3,992฿/เดือน

ทดลอง 7 วันฟรี + ส่วนลด 20%
ยกเลิกได้ทุกเมื่อ 🔓`,
    },
    {
      type: 'template',
      altText: 'รับส่วนลด 20%',
      template: {
        type: 'buttons',
        text: 'เลือกแพ็คเกจ',
        actions: [
          {
            type: 'uri',
            label: 'Starter 792฿',
            uri: `https://tradecandle.ai/register?plan=starter&promo=${promoCode}`,
          },
          {
            type: 'uri',
            label: 'Pro 1,992฿ ⭐',
            uri: `https://tradecandle.ai/register?plan=pro&promo=${promoCode}`,
          },
          {
            type: 'uri',
            label: 'Elite 3,992฿',
            uri: `https://tradecandle.ai/register?plan=elite&promo=${promoCode}`,
          },
        ],
      },
    },
  ],

  // Monthly report template
  monthlyReport: (data: { winRate: string; profitLoss: string; trades: number }) => [
    {
      type: 'text',
      text: `📊 รายงานประจำเดือน — TradeCandle v11

📈 Win Rate: ${data.winRate}
💰 P&L: ${data.profitLoss}
🔢 จำนวนเทรด: ${data.trades}

ดูรายละเอียดเพิ่มเติมได้ที่ Dashboard ↓`,
    },
    {
      type: 'template',
      altText: 'เปิด Dashboard',
      template: {
        type: 'buttons',
        text: 'จัดการ EA ของคุณ',
        actions: [
          {
            type: 'uri',
            label: '📊 เปิด Dashboard',
            uri: 'https://tradecandle.ai/dashboard',
          },
          {
            type: 'uri',
            label: '💬 สอบถาม',
            uri: 'https://lin.ee/tradecandle',
          },
        ],
      },
    },
  ],
};

// ─── Webhook Handler ────────────────────────────────────────────────────────

export async function handleLineWebhook(request: NextRequest) {
  const body = await request.json();
  const events = body.events || [];

  for (const event of events) {
    if (event.type === 'message' && event.message.type === 'text') {
      const userMessage = event.message.text.trim().toLowerCase();
      const replyToken = event.replyToken;
      const userId = event.source.userId;

      // Auto-reply logic
      let replyText = '';

      if (userMessage.includes('ราคา') || userMessage.includes('price') || userMessage.includes('แพ็คเกจ')) {
        replyText = `💰 ราคา TradeCandle v11

Starter: 990฿/เดือน (1 บัญชี)
Pro:     2,490฿/เดือน (3 บัญชี) ⭐
Elite:   4,990฿/เดือน (5 บัญชี)

⭐ ทดลอง 7 วันฟรี!
👉 https://tradecandle.ai/register`;
      } else if (userMessage.includes('ทดลอง') || userMessage.includes('trial') || userMessage.includes('free')) {
        replyText = `⭐ ทดลองฟรี 7 วัน!

1. สมัครที่: https://tradecandle.ai/register
2. รับ License Key ทันที
3. วางใน MT5 → เริ่มเทรด

ไม่ต้องใส่บัตร! ยกเลิกได้ทุกเมื่อ 🔓`;
      } else if (userMessage.includes('ช่วย') || userMessage.includes('help') || userMessage.includes('?') || userMessage.includes('สอบถาม')) {
        replyText = `สวัสดีครับ! 👋

ผมช่วยอะไรได้บ้าง?
• พิมพ์ "ราคา" — ดูแพ็คเกจ
• พิมพ์ "ทดลอง" — ทดลองฟรี 7 วัน
• พิมพ์ "วิธีใช้" — คู่มือเริ่มต้น
• หรือถามอะไรก็ได้ครับ! 💬`;
      } else if (userMessage.includes('วิธีใช้') || userMessage.includes('how') || userMessage.includes('guide') || userMessage.includes('เริ่ม')) {
        replyText = `📖 วิธีใช้ TradeCandle v11

1️⃣ สมัครที่ tradecandle.ai
2️⃣ รับ License Key ทันที
3️⃣ ดาวน์โหลด EA → วาง Key ใน MT5
4️⃣ เทรดอัตโนมัติ 24/5!
5️⃣ ดูผลจาก Dashboard บนมือถือ

👉 https://tradecandle.ai/register`;
      } else {
        // Default reply
        replyText = `สวัสดีครับ! 🙏 ขอบคุณที่ติดต่อ TradeCandle

ผมช่วยอะไรได้บ้าง?
• "ราคา" — ดูแพ็คเกจ
• "ทดลอง" — ทดลองฟรี 7 วัน
• "วิธีใช้" — คู่มือเริ่มต้น

หรือพิมพ์คำถามได้เลยครับ! 💬`;
      }

      // Reply to user
      try {
        await fetch(`${LINE_API_BASE}/message/reply`, {
          method: 'POST',
          headers: getLineHeaders(),
          body: JSON.stringify({
            replyToken,
            messages: [{ type: 'text', text: replyText }],
          }),
        });
      } catch (err) {
        console.error('Line reply error:', err);
      }

      // Store userId for future broadcast (async, don't block)
      // In production, save to DB: await saveLineUserId(userId);
    } else if (event.type === 'follow') {
      // User added the bot as friend
      const userId = event.source.userId;
      const welcomeMessage = `ยินดีต้อนรับสู่ TradeCandle! 🎉

AI เทรดทองคำอัตโนมัติ — ปิดกำไรเป็น 3 คลื่น

พิมพ์ "ราคา" เพื่อดูแพ็คเกจ
พิมพ์ "ทดลอง" เพื่อทดลองฟรี 7 วัน

มีคำถาม? ถามได้เลยครับ! 💬`;

      try {
        await fetch(`${LINE_API_BASE}/message/reply`, {
          method: 'POST',
          headers: getLineHeaders(),
          body: JSON.stringify({
            replyToken: event.replyToken,
            messages: [{ type: 'text', text: welcomeMessage }],
          }),
        });
      } catch (err) {
        console.error('Line welcome reply error:', err);
      }
    }
  }

  return NextResponse.json({ ok: true });
}