# DaaCoo E-Commerce Platform

A complete, full-stack e-commerce website for **DaaCoo** – an AI conversation device that enables natural human-AI interactions.

## Features

### Customer Store
- **Product Browsing** – Browse all DaaCoo versions (Basic, Pro, Family) with filtering and sorting
- **Product Detail** – Hero image with typing animation, specs, sample conversation demo
- **Shopping Cart** – Persistent cart with quantity controls, tax & shipping calculations
- **User Accounts** – Registration, login, order history (guest checkout also supported)
- **Checkout & Payment** – Multiple payment methods:
  - **Stripe** – Integrated with Stripe Checkout (test card: `4242 4242 4242 4242`)
  - **Alipay** – Simulated sandbox mode
  - **WeChat Pay** – Simulated sandbox mode  
  - **UnionPay** – Simulated sandbox mode

### Admin Portal
- **Dashboard** – Sales charts, top products, order stats, visitor metrics
- **Product Management** – Full CRUD for DaaCoo versions
- **Order Management** – View, filter, update status, cancel, export to CSV
- **Payment Logs** – View all payment attempts with status

## Tech Stack

- **Frontend:** Next.js 14 (App Router), React, TypeScript, Tailwind CSS, shadcn/ui
- **Backend:** Next.js API Routes, Prisma ORM
- **Database:** SQLite (easy to switch to PostgreSQL)
- **Payments:** Stripe Checkout + simulated gateways
- **Auth:** JWT-based authentication
- **Charts:** Recharts

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment Variables

Create a `.env.local` file (or edit the existing one):

```env
# Database
DATABASE_URL="file:./dev.db"

# JWT Secret (change in production)
JWT_SECRET="your-super-secret-key"
NEXTAUTH_SECRET="your-nextauth-secret"
NEXTAUTH_URL="http://localhost:3000"

# Stripe (test keys - replace with live keys in production)
STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# App URL
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 3. Product Image

Place the product image (`Cyber Float Studio.png`) at:

```
public/images/daacoo-main.png
```

This image is used as the main product photo for all DaaCoo versions.

### 4. Initialize Database

```bash
npm run db:migrate
```

### 5. Seed Database

```bash
sqlite3 dev.db < prisma/seed.sql
```

This creates:
- Default admin: `admin@daacoo.com` / `Admin123!`
- Demo user: `user@example.com` / `User123!`
- 3 DaaCoo products (Basic $199, Pro $349, Family $499)
- 3 demo orders with payments

### 6. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

The admin portal is accessible at [http://localhost:3000/admin](http://localhost:3000/admin).

## Default Accounts

| Role  | Email               | Password   |
|-------|---------------------|------------|
| Admin | admin@daacoo.com    | Admin123!  |
| User  | user@example.com    | User123!   |

## Payment Testing

### Stripe (card)
The checkout page now embeds Stripe Elements for card payments. Use Stripe test card: `4242 4242 4242 4242`, any future date, any CVC.

### Alipay / WeChat Pay / UnionPay
These methods redirect to Stripe Checkout with the appropriate payment method type enabled. Make sure the corresponding payment methods are activated in your Stripe Dashboard.

### Webhook forwarding (local development)
Stripe webhooks are required to mark orders as paid. In development, forward Stripe events to your local server:

1. Install the Stripe CLI and run:

```bash
stripe login
npm run stripe:webhook
```

2. Copy the webhook signing secret printed in the terminal into your `.env.local`:

```env
STRIPE_WEBHOOK_SECRET=whsec_...
```

3. The CLI forwards `checkout.session.completed` and `payment_intent.succeeded` events to `/api/stripe/webhook`.

In production, configure a webhook endpoint in the Stripe Dashboard pointing to `https://<your-domain>/api/stripe/webhook`.

## API Testing

### Register
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!","name":"Test User"}'
```

### Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@daacoo.com","password":"Admin123!"}'
```

### Get Products
```bash
curl http://localhost:3000/api/products
```

### Get Cart
```bash
curl http://localhost:3000/api/cart
```

### Create Order (Guest)
```bash
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "items":[{"productId":"daacoo-basic-001","name":"DaaCoo Basic","price":199,"quantity":1,"imageUrl":"/images/daacoo-main.png"}],
    "shippingAddress":"123 Test St",
    "fullName":"Test User",
    "phone":"+1234567890",
    "email":"test@example.com",
    "paymentMethod":"stripe"
  }'
```

## Project Structure

```
my-app/
├── prisma/
│   ├── schema.prisma       # Database schema
│   ├── seed.sql            # Seed data
│   └── migrations/         # Database migrations
├── public/
│   └── images/
│       └── daacoo-main.png # Product image (place here)
├── src/
│   ├── app/                # Next.js App Router pages
│   │   ├── api/            # API routes
│   │   ├── page.tsx        # Home page
│   │   ├── products/       # Product listing & detail
│   │   ├── cart/           # Shopping cart
│   │   ├── checkout/       # Checkout flow
│   │   ├── login/          # Login page
│   │   ├── register/       # Register page
│   │   ├── account/        # User account
│   │   └── admin/          # Admin portal
│   ├── components/
│   │   ├── ui/             # shadcn/ui components
│   │   ├── auth-provider.tsx
│   │   ├── cart-provider.tsx
│   │   └── navbar.tsx
│   ├── lib/
│   │   ├── prisma.ts       # Prisma client
│   │   ├── auth.ts         # Auth utilities
│   │   └── stripe.ts       # Stripe client
│   └── middleware.ts       # Route protection
├── .env.local              # Environment variables
├── next.config.js
├── package.json
└── README.md
```

## Switching to Production

1. **Database:** Update `prisma/schema.prisma` to use PostgreSQL and update `DATABASE_URL`
2. **Stripe:** Replace test keys with live keys in `.env.local`
3. **JWT Secret:** Use a strong, random secret
4. **Alipay/WeChat/UnionPay:** Replace simulated endpoints with real API integrations
5. **Build:** Run `npm run build` and deploy to Vercel or your preferred platform

## License

MIT
