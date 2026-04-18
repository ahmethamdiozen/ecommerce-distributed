# Distributed E-Commerce Platform

A microservices-based distributed e-commerce system built with TypeScript, demonstrating event-driven architecture, distributed locking, rate limiting, and observability patterns.

## Architecture Overview

```
                         ┌─────────────────┐
                         │    Frontend      │
                         │  React + Nginx   │
                         └────────┬─────────┘
                                  │
              ┌───────────────────┼───────────────────┐
              │                   │                   │
     ┌────────▼────────┐ ┌───────▼───────┐ ┌─────────▼────────┐
     │  Auth Service    │ │ Order Service │ │ Inventory Service │
     │   (Port 3001)    │ │  (Port 3000)  │ │   (Port 3002)     │
     └──┬──────────┬────┘ └──┬─────┬──┬──┘ └──┬───┬────┬───┬──┘
        │          │         │     │  │        │   │    │   │
     Postgres    Redis    Redis  Kafka RMQ  Postgres Redis MinIO
                                  │     │              │
                                  │     │         Kafka│
                                  ▼     ▼              │
                           ┌──────────────┐            │
                           │ Notification │◄───────────┘
                           │   Service    │
                           │  (Port 3003) │
                           └──────────────┘

            Monitoring: Prometheus (9090) + Grafana (3004)
```

## Services

### Auth Service (Port 3001)
Handles user registration, login, JWT token management, session revocation, and role-based access control.

- **Stack**: Express.js, Prisma, PostgreSQL, Redis
- **Endpoints**:
  - `POST /auth/register` - Create a new user account (auto-assigns admin role based on `ADMIN_EMAILS`)
  - `POST /auth/login` - Authenticate and receive JWT tokens
  - `POST /auth/refresh` - Refresh an expired access token
  - `POST /auth/logout` - Revoke a refresh token
- **Security**: Rate limited to 5 attempts per 60 seconds per IP+email
- **Admin Assignment**: Emails listed in `ADMIN_EMAILS` env var automatically receive `role: "admin"` on registration

### Order Service (Port 3000)
Processes orders with distributed locking and publishes events to downstream services. Supports multi-item orders.

- **Stack**: Express.js, Prisma, PostgreSQL, Redis, Kafka, RabbitMQ
- **Endpoints**:
  - `POST /orders` - Create an order with `items[]` array (authenticated, rate limited)
  - `GET /orders` - List all orders
  - `GET /stock/:productId` - Get current stock level (read-only)
- **Security**: Rate limited to 10 requests per 60 seconds per user

**Order creation flow:**
1. Check idempotency key in Redis
2. Sort items by productId (prevents deadlocks)
3. Acquire distributed locks on all products
4. Verify stock levels for all items
5. Atomically decrement stock for all items
6. Publish `OrderCreated` event to Kafka (single event with items array)
7. Publish notification task to RabbitMQ
8. Release all locks

### Inventory Service (Port 3002)
Manages the product catalog (CRUD with image upload), consumes order events from Kafka, and keeps Redis stock in sync.

- **Stack**: Express.js, Prisma, PostgreSQL, Redis, Kafka, MinIO
- **Endpoints**:
  - `GET /products` - List products (public, supports `?tag=` and `?search=` filters)
  - `GET /products/:id` - Get product detail (public)
  - `POST /products` - Create product with image upload (admin only, multipart)
  - `PUT /products/:id` - Update product (admin only, multipart)
  - `DELETE /products/:id` - Delete product (admin only)
- **Image Storage**: MinIO (S3-compatible), auto-creates bucket with public-read policy on startup
- **Stock Sync**: On product create/update, writes stock to both PostgreSQL and Redis

### Notification Service (Port 3003)
Consumes notification tasks from RabbitMQ with retry logic and dead-letter queue handling.

- **Stack**: Express.js, RabbitMQ
- **Pattern**: Task consumer with exponential backoff (5s, 10s, 20s)
- **Retry**: Max 3 attempts before routing to Dead Letter Queue (`notification-dlq`)

