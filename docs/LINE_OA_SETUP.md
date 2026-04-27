# Line OA Setup — TradeCandle v11

## Setup Steps Line Official Account

### 1. Create Line OA

1. Go to [Line Official Account Manager](https://manager.line.biz/)
2. Create a new account — Name: **TradeCandle**
3. Choose plan: **Standard** (Free unlimited messages)
4. Fill in information:
   - Display Name: `TradeCandle`
   - Category: Finance/Investment
   - Email: support@tradecandle.ai
   - Profile Picture: Logo TradeCandle

### 2. Open Messaging API

1. Go to **Settings → Messaging API**
2. Enable Messaging API
3. Choose plan: **Developer (Free)** or **Pro** (if you need more messages)
4. Copy values:
   - **Channel Access Token** → `.env` set as `LINE_CHANNEL_ACCESS_TOKEN`
   - **Channel Secret** → `.env` set as `LINE_CHANNEL_SECRET`

### 3. Set Webhook URL

1. In Messaging API Settings:
   - Webhook URL: `https://tradecandle.ai/api/line/webhook`
   - Enable **Use webhook**: ✅
   - Enable **Auto-reply messages**: ❌ (Disable — we will handle replies ourselves)
   - Enable **Greeting messages**: ❌ (Disable — we will send our own)

2. If dev on local:
   ```
   ngrok http 3000
   # Paste webhook URL: https://<ngrok-id>.ngrok-free.app/api/line/webhook
   ```

### 4. Add Environment Variables

Add in `.env`:

```env
# Line OA
LINE_CHANNEL_ACCESS_TOKEN=your_c...here
LINE_CHANNEL_SECRET=your_c...here
ADMIN_API_KEY=tc-adm...this
```

### 5. Create Rich Menu

```bash
cd /mnt/c/fullstack/ea-saas-platform
npx tsx scripts/setup-line-rich-menu.ts
```

Create Rich Menu image size 2500x1686 px:

```
┌─────────────────┬─────────────────┐
│    Sign Up to Use       │    ViewPrice        │
│  tradecandle.ai  │  #pricing       │
│   (Orange/Gold)       │   (Gold/Green)    │
├─────────────────┼─────────────────┤
│   Dashboard      │    Help      │
│   /dashboard     │  Print "help"     │
│   (Green)        │   (Blue)       │
└─────────────────┴─────────────────┘
```

Upload image:

```bash
curl -X POST \
  -H "Authorization: Bearer $LINE_...KEN" \
  -H "Content-Type: image/png" \
  --data-binary @rich-menu-image.png \
  "https://api.line.me/v2/bot/richmenu/{RICH_MENU_ID}/content"
```

Set as default:

```bash
curl -X POST \
  -H "Authorization: Bearer $LINE_...KEN" \
  "https://api.line.me/v2/bot/user/all/richmenu/{RICH_MENU_ID}"
```

### 6. Test Webhook

```bash
# Test GET endpoint
curl https://tradecandle.ai/api/line/webhook

# Test broadcast (requires server running)
curl -X POST http://localhost:3000/api/line/broadcast \
  -H "x-api-key: tc-admin-secret-change-this" \
  -H "Content-Type: application/json" \
  -d '{"type": "custom", "text": "Hello from TradeCandle!"}'
```

### 7. Send Broadcast per Campaign

```bash
# Teaser (2 days before launch)
curl -X POST http://localhost:3000/api/line/broadcast \
  -H "x-api-key: tc-admin-secret" \
  -H "Content-Type: application/json" \
  -d '{"type": "teaser"}'

# Launch Day
curl -X POST http://localhost:3000/api/line/broadcast \
  -H "x-api-key: tc-admin-secret" \
  -H "Content-Type: application/json" \
  -d '{"type": "launch"}'

# Urgency / Promo
curl -X POST http://localhost:3000/api/line/broadcast \
  -H "x-api-key: tc-admin-secret" \
  -H "Content-Type: application/json" \
  -d '{"type": "urgency", "promoCode": "LAUNCH20", "endDate": "30 April 2025"}'

# Monthly Report
curl -X POST http://localhost:3000/api/line/broadcast \
  -H "x-api-key: tc-admin-secret" \
  -H "Content-Type: application/json" \
  -d '{"type": "monthly", "winRate": "68%", "profitLoss": "+2,450 USD", "trades": 45}'

# Push to specific user
curl -X PUT http://localhost:3000/api/line/broadcast \
  -H "x-api-key: tc-admin-secret" \
  -H "Content-Type: application/json" \
  -d '{"to": "U1234567890abcdef", "type": "launch"}'
```

### 8. Auto-Reply Features

When keywords are sent in chat:
- `Price` / `price` / `Package` → Show pricing plans
- `trial` / `free` → Show free trial guide (7 days)
- `help` / `?` → Show help menu
- `how` / `guide` → Show Getting Started guide
- Add Friend → Send welcome message

### 9. QR Code + Add Friends

Put the Line OA QR Code on:
- Landing Page (`https://tradecandle.ai`) → Add "Add Line" button
- Facebook Page → Paste QR in posts
- Flyers/business cards

```
Line OA Link: https://lin.ee/tradecandle  (configure in Line OA Manager)
QR Code: Create from Line OA Manager → Settings → Add Friends
```

## Files Created

| File | Purpose |
|------|---------|
| `src/api/services/line.service.ts` | Line API service (push, broadcast, templates, webhook handler) |
| `src/api/routes/line/webhook/route.ts` | Webhook endpoint (receive events from Line) |
| `src/api/routes/line/broadcast/route.ts` | Broadcast API (send messages to all or specific users) |
| `scripts/setup-line-rich-menu.ts` | Create Rich Menu |
| `scripts/line-manage.ts` | CLI send broadcast, view followers, etc. |
| `docs/LINE_OA_SETUP.md` | This guide |