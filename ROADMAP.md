# Ecommerce Distributed — Deployment Roadmap

**Target subdomain**: `ecommerce.ahmethamdiozen.site` (+ `minio.ahmethamdiozen.site` for product images, optionally `grafana.ecommerce.ahmethamdiozen.site` for read-only metrics)
**Deploy order in pipeline**: 5th (last — largest pre-deploy fix list)
**Status**: feature-complete demo with observability; several security/correctness gaps block public deploy.

---

## North Star

The hero project in the portfolio. Demonstrates event-driven microservices with **Kafka + RabbitMQ + Redis distributed locks + MinIO + Prometheus/Grafana**, on top of a working storefront + admin panel. When "done", it must be something a recruiter can sign up to, place an order, and see admin-side state update — with no broken paths, no way to see other users' data, and public Grafana showing live metrics.

---

## Phase 0 — Deploy Blockers

**Rule**: none of these can ship as-is. These are security, correctness, or operability issues that would be embarrassing if a recruiter found them.

### Security

- [ ] **Remove JWT fallback secret** — `order-service/src/middleware/auth.ts:4`, `inventory-service/src/middleware/auth.ts:4`. Fallback `"access_secret_dev"` must not exist in prod. Require env on boot: `if (!process.env.JWT_ACCESS_SECRET) throw new Error("JWT_ACCESS_SECRET required")`. Apply to all 3 services.
- [ ] **Fix privacy leak in `GET /orders`** — `order-service/src/routes/order.ts:8-11` + `orderService.ts:109-112`. Currently returns every user's orders to any authenticated user. Filter by `req.user.email` (or switch to admin-only with separate `GET /orders/mine` for customers).
- [ ] **Remove hardcoded RabbitMQ fallback credentials** — `order-service/src/config/rabbitmq.ts:7` and `notification-service/src/consumers/notificationConsumer.ts:58` use `amqp://admin:admin123@...` as fallback. Require env.
- [ ] **Env var audit** — scan all services for `process.env.X || "default"` patterns. In prod, unset env should fail fast, not silently degrade.

### Operability

- [ ] **Add `/health` and `/ready` endpoints** to every service (`auth-service`, `order-service`, `inventory-service`, `notification-service`). `/health` returns 200 if process alive. `/ready` verifies downstream deps (Redis ping, Kafka producer ready, Postgres select 1, RabbitMQ channel open). Coolify uses these for restart/rollback.
- [ ] **Postgres init for 3 databases** — verify `infrastructure/postgres-init/` creates `auth_db`, `order_db`, `inventory_db`. Coolify Postgres resource must be configured with these + corresponding `AUTH_DATABASE_URL`, `ORDER_DATABASE_URL`, `INVENTORY_DATABASE_URL`.
- [ ] **Coolify env template** — create `infrastructure/.env.coolify.example` with all required vars (no defaults). Document which are Coolify secrets vs plain env.

### Deploy wiring

- [ ] **Frontend nginx config audit** — check `services/frontend/nginx.conf` proxies `/auth`, `/orders`, `/stock`, `/products` to correct service DNS names inside the Docker network. Without this, frontend can't reach backends in prod.
- [ ] **MinIO public subdomain** — configure `minio.ahmethamdiozen.site` in Coolify pointing at MinIO's `:9000`. Update `MINIO_PUBLIC_URL` env accordingly. Bucket `products` must have public-read policy (already in code — verify it runs on prod boot).
- [ ] **Frontend build args for Vite URLs** — `docker-compose.prod.yaml:161-163` sets `VITE_*_URL=""` (relative). Confirm all axios calls use relative paths through nginx, not absolute URLs.
- [ ] **docker-compose.prod.yaml networking** — verify services can resolve each other by name (`kafka`, `rabbitmq`, `minio`, `auth-service`, etc.) and that external Postgres/Redis from Coolify are on the same network.

### Demo data

- [ ] **Seed script for demo products** — 8-12 products across tags (clothing, electronics, books) with real-looking images uploaded to MinIO.
- [ ] **Demo admin account** — `admin@demo.com / demo1234` in `ADMIN_EMAILS`. Demo customer accounts too.
- [ ] **Public README demo credentials section** — explicit test accounts + "please don't break the demo" disclaimer.

---

## Phase 1 — Post-Deploy MVP Gaps

**Rule**: deploy-blocking issues are fixed, now fill the real feature gaps that user explicitly called out (admin/customer split, storefront view, lock/event audit).

### Admin/customer split

