# EA SaaS Platform

Full-stack Expert Advisor licensing and management SaaS platform.

## Stack

- **Frontend:** Next.js 14+ (App Router) + React + Tailwind CSS + shadcn/ui
- **Backend:** Next.js API Routes + Prisma ORM
- **Database:** MySQL 8 / MariaDB 10.11+
- **Cache/Queue:** Redis 7+
- **Payments:** Stripe
- **Containerization:** Docker + Docker Compose

## Quick Start

```bash
# Start infrastructure
docker compose -f docker/docker-compose.yml up -d mysql redis

# Install dependencies
npm install

# Run database migrations
npx prisma migrate dev

# Start development server
npm run dev

# Run tests
npm run test
```

## Documentation

- [PRD (Product Requirements)](docs/PRD.md)
- [Architecture](docs/ARCHITECTURE.md)
- [User Stories](docs/USER_STORIES.md)

## Project Structure

```
src/
  web/          # Next.js web application (customer + admin UI)
  api/          # EA Backend Contract API
  shared/       # Shared types, constants, validators
prisma/         # Database schema and migrations
ea-contract/    # MT4/MT5 EA code (MQL4/MQL5)
docker/         # Docker configuration
tests/          # Test files
scripts/        # Utility scripts
```

## Environment Setup

Copy `.env.example` to `.env` for Prisma and other local CLI commands. If you also want Next.js-specific local overrides, add `.env.local` as needed.

## License

Proprietary — All rights reserved.
