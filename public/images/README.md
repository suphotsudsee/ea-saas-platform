# 📸 Content Assets Index — TradeCandle v11

## ไฟล์ทั้งหมดอยู่ใน `public/images/`

### 🎨 โลโก้และไอคอน

| ไฟล์ | ขนาด | ใช้ที่ไหน |
|------|-------|-----------|
| `logo.svg` | 240×80 | Navbar, Header, Watermark |
| `icon-512.svg` | 512×512 | Favicon, App Icon, OG Image fallback |

### 🖼️ Infographics

| ไฟล์ | ขนาด | ใช้ที่ไหน |
|------|-------|-----------|
| `3wave-infographic.html` | 1200×1500 | Landing Page, FB Post, Line OA |
| `smc-filters-infographic.html` | 1200×1800 | Landing Page, FB Post |
| `hero-banner.html` | 1920×1080 | Landing Page Hero, OG Image |
| `pricing-cards.html` | 1920×1080 | Landing Page Pricing Section |

### 📱 Line OA

| ไฟล์ | ขนาด | ใช้ที่ไหน |
|------|-------|-----------|
| `line-rich-menu.html` | 2500×1686 | Line OA Rich Menu |

### 📘 Facebook Post Images

| ไฟล์ | ขนาด | หัวข้อ |
|------|-------|--------|
| `fb-post-1.html` | 1200×1200 | Pain-Point: "เคยเป็นไหม?" |
| `fb-post-2.html` | 1200×1200 | Smart Money 6 Filters |
| `fb-post-3.html` | 1200×1200 | Social Proof: +$340 |
| `fb-post-4.html` | 1200×1200 | Comparison: EA ทั่วไป vs TradeCandle |
| `fb-post-5.html` | 1200×1200 | CTA: 7 วันฟรี |

### 🎵 TikTok/Reels Cover Images

| ไฟล์ | ขนาด | หัวข้อ |
|------|-------|--------|
| `tiktok-cover-1.html` | 1080×1920 | "เคยเป็นไหม?" Pain Hook |
| `tiktok-cover-2.html` | 1080×1920 | "EA ขาดทุนจริงหรอ?" Myth-Busting |
| `tiktok-cover-3.html` | 1080×1920 | "ตื่นมาเห็นกำไร" Result Focus |

### 🎬 Video Animation

| ไฟล์ | ขนาด | ใช้ที่ไหน |
|------|-------|-----------|
| `video-3wave-animation.html` | 1080×1920 | TikTok/Reels video intro |

---

## วิธี Export เป็น PNG/GIF

เปิดไฟล์ `.html` ในเบราว์เซอร์ แล้วกดปุ่ม:

- **S** → Save as PNG
- **G** → Save as GIF (5 วินาที) — เฉพาะไฟล์ animation
- **R** → Reset animation
- **Space** → Pause/Resume

### แปลงเป็น PNG ด้วย Command Line

```bash
# ติดตั้ง Puppeteer (ถ้ายังไม่มี)
npm install -g puppeteer

# หรือใช้เบราว์เซอร์เปิดแล้วกด S
# เปิดไฟล์ใน Chrome:
# file:///mnt/c/fullstack/ea-saas-platform/public/images/3wave-infographic.html
```

### แนะนำการใช้

1. **เปิดไฟล์ .html ใน Chrome** → รูปจะแสดงทันที
2. **กด S** → บันทึกเป็น PNG ลง Downloads
3. **ย้ายไฟล์ PNG** ไปวางในโฟลเดอร์ `public/images/`
4. **อัปเดตโค้ด** → เปลี่ยน `.html` เป็น `.png` ใน `<img>` tags

### การใช้ SVG โลโก้

```html
<!-- ใน Next.js -->
<img src="/images/logo.svg" alt="TradeCandle" />
<!-- หรือใช้เป็น favicon -->
<link rel="icon" href="/images/icon-512.svg" type="image/svg+xml" />
```

### OG Image สำหรับ Social Sharing

เปิด `hero-banner.html` → กด S → บันทึกเป็น PNG → อัปโหลดเป็น OG image

```html
<!-- ใน <head> -->
<meta property="og:image" content="/images/hero-banner.png" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:image" content="/images/hero-banner.png" />
```

---

*สร้างเมื่อ: เม.ย. 2026 | 16 assets total*