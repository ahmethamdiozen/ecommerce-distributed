[🇹🇷 Türkçe](README.md)

# Distributed E-Commerce Platform

A microservices-based distributed e-commerce system built with TypeScript, demonstrating event-driven architecture, distributed locking, rate limiting, and observability patterns.

## Architecture

```
                         ┌──────────────────┐
                         │    Frontend      │
                         │  React + Nginx   │
                         └────────┬─────────┘
                                  │
              ┌───────────────────┼───────────────────┐
              │                   │                   │
     ┌────────▼─────────┐ ┌───────▼───────┐ ┌─────────▼─────────┐
     │  Auth Service    │ │ Order Service │ │ Inventory Service │
     │   (Port 3001)    │ │  (Port 3000)  │ │   (Port 3002)     │
     └──┬──────────┬────┘ └──┬─────┬────┬─┘ └──┬────────┬───────┘
        │          │         │     │    │      │        │  
     Postgres    Redis    Redis  Kafka RMQ  Postgres  Redis
                                  │     │              │
                                  ▼     ▼         Kafka│
                           ┌──────────────┐            │
                           │ Notification │◄───────────┘
                           │   Service    │
                           └──────────────┘

            Monitoring: Prometheus (9090) + Grafana (3004)
```

## Services

| Service | Port | Description |
|---|---|---|
| Auth Service | 3001 | JWT auth, registration, session revocation |
| Order Service | 3000 | Distributed locking, Kafka events, idempotency |
| Inventory Service | 3002 | Product catalog, MinIO image storage, Kafka consumer |
| Notification Service | 3003 | RabbitMQ consumer with retry + dead-letter queue |
| Frontend | 5173 | React SPA — storefront, cart, checkout, admin panel |

## Tech Stack

| Component | Technology |
|---|---|
| Language | TypeScript (Node.js) |
| Framework | Express.js v5 |
| ORM | Prisma |
| Database | PostgreSQL 16 |
| Cache | Redis 7.2 |
| Event Stream | Apache Kafka |
| Message Queue | RabbitMQ 3.12 |
| Object Storage | MinIO (S3-compatible) |
| Frontend | React 19 + Vite |
| Monitoring | Prometheus + Grafana |
| CI | GitHub Actions |

## Resilience Patterns

- **Distributed Locking** — Redis locks with TTL prevent concurrent order processing on the same product
- **Deadlock Prevention** — items sorted by productId before lock acquisition
- **Idempotency** — order results cached in Redis for 24 hours
- **Rate Limiting** — Redis-backed sliding window on auth and order endpoints
- **Dead Letter Queue** — failed notifications routed to DLQ after 3 retries with exponential backoff

## Getting Started

```bash
git clone https://github.com/ahmethamdiozen/ecommerce-distributed.git
cd ecommerce-distributed
cp infrastructure/.env.example infrastructure/.env  # fill in secrets
cd infrastructure && docker compose up --build

# Frontend (separate terminal)
cd services/frontend && npm install && npm run dev
```

### Service URLs

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Order Service | http://localhost:3000 |
| Auth Service | http://localhost:3001 |
| Inventory Service | http://localhost:3002 |
| Prometheus | http://localhost:9090 |
| Grafana | http://localhost:3004 |
| RabbitMQ | http://localhost:15672 |
| MinIO Console | http://localhost:9001 |

## CI Pipeline

GitHub Actions on every push to `main`:
1. Type-check all backend services (`tsc --noEmit`)
2. ESLint + Vite build for frontend
3. Docker build for all 5 Dockerfiles
4. Validate production compose file