### Frontend
React SPA with storefront, cart, checkout, and admin panel.

- **Stack**: React 19, TypeScript, Vite, React Router, Axios
- **Pages**:
  - `/` - Storefront with product grid, tag filtering, and search
  - `/product/:id` - Product detail page
  - `/cart` - Shopping cart (persisted in localStorage)
  - `/checkout` - Order placement (authenticated)
  - `/admin` - Product management panel (admin only)
  - `/login` - Login and registration
- **Auth**: JWT tokens stored in localStorage with automatic refresh on 401

## Tech Stack

| Component       | Technology                         |
|-----------------|------------------------------------|
| Language        | TypeScript (Node.js)               |
| Framework       | Express.js v5                      |
| ORM             | Prisma                             |
| Database        | PostgreSQL 16                      |
| Cache           | Redis 7.2                          |
| Event Stream    | Apache Kafka                       |
| Message Queue   | RabbitMQ 3.12                      |
| Object Storage  | MinIO (S3-compatible)              |
| Frontend        | React 19 + Vite                    |
| Monitoring      | Prometheus + Grafana               |
| CI              | GitHub Actions                     |
| Deployment      | Docker Compose + Coolify           |

## Resilience Patterns

- **Distributed Locking** - Redis-based locks with TTL to prevent concurrent order processing on the same product
- **Deadlock Prevention** - Items sorted by productId before lock acquisition ensures consistent ordering
- **Idempotency** - Order results cached in Redis for 24 hours to prevent duplicate processing
- **Rate Limiting** - Redis-backed sliding window counters on auth and order endpoints
- **Dead Letter Queue** - Failed notifications routed to DLQ after 3 retries with exponential backoff
- **Health Checks** - Docker health checks on Kafka, RabbitMQ, MinIO, and PostgreSQL with dependency ordering

## Monitoring & Observability

All services expose Prometheus metrics at `/metrics`:

| Service       | Metric                        | Type      | Description                      |
|---------------|-------------------------------|-----------|----------------------------------|
| Auth          | `auth_requests_total`         | Counter   | Auth actions by type and status  |
| Order         | `orders_total`                | Counter   | Orders by status                 |
| Order         | `order_duration_seconds`      | Histogram | Order processing latency         |
| Order         | `redis_locks_total`           | Counter   | Lock acquisition attempts        |
| Inventory     | `inventory_events_total`      | Counter   | Processed events by status       |
| Notification  | `notifications_total`         | Counter   | Notifications by status          |

Grafana is available at `http://localhost:3004` with Prometheus as the pre-configured data source.

## Getting Started

### Prerequisites

- Docker and Docker Compose
- Node.js 24+ (for local development)

### Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ecommerce-distributed
   ```

2. **Configure environment variables**
   ```bash
   cp infrastructure/.env.example infrastructure/.env
   ```
   Edit `infrastructure/.env` with your own secrets:
   ```env
   POSTGRES_USER=admin
   POSTGRES_PASSWORD=your_password_here
   RABBITMQ_USER=admin
   RABBITMQ_PASS=your_password_here
   JWT_ACCESS_SECRET=your_access_secret_here
   JWT_REFRESH_SECRET=your_refresh_secret_here
   GRAFANA_PASSWORD=your_grafana_password_here
   ADMIN_EMAILS=admin@example.com
   MINIO_ROOT_USER=minioadmin
   MINIO_ROOT_PASSWORD=minioadmin
   MINIO_BUCKET=products
   MINIO_PUBLIC_URL=http://localhost:9000
   ```

3. **Start all services**
   ```bash
   cd infrastructure
   docker compose up --build
   ```

4. **Start the frontend** (in a separate terminal)
   ```bash
   cd services/frontend
   npm install
   npm run dev
   ```

### Service URLs

| Service              | URL                          |
|----------------------|------------------------------|
| Frontend             | http://localhost:5173         |
| Order Service API    | http://localhost:3000         |
| Auth Service API     | http://localhost:3001         |
| Inventory Service    | http://localhost:3002         |
| Notification Service | http://localhost:3003         |
| MinIO Console        | http://localhost:9001         |
| MinIO API            | http://localhost:9000         |
| Prometheus           | http://localhost:9090         |
| Grafana              | http://localhost:3004         |
| RabbitMQ Management  | http://localhost:15672        |

## Project Structure

```
ecommerce-distributed/
├── .github/
│   └── workflows/
│       └── ci.yml                  # GitHub Actions CI pipeline
├── infrastructure/
│   ├── docker-compose.yml          # Local development stack
│   ├── docker-compose.prod.yaml    # Production (Coolify) stack
│   ├── .env.example                # Local env template
│   ├── .env.prod.example           # Production env template
│   ├── postgres-init/              # Database initialization scripts
│   └── prometheus/
│       └── prometheus.yml          # Scrape configuration
├── services/
│   ├── auth-service/               # Authentication & authorization
│   │   ├── src/
│   │   │   ├── routes/auth.ts
│   │   │   ├── services/authService.ts, tokenService.ts
│   │   │   └── middleware/rateLimiter.ts
│   │   └── prisma/                 # User, RefreshToken models
│   ├── order-service/              # Order processing
│   │   ├── src/
│   │   │   ├── routes/order.ts, stock.ts
│   │   │   ├── services/orderService.ts
│   │   │   └── middleware/auth.ts, rateLimiter.ts
│   │   └── prisma/                 # OrderEvent model
│   ├── inventory-service/          # Product catalog & event consumer
│   │   ├── src/
│   │   │   ├── routes/products.ts
│   │   │   ├── services/productService.ts
│   │   │   ├── consumers/orderConsumer.ts
│   │   │   ├── middleware/auth.ts
│   │   │   └── config/minio.ts, redis.ts
│   │   └── prisma/                 # Product, OrderEvent models
│   ├── notification-service/       # Notification consumer with retry
│   │   └── src/consumers/notificationConsumer.ts
│   └── frontend/                   # React SPA
│       ├── src/
│       │   ├── pages/              # Storefront, ProductDetail, Cart, Checkout, AdminPanel, LoginPage
│       │   ├── components/         # Header, PrivateRoute, AdminRoute
│       │   ├── context/            # AuthContext, CartContext
│       │   ├── hooks/              # useAuth, useCart
│       │   └── config/             # api.ts, axios.ts
│       └── nginx.conf              # Reverse proxy config for production
└── .gitignore
```

## Message Flow

### Order Event (Kafka)
```json
{
  "event": "OrderCreated",
  "orderId": "order:user@email.com:1713000000000",
  "userId": "user@email.com",
  "items": [
    { "productId": "clx1abc", "quantity": 2 },
    { "productId": "clx2def", "quantity": 1 }
  ],
  "timestamp": "2025-03-13T12:34:56.789Z"
}
```

### Notification Task (RabbitMQ)
```json
{
  "type": "ORDER_CONFIRMATION",
  "userId": "user@email.com",
  "orderId": "order:user@email.com:1713000000000",
  "items": [
    { "productId": "clx1abc", "quantity": 2 },
    { "productId": "clx2def", "quantity": 1 }
  ],
  "timestamp": "2025-03-13T12:34:56.789Z"
}
```

## CI Pipeline

GitHub Actions runs on every push and PR to `main`:

1. **Backend** - `npm ci` → `prisma generate` → `tsc --noEmit` (type check) for each service
2. **Frontend** - `npm ci` → `eslint` → `vite build`
3. **Docker Build** - Builds all 5 Dockerfiles (with BuildKit cache)
4. **Compose Validate** - Validates production compose file syntax

## Deployment (Coolify)

The production compose (`docker-compose.prod.yaml`) is designed for Coolify:

- PostgreSQL and Redis are expected as separate Coolify services (shared across stacks)
- Kafka, RabbitMQ, and MinIO run inside this stack
- Frontend nginx proxies `/auth`, `/orders`, `/stock`, `/products` to backend services
- MinIO needs a public subdomain (e.g. `minio.yourdomain`) for serving product images

## License

This project is for educational and demonstration purposes.
