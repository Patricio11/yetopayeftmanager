# YETOPAY — GOOGLE STITCH DESIGN PROMPTS
## Complete Screen Design Kit — Pay By Bank Edition

### HOW TO USE THIS FILE
Google Stitch works best with focused prompts (1–3 screens at a time). This file is organized into **prompt groups** — paste one group into Stitch per session, iterate, then move to the next.

**Recommended workflow:**
1. Start with **Prompt 0 (DESIGN.md)** — paste it as your Stitch project's design system context.
2. Work through each prompt group in order.
3. Use Stitch's "Experimental Mode" with Gemini 2.5 Pro for highest fidelity.
4. Set layout to **Desktop** (this is a web dashboard, not mobile).
5. After generating, use Stitch's follow-up chat to refine details.
6. Export to Figma for final polish, or use the code export.

---

## PROMPT 0: DESIGN SYSTEM CONTEXT
*Paste this first to establish the design language. Use it as your DESIGN.md in Stitch or paste before your first screen prompt.*

```
DESIGN SYSTEM — "YetoPay: Pay By Bank"

App Name: YetoPay
Tagline: "Pay By Bank — Instant. Secure. South African."
Platform: Web (Desktop + Mobile Responsive, Next.js)
Industry: Fintech — Pay By Bank / EFT payment gateway for South African merchants

BRAND PERSONALITY:
Trustworthy, modern, confident, South African. Think Stripe meets Investec — a tool merchants trust with their money. Clean surfaces, confident typography, subtle depth through shadow not color. The dashboard should feel like opening your premium banking app — structured, data-rich, never overwhelming. Every pixel communicates "your payments are in good hands." This is a platform processing real transactions for real businesses — design it like one.

DESIGN PHILOSOPHY:
"Clarity is the feature." Data-dense without feeling cluttered. White space creates hierarchy, not emptiness. Color is used surgically: green means money/success, amber means pending/attention, red means failed/danger. Cards are the primary container — elevated, clean, scannable. The design should scale from a solo merchant checking 5 transactions to an admin managing 200 merchants without breaking.

INSPIRATION SOURCES (reference these for the vibe):
- Stripe Dashboard — the gold standard for payment dashboards, clean white, structured data tables, excellent hierarchy
- Linear — modern SaaS dashboard, beautiful sidebar nav, purple-ish accents, buttery smooth
- Vercel — minimal, monochrome with subtle accents, gorgeous typography, developer-grade polish
- Investec Private Bank — South African premium feel, dark navy, silver, trust
- Mercury Bank — clean fintech dashboard, excellent card design, thoughtful empty states
- Wise (TransferWise) — clear transaction flows, green brand, trust-first design

COLOR PALETTE:
- Primary: #0A6E5C (YetoPay Teal — deep, confident green-teal. Think Investec green meets Wise green. Conveys money, trust, South Africa.)
- Primary Dark: #085A4B (pressed states, hover)
- Primary Light: #ECFDF5 (card tints, badge backgrounds)
- Primary Bright: #10B981 (success indicators, completed transactions, live dots)

- Accent: #F59E0B (Warm Amber — pending states, attention, warmth)
- Accent Light: #FFFBEB (pending badges, warning backgrounds)

- Danger: #EF4444 (Failed Red — clean, clinical, for failed transactions and destructive actions)
- Danger Light: #FEF2F2 (failed badges, error backgrounds)

- Info: #3B82F6 (Calm Blue — links, informational, API/developer elements)
- Info Light: #EFF6FF (info badges, code blocks)

- Background: #FAFBFC (barely-there grey — the canvas, never pure white for the page)
- Surface: #FFFFFF (cards, modals, dropdowns — pure white, elevated)
- Surface Secondary: #F8FAFC (secondary surfaces, input backgrounds, table headers)
- Divider: #E2E8F0 (borders, table lines, separators)

- Text Primary: #0F172A (near-black — headings, high emphasis)
- Text Body: #334155 (dark grey — body text, descriptions)
- Text Secondary: #64748B (medium grey — labels, metadata)
- Text Tertiary: #94A3B8 (light grey — timestamps, placeholders, disabled)

- Nav Background: #0F172A (dark navy sidebar — the signature look)
- Nav Text: #94A3B8 (inactive items)
- Nav Active: #FFFFFF (active item text)
- Nav Active Accent: #10B981 (active item left border + icon highlight)

TYPOGRAPHY:
- Font Family: Inter (entire app — modern, professional, excellent for data)
- Page Title: Inter 700, 28–32px, letter-spacing -0.5px, Text Primary
- Section Heading: Inter 600, 18–22px, letter-spacing -0.3px, Text Primary
- Card Title: Inter 600, 15–16px, Text Primary
- Body: Inter 400, 14–15px, line-height 1.6, Text Body
- Caption/Label: Inter 500, 12–13px, Text Secondary (uppercase sparingly for table headers)
- Numbers/Currency: Inter 600 with tabular figures (font-feature-settings: 'tnum'), monospace for amounts
- Large Stats: Inter 700, 28–36px, letter-spacing -0.5px (dashboard KPI numbers)

CARD STYLE — THE FOUNDATION:
- Background: pure white (#FFFFFF)
- Border: 1px solid #E2E8F0 (subtle, structural)
- Shadow: 0px 1px 3px rgba(0,0,0,0.04), 0px 1px 2px rgba(0,0,0,0.02) — barely there, just enough lift
- Hover shadow (interactive cards): 0px 4px 12px rgba(0,0,0,0.06) — lifts on hover
- Border Radius: 12px (cards), 8px (buttons, inputs, badges), 6px (small pills)
- Padding: 20–24px internal
- NO glassmorphism. NO gradients on cards. NO colored card backgrounds (except KPI accent strips).

BUTTON STYLE:
- Primary: #0A6E5C fill, white text, 40px height (compact), 44px height (standard), 8px radius
  Hover: #085A4B, subtle shadow lift
- Danger: white fill, 1px red border, red text. Hover: red-50 bg.
  (Never filled red for buttons — prevents accidental destructive actions.)
- Secondary: white fill, 1px #E2E8F0 border, Text Body color. Hover: #F8FAFC bg.
- Ghost: transparent, Primary teal text, no border. For inline actions.
- Icon Button: 36×36, 8px radius, transparent, icon in Text Secondary. Hover: Surface Secondary bg.
- All buttons: Inter 500, 14px. Minimum 36px height. Loading state: spinner replaces text.

INPUT FIELDS:
- Background: #FFFFFF (white, not grey — feels premium)
- Border: 1px solid #E2E8F0, radius 8px
- Focus: 2px ring in Primary teal (ring-offset-2, focus:ring-2 focus:ring-emerald-500)
- Error: 1px solid #EF4444 + red ring
- Height: 40px (standard), 44px (large/hero)
- Padding: 12px horizontal
- Label: above the field, Inter 500, 13px, Text Secondary, 4px margin-bottom
- Placeholder: Inter 400, 14px, Text Tertiary

STATUS BADGES (6px radius pills):
- Completed: #ECFDF5 bg, #0A6E5C text, green dot prefix — "Completed"
- Pending: #FFFBEB bg, #92400E text, amber dot prefix — "Pending"
- Failed: #FEF2F2 bg, #991B1B text, red dot prefix — "Failed"
- Initiated: #EFF6FF bg, #1E40AF text, blue dot prefix — "Initiated"
- Cancelled: #F8FAFC bg, #64748B text, grey dot prefix — "Cancelled"
- All badges: Inter 500, 12px, padding 4px 10px, inline-flex with dot (6px circle)

ICONS:
- Library: Lucide React (consistent, clean, 1.5px stroke weight)
- Size: 16px (inline/badges), 20px (standard/nav), 24px (feature/headers)
- Color: matches text weight or status color
- Nav icons: 20px, text-secondary when inactive, white when active

SPACING SYSTEM (4px base, 8px grid):
- 4px: tight inline (icon-to-text, badge internal)
- 8px: between related elements (label-to-input, badge-to-badge)
- 12px: between cards in a grid, between table rows
- 16px: card internal sections, form field gaps
- 20px: card padding, page horizontal gutters
- 24px: between major card groups
- 32px: page section breaks
- 48px: hero spacing, page top padding

SIDEBAR NAVIGATION (THE SIGNATURE):
- Width: 260px (expanded), 72px (collapsed)
- Background: #0F172A (slate-900, dark navy)
- Logo area: 64px height, YetoPay wordmark in white + teal icon, centered
- Nav items: 44px height, 12px horizontal padding, 8px radius
  - Inactive: Text in #94A3B8, icon in #64748B
  - Hover: bg rgba(255,255,255,0.05), text #CBD5E1
  - Active: bg rgba(16,185,129,0.1), text white, icon #10B981, left border 3px #10B981
- Section dividers: 1px rgba(255,255,255,0.06), 16px vertical margin
- Section labels: Inter 500, 11px, uppercase, letter-spacing 0.5px, #475569
- Bottom: user avatar (32px) + name + role badge + settings gear icon
- Collapse toggle: bottom of sidebar, small chevron button

DATA TABLE STYLE:
- Container: white card with border, 12px radius, overflow hidden
- Header: #F8FAFC bg, Inter 500 12px uppercase Text Secondary, 12px padding
- Rows: white bg, 14px padding, 1px bottom border #F1F5F9
- Row hover: #FAFBFC bg (barely visible, just enough feedback)
- Row click (if interactive): cursor-pointer, subtle left teal accent on hover
- Status column: uses status badges
- Amount column: right-aligned, tabular figures, Inter 600
- Date column: Inter 400, Text Secondary, relative format ("2 min ago") with tooltip for absolute
- Actions column: icon buttons (eye, edit, trash), 32px, ghost style
- Pagination: bottom of card, Inter 400 14px, page numbers + prev/next

CHART/GRAPH STYLE (Recharts):
- Background: transparent (lives in white card)
- Grid lines: #F1F5F9 (barely visible)
- Area fill: Primary teal at 10% opacity gradient
- Line stroke: Primary teal, 2px, smooth curve
- Bar fill: Primary teal (completed), Amber (pending), Red (failed)
- Tooltip: white card, subtle shadow, 8px radius, 12px padding
- Axis labels: Inter 400, 12px, Text Tertiary
- Legend: Inter 400, 13px, colored dot + label

EMPTY STATES:
- Centered in card/page area
- Subtle icon (48px, Text Tertiary at 30% opacity)
- Heading: Inter 600, 17px, Text Secondary
- Description: Inter 400, 14px, Text Tertiary, max-width 320px, centered
- CTA button (if applicable): Primary teal, standard size
- NO stock illustrations. Clean icon + text only.

MICRO-INTERACTIONS:
- Card hover: shadow deepens (200ms ease)
- Button press: scale 0.98 (100ms)
- Status badge appear: fade-in (150ms)
- Nav item hover: bg fade-in (150ms)
- Table row hover: bg tint (100ms)
- Skeleton loading: pulse animation on Surface Secondary rectangles
- Number counting: animated count-up on KPI cards (400ms ease-out)
- NO bouncy/playful animations. Smooth, subtle, professional.

RESPONSIVE BREAKPOINTS:
- Desktop: 1280px+ (sidebar expanded, full data tables)
- Tablet: 768–1279px (sidebar collapsed, cards stack to 2-col)
- Mobile: <768px (sidebar becomes top hamburger, single column, horizontal scroll on tables)
```

