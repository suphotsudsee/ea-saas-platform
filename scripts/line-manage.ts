// ─── Line OA Management Scripts ──────────────────────────────────────────
// Utility scripts for testing and managing Line OA
// ─────────────────────────────────────────────────────────────────────────────

const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN || '';
const LINE_API_BASE = 'https://api.line.me/v2/bot';
const ADMIN_API_KEY = process.env.ADMIN_API_KEY || 'tc-admin-secret';

const headers = {
  'Content-Type': 'application/json',
  Authorization: `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
};

// ─── Commands ───────────────────────────────────────────────────────────────

async function sendTestBroadcast(message: string) {
  console.log('📢 Sending test broadcast...\n');

  const res = await fetch(`${LINE_API_BASE}/message/broadcast`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      messages: [{ type: 'text', text: message }],
    }),
  });

  const data = await res.json();
  console.log(res.ok ? '✅ Broadcast sent!' : '❌ Broadcast failed:', data);

  // Also send via our API
  console.log('\n🌐 Via API endpoint:');
  console.log(`curl -X POST http://localhost:3000/api/line/broadcast \\`);
  console.log(`  -H "x-api-key: ${ADMIN_API_KEY}" \\`);
  console.log(`  -H "Content-Type: application/json" \\`);
  console.log(`  -d '{"type": "custom", "text": "${message}"}'`);
}

async function sendTemplateBroadcast(type: string) {
  console.log(`📤 Sending ${type} template broadcast...\n`);

  const res = await fetch('http://localhost:3000/api/line/broadcast', {
    method: 'POST',
    headers: {
      'x-api-key': ADMIN_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ type }),
  });

  const data = await res.json();
  console.log(res.ok ? '✅ Sent!' : '❌ Failed:', data);
}

async function checkOAInfo() {
  console.log('📋 Checking Line OA info...\n');

  const res = await fetch(`${LINE_API_BASE}/info`, { headers });
  const data = await res.json();

  if (res.ok) {
    console.log(`Bot Name: ${data.displayName}`);
    console.log(`Bot ID: ${data.userId}`);
    console.log(`Picture URL: ${data.pictureUrl}`);
  } else {
    console.error('❌ Failed:', data);
  }

  // Check follower count
  const followerRes = await fetch(`${LINE_API_BASE}/insight/followers`, { headers });
  const followerData = await followerRes.json();
  console.log(`\nFollowers: ${followerData.followers || 'N/A'}`);
}

async function getFollowerIds() {
  console.log('👥 Getting follower IDs...\n');

  // Get follower IDs (max 300 per call)
  let cursor: string | null = null;
  let allIds: string[] = [];

  do {
    const url = cursor
      ? `${LINE_API_BASE}/followers/ids?start=${cursor}`
      : `${LINE_API_BASE}/followers/ids`;

    const res = await fetch(url, { headers });
    const data = await res.json();

    if (data.userIds) {
      allIds = [...allIds, ...data.userIds];
    }
    cursor = data.next || null;
  } while (cursor);

  console.log(`Total followers: ${allIds.length}`);
  console.log('IDs:', allIds.slice(0, 10).join(', '), allIds.length > 10 ? '...' : '');

  return allIds;
}

// ─── CLI ─────────────────────────────────────────────────────────────────────

const command = process.argv[2];
const arg = process.argv[3];

switch (command) {
  case 'broadcast':
    sendTestBroadcast(arg || '🔧 ทดสอบระบบ — TradeCandle v11 Line OA ใช้งานได้แล้ว!');
    break;
  case 'template':
    sendTemplateBroadcast(arg || 'teaser');
    break;
  case 'info':
    checkOAInfo();
    break;
  case 'followers':
    getFollowerIds();
    break;
  default:
    console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📱 Line OA Management — TradeCandle v11
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Usage: npx tsx scripts/line-manage.ts <command> [args]

Commands:
  broadcast <message>    ส่งข้อความ broadcast ทดสอบ
  template <type>        ส่ง template (teaser|launch|urgency|monthly)
  info                   ดูข้อมูล OA + จำนวนผู้ติดตาม
  followers              ดูรายชื่อ follower IDs

ตัวอย่าง:
  npx tsx scripts/line-manage.ts broadcast "สวัสดีครับ!"
  npx tsx scripts/line-manage.ts template launch
  npx tsx scripts/line-manage.ts info
  npx tsx scripts/line-manage.ts followers
`);
}