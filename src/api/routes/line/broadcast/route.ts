import { broadcastMessage, LineTemplates, pushMessage, multicastMessage } from '../../../services/line.service';
import { NextRequest, NextResponse } from 'next/server';

// ─── POST /api/line/broadcast ─────────────────────────────────────────────
// Broadcast a message to all Line OA followers
// Admin-only: requires API key in header
//
// Body: { type: 'teaser' | 'launch' | 'urgency' | 'monthly' | 'custom', ... }
// ─────────────────────────────────────────────────────────────────────────────

const ADMIN_API_KEY = process.env.ADMIN_API_KEY || 'tc-admin-secret';

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const apiKey = request.headers.get('x-api-key') || request.headers.get('authorization')?.replace('Bearer ', '');
    if (apiKey !== ADMIN_API_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { type, ...params } = body;

    let messages: any[];

    switch (type) {
      case 'teaser':
        messages = LineTemplates.teaser();
        break;
      case 'launch':
        messages = LineTemplates.launch();
        break;
      case 'urgency':
        messages = LineTemplates.urgency(
          params.promoCode || 'LAUNCH20',
          params.endDate || 'April 30, 2025'
        );
        break;
      case 'monthly':
        messages = LineTemplates.monthlyReport({
          winRate: params.winRate || '68%',
          profitLoss: params.profitLoss || '+2,450 USD',
          trades: params.trades || 45,
        });
        break;
      case 'custom':
        if (!params.text) {
          return NextResponse.json({ error: 'Missing text for custom broadcast' }, { status: 400 });
        }
        messages = [{ type: 'text', text: params.text }];
        break;
      default:
        return NextResponse.json({ error: `Unknown type: ${type}. Use: teaser, launch, urgency, monthly, custom` }, { status: 400 });
    }

    const result = await broadcastMessage(messages);
    return NextResponse.json({ success: true, type, recipients: 'all', result });

  } catch (error) {
    console.error('Line broadcast error:', error);
    return NextResponse.json({ error: 'Broadcast failed', detail: String(error) }, { status: 500 });
  }
}

// ─── POST /api/line/broadcast/push ────────────────────────────────────────
// Push to specific user(s) by Line userId
// Body: { to: string | string[], type: 'teaser' | 'launch' | 'urgency' | 'monthly' | 'custom', ... }
// ─────────────────────────────────────────────────────────────────────────────

export async function PUT(request: NextRequest) {
  try {
    const apiKey = request.headers.get('x-api-key') || request.headers.get('authorization')?.replace('Bearer ', '');
    if (apiKey !== ADMIN_API_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { to, type, ...params } = body;

    if (!to) {
      return NextResponse.json({ error: 'Missing "to" field (Line userId or array)' }, { status: 400 });
    }

    let messages: any[];

    switch (type) {
      case 'teaser':
        messages = LineTemplates.teaser();
        break;
      case 'launch':
        messages = LineTemplates.launch();
        break;
      case 'urgency':
        messages = LineTemplates.urgency(params.promoCode || 'LAUNCH20', params.endDate || 'April 30, 2025');
        break;
      case 'monthly':
        messages = LineTemplates.monthlyReport(params);
        break;
      case 'custom':
        messages = [{ type: 'text', text: params.text || '' }];
        break;
      default:
        messages = [{ type: 'text', text: params.text || String(type) }];
    }

    const userIds = Array.isArray(to) ? to : [to];

    let result;
    if (userIds.length === 1) {
      result = await pushMessage(userIds[0], messages);
    } else {
      // Use multicast for multiple users
      result = await multicastMessage(userIds, messages);
    }

    return NextResponse.json({ success: true, type, sentTo: userIds.length, result });

  } catch (error) {
    console.error('Line push error:', error);
    return NextResponse.json({ error: 'Push failed', detail: String(error) }, { status: 500 });
  }
}