---

## PROMPT GROUP 1: LANDING PAGE (1 screen)

```
Design 1 desktop web page for "YetoPay" — a South African Pay By Bank payment gateway. The landing page must communicate trust, professionalism, and modern fintech energy. Think Stripe.com meets a South African banking aesthetic. Inter font, YetoPay Teal (#0A6E5C) primary, clean white surfaces, subtle shadows.

LAYOUT (top to bottom, 1280px max-width centered):

NAVIGATION BAR (fixed, 64px height):
- Background: white, subtle bottom border (1px #E2E8F0), slight shadow on scroll
- Left: YetoPay logo — a clean, minimal "Y" mark in teal (#0A6E5C) + "YetoPay" wordmark in Inter 700 20px Text Primary
- Center-right nav links (Inter 500 15px Text Body, 32px gap): Features, Banks, Pricing, API Docs
- Right: "Sign In" ghost button (teal text) + "Get Started" Primary teal button (40px height, 8px radius)

HERO SECTION (generous, 560px min-height, white bg):
- Left column (55% width):
  - Eyebrow: "PAY BY BANK" in teal pill badge (Primary Light bg, Primary text, Inter 600 12px, uppercase, letter-spacing 1px)
  - 16px gap
  - Headline: "Accept instant bank payments from every major South African bank" in Inter 800, 48px, Text Primary, letter-spacing -1px, line-height 1.1
  - 20px gap
  - Subheadline: "YetoPay connects your business to FNB, ABSA, Standard Bank, Nedbank, Capitec, and more — with real-time confirmation, no card fees, and enterprise-grade security." in Inter 400, 18px, Text Body, line-height 1.6, max-width 520px
  - 32px gap
  - CTA row: "Start Accepting Payments" Primary teal button (52px height, 16px radius, Inter 600 16px, subtle teal shadow) + "View API Docs" Secondary button (52px, outlined)
  - 24px gap
  - Trust strip: "Trusted by 50+ South African businesses" in Inter 400 14px Text Tertiary + row of 4 subtle grey merchant logos (placeholder rectangles)

- Right column (45% width):
  - A clean dashboard mockup card — white card with subtle shadow, 16px radius, showing:
    - A mini transaction table (3 rows) with status badges (Completed green, Pending amber, Completed green)
    - A mini bar chart at the top (5 bars, teal)
    - Amount values like "R 1,250.00", "R 450.00"
    - This should look like a real screenshot of the YetoPay dashboard, slightly rotated 2-3 degrees for depth
  - Floating mini-cards around it:
    - "R 2,500.00 received" success notification card (green dot, white card, tiny shadow, 8px radius)
    - "FNB ✓ Connected" small badge card
  - These floating elements give life and depth to the hero

BANK LOGOS SECTION (Surface Secondary bg #F8FAFC, 100px height):
- "Works with all major South African banks" Inter 500 14px Text Secondary, centered
- 16px gap
- Row of 6 bank logos (FNB, ABSA, Standard Bank, Nedbank, Capitec, African Bank) in greyscale, 40px height, evenly spaced, subtle hover: full color

FEATURES GRID (white bg, 80px top padding):
- Section heading: "Everything you need to accept Pay By Bank" Inter 700 32px Text Primary, centered, letter-spacing -0.5px
- Subtitle: "From payment links to webhooks, YetoPay handles the complexity so you can focus on your business." Inter 400 16px Text Secondary, centered, max-width 560px
- 48px gap
- 3-column grid (16px gap):

  Feature Card 1 — "Instant Payments":
  - White card, 1px border #E2E8F0, 12px radius, 24px padding
  - Top: 44px circle, Primary Light bg (#ECFDF5), teal Zap icon (24px)
  - 16px gap
  - Title: "Instant EFT Payments" Inter 600 17px Text Primary
  - 8px gap
  - Description: "Accept bank-to-bank payments in real time. No waiting for card settlements — funds confirmed instantly." Inter 400 14px Text Body, line-height 1.6
  
  Feature Card 2 — "Real-time Webhooks":
  - Icon: Bell icon in blue circle (#EFF6FF bg, #3B82F6 icon)
  - "Real-time Webhooks" 
  - "Get instant notifications when payments complete, fail, or are cancelled. Retry logic built in."

  Feature Card 3 — "Per-Bank Routing":
  - Icon: GitBranch icon in amber circle (#FFFBEB bg, #F59E0B icon)
  - "Intelligent Bank Routing"
  - "Route each bank through dedicated infrastructure for maximum reliability and uptime."

  Feature Card 4 — "Payment Links":
  - Icon: Link icon in purple circle (#F3E8FF bg, #8B5CF6 icon)
  - "Payment Links"
  - "Generate secure, branded payment links. Share via email, SMS, or embed in your checkout."

  Feature Card 5 — "Merchant Dashboard":
  - Icon: LayoutDashboard icon in teal circle
  - "Merchant Dashboard"
  - "Track every transaction, monitor bank health, manage API keys, and download invoices — all in one place."

  Feature Card 6 — "Enterprise Security":
  - Icon: Shield icon in slate circle (#F1F5F9 bg, #475569 icon)
  - "Enterprise Security"
  - "RSA-signed JWTs, HMAC webhook verification, AES-256 credential encryption, and PCI-aware token handling."

STATS BAR (Primary teal bg #0A6E5C, 120px height, full-width bleed):
- 4 stats in a row, white text, centered:
  - "R 12M+" / "Processed" (Inter 700 32px / Inter 400 14px opacity 0.8)
  - "50+" / "Merchants"
  - "6" / "Banks Supported"
  - "99.9%" / "Uptime"
- Subtle repeating diagonal line pattern at 5% opacity for texture

CTA SECTION (white bg, 80px vertical padding):
- "Ready to accept Pay By Bank?" Inter 700 32px, centered
- 12px gap
- "Get started in under 5 minutes. No setup fees." Inter 400 16px Text Secondary, centered
- 24px gap
- "Create Free Account" Primary teal button (52px, Inter 600 16px, teal shadow)

FOOTER (Nav bg #0F172A, 80px padding):
- 4 columns:
  - Column 1: YetoPay logo (white) + "South African Pay By Bank payment gateway" Inter 400 14px #94A3B8
  - Column 2: "Product" heading (#CBD5E1 Inter 600 13px uppercase) + links (Features, Pricing, API Docs, Banks) in #94A3B8 14px
  - Column 3: "Company" + links (About, Contact, Terms, Privacy)
  - Column 4: "Developers" + links (Documentation, API Reference, SDKs, Status)
- Bottom bar: "© 2025 YetoPay. All rights reserved." centered, #64748B 13px
- Subtle top border: 1px rgba(255,255,255,0.06)

Vibe: Stripe.com energy — confident, developer-friendly, premium without being flashy. A South African fintech that stands shoulder-to-shoulder with global payment platforms.
```