- [ ] **Admin panel — add Order management tab** — `frontend/src/pages/AdminPanel.tsx` currently only has products. Add `<OrdersTab />` listing all orders (admin-only endpoint), showing status, user, items, total. Update status (PENDING → PROCESSING → SHIPPED → DELIVERED) — new field in OrderEvent model or a new Order model.
- [ ] **Customer order history page** — add `frontend/src/pages/MyOrders.tsx` calling `GET /orders` (after Phase 0 fix). Link from Header when logged in.
- [ ] **Two distinct headers / layouts** — admin users see admin-focused nav; customers see storefront nav. Today `Header.tsx:23` conditionally shows an "Admin" link but there's no visual role split. Consider `AdminLayout` vs `CustomerLayout` wrappers.
- [ ] **Admin-only: DLQ inspection page** — read `notification-dlq` and display failed notifications so admin can retry/ack manually. Uses the management API via `notification-service`.

### Stock correctness & events

- [ ] **Decrement Postgres `Product.stock` when processing OrderCreated** — `inventory-service/src/consumers/orderConsumer.ts` currently only writes to `OrderEvent` table. Wrap in `prisma.$transaction`: create OrderEvent + decrement Product.stock. This fixes long-term drift between Postgres and Redis stock.
- [ ] **Redis stock rehydration on service boot** — `inventory-service` should on startup read all products from Postgres and `SET stock:<id> <value>` to rehydrate Redis after cold start or volume loss. Add to `inventory-service/src/index.ts`.
- [ ] **Emit `ProductDeleted` Kafka event** — `inventory-service/src/services/productService.ts:56-64` silently deletes. Order service has no way to clear cached references. Add producer in inventory-service, consumer in order-service that removes `stock:<id>` from Redis.
- [ ] **Storefront should read live stock** — `frontend/src/pages/Storefront.tsx:71` uses `p.stock` from Postgres (via inventory GET /products). Either:
  - (A) Call `GET /stock/:id` per product on storefront load (N+1 — not great), or
  - (B) Make inventory's `GET /products` enrich each product with Redis stock before returning.
  - Recommend (B).

### Idempotency & reliability

- [ ] **Fix idempotency** — `order-service/src/services/orderService.ts:33+40`. Current `orderId` is always unique (Date.now()), so the idempotency check never matches. Accept `Idempotency-Key` header from client and use that as the Redis key. Frontend Checkout should generate a UUID per user-initiated checkout and send it.
- [ ] **Kafka consumer — don't swallow DB errors** — `inventory-service/src/consumers/orderConsumer.ts:40-42`. Current catch logs and lets KafkaJS commit the offset → message lost. Rethrow so offset isn't committed; let KafkaJS retry. Also add a dead-letter topic `order-created-dlq` for poison-pill messages after N retries.
- [ ] **Notification consumer — use `nack` instead of ack+publish** — `notification-service/src/consumers/notificationConsumer.ts:96-104`. Main queue is already configured with `x-dead-letter-routing-key: notification-dlq`. Simplify to `channel.nack(msg, false, false)` — RabbitMQ routes to DLQ automatically. Removes duplicated DLQ publish logic.
- [ ] **RabbitMQ auto-reconnect** — `order-service/src/config/rabbitmq.ts`. `channel` is a module-level `let`; if connection drops, every subsequent `publishToQueue` throws uncaught. Wire `connection.on('close')` + `connection.on('error')` to reconnect with exponential backoff.
- [ ] **JSON.parse guard in consumers** — `orderConsumer.ts:20` and `notificationConsumer.ts:81` both parse without try/catch. Malformed payload crashes consumer. Wrap in try/catch + DLQ route.

### Order model

- [ ] **Proper Order + OrderItem schema** — `inventory-service/prisma` creates one `OrderEvent` row per item (`orderConsumer.ts:28-37`). A 3-item order = 3 rows = customer sees "3 orders". Migrate to `Order` (one row) + `OrderItem` (N rows) with a relation. Update `GET /orders` shape accordingly.

---

## Phase 2 — Polish / Portfolio Readiness

### Security hardening

- [ ] **Refresh token in httpOnly cookie** — `frontend/src/context/AuthContext.tsx:36` stores in localStorage (XSS-reachable). Move to httpOnly, SameSite=Lax cookie set by `auth-service`. Access token can stay in memory.
- [ ] **Opaque external order IDs** — order IDs exposed as `order:<email>:<timestamp>` to users leak PII (email) and internal structure. Generate a UUID `externalId`, keep `orderKey` internal for idempotency/locks. Update Checkout success page to show `externalId`.
- [ ] **Rate-limit headers (X-RateLimit-*)** — surface remaining quota to frontend so it can show "slow down" UI.

### Observability for demo

