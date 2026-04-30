[🇬🇧 English](README.EN.md)

# Dağıtık E-Ticaret Platformu

TypeScript ile geliştirilmiş, mikroservis tabanlı dağıtık e-ticaret sistemi. Olay güdümlü mimari, dağıtık kilitleme, hız sınırlama ve gözlemlenebilirlik kalıplarını sergiler.

## Mimari

```
                         ┌──────────────────┐
                         │    Frontend      │
                         │  React + Nginx   │
                         └────────┬─────────┘
                                  │
              ┌───────────────────┼─────────────────────┐
              │                   │                     │
     ┌────────▼─────────┐ ┌───────▼─────────┐ ┌─────────▼────────┐
     │  Auth Servisi    │ │ Sipariş Servisi │ │ Envanter Servisi │
     │   (Port 3001)    │ │  (Port 3000)    │ │   (Port 3002)    │
     └──┬──────────┬────┘ └──┬─────┬──┬─────┘ └──┬────────┬──────┘
        │          │         │     │  │          │        │   
     Postgres    Redis    Redis  Kafka RMQ    Postgres   Redis 
                                  │     │              │
                                  ▼     ▼         Kafka│
                           ┌──────────────┐            │
                           │   Bildirim   │◄───────────┘
                           │   Servisi    │
                           └──────────────┘

            İzleme: Prometheus (9090) + Grafana (3004)
```

## Servisler

| Servis | Port | Açıklama |
|---|---|---|
| Auth Servisi | 3001 | JWT kimlik doğrulama, kayıt, oturum iptali |
| Sipariş Servisi | 3000 | Dağıtık kilitleme, Kafka olayları, idempotency |
| Envanter Servisi | 3002 | Ürün kataloğu, MinIO görsel depolama, Kafka consumer |
| Bildirim Servisi | 3003 | Yeniden deneme + dead-letter queue ile RabbitMQ consumer |
| Frontend | 5173 | React SPA — mağaza, sepet, ödeme, admin paneli |

## Teknoloji Yığını

| Bileşen | Teknoloji |
|---|---|
| Dil | TypeScript (Node.js) |
| Framework | Express.js v5 |
| ORM | Prisma |
| Veritabanı | PostgreSQL 16 |
| Önbellek | Redis 7.2 |
| Olay akışı | Apache Kafka |
| Mesaj kuyruğu | RabbitMQ 3.12 |
| Nesne depolama | MinIO (S3 uyumlu) |
| Frontend | React 19 + Vite |
| İzleme | Prometheus + Grafana |
| CI | GitHub Actions |

## Dayanıklılık Kalıpları

- **Dağıtık Kilitleme** — TTL'li Redis kilitleri, aynı ürüne eş zamanlı sipariş işlenmesini engeller
- **Kilitlenme Önleme** — kilitler alınmadan önce ürünler productId'ye göre sıralanır
- **Idempotency** — sipariş sonuçları 24 saat Redis'te önbelleğe alınır; çift işleme engellenir
- **Hız Sınırlama** — auth ve sipariş uç noktalarında Redis destekli kayan pencere sayacı
- **Dead Letter Queue** — 3 yeniden denemeden sonra üstel geri çekilmeyle başarısız bildirimler DLQ'ya yönlendirilir

## Kurulum

```bash
git clone https://github.com/ahmethamdiozen/ecommerce-distributed.git
cd ecommerce-distributed
cp infrastructure/.env.example infrastructure/.env  # gizli değerleri doldurun
cd infrastructure && docker compose up --build

# Frontend (ayrı terminal)
cd services/frontend && npm install && npm run dev
```

### Servis URL'leri

| Servis | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Sipariş Servisi | http://localhost:3000 |
| Auth Servisi | http://localhost:3001 |
| Envanter Servisi | http://localhost:3002 |
| Prometheus | http://localhost:9090 |
| Grafana | http://localhost:3004 |
| RabbitMQ | http://localhost:15672 |
| MinIO Konsolu | http://localhost:9001 |

## CI Pipeline

Her `main` dalına push'ta GitHub Actions çalışır:
1. Tüm backend servisleri için tip kontrolü (`tsc --noEmit`)
2. Frontend için ESLint + Vite build
3. 5 Dockerfile için Docker build
4. Production compose dosyası doğrulaması