---

## PROMPT GROUP 2: AUTHENTICATION SCREENS (4 screens)

```
Design 4 desktop web screens for "YetoPay" — the AUTHENTICATION FLOW. Clean, professional fintech design. Inter font, YetoPay Teal (#0A6E5C) primary, white surfaces, subtle shadows. These should feel like signing into Stripe or Mercury — zero friction, premium trust.

SCREEN 1 — LOGIN:
- Split layout: left panel (50%) decorative + right panel (50%) form
- LEFT PANEL:
  - Background: #0F172A (dark navy)
  - Large YetoPay wordmark in white, vertically centered, slightly above center
  - Below logo: "Pay By Bank — Instant. Secure. South African." in Inter 400 16px #94A3B8
  - Subtle decorative element: abstract grid of dots or thin connecting lines at 5% white opacity — represents a payment network
  - Bottom-left: "Trusted by 50+ South African merchants" in #64748B 13px
- RIGHT PANEL:
  - White background, centered form container (max-width 400px), vertically centered
  - Top: "Welcome back" Inter 700 28px Text Primary
  - 8px gap: "Sign in to your YetoPay account" Inter 400 15px Text Secondary
  - 32px gap
  - Form:
    - Label "Email address" + email input (40px, white bg, 1px border, mail icon prefix)
    - 16px gap
    - Label "Password" + password input (lock icon prefix, eye toggle suffix)
    - 8px gap: "Forgot password?" right-aligned, Inter 500 14px, teal text, no underline
  - 24px gap
  - "Sign In" button — Primary teal, full-width, 44px, Inter 500 15px
    - Loading state: white spinner replacing text
  - 32px gap
  - "Don't have an account? Sign up" — centered, Inter 400 14px Text Secondary, "Sign up" in teal 500 weight

SCREEN 2 — REGISTER:
- Same split layout
- Left panel: same dark navy with "Start accepting Pay By Bank payments in minutes" headline
- Right panel:
  - "Create your account" heading
  - Form fields (16px gap):
    - Full Name (user icon)
    - Email (mail icon)
    - Phone (+27 prefix, phone icon)
    - Company Name (building icon)
    - Company Website (globe icon, optional indicator)
    - Password (lock icon, eye toggle)
  - Password strength indicator: 4 segments bar below password field, colored by strength (red → amber → green → teal)
  - "Create Account" teal button, full-width
  - Legal: "By creating an account, you agree to our Terms of Service and Privacy Policy" Inter 400 12px Text Tertiary, links in teal
  - "Already have an account? Sign in" at bottom

SCREEN 3 — VERIFY EMAIL:
- Centered layout (no split), max-width 480px
- Top: mail icon in 64px teal-tinted circle (#ECFDF5 bg, teal icon)
- 24px gap: "Check your email" Inter 700 26px, centered
- 12px gap: "We sent a verification link to you@example.com" Inter 400 15px Text Secondary, centered
- 32px gap
- White card with subtle border, 24px padding:
  - "Didn't receive the email?" Inter 500 15px Text Primary
  - 12px gap
  - "Check your spam folder, or resend the verification email below." Inter 400 14px Text Secondary
  - 16px gap
  - "Resend Verification Email" Secondary button, full-width, 40px
  - 12px gap
  - "Back to login" ghost link, centered, teal text
- Timer state: "Resend available in 0:47" in amber text when cooldown active

SCREEN 4 — RESET PASSWORD:
- Same centered layout
- Lock-reset icon in amber circle (not teal — this is recovery, amber conveys "attention needed" without alarm)
- "Reset your password" heading
- "Enter your email and we'll send you a reset link" subtitle
- Email input
- "Send Reset Link" button in amber (#F59E0B bg, white text) — amber for recovery flow
- Success state: green checkmark circle + "Email sent!" heading + "Check your inbox for the reset link" body + "Back to login" button

Vibe: Like signing into Stripe — clean, fast, trustworthy. The split layout with dark left panel gives it a premium, enterprise feel.
```

