# YETOPAYEFT - EFT Payment Management System

A modern, secure, and fast EFT (Electronic Funds Transfer) payment management system built with Next.js 15, Better Auth, and Drizzle ORM.

## 🚀 Features

### 🔐 Security First
- **Token-Based Payment Links** - Cryptographically secure (32-byte) tokens with SHA-256 hashing
- **Built-in Expiration** - Default 24 hours, configurable up to 7 days
- **Rate Limiting** - Maximum 10 access attempts per token
- **IP & User Agent Tracking** - Complete audit trail
- **Single-Use Tokens** - Optional one-time use capability
- **Revocable Links** - Merchants can cancel payment links anytime
- **Better Auth Integration** - No middleware needed, Vercel-friendly

### 💳 Payment Features
- Instant EFT payments from all major South African banks
- Secure payment page with 3-step flow
- Real-time transaction tracking
- Webhook notifications
- Customer email & name capture
- Custom reference/description

### 📊 Merchant Dashboard
- Real-time statistics (revenue, transactions, completion rate)
- Recent transaction history
- Create payment links with beautiful UI
- Transaction management
- Dark mode support

### 🎨 Beautiful UI/UX
- Modern gradient backgrounds
- Responsive design (mobile-first)
- Dark mode throughout
- Smooth animations & transitions
- Professional banking theme
- shadcn/ui components

## 🛠️ Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript 5.x
- **Database:** PostgreSQL (Neon) + Drizzle ORM
- **Authentication:** Better Auth (no middleware)
- **Styling:** Tailwind CSS 4
- **UI Components:** shadcn/ui + Radix UI
- **Icons:** Lucide React
- **Validation:** Zod
- **Forms:** React Hook Form

## 📁 Project Structure

```
yetopayeft/
├── app/
│   ├── page.tsx                              # Landing page
│   ├── auth/
│   │   ├── login/page.tsx                    # Sign in
│   │   └── register/page.tsx                 # Sign up
│   ├── dashboard/
│   │   ├── page.tsx                          # Merchant dashboard
│   │   └── payment-links/create/page.tsx    # Create payment link
│   ├── pay/[token]/page.tsx                  # Token-based payment page
│   └── api/
│       ├── auth/[...all]/route.ts            # Better Auth routes
│       └── payment-links/route.ts            # Payment link API
├── lib/
│   ├── db/
│   │   ├── schema/                           # Database schemas
│   │   │   ├── users.ts                      # Users & auth tables
│   │   │   ├── eft.ts                        # EFT & payment tokens
│   │   │   ├── team.ts                       # Team & API keys
│   │   │   └── system.ts                     # Logs & notifications
│   │   └── index.ts                          # DB connection
│   ├── security/
│   │   └── payment-token.ts                  # Token utilities
│   ├── auth.ts                               # Better Auth config
│   ├── auth-server.ts                        # Server-side auth helpers
│   ├── auth-client.ts                        # Client-side auth hooks
│   ├── constants.ts                          # Permissions & config
│   └── utils.ts                              # Utility functions
├── components/
│   ├── ui/                                   # shadcn/ui components
│   └── payment/
│       └── PaymentInterface.tsx              # Payment flow component
└── drizzle.config.ts                         # Drizzle configuration
```

## 🗄️ Database Schema

**17 Tables:**
- `user`, `session`, `account`, `verification` (Better Auth)
- `eft_banks`, `eft_transactions`, `payment_tokens` (NEW!)
- `eft_bank_accounts`, `eft_settings`
- `merchant_team_members`, `api_keys`
- `webhook_configurations`, `webhook_deliveries`
- `system_logs`, `audit_logs`, `notifications`, `user_services`

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- PostgreSQL database (Neon recommended)
- npm/yarn/pnpm

### Installation

1. **Clone the repository**
```bash
cd yetopayeft
```

2. **Install dependencies**
```bash
npm install
```

3. **Setup environment variables**
Create `.env.local`:
```env
DATABASE_URL=your_neon_database_url
DIRECT_URL=your_neon_direct_url
BETTER_AUTH_SECRET=your_secret_here
BETTER_AUTH_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
PAYMENT_TOKEN_SECRET=your_token_secret
```

4. **Generate database schema**
```bash
npx drizzle-kit generate
npx drizzle-kit push
```

5. **Run development server**
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## 🔑 Key Features Explained

### Token-Based Payment Links

Instead of exposing database IDs in URLs:
```
❌ OLD: /payment?general=550e8400-e29b-41d4-a716-446655440000
✅ NEW: /pay/abc123xyz789...securetoken...
```

**Security Benefits:**
1. Non-predictable (crypto.randomBytes)
2. Hashed storage (SHA-256)
3. Built-in expiration
4. Rate limiting
5. IP tracking
6. Revocable
7. Optional single-use

### No Middleware Approach

Better Auth handles authentication internally, so no custom middleware is needed. This approach:
- ✅ Works perfectly with Vercel
- ✅ Simpler deployment
- ✅ No middleware conflicts
- ✅ Better Auth manages sessions

**Server Components:**
```typescript
import { requireAuth } from '@/lib/auth-server';

export default async function DashboardPage() {
  const session = await requireAuth(); // Auto-redirects if not authenticated
  // ...
}
```

**Client Components:**
```typescript
'use client';
import { useSession } from '@/lib/auth-client';

export default function ProfileButton() {
  const { data: session } = useSession();
  // ...
}
```

## 📚 API Documentation

### Create Payment Link
```typescript
POST /api/payment-links

Body:
{
  "amount": 100.00,
  "reference": "Invoice #12345",
  "customerEmail": "customer@example.com",
  "customerName": "John Doe",
  "expiresInHours": 24
}

Response:
{
  "success": true,
  "data": {
    "transactionId": "uuid",
    "paymentUrl": "https://app.com/pay/token",
    "reference": "Invoice #12345",
    "amount": 100.00,
    "expiresAt": "2024-11-17T12:00:00Z",
    "status": "not_started"
  }
}
```

### List Payment Links
```typescript
GET /api/payment-links?limit=50&offset=0

Response:
{
  "success": true,
  "data": [...transactions],
  "pagination": { "limit": 50, "offset": 0 }
}
```

## 🎨 Design System

### Colors
- **Primary:** Blue (600-700)
- **Secondary:** Cyan (600-700)
- **Accent:** Teal (600-700)
- **Success:** Green (600-700)
- **Error:** Red (600-700)
- **Warning:** Orange (600-700)

### Typography
- **Headings:** Bold, slate-900/white
- **Body:** Regular, slate-600/slate-400
- **Small:** slate-500/slate-500

## 🔒 Security Features

- ✅ 256-bit encryption
- ✅ SHA-256 token hashing
- ✅ CSRF protection (Better Auth)
- ✅ XSS prevention
- ✅ SQL injection prevention (Drizzle ORM)
- ✅ Rate limiting
- ✅ IP tracking
- ✅ Complete audit logs
- ✅ MFA support (database ready)

## 📝 Next Steps

See `PROGRESS.md` for detailed implementation status.

**Optional Enhancements:**
1. Admin dashboard
2. Transaction details page
3. Webhook management UI
4. Team management
5. API keys management
6. EFT service integration (localhost:8080)

## 📄 License

Proprietary - All rights reserved

## 🤝 Support

For support, email support@yetopayeft.com

---

Built with ❤️ for South African merchants
