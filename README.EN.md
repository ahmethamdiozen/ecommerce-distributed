[🇹🇷 Türkçe](README.md)

# Distributed E-Commerce Platform

A microservices-based e-commerce system written in TypeScript. Services run independently and communicate through Kafka and RabbitMQ events. The system includes patterns common in production environments: distributed locking, idempotency, rate limiting, retry with dead-letter queues, and Prometheus-based observability.

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

### Auth Service — Port 3001

Handles user registration, login, token refresh, and session revocation. Authentication uses two tokens: an access token valid for 15 minutes and a refresh token valid for 7 days. Refresh tokens are persisted in PostgreSQL, which makes it possible to invalidate a specific session by deleting its record from the database.

Passwords are hashed with bcrypt (10 salt rounds). Users who register with an email address listed in the `ADMIN_EMAILS` environment variable are automatically assigned the `admin` role.

**Endpoints:**

| Method | Path | Description |
|---|---|---|
| POST | `/auth/register` | Creates a new user; checks `ADMIN_EMAILS` for admin role assignment |
| POST | `/auth/login` | Validates credentials; returns access + refresh tokens |
| POST | `/auth/refresh` | Issues a new access token from a valid refresh token |
| POST | `/auth/logout` | Deletes the refresh token from the database |
| GET | `/health` | Service health check |
| GET | `/metrics` | Prometheus metrics |

**Rate Limiting:** 5 attempts per 60 seconds per IP + email pair. Implemented as a Redis-backed sliding window counter.

---

### Order Service — Port 3000

Handles order creation and listing. When an order is created, it publishes an `order-created` event to Kafka and an `ORDER_CONFIRMATION` message to RabbitMQ.

Stock deductions are protected by Redis locks so that only one order can process a given product at a time. When an order contains multiple products, items are sorted by `productId` before acquiring locks; this ensures all concurrent orders request locks in the same sequence, preventing circular deadlocks.

**Endpoints:**

| Method | Path | Description |
|---|---|---|
| POST | `/orders` | Creates an order `[{productId, quantity}, ...]` |
| GET | `/orders` | Lists the authenticated user's orders |
| GET | `/stock/:productId` | Returns current stock level for a product |
| GET | `/health` | Service health check |
| GET | `/metrics` | Prometheus metrics |

**Rate Limiting:** 10 requests per 60 seconds per `userId` (from JWT). Responses include `X-RateLimit-Limit`, `X-RateLimit-Remaining`, and `X-RateLimit-Reset` headers.

**Distributed Locking:** A Redis lock is created with key `lock:product:{productId}` and a 5-second TTL. The lock value is the `orderId`, so only the order that acquired the lock can release it — a stale check prevents accidentally releasing someone else's lock.

**Idempotency:** Before processing, `idempotency:{orderId}` is queried in Redis. If the key exists, the order is not re-executed and an "already processed" response is returned. Successful orders are stored under this key for 24 hours.

---

### Inventory Service — Port 3002

Manages the product catalog and consumes order events from Kafka. Product images are uploaded to MinIO; the resulting public URL is stored in the `imageUrl` field.

Admins can create, update, and delete products. Stock is maintained in both PostgreSQL and Redis; the `stock:{productId}` key in Redis is also read by the order service.

The Kafka consumer listens to `order-created` events and writes them to the `order_events` table in PostgreSQL. This is not the order record itself — it's an audit trail of which orders affected which products.

**Endpoints:**

| Method | Path | Description |
|---|---|---|
| GET | `/products` | Lists all products; supports `?tag=` and `?search=` filters |
| GET | `/products/:id` | Returns a single product |
| POST | `/products` | Creates a product (admin, accepts image via `multipart/form-data`) |
| PUT | `/products/:id` | Updates a product (admin) |
| DELETE | `/products/:id` | Deletes a product (admin) |
| GET | `/health` | Service health check |
| GET | `/metrics` | Prometheus metrics |

---

### Notification Service — Port 3003

Consumes messages from the `notification-queue` in RabbitMQ and simulates email sending. The simulation is intentionally set to a 40% failure rate so the retry and DLQ mechanism can be exercised.

**Retry Flow:**

```
notification-queue (main queue)
  ↓  on failure
notification-retry (TTL-based wait queue: 5s → 10s → 20s)
  ↓  after TTL expires
notification-queue (requeued for retry)
  ↓  still failing after 3 attempts
notification-dlq (dead letter queue)
```

The `x-retry-count` header in each message tracks how many times it has been attempted. After 3 failures, the message is routed to the DLQ and logged. `channel.prefetch(1)` ensures the consumer processes one message at a time, avoiding unexpected concurrency issues.

---

### Frontend — Port 5173

A single-page application built with React 19 + Vite. Runs on Nginx in production.

**Pages:**