---

## PROMPT GROUP 3: DASHBOARD — SIDEBAR NAVIGATION (1 component)

```
Design the SIDEBAR NAVIGATION for "YetoPay" web dashboard. This is the signature navigation element — dark navy, always visible on desktop, collapsible. Think Linear or Vercel's sidebar.

SIDEBAR (260px width, full viewport height, fixed):
- Background: #0F172A (dark navy, the signature)
- Border-right: none (use subtle shadow instead: 1px 0 0 rgba(255,255,255,0.06))

LOGO AREA (64px height, 20px left padding):
- YetoPay mark: a clean "Y" shape or abstract payment flow icon in #10B981 (bright green), 28px
- 10px gap
- "YetoPay" wordmark in white, Inter 700 18px
- Collapse button: small chevron-left icon (16px, #64748B) in 28px ghost button, right side, only visible on hover

DEMO BANNER (if applicable, 36px height):
- Background: rgba(245,158,11,0.1) (amber tint)
- Left: info circle icon (14px, amber)
- "Demo Mode" Inter 500 12px amber text
- Right: "Go Live" tiny teal link

MAIN NAV SECTION (16px top padding):
- Section label: "MAIN" Inter 500 11px #475569 uppercase, letter-spacing 0.5px, 12px left padding, 20px bottom margin

- Nav items (44px height each, 8px horizontal margin, 8px radius):
  
  Layout per item: 12px left padding → icon (20px) → 12px gap → label (Inter 500 14px) → spacer → optional badge (right)
  
  INACTIVE: icon #64748B, text #94A3B8, bg transparent
  HOVER: bg rgba(255,255,255,0.04), text #CBD5E1, icon #94A3B8
  ACTIVE: bg rgba(16,185,129,0.1), text white, icon #10B981, left border 3px solid #10B981 (rounded)
  
  Items:
  1. LayoutDashboard icon — "Dashboard" (ACTIVE for this mockup)
  2. ArrowLeftRight icon — "Transactions"
  3. BarChart3 icon — "Analytics"  
  4. FileText icon — "Invoices"
  5. CreditCard icon — "Payment Links"

- Divider: 1px rgba(255,255,255,0.06), 16px vertical margin, 12px horizontal margin

- Section label: "MANAGE"
  6. Key icon — "Tokens" 
  7. Code icon — "API Docs"
  8. Settings icon — "Settings"

- Divider

- Section label: "ADMIN" (only visible for admin users)
  9. Building2 icon — "Merchants" + count badge ("12" in teal pill, 18px height)
  10. Users icon — "Partners"
  11. UserCog icon — "Users"
  12. Scale icon — "Reconciliation"
  13. Sliders icon — "Platform Settings"

BOTTOM SECTION (pinned to bottom, 16px padding):
- Divider above
- User row (44px height, 8px radius, hover: rgba(255,255,255,0.04)):
  - Avatar: 32px circle, initials "PM" on teal bg, white text Inter 600 12px
  - 10px gap
  - Column: "Patricio" Inter 500 14px white + "Admin" Inter 400 12px #64748B
  - Right: ChevronUp icon (16px, #64748B) — opens dropdown for logout/profile

COLLAPSED STATE (72px width):
- Only icons visible, centered
- Logo: just the "Y" mark, no wordmark
- Nav items: just icon (20px), centered, tooltip on hover showing label
- Active item: teal dot indicator below icon instead of left border
- User: just avatar, no text

Vibe: Linear meets Stripe. Dark, structured, premium. The sidebar is the first thing you see — it sets the tone for the entire product. It should feel like a tool built for serious businesses.
```

---

## PROMPT GROUP 4: DASHBOARD — MAIN OVERVIEW (1 screen, THE MOST IMPORTANT)

