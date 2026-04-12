# Distributed E-Commerce Platform

A microservices-based distributed e-commerce system built with TypeScript, demonstrating event-driven architecture, distributed locking, rate limiting, and observability patterns.

## Architecture Overview

```
                         +-----------------+
                         |    Frontend     |
                         | React + Vite    |
                         +--------+--------+
                                  |
                    +-------------+-------------+
                    |                           |
           +--------v--------+        +--------v--------+
           |  Auth Service   |        |  Order Service   |
           |   (Port 3001)   |        |   (Port 3000)    |
           +--------+--------+        +---+----------+---+
                    |                     |          |
                PostgreSQL + Redis     Kafka     RabbitMQ
                                        |          |
                              +---------v--+  +----v-----------+
                              | Inventory  |  | Notification   |
                              | Service    |  | Service        |
                              | (Port 3002)|  | (Port 3003)    |
                              +------------+  +----------------+

        Monitoring: Prometheus (9090) + Grafana (3004)
```

## Services

### Auth Service (Port 3001)
Handles user registration, login, JWT token management, and session revocation.

- **Stack**: Express.js, Prisma, PostgreSQL, Redis
- **Endpoints**:
  - `POST /auth/register` - Create a new user account
  - `POST /auth/login` - Authenticate and receive JWT tokens
  - `POST /auth/refresh` - Refresh an expired access token
  - `POST /auth/logout` - Revoke a refresh token
- **Security**: Rate limited to 5 attempts per 60 seconds per IP+email

### Order Service (Port 3000)
Processes orders with distributed locking and publishes events to downstream services.

- **Stack**: Express.js, Prisma, PostgreSQL, Redis, Kafka, RabbitMQ
- **Endpoints**:
  - `POST /orders` - Create an order (authenticated, rate limited)
  - `GET /orders` - List all orders
  - `GET /stock/:productId` - Get current stock level
  - `POST /stock/:productId` - Set stock level (for seeding/testing)
- **Security**: Rate limited to 10 requests per 60 seconds per user

**Order creation flow:**
1. Check idempotency key in Redis
2. Acquire distributed lock on the product
3. Verify and atomically decrement stock
4. Persist the order event to PostgreSQL
5. Publish `OrderCreated` event to Kafka
6. Publish notification task to RabbitMQ
7. Release lock

### Inventory Service (Port 3002)
Consumes order events from Kafka and maintains an inventory event log.

- **Stack**: Express.js, Prisma, PostgreSQL, Kafka
- **Pattern**: Event consumer (Kafka consumer group: `inventory-group`)

### Notification Service (Port 3003)
Consumes notification tasks from RabbitMQ with retry logic and dead-letter queue handling.

- **Stack**: Express.js, RabbitMQ
- **Pattern**: Task consumer with exponential backoff (5s, 10s, 20s)
- **Retry**: Max 3 attempts before routing to Dead Letter Queue (`notification-dlq`)

### Frontend
React SPA for user authentication and order management.

- **Stack**: React 19, TypeScript, Vite, React Router, Axios
- **Features**: Login/Register, order creation, order history (auto-refresh), stock management panel
- **Auth**: JWT tokens stored in localStorage with automatic refresh on 401

## Tech Stack

| Component     | Technology                         |
|---------------|------------------------------------|
| Language      | TypeScript (Node.js)               |
| Framework     | Express.js v5                      |
| ORM           | Prisma                             |
| Database      | PostgreSQL 16                      |
| Cache         | Redis 7.2                          |
| Event Stream  | Apache Kafka (Confluent 7.5)       |
| Message Queue | RabbitMQ 3.12                      |
| Frontend      | React 19 + Vite                    |
| Monitoring    | Prometheus + Grafana               |
| Containers    | Docker Compose                     |

## Resilience Patterns

- **Distributed Locking** - Redis-based locks with TTL to prevent concurrent order processing on the same product
- **Idempotency** - Order results cached in Redis for 24 hours to prevent duplicate processing
- **Rate Limiting** - Redis-backed sliding window counters on auth and order endpoints
- **Dead Letter Queue** - Failed notifications routed to DLQ after 3 retries with exponential backoff
- **Health Checks** - Docker health checks on Kafka, RabbitMQ, and PostgreSQL with dependency ordering

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
| Prometheus           | http://localhost:9090         |
| Grafana              | http://localhost:3004         |
| RabbitMQ Management  | http://localhost:15672        |

## Project Structure

```
ecommerce-distributed/
├── infrastructure/
│   ├── docker-compose.yml          # Full stack orchestration
│   ├── docker-compose.yml.example  # Template without secrets
│   ├── .env.example                # Environment variable template
│   ├── postgres-init/              # Database initialization scripts
│   └── prometheus/
│       └── prometheus.yml          # Scrape configuration
├── services/
│   ├── auth-service/               # Authentication & authorization
│   │   ├── src/
│   │   ├── prisma/                 # Database schema & migrations
│   │   ├── Dockerfile
│   │   └── package.json
│   ├── order-service/              # Order processing & stock management
│   │   ├── src/
│   │   ├── prisma/
│   │   ├── Dockerfile
│   │   └── package.json
│   ├── inventory-service/          # Inventory event consumer
│   │   ├── src/
│   │   ├── prisma/
│   │   ├── Dockerfile
│   │   └── package.json
│   ├── notification-service/       # Notification consumer with retry
│   │   ├── src/
│   │   ├── Dockerfile
│   │   └── package.json
│   └── frontend/                   # React SPA
│       ├── src/
│       └── package.json
└── .gitignore
```

## Message Flow

### Order Event (Kafka)
```json
{
  "event": "OrderCreated",
  "orderId": "order:user@email.com:1713000000000",
  "userId": "user@email.com",
  "productId": "product-1",
  "quantity": 5,
  "timestamp": "2025-03-13T12:34:56.789Z"
}
```

### Notification Task (RabbitMQ)
```json
{
  "type": "ORDER_CONFIRMATION",
  "userId": "user@email.com",
  "orderId": "order:user@email.com:1713000000000",
  "productId": "product-1",
  "quantity": 5,
  "timestamp": "2025-03-13T12:34:56.789Z"
}
```

## License

This project is for educational and demonstration purposes.
