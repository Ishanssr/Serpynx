# ⚡ Serpynx — Smart Freelance Marketplace

A niche freelance marketplace for developers. Clients post tasks, freelancers bid, and a **smart scoring engine** ranks applicants — not just by lowest price, but by skills, price, and ratings.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite, React Router, Axios |
| Backend | NestJS, Passport JWT, class-validator |
| ORM | Prisma |
| Database | PostgreSQL |
| Matching | Rule-based scoring engine |

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL database (local or [Supabase](https://supabase.com))

### 1. Backend Setup

```bash
cd backend
cp .env .env.local   # Edit DATABASE_URL with your Postgres connection string
npm install
npx prisma migrate dev --name init
npm run start:dev
```

Backend runs at: `http://localhost:3000`

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at: `http://localhost:5173`

## API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register user |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/profile` | Get profile (auth) |

### Tasks
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tasks` | List tasks |
| GET | `/api/tasks/:id` | Task detail + bids |
| POST | `/api/tasks` | Create task (client) |
| PATCH | `/api/tasks/:id` | Update task (client) |
| DELETE | `/api/tasks/:id` | Delete task (client) |

### Bids
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/tasks/:id/bids` | Place bid (freelancer) |
| GET | `/api/tasks/:id/bids` | List bids (ranked) |
| POST | `/api/bids/:id/accept` | Accept bid (client) |
| GET | `/api/my-bids` | My bids (freelancer) |

### Submissions & Reviews
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/tasks/:id/submit` | Submit work |
| POST | `/api/tasks/:id/review` | Leave review |

## Smart Matching

Bids are ranked by a weighted score:
```
Score = 0.4 × SkillMatch + 0.3 × PriceScore + 0.3 × RatingScore
```

## Project Structure

```
Serpynx/
├── backend/
│   ├── src/
│   │   ├── auth/         # JWT auth, register, login
│   │   ├── tasks/        # Task CRUD
│   │   ├── bids/         # Bid placement, acceptance
│   │   ├── matching/     # Smart scoring engine
│   │   ├── submissions/  # Work submission
│   │   ├── reviews/      # Rating system
│   │   ├── prisma/       # Database service
│   │   └── common/       # Guards, decorators
│   └── prisma/
│       └── schema.prisma
├── frontend/
│   └── src/
│       ├── api/          # Axios client
│       ├── context/      # Auth context
│       ├── components/   # Layout, UI components
│       └── pages/        # All page components
└── README.md
```

## License

MIT