| Page | Route | Access |
|---|---|---|
| Login / Register | `/login` | Public |
| Storefront | `/` | Public |
| Product Detail | `/product/:id` | Public |
| Cart | `/cart` | Public |
| Checkout | `/checkout` | Authenticated users |
| Admin Panel | `/admin` | Admin role only |

An Axios interceptor automatically attaches the JWT bearer token to every request. On a 401 response, it triggers the refresh token flow; if that also fails, localStorage is cleared and the user is redirected to `/login`. Cart contents and tokens are persisted in localStorage.

---

## Tech Stack

| Component | Technology |
|---|---|
| Language | TypeScript (Node.js) |
| Framework | Express.js v5 |
| ORM | Prisma |
| Database | PostgreSQL 16 |
| Cache | Redis 7.2 |
| Event Streaming | Apache Kafka (Confluent 7.5) |
| Message Queue | RabbitMQ 3.12 |
| Object Storage | MinIO (S3-compatible) |
| Frontend | React 19 + Vite |
| Monitoring | Prometheus + Grafana |
| CI | GitHub Actions |

---

## Event Flow

```
User places an order
  → Order Service: acquires Redis lock, deducts stock
  → Kafka: publishes order-created event
  → RabbitMQ: publishes ORDER_CONFIRMATION message
        ↓                              ↓
  Inventory Service              Notification Service
  (writes audit record)          (sends email; on failure,
                                  retries → DLQ)
```

---

## Resilience Patterns

**Distributed Locking**
Locks are acquired atomically with `SET key value NX PX 5000`. The lock value is the order's ID; before releasing, the current value is checked to ensure only the lock holder can release it. For orders with multiple items, products are sorted by `productId` before any lock is taken. This guarantees all concurrent orders request locks in the same order, preventing circular deadlocks.

**Idempotency**
Before processing, `idempotency:{orderId}` is queried. If it exists, the order is not re-processed. Successful orders are marked for 24 hours; duplicate requests during this window do not touch the database.

**Rate Limiting**
Auth service uses an IP + email key; order service uses `userId` from the JWT. Both use a Redis sliding window counter. Exceeding the limit returns 429 with a `Retry-After` duration.

**Dead Letter Queue**
The notification service retries failed messages up to 3 times with exponential backoff (5s, 10s, 20s). Messages that still fail after the third attempt are moved to the DLQ and logged for manual inspection.

---

## Monitoring

All services expose metrics in Prometheus format at `/metrics`. Prometheus scrapes all endpoints every 15 seconds.

**Key Metrics:**

| Service | Metric | Description |
|---|---|---|
| Auth | `auth_requests_total{action, status}` | Register/login/refresh/logout counts by outcome |
| Order | `orders_total{status}` | Order counts: success / failed / duplicate |
| Order | `order_duration_seconds` | Processing time histogram |
| Order | `redis_locks_total{result}` | Lock acquisition success/failure rate |
| Inventory | `product_operations_total{operation, status}` | CRUD operation counts |
| Notification | `notifications_total{status}` | Notification counts: success / failed / dead |

MinIO cluster metrics are also collected from `/minio/v2/metrics/cluster`.

---

## Getting Started

```bash
git clone https://github.com/ahmethamdiozen/ecommerce-distributed.git
cd ecommerce-distributed
cp infrastructure/.env.example infrastructure/.env
# Edit .env and fill in secrets
cd infrastructure && docker compose up --build

# Frontend (separate terminal)
cd services/frontend && npm install && npm run dev
```

Docker Compose starts Kafka, Zookeeper, Redis, RabbitMQ, PostgreSQL, MinIO, Prometheus, and Grafana automatically. Services wait for their dependencies to pass health checks before starting.

### Environment Variables

Copy from `infrastructure/.env.example` and fill in the following:

```env
POSTGRES_PASSWORD=          # PostgreSQL password
RABBITMQ_USER=              # RabbitMQ username
RABBITMQ_PASS=              # RabbitMQ password
JWT_ACCESS_SECRET=          # Access token signing key
JWT_REFRESH_SECRET=         # Refresh token signing key
GRAFANA_PASSWORD=           # Grafana admin password
ADMIN_EMAILS=               # Comma-separated list of admin emails
MINIO_ROOT_USER=            # MinIO root username
MINIO_ROOT_PASSWORD=        # MinIO root password
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
| RabbitMQ Management | http://localhost:15672 |
| MinIO Console | http://localhost:9001 |

---

## CI Pipeline

GitHub Actions runs four jobs on every push to `main`:

1. **Type Check** — `tsc --noEmit` runs in parallel for all 4 backend services. `prisma generate` is run first if a schema.prisma file exists.
2. **Frontend** — ESLint check followed by `vite build`.
3. **Docker Build** — Once type check and frontend build pass, all 5 Dockerfiles are built with layer caching. Nothing is pushed to a registry.
4. **Compose Validation** — Verifies the production compose file has valid syntax.

---