- [ ] **Public read-only Grafana dashboard** — add Grafana + Prometheus to `docker-compose.prod.yaml` (currently absent from prod). Create an anonymous read-only viewer user. Expose at `grafana.ecommerce.ahmethamdiozen.site`. Pre-build 2-3 panels: orders/min, lock acquisition success rate, notification retry counts.
- [ ] **Log structured JSON** — replace `console.log` with `pino` or `winston` JSON output across all services. Coolify/Loki-friendly.
- [ ] **Sentry (or equivalent)** for error tracking on frontend + services.

### Portfolio presentation

- [ ] **Screenshots in README** — storefront, product detail, cart, checkout, admin panel. 5-6 shots, clean demo data.
- [ ] **90-second architecture video** — screen recording: place order → show Kafka consumer log → show RabbitMQ retry → show Grafana metric tick up. Upload to YouTube unlisted, link in README.
- [ ] **Portfolio card on ahmethamdiozen.site** — new project entry in `portfolio/`:
  - Title: "Distributed E-Commerce Platform"
  - Tech: Kafka, RabbitMQ, Redis, MinIO, Microservices, Prometheus
  - Links: live demo (`ecommerce.ahmethamdiozen.site`), GitHub, architecture doc
  - TR + EN copy (portfolio is i18n)
- [ ] **Architecture decision record (ADR) in repo** — `docs/adr/001-distributed-locking-via-redis.md` documenting why Redlock-style and its known limitations (Kleppmann's critique). This is a strong interview signal.

### CI/CD

- [ ] **Auto-deploy on merge to main** — Coolify webhook on push to `main` rebuilds frontend + each backend image. Keep existing GitHub Actions `ci.yml` for type-check + tests as pre-merge gate.
- [ ] **Add at least one integration test per service** — hit `/health` + one real endpoint. Use testcontainers for Redis/Kafka if feasible.

---

## Phase 3 — Stretch

- [ ] **Transactional Outbox pattern** — today, stock decrement + Kafka publish + Rabbit publish are sequential and non-atomic (`orderService.ts:73-99`). Partial failure = inconsistent state. Write event to a Postgres `outbox` table in the same transaction as stock change; a separate worker publishes to Kafka/RabbitMQ with at-least-once semantics. This is a strong resume bullet.
- [ ] **Replace simulated email** — `notification-service/src/consumers/notificationConsumer.ts:109-118` is 40% random failure. Wire to Resend / SendGrid / AWS SES. Keep 40% failure as an env-flagged `DEMO_MODE` for testing DLQ.
- [ ] **Atomic Redis stock check-and-decrement** — use a Lua script to combine GET + check + DECRBY in one atomic call. Eliminates the 2-step race window even when locks expire mid-processing.
- [ ] **Horizontal scaling test** — run 2 replicas of order-service behind a round-robin. Stress test with 100 concurrent orders on same product. Document in README — "distributed locks verified across N instances".
- [ ] **Redlock-style lock extension watchdog** — today lock TTL is 5s (`orderService.ts:8`); if processing stalls, lock releases mid-flight. Implement periodic renewal (every 2s) until processing completes.
- [ ] **gRPC between services** — swap REST internal calls for gRPC. Different tech on the resume.

---

## Deploy Checklist (Coolify)

1. DNS: A record for `ecommerce.ahmethamdiozen.site` and `minio.ahmethamdiozen.site` → VPS IP.
2. Coolify: create Postgres resource with databases `auth_db`, `order_db`, `inventory_db`.
3. Coolify: Redis resource (shared, password-protected).
4. Coolify: stack deploy from GitHub using `infrastructure/docker-compose.prod.yaml`.
5. Secrets: `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `RABBITMQ_USER/PASS`, `MINIO_ROOT_USER/PASSWORD`, `ADMIN_EMAILS`, `AUTH_DATABASE_URL`, `ORDER_DATABASE_URL`, `INVENTORY_DATABASE_URL`, `REDIS_URL/HOST/PORT/PASSWORD`.
6. Domains in Coolify: frontend → `ecommerce.ahmethamdiozen.site`, MinIO → `minio.ahmethamdiozen.site`. Let's Encrypt SSL for both.
7. Run seed script once after first deploy (admin user + products).
8. Smoke test: register, login, add to cart, checkout, see order in admin panel.

---

## Demo Setup

- Public test accounts (README):
  - Admin: `admin@demo.ecommerce.ahmethamdiozen.site` / `demo1234`
  - Customer: `shopper@demo.ecommerce.ahmethamdiozen.site` / `demo1234`
- 10 seeded products across 3 tags.
- Disclaimer: "demo data resets daily at 04:00 UTC via cron".
