# 7G — UTM Parameters + Tracking Setup
## TradeCandle v11 — Track All Channels

---

## 🔗 UTM Naming Convention

### Format
```
https://tradecandle.ai/?utm_source={source}&utm_medium={medium}&utm_campaign={campaign}&utm_content={content}
```

### Rules
- UseItemPrintเล็ก (lowercase) Only
- Use underscore `_` InsteadSpace
- Noต้องใส่ `?` ซ้ำ — ใส่ `&` ต่อท้าย

---

## 📊 Master UTM Table

### FB Organic Posts
| Post | Link |
|------|------|
| Post 1 (Pain) | `?utm_source=fb&utm_medium=organic&utm_campaign=launch_week1&utm_content=post1_pain` |
| Post 2 (Edu) | `?utm_source=fb&utm_medium=organic&utm_campaign=launch_week1&utm_content=post2_edu` |
| Post 3 (Proof) | `?utm_source=fb&utm_medium=organic&utm_campaign=launch_week1&utm_content=post3_proof` |
| Post 4 (Myth) | `?utm_source=fb&utm_medium=organic&utm_campaign=launch_week1&utm_content=post4_myth` |
| Post 5 (Urgency) | `?utm_source=fb&utm_medium=organic&utm_campaign=launch_week1&utm_content=post5_urgency` |

### FB Groups
| Group | Link |
|-------|------|
| PostในGroup | `?utm_source=fb_group&utm_medium=organic&utm_campaign=launch_week1&utm_content=post1_pain_group` |

### FB Ads
| Ad | Link |
|-----|------|
| Ad 1 (Pain-Point Carousel) | `?utm_source=fb&utm_medium=cpc&utm_campaign=launch_ad1_pain&utm_content=carousel` |
| Ad 2 (Social Proof Video) | `?utm_source=fb&utm_medium=cpc&utm_campaign=launch_ad2_proof&utm_content=video30s` |
| Ad 3 (Myth Retargeting) | `?utm_source=fb&utm_medium=cpc&utm_campaign=launch_ad3_myth&utm_content=retargeting` |

### TikTok
| Video | Link |
|-------|------|
| Clip 1 (Pain) | `?utm_source=tiktok&utm_medium=organic&utm_campaign=launch_week1&utm_content=clip1_pain` |
| Clip 2 (Myth) | `?utm_source=tiktok&utm_medium=organic&utm_campaign=launch_week1&utm_content=clip2_myth` |
| Clip 3 (POV) | `?utm_source=tiktok&utm_medium=organic&utm_campaign=launch_week1&utm_content=clip3_pov` |

### Line OA
| Message | Link |
|---------|------|
| Broadcast 1 (Teaser) | `?utm_source=line&utm_medium=broadcast&utm_campaign=launch_teaser` |
| Broadcast 2 (Launch) | `?utm_source=line&utm_medium=broadcast&utm_campaign=launch_day&utm_content=line_exclusive` |
| Broadcast 3 (Urgency) | `?utm_source=line&utm_medium=broadcast&utm_campaign=launch_urgency` |
| Line Rich Menu: Sign Up | `?utm_source=line&utm_medium=rich_menu&utm_campaign=ongoing&utm_content=signup` |
| Line Rich Menu: สอนTrading | `?utm_source=line&utm_medium=rich_menu&utm_campaign=ongoing&utm_content=learn` |

### Emails
| Email | Link |
|-------|------|
| Welcome (Day 0) | `?utm_source=email&utm_medium=welcome&utm_campaign=trial` |
| Day 3 | `?utm_source=email&utm_medium=day3&utm_campaign=trial` |
| Day 5 | `?utm_source=email&utm_medium=day5&utm_campaign=trial` |
| Day 7 | `?utm_source=email&utm_medium=day7&utm_campaign=trial` |
| Day 14 (Comeback) | `?utm_source=email&utm_medium=post_trial&utm_campaign=comeback` |

### Pricing Page Deep Links
| Tier | Link |
|------|------|
| Starter | `https://tradecandle.ai/#pricing?utm_source=fb&utm_medium=organic&utm_campaign=launch_week1&utm_content=starter` |
| Pro ⭐ | `https://tradecandle.ai/#pricing?utm_source=fb&utm_medium=organic&utm_campaign=launch_week1&utm_content=pro` |
| Elite | `https://tradecandle.ai/#pricing?utm_source=fb&utm_medium=organic&utm_campaign=launch_week1&utm_content=elite` |

---

## 📈 GA4 Setup — Custom Events

### Events to Track (already in `src/lib/analytics.tsx`)