```
Design 1 desktop web screen for "YetoPay" — the MAIN DASHBOARD PAGE. This is the screen merchants see after login. It must be the most polished, data-rich, impressive screen of the entire kit. Think Stripe Dashboard's overview page.

LAYOUT: Sidebar (260px, dark navy, from Prompt Group 3) + Main content area (remaining width, #FAFBFC background)

MAIN CONTENT (32px padding, max-width 1200px):

HEADER ROW (flex, space-between):
- Left:
  - "Dashboard" Inter 700 28px Text Primary
  - 4px gap
  - "Welcome back, Patricio" Inter 400 15px Text Secondary
- Right:
  - Date range selector: pill-shaped segmented control with "Today", "7 Days", "30 Days", "90 Days" — 36px height, 6px radius, Surface Secondary bg, active segment white bg with shadow
  - 12px gap
  - "Export" Secondary button (Download icon + text, 36px height)

LIVE INDICATOR (below header, 8px gap):
- Small row: pulsing green dot (6px, animation) + "Live — Last updated 2 min ago" Inter 400 13px Text Tertiary
- Right: "Refresh" ghost button with refresh icon

KPI CARDS ROW (4 cards, 16px gap, equal width):

Each card: white, 1px border #E2E8F0, 12px radius, 24px padding
- Top-left: icon in 40px colored circle
- Top-right: trend badge ("↑ 12.4%" in green pill or "↓ 3.2%" in red pill), Inter 500 12px
- Middle: stat value — Inter 700 32px Text Primary (e.g., "R 245,892.50")
- Bottom: label — Inter 400 14px Text Secondary (e.g., "Total Revenue")
- Accent: 3px top border in the card's accent color

Card 1 — "Total Revenue":
  - Icon: DollarSign in teal circle (#ECFDF5 bg)
  - Value: "R 245,892.50"
  - Trend: "↑ 12.4%" green
  - Top border: teal

Card 2 — "Transactions":
  - Icon: ArrowLeftRight in blue circle (#EFF6FF bg)
  - Value: "1,247"
  - Trend: "↑ 8.2%" green
  - Top border: blue

Card 3 — "Success Rate":
  - Icon: CheckCircle in green circle (#ECFDF5 bg)
  - Value: "94.7%"
  - Trend: "↑ 1.3%" green
  - Top border: green

Card 4 — "Pending":
  - Icon: Clock in amber circle (#FFFBEB bg)
  - Value: "23"
  - Trend: "↓ 5 from yesterday" neutral grey
  - Top border: amber

CHART SECTION (24px top margin, 2-column: 65% + 35%, 16px gap):

LEFT — Revenue Chart Card:
  - White card, border, 12px radius
  - Header (20px padding): "Revenue Overview" Inter 600 16px + "Last 30 days" Text Secondary 13px
  - Chart area (280px height):
    - Area chart with smooth curve
    - Fill: teal gradient from 15% opacity to 0%
    - Line: 2px solid teal
    - X-axis: dates (Inter 400 11px Text Tertiary)
    - Y-axis: currency (Inter 400 11px Text Tertiary)
    - Grid: horizontal only, #F1F5F9
    - Hover tooltip: white card with date + "R 12,450.00" + "47 transactions"

RIGHT — Transaction Status Card:
  - White card, border, 12px radius
  - Header: "Transaction Breakdown" Inter 600 16px
  - Donut/pie chart (200px):
    - Completed: teal (largest slice)
    - Pending: amber
    - Failed: red
    - Cancelled: grey
    - Center: total count "1,247" Inter 700 24px
  - Legend below chart: colored dots + labels + counts, 2-column layout

RECENT TRANSACTIONS TABLE (24px top margin):
  - White card, border, 12px radius, overflow hidden
  - Header row: "Recent Transactions" Inter 600 16px left + "View All →" teal ghost link right, 20px padding
  - Table header: #F8FAFC bg, Inter 500 12px Text Secondary uppercase
    Columns: Reference | Amount | Bank | Status | Date | Actions
  - 5 rows of sample data:
    Row 1: "TXN-2024-001" | "R 1,250.00" (Inter 600) | "FNB" with small bank color dot | Completed badge (green) | "2 min ago" | eye icon button
    Row 2: "TXN-2024-002" | "R 450.00" | "ABSA" | Pending badge (amber) | "15 min ago" | eye
    Row 3: "TXN-2024-003" | "R 3,200.00" | "Standard Bank" | Completed (green) | "1 hour ago" | eye
    Row 4: "TXN-2024-004" | "R 890.00" | "Capitec" | Failed (red) | "2 hours ago" | eye
    Row 5: "TXN-2024-005" | "R 1,750.00" | "Nedbank" | Completed (green) | "3 hours ago" | eye
  - Row hover: #FAFBFC bg
  - Amounts: right-aligned, tabular figures

Vibe: This is the Stripe Dashboard for South Africa. Data-rich without being overwhelming. Every element earns its space. A merchant should open this and immediately feel confident about their payment processing.
```

---

## PROMPT GROUP 5: TRANSACTIONS PAGE (1 screen)

```
Design 1 desktop web screen for "YetoPay" — the TRANSACTIONS PAGE. Full-width data table with powerful filtering. This is where merchants spend most of their time. Think Stripe's payments list page.

LAYOUT: Sidebar + Main content (#FAFBFC bg)

MAIN CONTENT:

HEADER:
- "Transactions" Inter 700 28px
- 4px gap: "View and manage all payment transactions" Inter 400 15px Text Secondary

FILTER BAR (white card, border, 12px radius, 16px padding, flex row):
- Search input: magnifying glass icon + "Search by reference, amount, or bank..." placeholder, 280px width, 40px height
- 12px gap
- Status dropdown: "All Statuses" default, 40px height, chevron-down, options: All, Completed, Pending, Failed, Initiated, Cancelled
- Bank dropdown: "All Banks" default, options: FNB, ABSA, Standard Bank, Nedbank, Capitec, African Bank
- Date range picker: calendar icon + "Last 30 days" display, opens date picker popover
- Spacer
- "Export CSV" Secondary button with download icon
- Active filters: show as removable pills below filter bar (e.g., "Status: Completed ×" teal pill)

TABLE (white card, border, 12px radius, overflow hidden):
- Header: #F8FAFC bg, sticky
  Columns: Checkbox | Reference | Amount | Bank | Status | Customer | Date | Actions
- Bulk action bar (appears when checkboxes selected): "3 selected" + "Export Selected" + "Mark as..." dropdown

- 10 rows of sample data with variety:
  - Mix of statuses (Completed, Pending, Failed, Initiated)
  - Mix of banks (FNB, ABSA, Capitec, Nedbank, Standard Bank)
  - Mix of amounts (R 150.00 to R 15,000.00)
  - Mix of times ("Just now" to "3 days ago")
  - Reference format: "TXN-2024-XXXX"

- Row detail expansion: clicking a row (or eye icon) slides down a detail panel:
  - 2-column layout inside expanded area (#FAFBFC bg, 16px padding, 8px radius inner):
    - Left: Transaction ID, Reference, Amount, Fee, Net, Bank, Account
    - Right: Status timeline (vertical): Created → Initiated → Pending → Completed (with timestamps)
  - "View Full Details" link at bottom-right

PAGINATION (inside card, bottom, 16px padding):
- Left: "Showing 1–10 of 1,247 transactions" Inter 400 14px Text Secondary
- Right: page number buttons (1, 2, 3, ..., 125) with prev/next arrows
- Active page: teal bg white text, 32px square, 6px radius
- Other pages: transparent, Text Body, hover Surface Secondary bg

Vibe: Stripe Payments list. Clean, dense, powerful. A merchant with 10,000 transactions can find any single one in seconds.
```

