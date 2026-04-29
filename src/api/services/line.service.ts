// ─── Line OA Webhook + Broadcast Service ──────────────────────────────────
// Handles Line Messaging API: webhook, push messages, rich menu
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';

// ─── Line API Config ────────────────────────────────────────────────────────

const LINE_CHANNEL_ACCESS_TOKEN=process.env.LINE_CHANNEL_ACCESS_TOKEN || '';
const LINE_CHANNEL_SECRET=process.env.LINE_CHANNEL_SECRET || '';
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

🔥 Great News!

Trading gold and ever experienced:
❌ Profits wiped out mid-trade
❌ Staring at charts all day, missing entries
❌ Buying EAs that just lose money

Tomorrow we have the answer 🔓

Don't miss it! Watch tomorrow at 10:00

━━━━━━━━━━━━━━━━━━`,
    },
    {
      type: 'imagemap',
      baseUrl: 'https://tradecandle.ai/images/line-teaser', // replace with actual image URL
      altText: 'TradeCandle v12 — Launching tomorrow!',
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
      text: `🚀 We're Live!
TradeCandle v12
— AI Automated Gold Trading —

✅ 3-Wave Cashout
   Close profit in 3 rounds — no need to wait for 100% TP

✅ 6 Smart Money Filters
   Reads market structure automatically

✅ SaaS Dashboard + Kill Switch
   Control from your phone anytime, anywhere

⭐ Try 1 month free — no credit card required`,
    },
    {
      type: 'template',
      altText: 'Choose a Plan',
      template: {
        type: 'buttons',
        thumbnailImageUrl: 'https://tradecandle.ai/images/line-launch.jpg', // replace
        title: 'TradeCandle v12',
        text: 'AI Automated Gold Trading',
        actions: [
          {
            type: 'uri',
            label: '🚀 Get Started — 1 Month Free',
            uri: 'https://tradecandle.ai/register',
          },
          {
            type: 'uri',
            label: '📊 View Plans',
            uri: 'https://tradecandle.ai/#pricing',
          },
          {
            type: 'uri',
            label: '💬 Ask Us',
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
      text: `⏰ Last chance! Expires ${endDate}

Get 20% off all plans
Use code: ${promoCode}

Starter  $9.99 → $7.99/month
Pro      $19.99 → $15.99/month
Elite    $39.99 → $31.99/month

Try 1 month free + 20% discount
Cancel anytime 🔓`,
    },
    {
      type: 'template',
      altText: 'Get 20% off',
      template: {
        type: 'buttons',
        text: 'Choose a Plan',
        actions: [
          {
            type: 'uri',
            label: 'Starter $7.92',
            uri: `https://tradecandle.ai/register?plan=starter&promo=${promoCode}`,
          },
          {
            type: 'uri',
            label: 'Pro $19.92 ⭐',
            uri: `https://tradecandle.ai/register?plan=pro&promo=${promoCode}`,
          },
          {
            type: 'uri',
            label: 'Elite $39.92',
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
      text: `📊 Monthly Report — TradeCandle v12

📈 Win Rate: ${data.winRate}
💰 P&L: ${data.profitLoss}
🔢 Total Trades: ${data.trades}

View more details on your Dashboard ↓`,
    },
    {
      type: 'template',
      altText: 'Open Dashboard',
      template: {
        type: 'buttons',
        text: 'Manage Your EA',
        actions: [
          {
            type: 'uri',
            label: '📊 Open Dashboard',
            uri: 'https://tradecandle.ai/dashboard',
          },
          {
            type: 'uri',
            label: '💬 Ask Us',
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

      if (userMessage.includes('price') || userMessage.includes('package')) {
        replyText = `💰 TradeCandle v12 Pricing

Starter: $9.99/month (1 Account)
Pro:     $19.99/month (3 Accounts) ⭐
Elite:   $39.99/month (5 Accounts)

⭐ Try 1 month free!
👉 https://tradecandle.ai/register`;
      } else if (userMessage.includes('trial') || userMessage.includes('free')) {
        replyText = `⭐ Try 1 month free!

1. Sign up at: https://tradecandle.ai/register
2. Receive your License Key immediately
3. Paste it in MT5 → Start trading

No credit card required! Cancel anytime 🔓`;
      } else if (userMessage.includes('help') || userMessage.includes('?')) {
        replyText = `Hello! 👋

How can I help you?
• Type "Price" — View plans
• Type "Trial" — Try 1 month free
• Type "Guide" — Getting started guide
• Or ask anything! 💬`;
      } else if (userMessage.includes('how') || userMessage.includes('guide') || userMessage.includes('start')) {
        replyText = `📖 How to Use TradeCandle v12

1️⃣ Sign up at tradecandle.ai
2️⃣ Receive your License Key immediately
3️⃣ Download EA → Paste Key in MT5
4️⃣ Automated trading 24/5!
5️⃣ Monitor performance from the dashboard on your phone

👉 https://tradecandle.ai/register`;
      } else {
        // Default reply
        replyText = `Hello! 🙏 Thank you for contacting TradeCandle

How can I help you?
• "Price" — View plans
• "Trial" — Try 1 month free
• "Guide" — Getting started guide

Or just type your question! 💬`;
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
      const welcomeMessage = `Welcome to TradeCandle! 🎉

AI Automated Gold Trading — Close profit in 3 waves

Type "Price" to view plans
Type "Trial" to try 1 month free

Got questions? Just ask! 💬`;

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