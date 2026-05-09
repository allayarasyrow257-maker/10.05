# 🍽️ QR Restaurant Ordering System

A premium, production-ready QR-based restaurant ordering system with realtime features, gift system, and a stunning admin dashboard.

![Tech Stack](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js)
![Tech Stack](https://img.shields.io/badge/Express.js-4-green?style=flat-square&logo=express)
![Tech Stack](https://img.shields.io/badge/PostgreSQL-16-blue?style=flat-square&logo=postgresql)
![Tech Stack](https://img.shields.io/badge/Socket.io-4-white?style=flat-square&logo=socket.io)
![Tech Stack](https://img.shields.io/badge/Prisma-5-purple?style=flat-square&logo=prisma)
![Tech Stack](https://img.shields.io/badge/TailwindCSS-3-blue?style=flat-square&logo=tailwindcss)

---

## ✨ Features

### Customer Side (QR Menu)
- **QR Code Entry** — Each table has a unique QR code (`/menu?table=1`)
- **Multi-Language** — English, Turkish, Arabic support with RTL
- **Smart Category Navigation** — Sticky tabs that auto-update on scroll
- **Smooth Cart Experience** — Add-to-cart animations, floating cart bar, quantity controls
- **Call Waiter** — One-tap button sends realtime notification to admin
- **Order Tracking** — Realtime status updates (pending → preparing → ready → delivered)

### Gift System
- Send food/drinks to another table as a gift
- 3-step flow: Select product → Choose table → Confirm & send
- Receiver gets a realtime popup to accept or decline
- Accepted gifts appear in cart with a special "Gift" badge
- Gift cost is charged to the sender

### Admin Panel
- **Dashboard** — KPI cards (daily/weekly/monthly revenue, total orders) + interactive charts (line, bar, area)
- **Order Management** — Live order feed with status controls, filtering, and realtime updates
- **Table Management** — Visual grid showing table status, active orders, and waiter call alerts with animations
- **Menu Management** — Full CRUD for categories and products with multi-language support
- **Realtime Notifications** — Instant alerts for new orders, waiter calls, and gifts

### UI/UX
- Dark modern design with glassmorphism (blur + transparency)
- Framer Motion animations throughout
- Fully responsive (mobile, tablet, desktop)
- Loading skeletons, hover effects, smooth transitions
- Sidebar navigation with active state indicators

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 14 (App Router), React 18, TypeScript |
| **Styling** | TailwindCSS, Glassmorphism, Custom CSS |
| **Animations** | Framer Motion |
| **Charts** | Recharts |
| **State** | Zustand |
| **Backend** | Node.js, Express.js |
| **Database** | PostgreSQL + Prisma ORM |
| **Realtime** | Socket.io |
| **Auth** | JWT (jsonwebtoken + bcryptjs) |
| **Validation** | express-validator |
| **File Upload** | Multer |

---

## 📁 Project Structure

```
menu/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma        # Database models & relations
│   │   └── seed.js              # Sample data (admin, tables, categories, products)
│   ├── src/
│   │   ├── index.js             # Express + Socket.io server entry
│   │   ├── middleware/
│   │   │   └── auth.js          # JWT authentication middleware
│   │   ├── routes/
│   │   │   ├── auth.js          # Login / Register / Verify
│   │   │   ├── menu.js          # Categories, Products, Combos CRUD
│   │   │   ├── orders.js        # Order creation & status management
│   │   │   ├── tables.js        # Table CRUD
│   │   │   ├── gifts.js         # Gift send / accept / reject
│   │   │   ├── analytics.js     # Dashboard KPIs & revenue charts
│   │   │   ├── admin.js         # Admin stats
│   │   │   └── upload.js        # Image upload (Multer)
│   │   └── socket/
│   │       └── handler.js       # Socket.io event handlers
│   ├── uploads/                 # Uploaded images
│   ├── .env                     # Environment variables
│   └── package.json
│
├── frontend/
│   └── src/
│       ├── app/
│       │   ├── layout.tsx               # Root layout (dark theme, toast provider)
│       │   ├── page.tsx                 # Landing page
│       │   ├── globals.css              # Tailwind + glassmorphism utilities
│       │   ├── menu/
│       │   │   └── page.tsx             # Customer QR menu page
│       │   └── admin/
│       │       ├── layout.tsx           # Admin layout (sidebar + topbar)
│       │       ├── page.tsx             # Admin login page
│       │       ├── dashboard/page.tsx   # KPIs + Charts
│       │       ├── orders/page.tsx      # Order management
│       │       ├── tables/page.tsx      # Table grid
│       │       └── menu/page.tsx        # Menu CRUD
│       ├── components/
│       │   ├── ui/                      # Button, Card, Modal, Badge, Skeleton
│       │   ├── menu/                    # LanguageSelector, MenuContent, ProductCard, CategoryTabs
│       │   ├── cart/                    # CartBar, CartModal
│       │   ├── gift/                    # GiftButton, GiftModal, GiftNotification
│       │   └── admin/                   # Sidebar, Topbar
│       ├── store/
│       │   ├── cart-store.ts            # Cart state (Zustand)
│       │   └── admin-store.ts           # Auth state (Zustand)
│       ├── lib/
│       │   ├── api.ts                   # API client (fetch wrapper)
│       │   ├── socket.ts               # Socket.io client singleton
│       │   └── utils.ts                # cn(), formatCurrency(), getLocalizedName()
│       └── hooks/
│           └── use-socket.ts            # Socket.io React hook
│
├── start.sh                     # Start both servers
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+
- **PostgreSQL** 14+
- **npm** or **yarn**

### 1. Clone & Install

```bash
cd menu

# Install backend dependencies
cd backend && npm install

# Install frontend dependencies
cd ../frontend && npm install
```

### 2. Setup Database

```bash
# Create database
createdb qr_menu

# Update connection string if needed
# Edit backend/.env → DATABASE_URL

# Run migrations
cd backend
npx prisma migrate dev --name init

# Seed sample data
node prisma/seed.js
```

### 3. Start Development Servers

```bash
# Option 1: Use the start script
./start.sh

# Option 2: Start manually (in separate terminals)

# Terminal 1 - Backend
cd backend && npm run dev

# Terminal 2 - Frontend
cd frontend && npm run dev
```

### 4. Open in Browser

| URL | Description |
|-----|-------------|
| `http://localhost:3000` | Landing Page |
| `http://localhost:3000/menu?table=1` | Customer Menu (Table 1) |
| `http://localhost:3000/admin` | Admin Login |
| `http://localhost:3000/admin/dashboard` | Admin Dashboard |
| `http://localhost:3001/api/health` | API Health Check |

---

## 🔐 Default Credentials

| Field | Value |
|-------|-------|
| Email | `admin@restaurant.com` |
| Password | `admin123` |

> Change these in production by updating the seed file or registering a new admin via the API.

---

## 🗄️ Database Schema

```
tables          ─┐
  id, number,    │
  name, status   │
                 ├── orders ── order_items ── products ── categories
gifts            │
  sender_table ──┘
  receiver_table─┘
  product ───────────────────────────────── products

admin (standalone)
combos ── combo_items ── products
```

### Models

| Model | Description |
|-------|-------------|
| `Table` | Restaurant tables with status tracking |
| `Category` | Menu categories (multi-language JSON) |
| `Product` | Menu items with price and availability |
| `Order` | Customer orders with status flow |
| `OrderItem` | Individual items in an order |
| `Gift` | Gift transactions between tables |
| `Combo` | Bundle deals with discount pricing |
| `Admin` | Admin users with JWT auth |

---

## ⚡ Realtime Events (Socket.io)

| Event | Direction | Description |
|-------|-----------|-------------|
| `join-table` | Client → Server | Join a table's room |
| `join-admin` | Client → Server | Join admin notification room |
| `call-waiter` | Client → Server → Admin | Waiter call alert |
| `order-received` | Server → Admin | New order notification |
| `order-status-updated` | Server → Table + Admin | Order status change |
| `gift-received` | Server → Receiver Table | Incoming gift popup |
| `gift-response` | Server → Sender + Admin | Gift accepted/rejected |

---

## 📊 API Endpoints

### Public

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/menu/categories` | Get all categories with products |
| GET | `/api/menu/products` | Get all products |
| GET | `/api/menu/combos` | Get all combos |
| GET | `/api/tables` | Get all tables |
| GET | `/api/tables/:id` | Get single table |
| POST | `/api/orders` | Create new order |
| GET | `/api/orders/table/:id` | Get orders for a table |
| POST | `/api/gifts` | Send a gift |
| PUT | `/api/gifts/:id/respond` | Accept/reject gift |
| GET | `/api/gifts/table/:id` | Get gifts for a table |

### Admin (JWT Required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Admin login |
| POST | `/api/auth/register` | Register admin |
| GET | `/api/auth/verify` | Verify token |
| GET | `/api/orders` | Get all orders (paginated) |
| PUT | `/api/orders/:id/status` | Update order status |
| POST | `/api/menu/categories` | Create category |
| PUT | `/api/menu/categories/:id` | Update category |
| DELETE | `/api/menu/categories/:id` | Delete category |
| POST | `/api/menu/products` | Create product |
| PUT | `/api/menu/products/:id` | Update product |
| DELETE | `/api/menu/products/:id` | Delete product |
| GET | `/api/analytics/dashboard` | Dashboard KPIs |
| GET | `/api/analytics/revenue/daily` | Hourly revenue chart |
| GET | `/api/analytics/revenue/weekly` | Daily revenue chart |
| GET | `/api/analytics/revenue/monthly` | Monthly revenue chart |
| POST | `/api/upload` | Upload image |

---

## 🌍 Multi-Language Support

All categories and products store names as JSON:

```json
{
  "en": "Grilled Salmon",
  "tr": "Izgara Somon",
  "ar": "سلمون مشوي"
}
```

The customer selects their language on entry, and all menu items render in the chosen language with proper RTL support for Arabic.

---

## 🎨 Design System

- **Theme:** Dark mode with purple accent (`hsl(263, 70%, 58%)`)
- **Cards:** Glassmorphism (`bg-white/5 backdrop-blur-xl border border-white/10`)
- **Borders:** `rounded-2xl` everywhere
- **Animations:** Framer Motion for page transitions, layout animations, hover/tap effects
- **Charts:** Recharts with custom gradient fills and dark-themed tooltips

---

## 📝 Environment Variables

### Backend (`backend/.env`)

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/qr_menu"
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
PORT=3001
FRONTEND_URL="http://localhost:3000"
```

### Frontend (`frontend/.env.local`)

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
```

---

## 📄 License

MIT
# qrcode-menu