---

## PROMPT GROUP 6: ANALYTICS PAGE (1 screen)

```
Design 1 desktop web screen for "YetoPay" — the ANALYTICS PAGE. Data visualization heaven. Multiple chart types, KPIs, and insights. Think Stripe Sigma meets a Bloomberg terminal (but pretty).

LAYOUT: Sidebar + Main content

MAIN CONTENT:

HEADER:
- "Analytics" Inter 700 28px
- Date range pills: Today | 7 Days | 30 Days | 90 Days | Custom (active: 30 Days)
- "Download Report" button (right)

KPI ROW (4 small stat cards, compact):
- Revenue + growth %, Transactions + growth %, Success Rate + change, Avg Transaction Value
- Same card style as dashboard but smaller (16px padding)

CHARTS (2-row layout):

ROW 1 (2 columns, 55% + 45%):
- LEFT: "Daily Transaction Volume" — stacked bar chart (completed/failed/pending), 320px height
  - Completed bars: teal, Failed: red, Pending: amber
  - X-axis: last 30 days (show every 5th label)
  - Hover tooltip with breakdown
- RIGHT: "Bank Performance" — horizontal bar chart
  - Bars sorted by transaction count (highest first)
  - Each bar: bank name left, bar in center (teal), count right
  - FNB (456), ABSA (312), Capitec (234), Standard Bank (189), Nedbank (56)
  - Success rate percentage as secondary grey text

ROW 2 (2 columns, 45% + 55%):
- LEFT: "Hourly Heatmap" — 7×24 grid (days × hours)
  - Cell color: white (0 transactions) → light teal → dark teal (high volume)
  - Y-axis: Mon–Sun, X-axis: 00–23
  - Hover: "Tuesday 14:00 — 47 transactions, 92% success"
- RIGHT: "Revenue Trend" — area chart with comparison
  - Primary line: current period (teal solid)
  - Secondary line: previous period (teal dashed, 30% opacity)
  - Fill under current line
  - Legend: "This period: R 245,892" vs "Previous: R 218,450 (+12.6%)"

ROW 3 (full-width):
- "Top Failure Reasons" — white card with simple table
  - Columns: Reason | Count | Percentage | Trend
  - 5 rows: "Timeout", "Insufficient Funds", "Auth Failed", "Bank Offline", "User Cancelled"
  - Percentage shown as mini horizontal bar (red) + number

Vibe: Mercury Bank's analytics + Stripe's Sigma. Beautiful data storytelling. Every chart tells the merchant something actionable.
```

---

## PROMPT GROUP 7: SETTINGS PAGE (1 screen with tabs)

```
Design 1 desktop web screen for "YetoPay" — the SETTINGS PAGE with tabbed navigation. This is where merchants configure their account, API keys, webhooks, and bank accounts. Think Stripe Settings.

LAYOUT: Sidebar + Main content

MAIN CONTENT:

HEADER:
- "Settings" Inter 700 28px
- "Manage your account, integrations, and preferences" Inter 400 15px Text Secondary

TAB BAR (below header, 24px gap):
- Horizontal tabs, underline style:
  - "Profile" | "Security" | "API Keys" | "Company" | "Notifications" | "EFT Configuration"
  - Active tab: teal text, 2px bottom border teal
  - Inactive: Text Secondary, hover Text Primary
  - 32px gap between tabs

ACTIVE TAB: "EFT Configuration" (the most complex and interesting tab to show)

SUBTAB BAR (inside content area, pill style):
- "Bank Accounts" | "Webhooks" | "EFT URLs" | "Monitoring" | "Terms & Conditions"
- Pill style: 36px height, 8px radius, active: white bg + shadow, inactive: transparent

ACTIVE SUBTAB: "Webhooks"

CONTENT:

Section 1 — Webhook Endpoint:
- White card, border, 12px radius, 24px padding
- Header: "Webhook Configuration" Inter 600 17px + "Receive real-time payment notifications" Text Secondary 14px
- 20px gap
- Label: "Webhook URL"
- Input: full-width, pre-filled "https://api.merchant.com/webhooks/yetopay", green checkmark suffix (verified)
- 16px gap
- Label: "Events" 
- Checkbox list (2 columns):
  - ☑ payment.completed, ☑ payment.failed, ☑ payment.pending
  - ☑ transaction.created, ☐ transaction.updated
  - ☑ payment.cancelled
- 16px gap
- "Save Webhook" Primary teal button

Section 2 — Webhook Secret:
- White card, border, 12px radius, 24px padding
- "Webhook Secret" heading
- Secret display: monospace font, masked "whsec_****************************4895" with copy icon + "Reveal" ghost link
- "Regenerate Secret" Danger outlined button (red text/border)
- Warning text: "Regenerating will invalidate the current secret. Update your server before regenerating." Inter 400 13px amber text with warning icon

Section 3 — Recent Deliveries:
- White card with table
- "Recent Webhook Deliveries" heading + "View All" link
- Table: Event | Status | Response | Timestamp | Actions
- 5 rows:
  - "payment.completed" | ✓ 200 (green badge) | "200 OK" | "2 min ago" | "Redeliver" ghost button
  - "payment.failed" | ✓ 200 | "200 OK" | "15 min ago" | "Redeliver"
  - "payment.completed" | ✗ 500 (red badge) | "500 Internal Server Error" | "1 hour ago" | "Redeliver"
  - "transaction.created" | ✓ 200 | "200 OK" | "2 hours ago" | "Redeliver"
  - "payment.completed" | ⏳ Pending (amber) | "Retrying in 30s" | "2 hours ago" | "Cancel"

Vibe: Stripe's webhook settings page. Developer-friendly, clear, trustworthy. A developer should be able to configure webhooks in 30 seconds.
```

---

## PROMPT GROUP 8: PAYMENT PAGE (1 screen — public-facing)

