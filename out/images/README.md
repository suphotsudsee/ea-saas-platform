# 📸 Content Assets Index — TradeCandle v11

## FileAllLocated In `public/images/`

### 🎨 Logos and Icons

| File | Size | Where to Use |
|------|-------|-----------|
| `logo.svg` | 240×80 | Navbar, Header, Watermark |
| `icon-512.svg` | 512×512 | Favicon, App Icon, OG Image fallback |

### 🖼️ Infographics

| File | Size | Where to Use |
|------|-------|-----------|
| `3wave-infographic.html` | 1200×1500 | Landing Page, FB Post, Line OA |
| `smc-filters-infographic.html` | 1200×1800 | Landing Page, FB Post |
| `hero-banner.html` | 1920×1080 | Landing Page Hero, OG Image |
| `pricing-cards.html` | 1920×1080 | Landing Page Pricing Section |

### 📱 Line OA

| File | Size | Where to Use |
|------|-------|-----------|
| `line-rich-menu.html` | 2500×1686 | Line OA Rich Menu |

### 📘 Facebook Post Images

| File | Size | หัวข้อ |
|------|-------|--------|
| `fb-post-1.html` | 1200×1200 | Pain-Point: "Have You Ever?" |
| `fb-post-2.html` | 1200×1200 | Smart Money 6 Filters |
| `fb-post-3.html` | 1200×1200 | Social Proof: +$340 |
| `fb-post-4.html` | 1200×1200 | Comparison: EA General vs TradeCandle |
| `fb-post-5.html` | 1200×1200 | CTA: 7 daysFree |

### 🎵 TikTok/Reels Cover Images

| File | Size | หัวข้อ |
|------|-------|--------|
| `tiktok-cover-1.html` | 1080×1920 | "Have You Ever?" Pain Hook |
| `tiktok-cover-2.html` | 1080×1920 | "EA LossReally??" Myth-Busting |
| `tiktok-cover-3.html` | 1080×1920 | "Wake Up and SeeProfit" Result Focus |

### 🎬 Video Animation

| File | Size | Where to Use |
|------|-------|-----------|
| `video-3wave-animation.html` | 1080×1920 | TikTok/Reels video intro |

---

## วิธี Export เป็น PNG/GIF

OpenFile `.html` ในเบราว์เซอร์ AlreadyกดButton:

- **S** → Save as PNG
- **G** → Save as GIF (5 seconds) — ExclusiveFile animation
- **R** → Reset animation
- **Space** → Pause/Resume

### แปลงเป็น PNG ด้วย Command Line

```bash
# Install Puppeteer (IfยังNoHas)
npm install -g puppeteer

# OrUseเบราว์เซอร์OpenAlreadyกด S
# OpenFileใน Chrome:
# file:///mnt/c/fullstack/ea-saas-platform/public/images/3wave-infographic.html
```

### แนะนำการUse

1. **OpenFile .html ใน Chrome** → รูปจะShowทันที
2. **กด S** → Saveเป็น PNG ลง Downloads
3. **ย้ายFile PNG** ไปPasteในโฟลเดอร์ `public/images/`
4. **Updateโค้ด** → เปลี่ยน `.html` เป็น `.png` ใน `<img>` tags

### การUse SVG Logo

```html
<!-- ใน Next.js -->
<img src="/images/logo.svg" alt="TradeCandle" />
<!-- OrUseเป็น favicon -->
<link rel="icon" href="/images/icon-512.svg" type="image/svg+xml" />
```

### OG Image For Social Sharing

Open `hero-banner.html` → กด S → Saveเป็น PNG → Uploadเป็น OG image

```html
<!-- ใน <head> -->
<meta property="og:image" content="/images/hero-banner.png" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:image" content="/images/hero-banner.png" />
```

---

*Createเมื่อ: เม.ย. 2026 | 16 assets total*