```typescript
// Landing page CTAs
trackEvent('cta_click', { cta_name: 'hero_free_trial', cta_location: 'hero' });
trackEvent('cta_click', { cta_name: 'pricing_pro', cta_location: 'pricing' });
trackEvent('cta_click', { cta_name: 'faq_cta', cta_location: 'faq' });

// Checkout flow
trackEvent('begin_checkout', { plan: 'pro', value: 2490, currency: 'THB' });
trackEvent('purchase', { value: 2490, currency: 'THB', plan: 'pro' });
trackEvent('subscribe', { plan: 'pro', value: 2490 });
trackEvent('trial_start', { plan: 'pro', user_id: 'xxx' });

// Engagement
trackEvent('video_play', { video_name: '3wave_demo' });
trackEvent('line_add_friend', { page: '/landing' });
trackEvent('contact', { contact_method: 'line' });
```

### GA4 Custom Conversions (Create in GA4 Admin)

1. **purchase** — event: `purchase`
2. **subscribe** — event: `subscribe`
3. **trial_start** — event: `trial_start`
4. **begin_checkout** — event: `begin_checkout`
5. **cta_click** — event: `cta_click`

### GA4 Custom Audiences

1. **All Visitors** — Page view on `/`
2. **Pricing Viewers** — Page view on `/#pricing`
3. **Checkout Starters** — event: `begin_checkout`
4. **Trial Users** — event: `trial_start`
5. **Purchasers** — event: `purchase`

---

## 🎯 FB Pixel Setup — Custom Conversions

### Standard Events (Auto-tracked)
| FB Event | Maps From |
|----------|-----------|
| PageView | Every page |
| CompleteRegistration | `sign_up` |
| InitiateCheckout | `begin_checkout` |
| Purchase | `purchase` |
| Subscribe | `subscribe` |
| StartTrial | `trial_start` |
| ViewContent | `view_item` |
| Contact | `contact` |
| AddToWishlist | `line_add_friend` |

### Custom Conversions (Create in Events Manager)

1. **Purchase THB** — event: `Purchase`, rule: `value > 0`
2. **Trial Signup** — event: `StartTrial`
3. **Line Friend** — event: `AddToWishlist`
4. **Pricing View** — URL contains `#pricing`

### Custom Audiences

1. **All Website Visitors** — 180 days
2. **Pricing Page** — URL contains `#pricing`
3. **Checkout Starters** — event: `InitiateCheckout`
4. **Trial Users** — event: `StartTrial`
5. **Purchasers** — event: `Purchase`
6. **Line Friends** — event: `AddToWishlist`

### Lookalike Audiences (Create after 100+ events)
1. **Lookalike Thailand 1%** — from Purchasers
2. **Lookalike Thailand 1%** — from Trial Users

---

## 📊 Daily Tracking Checklist

### FB Ads Manager (เช็คเช้า + เย็น)
- [ ] Spend ($)
- [ ] Impressions
- [ ] CTR (%)
- [ ] CPC ($)
- [ ] Conversions
- [ ] Cost per Conversion ($)
- [ ] ROAS

### GA4 (เช็คเช้า)
- [ ] Real-time users
- [ ] Pageviews
- [ ] Top pages
- [ ] Traffic sources
- [ ] Events fired

### Line OA (เช็คเย็น)
- [ ] New friends (daysThis)
- [ ] Messages received
- [ ] Broadcast open rate
- [ ] Link click rate

### Blockchain Explorer (เช็คเย็น)
- [ ] New trials
- [ ] New paid subscriptions
- [ ] Revenue ($)
- [ ] Churned subscriptions

---

## 📊 Campaign Report Template

```markdown
# Campaign Report — Day [X]

## Metrics
| Metric | Target | Actual | % of Target |
|--------|--------|--------|-------------|
| LP Visits | [target] | [actual] | [%] |
| Trial Signups | [target] | [actual] | [%] |
| Paid Conversions | [target] | [actual] | [%] |
| Revenue | [target]$ | [actual]$ | [%] |
| ROAS | ≥3x | [actual]x | [%] |

## Ad Performance
| Ad | Spend | Impressions | CTR | CPC | Conversions | Cost/Conv |
|-----|-------|------------|-----|-----|------------|-----------|
| Ad 1 | $ | | % | $ | | $ |
| Ad 2 | $ | | % | $ | | $ |
| Ad 3 | $ | | % | $ | | $ |

## Top Content
| Content | Views | Clicks | Signups |
|---------|-------|--------|---------|
| | | | |

## Action Items
- [ ] 
- [ ] 
- [ ] 
```