```
Design 1 desktop/mobile web screen for "YetoPay" — the PUBLIC PAYMENT PAGE that customers see when they click a payment link. This must be the most trust-inspiring screen. The customer is about to enter their banking credentials — every pixel must say "this is safe."

LAYOUT: Centered, max-width 480px (mobile-optimized), #FAFBFC background

TOP BAR (56px, white, subtle bottom shadow):
- Left: small YetoPay mark (20px teal) + "YetoPay" Inter 600 15px Text Primary
- Right: lock icon (16px, #64748B) + "Secured by YetoPay" Inter 400 13px Text Tertiary

MERCHANT INFO CARD (white, border, 12px radius, 20px padding):
- Merchant logo (48px square, 8px radius) or initials in teal circle
- 12px gap
- Column:
  - Merchant name: "Acme Store" Inter 600 16px Text Primary
  - Reference: "INV-2024-001" Inter 400 13px Text Secondary

AMOUNT DISPLAY (centered, 32px top margin):
- "R 1,250.00" Inter 700 40px Text Primary, letter-spacing -1px
- 4px gap
- "South African Rand" Inter 400 14px Text Tertiary

BANK SELECTION (24px top margin):
- "Select your bank" Inter 600 16px Text Primary
- 16px gap
- Bank grid (2 columns, 12px gap):
  Each bank tile: white card, 1px border, 12px radius, 16px padding, 64px height
    - Bank color dot (8px) left
    - Bank name Inter 500 15px, centered
    - Hover: border changes to bank's brand color, subtle shadow lift
    - Selected: 2px border in bank color, teal checkmark top-right corner
  
  Banks shown:
  - FNB (dot: #009FDA)
  - ABSA (dot: #AF1F2D)
  - Standard Bank (dot: #003DA5)
  - Nedbank (dot: #009639)
  - Capitec (dot: #003B5C)
  - African Bank (dot: #FF6600)

BANK AUTH FORM (appears after bank selection, slide-in animation):
- White card, 12px radius, 24px padding
- Selected bank header: bank color left bar (4px) + bank name + bank logo
- Form fields:
  - "Username / Account Number" input (40px)
  - "Password / PIN" input (masked, eye toggle)
  - Captcha image (if applicable): rendered image + text input below
- "Continue" button: YetoPay teal, full-width, 44px
- "Cancel" ghost link below

PROCESSING STATE (replaces form):
- Centered content:
  - Animated teal spinner (32px, clean SVG, 1.5s rotation)
  - 16px gap
  - "Processing your payment..." Inter 500 16px Text Primary
  - 8px gap
  - "Please wait — do not close this page" Inter 400 14px Text Tertiary
  - Pulsing teal dot animation below

SUCCESS STATE:
- Green checkmark in 64px circle (#ECFDF5 bg, teal check)
- "Payment Successful" Inter 700 24px Text Primary
- "R 1,250.00 paid to Acme Store" Inter 400 15px Text Secondary
- "Reference: INV-2024-001" Inter 400 14px Text Tertiary
- "Redirecting to merchant..." with countdown "3..."
- "Return to Merchant" teal button if redirect fails

FAILED STATE:
- Red X in 64px circle (Danger Light bg, red X)
- "Payment Failed" Inter 700 24px
- Error reason: "Authentication failed. Please check your credentials." Inter 400 15px Text Secondary
- "Try Again" Primary button + "Cancel Payment" ghost link

TRUST FOOTER (bottom, centered):
- Row: lock icon + "256-bit encryption" • shield icon + "Bank-grade security" • checkmark icon + "Verified by YetoPay"
- All in Inter 400 12px Text Tertiary, 16px between items

Vibe: Like paying through Stripe Checkout or PayFast. Minimal, trust-forward, professional. The customer should feel as safe as if they were on their own bank's website. No clutter, no distractions — just the payment.
```

---

## PROMPT GROUP 9: ADMIN — MERCHANTS LIST (1 screen)

```
Design 1 desktop web screen for "YetoPay" — the ADMIN MERCHANTS PAGE. This is where platform admins manage all registered merchants. Think Stripe Connect's connected accounts list.

LAYOUT: Sidebar + Main content

HEADER:
- "Merchants" Inter 700 28px
- "Manage all registered merchants and their settings" Text Secondary
- Right: "Invite Merchant" Primary teal button with plus icon

STATS ROW (4 compact cards, 16px gap):
- Total Merchants: "156" with building icon
- Active: "142" with green dot + check icon
- Pending KYC: "8" with amber warning icon  
- Inactive: "6" with grey X icon

FILTER + SEARCH:
- Search: "Search merchants by name or email..." (280px)
- Status filter: All | Active | Pending | KYC Rejected | Inactive
- Sort: "Recently Active" dropdown

MERCHANT LIST (white card with table):
- Table columns: Name/Email | Status | KYC | Transactions | Volume | Last Active | Actions
- 8 rows showing variety:
  - "Acme Store" / "billing@acme.com" | Active (green badge) | Verified (green) | "1,247" | "R 245K" | "2 min ago" | View/Edit/Suspend
  - "Cape Town Crafts" / "pay@ctcrafts.co.za" | Active | Verified | "456" | "R 89K" | "1 hour ago" | ...
  - "Fresh Foods SA" / "admin@freshfoods.co.za" | Pending (amber) | Under Review (amber) | "0" | "R 0" | "1 day ago" | View/Approve/Reject
  - Mix of statuses and volumes
- Row click: navigates to merchant detail page
- Name column: bold name + grey email below (2-line cell)

Vibe: Stripe Connect merchant list. Clean, actionable, scalable to hundreds of merchants.
```

---

## PROMPT GROUP 10: PARTNER DASHBOARD (1 screen)

```
Design 1 desktop web screen for "YetoPay" — the PARTNER DASHBOARD. Partners manage multiple merchants under their account. Similar to the main dashboard but focused on merchant portfolio metrics.

LAYOUT: Sidebar (with "Partner" section active) + Main content

HEADER:
- "Partner Dashboard" Inter 700 28px
- "Overview of your merchant portfolio" Text Secondary
- Green live dot

KPI CARDS (4 cards):
- Total Merchants: count + icon
- Active Merchants: count + green indicator
- Monthly Transactions: count + trend
- Monthly Volume: currency + trend

MERCHANT TABLE (white card):
- "Your Merchants" heading
- Columns: Merchant | Status | Transactions | Volume | Commission | Actions
- 5 rows of partner's merchants with commission amounts
- "View All Merchants →" link at bottom

RECENT TRANSACTIONS:
- Same table format as main dashboard
- Shows transactions across all partner merchants
- Extra column: "Merchant" to identify which merchant

Vibe: An agency dashboard — the partner sees across all their merchants at a glance. Clean, portfolio-focused.
```

---

## PROMPT GROUP 11: API DOCUMENTATION PAGE (1 screen)

