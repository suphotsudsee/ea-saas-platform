// ─── Line OA Rich Menu Setup ──────────────────────────────────────────────
// Creates a Rich Menu for the Line OA with navigation buttons
// Run this script once to set up the Rich Menu after creating the OA
// ─────────────────────────────────────────────────────────────────────────────

const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN || '';
const LINE_API_BASE = 'https://api.line.me/v2/bot';

const headers = {
  'Content-Type': 'application/json',
  Authorization: `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
};

// ─── Rich Menu Definition ──────────────────────────────────────────────────

const richMenu = {
  size: { width: 2500, height: 1686 },
  name: 'TradeCandle v11 Menu',
  chatBarText: 'เมนู',
  selected: false,
  areas: [
    // Row 1: กลับหน้าแชท | ดูราคา
    {
      bounds: { x: 0, y: 0, width: 1250, height: 843 },
      action: { type: 'uri', label: 'สมัครใช้', uri: 'https://tradecandle.ai/register' },
    },
    {
      bounds: { x: 1250, y: 0, width: 1250, height: 843 },
      action: { type: 'uri', label: 'ดูราคา', uri: 'https://tradecandle.ai/#pricing' },
    },
    // Row 2: Dashboard | ช่วยเหลือ
    {
      bounds: { x: 0, y: 843, width: 1250, height: 843 },
      action: { type: 'uri', label: 'Dashboard', uri: 'https://tradecandle.ai/dashboard' },
    },
    {
      bounds: { x: 1250, y: 843, width: 1250, height: 843 },
      action: { type: 'message', label: 'ช่วยเหลือ', text: 'ช่วย' },
    },
  ],
};

async function setupRichMenu() {
  console.log('🎨 Creating Line OA Rich Menu...\n');

  if (!LINE_CHANNEL_ACCESS_TOKEN) {
    console.error('❌ LINE_CHANNEL_ACCESS_TOKEN not set in .env');
    process.exit(1);
  }

  // 1. List existing rich menus
  const listRes = await fetch(`${LINE_API_BASE}/richmenu/list`, { headers });
  const listData = await listRes.json();
  console.log('📋 Existing Rich Menus:', listData.richmenus?.length || 0);

  // 2. Delete existing rich menus (optional — remove old ones)
  if (listData.richmenus?.length > 0) {
    for (const menu of listData.richmenus) {
      console.log(`  Deleting: ${menu.richMenuId} (${menu.name})`);
      await fetch(`${LINE_API_BASE}/richmenu/${menu.richMenuId}`, {
        method: 'DELETE',
        headers,
      });
    }
  }

  // 3. Create new rich menu
  const createRes = await fetch(`${LINE_API_BASE}/richmenu`, {
    method: 'POST',
    headers,
    body: JSON.stringify(richMenu),
  });
  const createData = await createRes.json();

  if (!createRes.ok) {
    console.error('❌ Failed to create rich menu:', createData);
    process.exit(1);
  }

  const richMenuId = createData.richMenuId;
  console.log(`✅ Rich Menu created: ${richMenuId}`);

  // 4. Upload rich menu image (you need to create and upload an image)
  // The image should be 2500x1686 pixels, matching the layout above
  // For now, we'll use a placeholder — you'll need to upload an actual image
  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📷 ขั้นตอนต่อไป: อัปโหลดรูป Rich Menu
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

สร้างรูปขนาด 2500x1686 พิกเซล แบ่งเป็น 4 ช่อง:

┌─────────────┬─────────────┐
│  สมัครใช้    │  ดูราคา      │
│  (ส้ม)       │  (ทอง)      │
├─────────────┼─────────────┤
│  Dashboard  │  ช่วยเหลือ    │
│  (เขียว)     │  (น้ำเงิน)    │
└─────────────┴─────────────┘

อัปโหลดรูป:

curl -X POST \\
  -H "Authorization: Bearer \${LINE_CHANNEL_ACCESS_TOKEN}" \\
  -H "Content-Type: image/png" \\
  --data-binary @rich-menu-image.png \\
  "https://api.line.me/v2/bot/richmenu/${richMenuId}/content"

กำหนดเป็นdefault:

curl -X POST \\
  -H "Authorization: Bearer \${LINE_CHANNEL_ACCESS_TOKEN}" \\
  "https://api.line.me/v2/bot/user/all/richmenu/${richMenuId}"
`);

  // 5. Print Rich Menu ID for reference
  console.log(`\n🆔 Rich Menu ID: ${richMenuId}`);
  console.log('\n✅ Rich Menu สร้างเรียบร้อย! อัปโหลดรูปและตั้งเป็น default แล้วใช้ได้เลย');
}

setupRichMenu().catch(console.error);