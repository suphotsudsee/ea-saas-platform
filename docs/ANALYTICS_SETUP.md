# 📊 Analytics Setup Guide — TradeCandle

Guide for setting up Google Analytics 4 + Facebook Pixel + Google Tag Manager for website tradecandle.ai

---

## 1. Google Analytics 4 (GA4)

### Create GA4 Property
1. Go to [Google Analytics](https://analytics.google.com/)
2. Click **Create Account** → Set name `TradeCandle`
3. Select **Web** → Enter URL `tradecandle.ai`
4. Get **Measurement ID** in format `G-XXXXXXXXXX`

### Enter values in `.env`
```bash
NEXT_PUBLIC_GA4_MEASUREMENT_ID=G-XXXXXXXXXX
```

### Link with Search Console (SEO)
1. Go to GA4 → **Admin** → **Property settings** → **Search Console**
2. Link Google Search Console → select `tradecandle.ai`
3. You will see organic search data in GA4 within 24-48 hours

### Auto-tracked Events
| Event | When | Parameters |
|-------|------|------------|
| `cta_click` | Click any CTA button | `cta_name`, `cta_location` |
| `begin_checkout` | Click select package | `plan`, `value` |
| `purchase` | Payment successful | `value`, `currency`, `plan` |
| `subscribe` | Sign up successful | `plan`, `value` |
| `trial_start` | Start trial | `plan`, `user_id` |
| `sign_up` | Register | `method`, `plan` |
| `video_play` | Play video | `video_name` |
| `line_add_friend` | Click Add Line Friend | — |
| `kill_switch` | Click Kill Switch | `action`, `account_id` |
| `dashboard_view` | Enter dashboard | `section` |

### Create Custom Conversions in GA4
1. Go to **Admin** → **Conversions** → **New conversion event**
2. Add these events as conversions:
   - `purchase`
   - `subscribe`
   - `trial_start`
   - `sign_up`
   - `begin_checkout`

---

## 2. Facebook Pixel

### Create FB Pixel
1. Go to [Meta Business Suite](https://business.facebook.com/)
2. **Events Manager** → **Connect Data** → **Web** → **Facebook Pixel**
3. Set name `TradeCandle Pixel` → select `Manual Install`
4. Get **Pixel ID** — a number like `123456789012345`

### Enter values in `.env`
```bash
NEXT_PUBLIC_FB_PIXEL_ID=123456789012345
```

### Standard Auto-tracked Events
| FB Event | Mapping from Analytics |
|----------|----------------------|
| `PageView` | All pages |
| `CompleteRegistration` | `sign_up` |
| `InitiateCheckout` | `begin_checkout` |
| `Purchase` | `purchase` |
| `Subscribe` | `subscribe` |
| `StartTrial` | `trial_start` |
| `ViewContent` | `view_item`, `video_play` |
| `Contact` | `contact` |
| `AddToWishlist` | `line_add_friend` |

### Create Custom Conversions in FB
1. **Events Manager** → **Custom Conversions** → **Create**
2. Create:
   - `Purchase THB`: event `Purchase`, rule `value > 0`
   - `Trial Signup`: event `StartTrial`
   - `Line Friend`: event `AddToWishlist`

### Conversions API (CAPI) — Recommended
For more accurate data (especially after iOS 14.5):
1. **Events Manager** → **Conversions API** → **Set up manually**
2. Enter Access Token in `.env`:
```bash
FB_CAPI_ACCESS_TOKEN=your_a...here
```
3. Server-side events will be sent from `/api/webhooks/stripe` automatically when payment is successful

---

## 3. Google Tag Manager (Optional)

GTM helps manage all tags from one place — recommended if using multiple ad platforms

### Create GTM Container
1. Go to [Google Tag Manager](https://tagmanager.google.com/)
2. Create Account → Container `tradecandle.ai` → **Web**
3. Get **GTM ID** in format `GTM-XXXXXXX`

### Enter values in `.env`
```bash
NEXT_PUBLIC_GTM_ID=GTM-XXXXXXX
```

### Add GA4 + FB Pixel in GTM
1. **Tags** → **New** → select **Google Analytics: GA4 Configuration**
   - Measurement ID: `G-XXXXXXXXXX`
2. **Tags** → **New** → select **Custom HTML**
   - Paste FB Pixel code
3. **Triggers**: All Pages

---

## 4. Verify Installation

### How to Test GA4
```bash
# Open website localhost:3000
# Open DevTools → Network → Filter "google-analytics"
# You will see requests sending data to GA4
```

### How to Test FB Pixel
```bash
# Install Facebook Pixel Helper extension
# Open website → You will see Pixel ID + PageView event
```

### How to Test Events
```bash
# Open DevTools → Console
# You will see log: [Analytics] cta_click {cta_name: "hero_free_trial", ...}
# (in development mode only)
```

### Test with gtag console
```javascript
// Open DevTools Console and run:
window.gtag('event', 'test_event', { test_param: 'hello' });
// → View in GA4 DebugView
```

---

## 5. Retargeting Setup

### FB Custom Audiences
After installing Pixel, create Custom Audiences:
1. **All Website Visitors** — 180 days
2. **Pricing Page Visitors** — rule: `url contains /#pricing`
3. **Checkout Starters** — event: `InitiateCheckout`
4. **Trial Users** — event: `StartTrial`
5. **Purchasers** — event: `Purchase`

### Lookalike Audiences
Create from:
- Purchasers (1% Thailand)
- Trial Users (1% Thailand)

---

## 6. Summary of `.env` settings needed

```bash
# ─── Analytics ────────────────────────────
NEXT_PUBLIC_GA4_MEASUREMENT_ID=G-XXXXXXXXXX    # ← Replace with real value
NEXT_PUBLIC_FB_PIXEL_ID=000000000000000         # ← Replace with real value
NEXT_PUBLIC_GTM_ID=                             # ← If using GTM, enter GTM-XXXXXXX
NEXT_PUBLIC_SITE_URL=https://tradecandle.ai

# ─── FB Conversions API (optional) ───────
FB_CAPI_ACCESS_TOKEN=*** ← If using CAPI
```

---

## 📁 Related Files

| File | Purpose |
|------|---------|
| `src/lib/analytics.tsx` | Provider + Hooks + Script components |
| `src/lib/consent.tsx` | Cookie consent banner (GDPR/CCPA) |
| `src/lib/landing-tracking.ts` | Landing page + Dashboard + Conversion tracking hooks |
| `src/app/layout.tsx` | Called from root layout |
| `next.config.js` | CSP headers for GA4 + FB Pixel |
| `.env` | Analytics IDs |