```
Design 1 desktop web screen for "YetoPay" — the API DOCS PAGE inside the dashboard. Developer-focused, with code examples, endpoint documentation, and a clean layout. Think Stripe API docs.

LAYOUT: Sidebar + Main content (wider, up to 1400px)

HEADER:
- "API Documentation" Inter 700 28px
- "Integrate YetoPay payments into your application" Text Secondary

TAB BAR:
- "Getting Started" | "Endpoints" | "Webhooks" | "SDKs" | "Integration Flows"
- Active: "Getting Started"

CONTENT (2-column: 55% docs + 45% code):

LEFT COLUMN — Documentation:
- Section: "Quick Start"
  - Step 1: "Get your API key" — text + link to API Keys settings
  - Step 2: "Create a payment" — endpoint description
  - Step 3: "Handle the webhook" — webhook setup
  
- Endpoint card:
  - Method badge: "POST" in green pill
  - URL: "/api/payment-links" in monospace
  - Description text
  - Parameters table: name | type | required | description

RIGHT COLUMN — Code Examples:
- Language tabs: "Node.js" | "Python" | "PHP" | "cURL"
- Code block: dark bg (#1E293B), monospace font, syntax highlighted
  - Green strings, blue keywords, grey comments
  - Copy button top-right
  - Line numbers in Text Tertiary

- Response example below:
  - "Response" label
  - JSON code block with the payment link response

Vibe: Stripe API docs energy. Developer-first, clear examples, instant understanding.
```

---

## PROMPT GROUP 12: INVOICES PAGE (1 screen)

```
Design 1 desktop web screen for "YetoPay" — the INVOICES PAGE. Merchants view their fee invoices here. Clean table with status tracking and download actions.

LAYOUT: Sidebar + Main content

HEADER:
- "Invoices" Inter 700 28px + "View and download your fee invoices" Text Secondary

STATS (3 compact cards):
- Outstanding: "R 2,450.00" with amber accent
- Paid This Month: "R 12,890.00" with green accent  
- Total Fees YTD: "R 45,230.00" with teal accent

TABLE (white card):
- Columns: Invoice # | Period | Amount | Status | Due Date | Actions
- Status badges: Paid (green), Pending (amber), Overdue (red), Draft (grey)
- Actions: View PDF icon, Download icon, Send to Email icon
- 8 rows of sample data with mix of statuses
- Amounts in ZAR, right-aligned, tabular figures

Vibe: Clean billing page. Like Vercel's invoices — straightforward, no surprises.
```

---

## PROMPT GROUP 13: TOKENS / SAVED CREDENTIALS (1 screen)

```
Design 1 desktop web screen for "YetoPay" — the TOKENS PAGE. Merchants can see saved customer bank tokens (anonymized) with usage stats. Security-focused design.

LAYOUT: Sidebar + Main content

HEADER:
- "Saved Tokens" Inter 700 28px
- "Manage tokenized customer bank credentials" Text Secondary
- Shield icon accent

STATS (3 cards):
- Active Tokens: count with key icon
- Default Token Set: indicator
- Total Token Uses: count with repeat icon

SEARCH + FILTER:
- Search by masked account number
- Filter by bank, status (active/revoked)

TOKEN LIST (white card):
- Each row: masked account "****5678" | Bank name with color dot | Status badge | Created date | Last used | Usage count | Actions (Revoke, Set Default)
- Default token: highlighted with teal left border + "Default" badge
- Revoked tokens: greyed out with strikethrough

Security notice card at top:
- Shield icon + "Tokens are encrypted with AES-256. Account numbers are never stored in plain text." Inter 400 14px Text Secondary
- Teal-tinted background (#ECFDF5), 12px radius

Vibe: Security-first. Like a password manager's vault — serious, encrypted, trustworthy.
```

---

## PROMPT GROUP 14: EMPTY STATES & LOADING (4 states)

```
Design 4 states for "YetoPay" dashboard components — EMPTY STATES and LOADING STATES. These small moments define polish. Think Mercury Bank's empty states.

STATE 1 — EMPTY TRANSACTIONS:
- Centered in the table card area
- Icon: ArrowLeftRight (48px, Text Tertiary at 25% opacity)
- 16px gap: "No transactions yet" Inter 600 17px Text Secondary
- 8px gap: "When customers pay through your payment links, transactions will appear here." Inter 400 14px Text Tertiary, max-width 360px, centered
- 24px gap: "Create Payment Link" Primary teal button (40px)

STATE 2 — EMPTY ANALYTICS:
- Icon: BarChart3 (48px, 25% opacity)
- "Not enough data" heading
- "Analytics require at least 7 days of transaction data. Check back soon." description
- No CTA button

STATE 3 — TABLE LOADING SKELETON:
- Same white card container
- 5 skeleton rows:
  - Each row: pulse-animated rectangles matching column widths
  - Rectangles: Surface Secondary bg (#F1F5F9), 6px radius, 16px height
  - Reference: 120px wide | Amount: 80px | Bank: 60px | Status: 72px pill | Date: 90px
  - Staggered animation: each row starts 50ms after previous
  - Pulse: opacity 0.5 → 1.0 → 0.5, 1.5s loop

STATE 4 — DASHBOARD LOADING:
- KPI cards: 4 skeleton cards with pulse rectangles (icon circle + 2 text lines)
- Chart area: large skeleton rectangle with faint chart-line shape
- Table: skeleton rows (same as State 3)
- Everything pulse-animates in sync

Vibe: Polished loading states signal quality. No white blank screens. Mercury Bank and Linear nail this.
```

---

## DESIGN SYSTEM QUICK REFERENCE

### Color Tokens
```
--yp-primary: #0A6E5C
--yp-primary-dark: #085A4B
--yp-primary-light: #ECFDF5
--yp-primary-bright: #10B981
--yp-accent: #F59E0B
--yp-accent-light: #FFFBEB
--yp-danger: #EF4444
--yp-danger-light: #FEF2F2
--yp-info: #3B82F6
--yp-info-light: #EFF6FF
--yp-bg: #FAFBFC
--yp-surface: #FFFFFF
--yp-surface-secondary: #F8FAFC
--yp-divider: #E2E8F0
--yp-text-primary: #0F172A
--yp-text-body: #334155
--yp-text-secondary: #64748B
--yp-text-tertiary: #94A3B8
--yp-nav-bg: #0F172A
--yp-nav-active: #10B981
```

### Component Sizes
```
Button height: 36px (compact), 40px (standard), 44px (large), 52px (hero)
Input height: 40px (standard), 44px (large)
Nav item: 44px height
Card radius: 12px
Button/Input radius: 8px
Badge radius: 6px
Card padding: 20-24px
Page padding: 32px
Sidebar: 260px (expanded), 72px (collapsed)
```

### Status Color Map
```
Completed: teal (#0A6E5C bg light, text dark)
Pending: amber (#F59E0B)
Failed: red (#EF4444)
Initiated: blue (#3B82F6)
Cancelled: grey (#64748B)
```
