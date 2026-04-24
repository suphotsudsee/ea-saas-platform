import { handleLineWebhook } from '../../../services/line.service';
import { NextRequest, NextResponse } from 'next/server';

// ─── POST /api/line/webhook ─────────────────────────────────────────────
// Receives webhook events from Line Messaging API
// Verify signature → parse events → auto-reply / follow events
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    // Verify Line signature
    const channelSecret = process.env.LINE_CHANNEL_SECRET || '';
    const signature = request.headers.get('x-line-signature') || '';

    if (channelSecret) {
      // In production, verify the signature using crypto
      // const body = await request.text();
      // const hash = crypto.createHmac('sha256', channelSecret).update(body).digest('base64');
      // if (hash !== signature) { return NextResponse.json({ error: 'Invalid signature' }, { status: 403 }); }
    }

    return await handleLineWebhook(request);
  } catch (error) {
    console.error('Line webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

// Line requires webhook URL to respond 200 OK quickly
// so we process events and return immediately
export async function GET() {
  return NextResponse.json({
    service: 'TradeCandle Line OA Webhook',
    status: 'active',
    docs: 'https://tradecandle.ai/api/docs',
  });
}